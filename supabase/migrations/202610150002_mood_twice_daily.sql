-- Delivery receipts only. These rows never record the person's mood choice.
create table if not exists public.mood_reminder_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_date date not null,
  slot text not null check (slot in ('morning','evening')),
  email text not null,
  email_token text not null,
  email_action_id uuid not null unique,
  sent_at timestamptz,
  primary key (user_id, reminder_date, slot)
);
alter table public.mood_reminder_deliveries enable row level security;
revoke all on public.mood_reminder_deliveries from anon, authenticated;
grant all on public.mood_reminder_deliveries to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Set up the existing service-role credential in Vault before running this section.
-- Only the project's existing postgres role can run these jobs.
select cron.schedule('mood-reminder-morning-beijing', '0 2 * * *', $job$
  select net.http_post(
    url := 'https://nemmxtfonfpzprvtynah.supabase.co/functions/v1/gift-api',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='mood_scheduler_service_role')),
    body := '{"action":"mood-reminder","slot":"morning"}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
select cron.schedule('mood-reminder-evening-beijing', '0 10 * * *', $job$
  select net.http_post(
    url := 'https://nemmxtfonfpzprvtynah.supabase.co/functions/v1/gift-api',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='mood_scheduler_service_role')),
    body := '{"action":"mood-reminder","slot":"evening"}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
