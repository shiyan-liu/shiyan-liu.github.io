-- A private, playful keepsake agreement. Only the authenticated Edge API can read or write it.
create table public.love_promise_agreements (
  id text primary key check (id = 'zz-love-promise-v1'),
  created_at timestamptz not null default now(),
  party_one_name text,
  party_one_signature jsonb,
  party_one_signed_at timestamptz,
  party_two_name text,
  party_two_signature jsonb,
  party_two_signed_at timestamptz,
  sealed_at timestamptz,
  check ((party_one_name is null) = (party_one_signed_at is null)),
  check ((party_two_name is null) = (party_two_signed_at is null)),
  check ((party_one_signature is null) = (party_one_signed_at is null)),
  check ((party_two_signature is null) = (party_two_signed_at is null)),
  check (sealed_at is null or (party_one_signed_at is not null and party_two_signed_at is not null))
);
alter table public.love_promise_agreements enable row level security;
revoke all on public.love_promise_agreements from public, anon, authenticated;
grant all on public.love_promise_agreements to service_role;
insert into public.love_promise_agreements(id) values ('zz-love-promise-v1');

create function public.love_promise_sign(p_party text, p_name text, p_signature jsonb)
returns public.love_promise_agreements
language plpgsql security definer set search_path=public as $$
declare v public.love_promise_agreements;
begin
  if p_party not in ('one','two') or p_name is null or length(btrim(p_name)) not between 1 and 40
     or jsonb_typeof(p_signature) <> 'array' or jsonb_array_length(p_signature) not between 1 and 24 then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v from public.love_promise_agreements where id='zz-love-promise-v1' for update;
  if not found then raise exception 'PROMISE_NOT_FOUND'; end if;
  if v.sealed_at is not null then raise exception 'PROMISE_SEALED'; end if;
  if p_party='one' then
    if v.party_one_signed_at is not null then raise exception 'PROMISE_ALREADY_SIGNED'; end if;
    update public.love_promise_agreements set party_one_name=btrim(p_name),party_one_signature=p_signature,party_one_signed_at=now(),
      sealed_at=case when party_two_signed_at is not null then now() else null end
      where id='zz-love-promise-v1' returning * into v;
  else
    if v.party_two_signed_at is not null then raise exception 'PROMISE_ALREADY_SIGNED'; end if;
    update public.love_promise_agreements set party_two_name=btrim(p_name),party_two_signature=p_signature,party_two_signed_at=now(),
      sealed_at=case when party_one_signed_at is not null then now() else null end
      where id='zz-love-promise-v1' returning * into v;
  end if;
  return v;
end;$$;
revoke all on function public.love_promise_sign(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.love_promise_sign(text,text,jsonb) to service_role;
