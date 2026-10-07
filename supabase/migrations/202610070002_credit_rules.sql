-- Three guesses per new gift and three guesses per newly saved photo.
alter table public.gift_credit_ledger drop constraint if exists gift_credit_ledger_delta_check;
alter table public.gift_credit_ledger add constraint gift_credit_ledger_delta_check check (delta in (-1,1,3));
alter table public.gift_credit_ledger drop constraint if exists gift_credit_ledger_reason_check;
alter table public.gift_credit_ledger add constraint gift_credit_ledger_reason_check check (reason in ('photo_upload','guess','new_game'));

create or replace function public.gift_finalize(p_user uuid,p_intent uuid,p_hash text,p_path text) returns jsonb
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

create or replace function public.gift_create(p_user uuid,p_id uuid,p_title text,p_answer text,p_aliases text[],p_embedding double precision[],p_model text,p_reveal text,p_photo uuid) returns uuid
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
