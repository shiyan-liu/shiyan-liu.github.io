create table if not exists public.gift_email_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null check (status in ('pending','active','unsubscribed')),
  confirm_hash text,
  unsubscribe_hash text not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  last_confirmation_sent_at timestamptz,
  attempt_window_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  unique (email)
);
alter table public.gift_email_subscriptions enable row level security;
revoke all on public.gift_email_subscriptions from anon, authenticated;
grant all on public.gift_email_subscriptions to service_role;

create table if not exists public.gift_email_deliveries (
  game_id uuid not null references public.gift_games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('sent','failed')),
  attempt_count integer not null default 0,
  provider_id text,
  last_error text,
  sent_at timestamptz,
  primary key (game_id,user_id)
);
alter table public.gift_email_deliveries enable row level security;
revoke all on public.gift_email_deliveries from anon, authenticated;
grant all on public.gift_email_deliveries to service_role;

create or replace function public.gift_prepare_subscription(
  p_user uuid, p_email text, p_confirm_hash text, p_unsubscribe_hash text
) returns text language plpgsql security definer set search_path = public as $$
declare s public.gift_email_subscriptions%rowtype;
begin
  if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(p_email)>254 or length(p_confirm_hash)<>64 or length(p_unsubscribe_hash)<>64 then
    raise exception 'INVALID_INPUT';
  end if;
  perform 1 from public.gift_members where user_id=p_user and role='player';
  if not found then raise exception 'FORBIDDEN'; end if;
  select * into s from public.gift_email_subscriptions where user_id=p_user for update;
  if found then
    if s.email=p_email and s.status='active' then return 'active'; end if;
    if s.email=p_email and s.status='pending' and s.last_confirmation_sent_at>now()-interval '10 minutes' then return 'pending'; end if;
    if s.last_confirmation_sent_at>now()-interval '1 hour' then return 'cooldown'; end if;
    if s.attempt_window_at>now()-interval '24 hours' and s.attempt_count>=3 then return 'limit'; end if;
    update public.gift_email_subscriptions set email=p_email,status='pending',confirm_hash=p_confirm_hash,
      unsubscribe_hash=p_unsubscribe_hash,confirmed_at=null,last_confirmation_sent_at=now(),
      attempt_window_at=case when s.attempt_window_at<now()-interval '24 hours' then now() else s.attempt_window_at end,
      attempt_count=case when s.attempt_window_at<now()-interval '24 hours' then 1 else s.attempt_count+1 end
    where user_id=p_user;
  else
    insert into public.gift_email_subscriptions(user_id,email,status,confirm_hash,unsubscribe_hash,last_confirmation_sent_at,attempt_count)
    values(p_user,p_email,'pending',p_confirm_hash,p_unsubscribe_hash,now(),1);
  end if;
  return 'send';
end $$;
revoke all on function public.gift_prepare_subscription(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.gift_prepare_subscription(uuid,text,text,text) to service_role;
