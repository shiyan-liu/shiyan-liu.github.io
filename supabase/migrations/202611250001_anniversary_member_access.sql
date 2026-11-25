create table if not exists public.gift_anniversary_album (
  id boolean primary key default true check (id),
  album_pass text not null
);

alter table public.gift_anniversary_album enable row level security;
revoke all on table public.gift_anniversary_album from public, anon, authenticated;
grant select, insert, update on table public.gift_anniversary_album to service_role;

create or replace function public.gift_anniversary_pass()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select album.album_pass
  from public.gift_anniversary_album as album
  where album.id
    and exists (
      select 1
      from public.gift_members as member
      where member.user_id = (select auth.uid())
        and member.role in ('admin', 'player')
    );
$$;

revoke all on function public.gift_anniversary_pass() from public, anon, authenticated;
grant execute on function public.gift_anniversary_pass() to authenticated;

notify pgrst, 'reload schema';
