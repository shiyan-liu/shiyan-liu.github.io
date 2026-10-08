alter table public.gift_upload_intents add column if not exists mime_type text;
alter table public.gift_media add column if not exists reference_hash text;
alter table public.gift_media add column if not exists verification_model text;
alter table public.gift_media add column if not exists verification_score numeric;

update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
where id='gift-private';

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
  update gift_members set balance=balance+3 where user_id=p_user returning * into m;
  insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,3,'photo_upload',p_id);
  update gift_upload_intents set finalized=true where id=p_id;
  return jsonb_build_object('duplicate',false,'media_id',p_id,'balance',m.balance);
end $$;
revoke all on function public.gift_finalize_verified_media(uuid,uuid,text,text,text,text,text,numeric) from public,anon,authenticated;
grant execute on function public.gift_finalize_verified_media(uuid,uuid,text,text,text,text,text,numeric) to service_role;
