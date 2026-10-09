create or replace function public.gift_charge_completed_whisper() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='completed' and old.status is distinct from 'completed' and not exists (select 1 from public.gift_credit_ledger where reference_id=new.id and reason='tease') then
    update public.gift_members set balance=balance-1 where user_id=new.user_id and balance>=1;
    if not found then raise exception 'NO_CREDITS'; end if;
    insert into public.gift_credit_ledger(user_id,delta,reason,reference_id) values(new.user_id,-1,'tease',new.id);
  end if;
  return new;
end; $$;
drop trigger if exists gift_whisper_charge on public.gift_whispers;
create trigger gift_whisper_charge before update on public.gift_whispers for each row execute function public.gift_charge_completed_whisper();
