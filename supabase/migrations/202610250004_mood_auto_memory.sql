-- Keep all conversation turns; maintain a compact, automatically edited long-term memory.
alter table public.mood_talk_memory drop constraint mood_talk_memory_content_check;
alter table public.mood_talk_memory add constraint mood_talk_memory_content_check check(length(content)<=1800);
alter table public.mood_talk_memory add column version integer not null default 0;
create table public.mood_talk_turns (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,
 version integer not null,
 moods jsonb not null,
 custom_mood text not null default '',
 message text not null default '',
 tone text not null default '',
 reply text not null,
 created_at timestamptz not null default now(),
 unique(session_id,version)
);
create index mood_talk_turns_recent on public.mood_talk_turns(user_id,created_at desc);
alter table public.mood_talk_turns enable row level security;
revoke all on public.mood_talk_turns from public,anon,authenticated;
grant all on public.mood_talk_turns to service_role;
create function public.mood_talk_commit(p_user uuid,p_id uuid,p_expected integer,p_moods jsonb,p_custom text,p_quote text,p_choices jsonb,p_messages jsonb,p_user_text text,p_tone text,p_memory text,p_memory_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result mood_talk_sessions;
begin
 if length(p_memory)>1800 or length(p_user_text)>160 or length(p_quote)>150 then raise exception 'INVALID_INPUT';end if;
 if p_expected=0 then
  insert into mood_talk_sessions(id,user_id,moods,custom_mood,quote,choices,messages,last_user_text)
  values(p_id,p_user,p_moods,p_custom,p_quote,p_choices,p_messages,p_user_text) returning * into result;
 else
  update mood_talk_sessions set quote=p_quote,choices=p_choices,messages=p_messages,last_user_text=p_user_text,version=version+1
  where id=p_id and user_id=p_user and version=p_expected and expires_at>now() returning * into result;
  if not found then raise exception 'MOOD_TALK_CHANGED';end if;
 end if;
 insert into mood_talk_turns(user_id,session_id,version,moods,custom_mood,message,tone,reply)
 values(p_user,p_id,result.version,p_moods,p_custom,p_user_text,p_tone,p_quote);
 insert into mood_talk_memory(user_id,content,version) values(p_user,p_memory,1)
 on conflict(user_id) do update set content=excluded.content,updated_at=now(),version=mood_talk_memory.version+1
 where mood_talk_memory.version=p_memory_version;
 return to_jsonb(result);
end;$$;
revoke all on function public.mood_talk_commit(uuid,uuid,integer,jsonb,text,text,jsonb,jsonb,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.mood_talk_commit(uuid,uuid,integer,jsonb,text,text,jsonb,jsonb,text,text,text,integer) to service_role;
