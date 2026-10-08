-- Private media and the single admin-managed face reference.
create table if not exists public.gift_face_reference (
  id boolean primary key default true check (id),
  storage_path text not null,
  image_hash text not null,
  mime_type text not null default 'image/jpeg' check (mime_type in ('image/jpeg','image/png','image/webp')),
  updated_at timestamptz not null default now()
);
alter table public.gift_face_reference add column if not exists mime_type text not null default 'image/jpeg';
alter table public.gift_face_reference enable row level security;
revoke all on public.gift_face_reference from public, anon, authenticated;
grant all on public.gift_face_reference to service_role;

create table if not exists public.gift_media (
  id uuid primary key,
  user_id uuid not null references public.gift_members(user_id),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','video/mp4','video/webm')),
  media_hash text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(user_id,media_hash)
);
alter table public.gift_media enable row level security;
revoke all on public.gift_media from public, anon, authenticated;
grant all on public.gift_media to service_role;

update storage.buckets set file_size_limit=52428800,
  allowed_mime_types=array['image/jpeg','video/mp4','video/webm']
where id='gift-private';

create or replace function public.gift_finalize_media(p_user uuid,p_id uuid,p_hash text,p_path text,p_mime text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m gift_members; existing gift_media; begin
  select * into m from gift_members where user_id=p_user for update;
  if not found or m.role<>'player' then raise exception 'FORBIDDEN'; end if;
  if p_mime not in ('image/jpeg','video/mp4','video/webm') then raise exception 'INVALID_MEDIA'; end if;
  select * into existing from gift_media where user_id=p_user and media_hash=p_hash;
  if found then return jsonb_build_object('duplicate',true,'media_id',existing.id,'balance',m.balance); end if;
  insert into gift_media(id,user_id,storage_path,mime_type,media_hash) values(p_id,p_user,p_path,p_mime,p_hash);
  update gift_members set balance=balance+3 where user_id=p_user returning * into m;
  insert into gift_credit_ledger(user_id,delta,reason,reference_id) values(p_user,3,'photo_upload',p_id);
  return jsonb_build_object('duplicate',false,'media_id',p_id,'balance',m.balance);
end $$;
revoke all on function public.gift_finalize_media(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.gift_finalize_media(uuid,uuid,text,text,text) to service_role;
