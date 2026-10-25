-- Public, anonymous two-seat rooms. Separate tables and capabilities from the private game.
create table public.open_word_rooms (
 code text primary key check(code ~ '^[A-Za-z0-9_-]{12}$'),
 a_hash text not null check(length(a_hash)=64),
 b_hash text check(length(b_hash)=64),
 version bigint not null default 1,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days'
);
create index open_word_room_expiry on public.open_word_rooms(expires_at);
create table public.open_word_games (
 id uuid primary key default gen_random_uuid(),
 room_code text not null references public.open_word_rooms(code) on delete cascade,
 status text not null default 'active' check(status in ('active','won','closed')),
 current_round integer not null default 1 check(current_round between 1 and 100),
 created_at timestamptz not null default now()
);
create index open_word_games_room on public.open_word_games(room_code,created_at desc,id desc);
create unique index open_word_one_active on public.open_word_games(room_code) where status='active';
create table public.open_word_rounds (
 game_id uuid not null references public.open_word_games(id) on delete cascade,
 round_no integer not null check(round_no between 1 and 100),
 a_word text check(length(a_word) between 1 and 80),
 b_word text check(length(b_word) between 1 and 80),
 revealed_at timestamptz,
 primary key(game_id,round_no)
);
create table public.open_word_limits (
 key text not null,
 window_at timestamptz not null,
 hits integer not null default 1,
 primary key(key,window_at)
);
alter table public.open_word_rooms enable row level security;
alter table public.open_word_games enable row level security;
alter table public.open_word_rounds enable row level security;
alter table public.open_word_limits enable row level security;
revoke all on public.open_word_rooms,public.open_word_games,public.open_word_rounds,public.open_word_limits from anon,authenticated;

create function public.open_word_rate(p_key text,p_window timestamptz,p_max integer) returns void
language plpgsql security definer set search_path=public as $$
declare v_hits integer;
begin
 insert into open_word_limits(key,window_at) values(p_key,p_window)
 on conflict(key,window_at) do update set hits=open_word_limits.hits+1 returning hits into v_hits;
 if v_hits>p_max then raise exception 'RATE_LIMITED'; end if;
end;$$;

-- Separate transaction: invalid join attempts also consume their IP entry budget.
create function public.open_word_entry_rate(p_ip text,p_action text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 if p_action='create' then
  perform open_word_rate('create-hour:'||p_ip,date_trunc('hour',now()),5);
  perform open_word_rate('create-day:'||p_ip,date_trunc('day',now()),20);
 elsif p_action='join' then
  perform open_word_rate('join:'||p_ip,date_trunc('hour',now()),60);
 else return false; end if;
 return true;
exception when raise_exception then
 if SQLERRM='RATE_LIMITED' then return false;end if;raise;
end;$$;

create function public.open_word_view(p_code text,p_seat text,p_game uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_room open_word_rooms;v_game open_word_games;v_rounds jsonb;v_history jsonb;
begin
 select * into v_room from open_word_rooms where code=p_code;
 if p_game is null then
  select * into v_game from open_word_games where room_code=p_code order by created_at desc,id desc limit 1;
 else
  select * into v_game from open_word_games where room_code=p_code and id=p_game;
  if not found then raise exception 'GAME_CHANGED'; end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('number',round_no,'aSubmitted',a_word is not null,'bSubmitted',b_word is not null,
 'revealed',revealed_at is not null,'aWord',case when revealed_at is not null then a_word end,'bWord',case when revealed_at is not null then b_word end) order by round_no),'[]'::jsonb)
 into v_rounds from open_word_rounds where game_id=v_game.id;
 select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc,g.id desc),'[]'::jsonb) into v_history
 from (select id,status,current_round,created_at from open_word_games where room_code=p_code order by created_at desc,id desc limit 20) g;
 return jsonb_build_object('room',jsonb_build_object('code',p_code,'seat',p_seat,'joined',v_room.b_hash is not null,'version',v_room.version,'expiresAt',v_room.expires_at),
 'game',jsonb_build_object('id',v_game.id,'status',v_game.status,'current_round',v_game.current_round,'created_at',v_game.created_at),'rounds',v_rounds,'history',v_history);
end;$$;

create function public.open_word_action(p_action text,p_code text,p_hash text,p_ip text default '',p_version bigint default -1,p_game uuid default null,p_round integer default null,p_word text default null,p_before timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_room open_word_rooms;v_game open_word_games;v_round open_word_rounds;v_seat text;v_id uuid;v_count integer;v_history jsonb;
begin
 if p_code is null or p_code !~ '^[A-Za-z0-9_-]{12}$' or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_INPUT'; end if;
 if p_action='create' then
  perform open_word_rate('create-global',date_trunc('day',now()),200);
  perform open_word_rate('round-global',date_trunc('day',now()),10000);
  insert into open_word_rooms(code,a_hash) values(p_code,p_hash);
  insert into open_word_games(room_code) values(p_code) returning id into v_id;
  insert into open_word_rounds(game_id,round_no) values(v_id,1);
  return open_word_view(p_code,'a');
 end if;
 -- Reads use a shared lock: unrelated reads never serialize. Only mutations lock a room.
 if p_action in ('state','history') then
  select * into v_room from open_word_rooms where code=p_code for share;
 else
  select * into v_room from open_word_rooms where code=p_code for update;
 end if;
 if not found then raise exception 'ROOM_NOT_FOUND'; end if;
 if v_room.expires_at<=now() then raise exception 'ROOM_EXPIRED'; end if;
 if p_hash=v_room.a_hash then v_seat:='a';
 elsif p_hash=v_room.b_hash then v_seat:='b';
 elsif p_action='join' and v_room.b_hash is null then
  update open_word_rooms set b_hash=p_hash,version=version+1 where code=p_code;
  v_seat:='b';
 elsif p_action='join' then raise exception 'ROOM_FULL';
 else raise exception 'ROOM_AUTH'; end if;
 perform open_word_rate('token:'||p_hash,date_trunc('minute',now()),60);
 if p_action='state' then
  if p_game is null and p_version=v_room.version then return jsonb_build_object('unchanged',true); end if;
  return open_word_view(p_code,v_seat,p_game);
 elsif p_action='history' then
  select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc,g.id desc),'[]'::jsonb) into v_history from
  (select id,status,current_round,created_at from open_word_games where room_code=p_code and (p_before is null or created_at<p_before) order by created_at desc,id desc limit 20) g;
  return jsonb_build_object('history',v_history);
 elsif p_action='join' then return open_word_view(p_code,v_seat);
 elsif p_action='start' then
  select * into v_game from open_word_games where room_code=p_code order by created_at desc,id desc limit 1;
  if v_game.id is distinct from p_game then raise exception 'GAME_CHANGED'; end if;
  select count(*) into v_count from open_word_games where room_code=p_code;
  if v_count>=100 then raise exception 'ROOM_LIMIT'; end if;
  perform open_word_rate('round-global',date_trunc('day',now()),10000);
  update open_word_games set status='closed' where room_code=p_code and status='active';
  insert into open_word_games(room_code) values(p_code) returning id into v_id;
  insert into open_word_rounds(game_id,round_no) values(v_id,1);
  update open_word_rooms set version=version+1 where code=p_code;
  return open_word_view(p_code,v_seat);
 elsif p_action='submit' then
  if v_room.b_hash is null then raise exception 'WAIT_FOR_PARTNER'; end if;
  if p_word is null or length(btrim(p_word)) not between 1 and 80 then raise exception 'INVALID_INPUT'; end if;
  select * into v_game from open_word_games where room_code=p_code and id=p_game;
  if not found or v_game.status<>'active' or v_game.current_round is distinct from p_round then raise exception 'GAME_CHANGED'; end if;
  select * into v_round from open_word_rounds where game_id=p_game and round_no=p_round;
  if (v_seat='a' and v_round.a_word is not null) or (v_seat='b' and v_round.b_word is not null) then raise exception 'ALREADY_SENT'; end if;
  if v_seat='a' then update open_word_rounds set a_word=btrim(p_word) where game_id=p_game and round_no=p_round;
  else update open_word_rounds set b_word=btrim(p_word) where game_id=p_game and round_no=p_round;end if;
  select * into v_round from open_word_rounds where game_id=p_game and round_no=p_round;
  if v_round.a_word is not null and v_round.b_word is not null then
   update open_word_rounds set revealed_at=now() where game_id=p_game and round_no=p_round;
   if lower(normalize(v_round.a_word,NFKC))=lower(normalize(v_round.b_word,NFKC)) then
    update open_word_games set status='won' where id=p_game;
   elsif p_round>=100 then update open_word_games set status='closed' where id=p_game;
   else
    perform open_word_rate('round-global',date_trunc('day',now()),10000);
    update open_word_games set current_round=p_round+1 where id=p_game;
    insert into open_word_rounds(game_id,round_no) values(p_game,p_round+1);
   end if;
  end if;
  update open_word_rooms set version=version+1 where code=p_code;
  return open_word_view(p_code,v_seat);
 end if;
 raise exception 'INVALID_INPUT';
end;$$;

create function public.open_word_cleanup() returns void language plpgsql security definer set search_path=public as $$
begin
 delete from open_word_rooms where code in (select code from open_word_rooms where expires_at<=now() order by expires_at limit 1000);
 delete from open_word_limits where window_at<now()-interval '2 days';
end;$$;
revoke all on function public.open_word_entry_rate(text,text),public.open_word_rate(text,timestamptz,integer),public.open_word_view(text,text,uuid),public.open_word_action(text,text,text,text,bigint,uuid,integer,text,timestamptz),public.open_word_cleanup() from public,anon,authenticated;
grant execute on function public.open_word_entry_rate(text,text),public.open_word_action(text,text,text,text,bigint,uuid,integer,text,timestamptz),public.open_word_cleanup() to service_role;
select cron.schedule('public-word-room-cleanup','15 * * * *','select public.open_word_cleanup()');
