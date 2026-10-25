-- Short-lived conversational cards; only explicitly saved notes become cross-day context.
create table public.mood_talk_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 moods jsonb not null,
 custom_mood text not null default '',
 quote text not null,
 choices jsonb not null,
 messages jsonb not null default '[]',
 last_user_text text not null default '',
 version integer not null default 1,
 emailed_version integer not null default 0,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours'
);
create index mood_talk_recent on public.mood_talk_sessions(user_id,created_at desc);
create index mood_talk_expiry on public.mood_talk_sessions(expires_at);
create table public.mood_talk_memory (
 user_id uuid primary key references auth.users(id) on delete cascade,
 content text not null check(length(content) between 1 and 160),
 updated_at timestamptz not null default now()
);
alter table public.mood_talk_sessions enable row level security;
alter table public.mood_talk_memory enable row level security;
revoke all on public.mood_talk_sessions,public.mood_talk_memory from public,anon,authenticated;
grant all on public.mood_talk_sessions,public.mood_talk_memory to service_role;
create function public.mood_talk_cleanup() returns void language sql security definer set search_path=public as $$
 delete from mood_talk_sessions where expires_at<now();
$$;
revoke all on function public.mood_talk_cleanup() from public,anon,authenticated;
grant execute on function public.mood_talk_cleanup() to service_role;
select cron.schedule('mood-talk-cleanup','35 * * * *','select public.mood_talk_cleanup()');
