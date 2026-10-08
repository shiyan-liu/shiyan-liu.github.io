begin;
lock table public.gift_members in share row exclusive mode;
alter table public.gift_credit_ledger drop constraint if exists gift_credit_ledger_delta_check;
alter table public.gift_credit_ledger add constraint gift_credit_ledger_delta_check check (delta in (-2,-1,1,3,5) or (reason='currency_conversion' and delta>=0));
alter table public.gift_credit_ledger drop constraint if exists gift_credit_ledger_reason_check;
alter table public.gift_credit_ledger add constraint gift_credit_ledger_reason_check check (reason in ('photo_upload','guess','new_game','tease','currency_conversion'));
-- Convert once without reducing anyone's existing number of guesses.
with adjustments as (
 insert into public.gift_credit_ledger(user_id,delta,reason,reference_id)
 select user_id,balance,'currency_conversion',user_id from public.gift_members where role='player'
 on conflict(reason,reference_id) do nothing returning user_id,delta
)
update public.gift_members m set balance=m.balance+a.delta from adjustments a where m.user_id=a.user_id;

create or replace function public.gift_guess(p_user uuid,p_game uuid,p_text text,p_normalized text,p_score numeric,p_correct boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
declare m gift_members; g gift_games; q gift_guesses; begin
 select * into m from gift_members where user_id=p_user for update;
 if not found or m.role<>'player' then raise exception 'FORBIDDEN'; end if;
 select * into g from gift_games where id=p_game for update;
 if not found then raise exception 'GAME_CHANGED'; end if;
 select * into q from gift_guesses where user_id=p_user and game_id=p_game and normalized=p_normalized;
 if found then return jsonb_build_object('guess',to_jsonb(q),'balance',m.balance,'duplicate',true); end if;
 if g.status<>'active' then raise exception 'GAME_CHANGED'; end if;
 if m.balance<2 then raise exception 'NO_CREDITS'; end if;
 insert into gift_guesses(game_id,user_id,text,normalized,score,is_correct)
 values(p_game,p_user,p_text,p_normalized,case when p_correct then 100 else least(99,greatest(0,p_score)) end,p_correct) returning * into q;
 update gift_members set balance=balance-2 where user_id=p_user returning * into m;
 insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,-2,'guess',q.id);
 if p_correct then update gift_games set status='won' where id=p_game; end if;
 return jsonb_build_object('guess',to_jsonb(q),'balance',m.balance,'duplicate',false);
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
 update gift_members set balance=balance+5 where role='player';
 insert into gift_credit_ledger(user_id,delta,reason,reference_id)
 select user_id,5,'new_game',p_id from gift_members where role='player';
 return p_id;
end $$;

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
   update gift_members set balance=balance+5 where user_id=p_user returning * into m;
   insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,5,'photo_upload',p_intent);
 end if;
 update gift_upload_intents set finalized=true where id=p_intent;
 return jsonb_build_object('duplicate',false,'photo_id',p_intent,'balance',m.balance);
end $$;

create or replace function public.gift_finalize_media(p_user uuid,p_id uuid,p_hash text,p_path text,p_mime text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m gift_members; existing gift_media; begin
  select * into m from gift_members where user_id=p_user for update;
  if not found or m.role<>'player' then raise exception 'FORBIDDEN'; end if;
  if p_mime not in ('image/jpeg','video/mp4','video/webm') then raise exception 'INVALID_MEDIA'; end if;
  select * into existing from gift_media where user_id=p_user and media_hash=p_hash;
  if found then return jsonb_build_object('duplicate',true,'media_id',existing.id,'balance',m.balance); end if;
  insert into gift_media(id,user_id,storage_path,mime_type,media_hash) values(p_id,p_user,p_path,p_mime,p_hash);
  update gift_members set balance=balance+5 where user_id=p_user returning * into m;
  insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,5,'photo_upload',p_id);
  return jsonb_build_object('duplicate',false,'media_id',p_id,'balance',m.balance);
end $$;

create or replace function public.gift_finalize_verified_media(
  p_user uuid,p_id uuid,p_hash text,p_path text,p_mime text,
  p_reference_hash text,p_model text,p_confidence numeric
) returns jsonb language plpgsql security definer set search_path=public as $$
declare m gift_members; i gift_upload_intents; existing gift_media; reference gift_face_reference;
begin
  select * into m from gift_members where user_id=p_user for update;
  if not found or m.role<>'player' then raise exception 'FORBIDDEN'; end if;
  select * into i from gift_upload_intents where id=p_id and user_id=p_user for update;
  if not found then raise exception 'INVALID_INPUT'; end if;
  if i.finalized then
    return jsonb_build_object('duplicate',true,'balance',m.balance);
  end if;
  if i.created_at < now()-interval '2 hours' then raise exception 'UPLOAD_EXPIRED'; end if;
  if p_mime is null or i.mime_type is distinct from p_mime or p_mime not in ('image/jpeg','video/mp4','video/webm') then
    raise exception 'INVALID_MEDIA';
  end if;
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or
     p_path is distinct from 'media/'||p_user::text||'/'||p_id::text||'/'||p_hash then
    raise exception 'INVALID_INPUT';
  end if;
  select * into reference from gift_face_reference where id=true for share;
  if not found then raise exception 'FACE_REFERENCE_MISSING'; end if;
  if reference.image_hash is distinct from p_reference_hash then raise exception 'FACE_REFERENCE_CHANGED'; end if;
  if p_model is null or length(p_model)=0 or p_confidence is null or
     p_confidence < 0.9 or p_confidence > 1 or p_confidence::text='NaN' then
    raise exception 'FACE_MISMATCH';
  end if;
  select * into existing from gift_media where user_id=p_user and media_hash=p_hash;
  if found then
    update gift_upload_intents set finalized=true where id=p_id;
    return jsonb_build_object('duplicate',true,'media_id',existing.id,'balance',m.balance);
  end if;
  insert into gift_media(id,user_id,storage_path,mime_type,media_hash,reference_hash,verification_model,verification_score)
    values(p_id,p_user,p_path,p_mime,p_hash,p_reference_hash,p_model,p_confidence);
  update gift_members set balance=balance+5 where user_id=p_user returning * into m;
  insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,5,'photo_upload',p_id);
  update gift_upload_intents set finalized=true where id=p_id;
  return jsonb_build_object('duplicate',false,'media_id',p_id,'balance',m.balance);
end $$;

create or replace function public.gift_complete_whisper(p_user uuid,p_id uuid,p_reply text,p_cost numeric,p_prompt_tokens integer,p_completion_tokens integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m gift_members; w gift_whispers; g gift_games; begin
 select * into m from gift_members where user_id=p_user for update;
 if not found or m.role<>'player' then raise exception 'FORBIDDEN'; end if;
 select * into w from gift_whispers where id=p_id and user_id=p_user for update;
 if not found then raise exception 'INVALID_INPUT'; end if;
 if w.status='completed' then return jsonb_build_object('reply',w.reply,'balance',m.balance,'duplicate',true); end if;
 if w.status<>'pending' or p_reply is null or length(p_reply)=0 or length(p_reply)>180 then raise exception 'INVALID_INPUT'; end if;
 select * into g from gift_games where id=w.game_id for update;
 if not found or g.status<>'active' then raise exception 'GAME_CHANGED'; end if;
 if m.balance<1 then raise exception 'NO_CREDITS'; end if;
 update gift_members set balance=balance-1 where user_id=p_user returning * into m;
 insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,-1,'tease',p_id);
 update gift_whispers set reply=p_reply,status='completed',cost=p_cost,prompt_tokens=p_prompt_tokens,completion_tokens=p_completion_tokens where id=p_id;
 return jsonb_build_object('reply',p_reply,'balance',m.balance,'duplicate',false);
end $$;
revoke all on function public.gift_complete_whisper(uuid,uuid,text,numeric,integer,integer) from public,anon,authenticated;
grant execute on function public.gift_complete_whisper(uuid,uuid,text,numeric,integer,integer) to service_role;
commit;
