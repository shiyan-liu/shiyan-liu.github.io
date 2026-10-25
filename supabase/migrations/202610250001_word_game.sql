-- Shared persistent game, private rounds; only the authenticated Edge API can access it.
create table public.word_games (
 id uuid primary key default gen_random_uuid(),
 status text not null default 'active' check(status in ('active','won','closed')),
 current_round integer not null default 1 check(current_round>0),
 created_at timestamptz not null default now(),
 finished_at timestamptz
);
create unique index one_active_word_game on public.word_games(status) where status='active';
create table public.word_rounds (
 game_id uuid not null references public.word_games(id) on delete cascade,
 round_no integer not null check(round_no>0),
 lsy_word text check(length(lsy_word) between 1 and 80),
 zz_word text check(length(zz_word) between 1 and 80),
 lsy_submitted_at timestamptz,
 zz_submitted_at timestamptz,
 revealed_at timestamptz,
 primary key(game_id,round_no)
);
alter table public.word_games enable row level security;
alter table public.word_rounds enable row level security;
revoke all on public.word_games,public.word_rounds from anon,authenticated;
create function public.word_game_start(p_expected_game uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_latest uuid; v_id uuid;
begin
 perform pg_advisory_xact_lock(20261025,1);
 select id into v_latest from word_games order by created_at desc,id desc limit 1;
 if v_latest is distinct from p_expected_game then raise exception 'WORD_GAME_CHANGED'; end if;
 update word_games set status='closed',finished_at=now() where status='active';
 insert into word_games default values returning id into v_id;
 insert into word_rounds(game_id,round_no) values(v_id,1);
 return v_id;
end;$$;
create function public.word_game_submit(p_game uuid,p_round integer,p_seat text,p_word text) returns void
language plpgsql security definer set search_path=public as $$
declare v_game word_games; v_round word_rounds; v_word text:=btrim(p_word);
begin
 if p_seat not in ('lsy','zz') or p_seat is null or v_word is null or length(v_word) not between 1 and 80 then raise exception 'INVALID_INPUT'; end if;
 select * into v_game from word_games where id=p_game for update;
 if not found or v_game.status<>'active' or v_game.current_round<>p_round then raise exception 'WORD_GAME_CHANGED'; end if;
 select * into v_round from word_rounds where game_id=p_game and round_no=p_round for update;
 if not found then raise exception 'WORD_GAME_CHANGED'; end if;
 if (p_seat='lsy' and v_round.lsy_word is not null) or (p_seat='zz' and v_round.zz_word is not null) then raise exception 'WORD_ALREADY_SENT'; end if;
 if p_seat='lsy' then
  update word_rounds set lsy_word=v_word,lsy_submitted_at=now() where game_id=p_game and round_no=p_round;
 else
  update word_rounds set zz_word=v_word,zz_submitted_at=now() where game_id=p_game and round_no=p_round;
 end if;
 select * into v_round from word_rounds where game_id=p_game and round_no=p_round;
 if v_round.lsy_word is not null and v_round.zz_word is not null then
  update word_rounds set revealed_at=now() where game_id=p_game and round_no=p_round;
  if lower(normalize(v_round.lsy_word,NFKC))=lower(normalize(v_round.zz_word,NFKC)) then
   update word_games set status='won',finished_at=now() where id=p_game;
  else
   update word_games set current_round=p_round+1 where id=p_game;
   insert into word_rounds(game_id,round_no) values(p_game,p_round+1);
  end if;
 end if;
end;$$;
revoke all on function public.word_game_start(uuid),public.word_game_submit(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.word_game_start(uuid),public.word_game_submit(uuid,integer,text,text) to service_role;
