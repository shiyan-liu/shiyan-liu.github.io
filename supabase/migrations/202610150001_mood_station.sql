create table if not exists public.mood_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('sad','tired','anxious','miss_you')),
  created_at timestamptz not null default now()
);
create index if not exists mood_entries_user_created_at on public.mood_entries(user_id,created_at desc);
alter table public.mood_entries enable row level security;
revoke all on public.mood_entries from anon, authenticated;
grant all on public.mood_entries to service_role;

create table if not exists public.mood_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, reminder_date)
);
alter table public.mood_reminders enable row level security;
revoke all on public.mood_reminders from anon, authenticated;
grant all on public.mood_reminders to service_role;

create table if not exists public.mood_email_actions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  token_hash text not null unique,
  reminder_date date not null,
  expires_at timestamptz not null,
  selected_mood text check (selected_mood in ('sad','tired','anxious','miss_you')),
  selected_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mood_email_actions_user_created_at on public.mood_email_actions(user_id, created_at desc);
alter table public.mood_email_actions enable row level security;
revoke all on public.mood_email_actions from anon, authenticated;
grant all on public.mood_email_actions to service_role;

alter table public.mood_email_actions add column if not exists email text;
