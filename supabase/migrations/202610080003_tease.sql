alter table public.gift_game_secrets add column if not exists playful_hint text not null default '';

-- Reuse the existing server-only limiter, preserving all existing grants.
create or replace function public.gift_rate(p_user uuid,p_action text,p_limit integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare n integer; window_start_at timestamptz; begin
  if p_action='tease-daily' then
    window_start_at=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  else
    window_start_at=date_trunc('minute',now());
  end if;
  insert into gift_request_limits values(p_user,p_action,window_start_at,1)
  on conflict(user_id,action,window_start) do update set count=gift_request_limits.count+1 returning count into n;
  delete from gift_request_limits where window_start < now()-interval '1 day';
  return n<=p_limit;
end $$;

create table if not exists public.gift_whispers (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.gift_games(id),
 user_id uuid not null references public.gift_members(user_id),
 message text not null check (char_length(message)<=160),
 reply text,
 status text not null default 'pending' check (status in ('pending','completed','failed')),
 model text not null,
 cost numeric,
 prompt_tokens integer,
 completion_tokens integer,
 created_at timestamptz not null default now()
);
create index if not exists gift_whispers_game_user on public.gift_whispers(game_id,user_id,created_at);
alter table public.gift_whispers enable row level security;
revoke all on public.gift_whispers from anon, authenticated;
grant all on public.gift_whispers to service_role;
