-- Dedicated Supabase project recommended. All mutations are service-role only.
create table public.gift_members (
 user_id uuid primary key references auth.users(id), role text not null unique check(role in ('admin','player')),
 balance integer not null default 0 check(balance >= 0)
);
create table public.gift_games (
 id uuid primary key, title text not null, status text not null default 'active' check(status in ('active','won','revealed','archived')),
 created_at timestamptz not null default now()
);
create unique index one_active_gift on public.gift_games((status)) where status='active';
create table public.gift_game_secrets (
 game_id uuid primary key references public.gift_games(id), answer text not null, aliases text[] not null default '{}',
 embedding double precision[] not null, model text not null, reveal_text text not null, reveal_photo_id uuid
);
create table public.gift_photos (
 id uuid primary key, user_id uuid not null references public.gift_members(user_id), storage_path text not null unique,
 image_hash text not null, created_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,image_hash)
);
alter table public.gift_game_secrets add foreign key(reveal_photo_id) references public.gift_photos(id);
create table public.gift_upload_intents (
 id uuid primary key, user_id uuid not null references public.gift_members(user_id), path text not null unique,
 created_at timestamptz not null default now(), finalized boolean not null default false
);
create table public.gift_guesses (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.gift_games(id),
 user_id uuid not null references public.gift_members(user_id), text text not null, normalized text not null,
 score numeric(5,2) not null check(score >= 0 and score <= 100), is_correct boolean not null,
 created_at timestamptz not null default now(), unique(game_id,user_id,normalized)
);
create table public.gift_credit_ledger (
 id bigint generated always as identity primary key, user_id uuid not null references public.gift_members(user_id),
 delta integer not null check(delta in (-1,1,3)), reason text not null check(reason in ('photo_upload','guess','new_game')),
 reference_id uuid not null, created_at timestamptz not null default now(), unique(reason,reference_id)
);
create table public.gift_request_limits (
 user_id uuid references public.gift_members(user_id), action text, window_start timestamptz, count integer not null,
 primary key(user_id,action,window_start)
);
do $$ declare t text; begin
 foreach t in array array['gift_members','gift_games','gift_game_secrets','gift_photos','gift_upload_intents','gift_guesses','gift_credit_ledger','gift_request_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('gift-private','gift-private',false,5242880,array['image/jpeg'])
on conflict(id) do nothing;
-- No storage policies: only server-created upload/signing URLs can access files.

create function public.gift_rate(p_user uuid,p_action text,p_limit integer) returns boolean
language plpgsql security definer set search_path=public as $$
declare n integer; begin
 insert into gift_request_limits values(p_user,p_action,date_trunc('minute',now()),1)
 on conflict(user_id,action,window_start) do update set count=gift_request_limits.count+1 returning count into n;
 delete from gift_request_limits where window_start < now()-interval '1 day';
 return n<=p_limit;
end $$;

create function public.gift_finalize(p_user uuid,p_intent uuid,p_hash text,p_path text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare m gift_members; i gift_upload_intents; existing gift_photos; begin
 select * into m from gift_members where user_id=p_user for update;
 if not found then raise exception 'FORBIDDEN'; end if;
 select * into i from gift_upload_intents where id=p_intent and user_id=p_user for update;
 if not found then raise exception 'UPLOAD_EXPIRED'; end if;
 if i.finalized then
   select * into existing from gift_photos where id=p_intent;
   return jsonb_build_object('duplicate',true,'photo_id',existing.id,'balance',m.balance);
 end if;
 if i.created_at < now()-interval '2 hours' then raise exception 'UPLOAD_EXPIRED'; end if;
 select * into existing from gift_photos where user_id=p_user and image_hash=p_hash;
 if found then
   update gift_upload_intents set finalized=true where id=p_intent;
   return jsonb_build_object('duplicate',true,'photo_id',existing.id,'balance',m.balance);
 end if;
 insert into gift_photos(id,user_id,storage_path,image_hash) values(p_intent,p_user,p_path,p_hash);
 if m.role='player' then
   update gift_members set balance=balance+3 where user_id=p_user returning * into m;
   insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,3,'photo_upload',p_intent);
 end if;
 update gift_upload_intents set finalized=true where id=p_intent;
 return jsonb_build_object('duplicate',false,'photo_id',p_intent,'balance',m.balance);
end $$;

create function public.gift_guess(p_user uuid,p_game uuid,p_text text,p_normalized text,p_score numeric,p_correct boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
declare m gift_members; g gift_games; q gift_guesses; begin
 select * into m from gift_members where user_id=p_user for update;
 if not found or m.role<>'player' then raise exception 'FORBIDDEN'; end if;
 select * into g from gift_games where id=p_game for update;
 if not found then raise exception 'GAME_CHANGED'; end if;
 select * into q from gift_guesses where user_id=p_user and game_id=p_game and normalized=p_normalized;
 if found then return jsonb_build_object('guess',to_jsonb(q),'balance',m.balance,'duplicate',true); end if;
 if g.status<>'active' then raise exception 'GAME_CHANGED'; end if;
 if m.balance<1 then raise exception 'NO_CREDITS'; end if;
 insert into gift_guesses(game_id,user_id,text,normalized,score,is_correct)
 values(p_game,p_user,p_text,p_normalized,case when p_correct then 100 else least(99,greatest(0,p_score)) end,p_correct) returning * into q;
 update gift_members set balance=balance-1 where user_id=p_user returning * into m;
 insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,-1,'guess',q.id);
 if p_correct then update gift_games set status='won' where id=p_game; end if;
 return jsonb_build_object('guess',to_jsonb(q),'balance',m.balance,'duplicate',false);
end $$;

create function public.gift_create(p_user uuid,p_id uuid,p_title text,p_answer text,p_aliases text[],p_embedding double precision[],p_model text,p_reveal text,p_photo uuid) returns uuid
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from gift_members where user_id=p_user and role='admin') then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(78654321);
 if exists(select 1 from gift_games where id=p_id) then return p_id; end if;
 if p_photo is not null and not exists(select 1 from gift_photos where id=p_photo and deleted_at is null) then raise exception 'PHOTO_MISSING'; end if;
 update gift_games set status='archived' where status='active';
 insert into gift_games(id,title) values(p_id,p_title);
 insert into gift_game_secrets values(p_id,p_answer,p_aliases,p_embedding,p_model,p_reveal,p_photo);
 update gift_members set balance=balance+3 where role='player';
 insert into gift_credit_ledger(user_id,delta,reason,reference_id)
 select user_id,3,'new_game',p_id from gift_members where role='player';
 return p_id;
end $$;

-- RPCs accept trusted scores/user IDs, so browsers must never execute them.
revoke all on function public.gift_rate(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.gift_finalize(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.gift_guess(uuid,uuid,text,text,numeric,boolean) from public,anon,authenticated;
revoke all on function public.gift_create(uuid,uuid,text,text,text[],double precision[],text,text,uuid) from public,anon,authenticated;
grant execute on function public.gift_rate(uuid,text,integer) to service_role;
grant execute on function public.gift_finalize(uuid,uuid,text,text) to service_role;
grant execute on function public.gift_guess(uuid,uuid,text,text,numeric,boolean) to service_role;
grant execute on function public.gift_create(uuid,uuid,text,text,text[],double precision[],text,text,uuid) to service_role;

create table public.gift_login_limits (
 key_hash text not null, window_start timestamptz not null, count integer not null,
 primary key(key_hash,window_start)
);
alter table public.gift_login_limits enable row level security;
revoke all on public.gift_login_limits from anon,authenticated;
grant all on public.gift_login_limits to service_role;
create function public.gift_login_rate(p_key text) returns boolean
language plpgsql security definer set search_path=public as $$
declare n integer; begin
 insert into gift_login_limits values(p_key,date_trunc('hour',now()),1)
 on conflict(key_hash,window_start) do update set count=gift_login_limits.count+1 returning count into n;
 delete from gift_login_limits where window_start<now()-interval '2 days';
 return n<=8;
end $$;
revoke all on function public.gift_login_rate(text) from public,anon,authenticated;
grant execute on function public.gift_login_rate(text) to service_role;
