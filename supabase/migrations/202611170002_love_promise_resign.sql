-- Replace only on submission; drafts never overwrite a saved signature.
create or replace function public.love_promise_sign(p_party text, p_name text, p_signature jsonb)
returns public.love_promise_agreements
language plpgsql security definer set search_path=public as $$
declare v public.love_promise_agreements;
begin
  if p_party not in ('one','two') or p_name is null or length(btrim(p_name)) not between 1 and 40
     or p_signature is null or jsonb_typeof(p_signature) <> 'array' or jsonb_array_length(p_signature) not between 1 and 24 then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v from public.love_promise_agreements where id='zz-love-promise-v1' for update;
  if not found then raise exception 'PROMISE_NOT_FOUND'; end if;
  if p_party='one' then
    update public.love_promise_agreements set party_one_name=btrim(p_name),party_one_signature=p_signature,party_one_signed_at=now(),
      sealed_at=case when party_two_signed_at is not null then coalesce(sealed_at,now()) else null end
      where id='zz-love-promise-v1' returning * into v;
  else
    update public.love_promise_agreements set party_two_name=btrim(p_name),party_two_signature=p_signature,party_two_signed_at=now(),
      sealed_at=case when party_one_signed_at is not null then coalesce(sealed_at,now()) else null end
      where id='zz-love-promise-v1' returning * into v;
  end if;
  return v;
end;$$;
revoke all on function public.love_promise_sign(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.love_promise_sign(text,text,jsonb) to service_role;
