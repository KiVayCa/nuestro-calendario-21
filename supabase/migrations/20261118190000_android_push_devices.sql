create table public.android_push_devices (
  id uuid not null default gen_random_uuid() unique,
  token text primary key check (length(token) between 20 and 4096),
  expires_at timestamptz not null default now() + interval '90 days',
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade
);

create index android_push_devices_recipient
  on public.android_push_devices (couple_id, user_id);

alter table public.android_push_devices enable row level security;
revoke all on public.android_push_devices from public, anon, authenticated;
grant select, insert, update, delete on public.android_push_devices to service_role;

create table calendar_internal.android_push_pair_codes (
  code_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  challenge text not null,
  state text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '90 seconds'
);
revoke all on calendar_internal.android_push_pair_codes from public, anon, authenticated;

create function public.create_android_push_pair_code(p_couple_id uuid,p_challenge text,p_state text)
returns text language plpgsql security definer set search_path='' as $$
declare code text;
begin
  if auth.uid() is null or p_challenge is null or p_state is null or p_challenge !~ '^[a-f0-9]{64}$' or p_state !~ '^[a-f0-9]{32}$'
    or not exists(select 1 from public.couple_members where couple_id=p_couple_id and user_id=auth.uid()) then
    raise exception 'Invalid notification link' using errcode='42501';
  end if;
  delete from calendar_internal.android_push_pair_codes where expires_at<now();
  if (select count(*) from calendar_internal.android_push_pair_codes where user_id=auth.uid() and created_at>now()-interval '2 minutes') >= 5 then
    raise exception 'Wait before linking another phone';
  end if;
  code=encode(extensions.gen_random_bytes(32),'hex');
  insert into calendar_internal.android_push_pair_codes(code_hash,user_id,couple_id,challenge,state)
    values(encode(extensions.digest(code,'sha256'),'hex'),auth.uid(),p_couple_id,p_challenge,p_state);
  return code;
end $$;

create function public.claim_android_push_device(p_code text, p_verifier text, p_state text, p_token text)
returns boolean language plpgsql security definer set search_path='' as $$
declare link calendar_internal.android_push_pair_codes;
begin
  if p_code is null or p_code !~ '^[a-f0-9]{64}$'
    or p_verifier is null or p_verifier !~ '^[a-f0-9]{64}$'
    or p_state is null or p_state !~ '^[a-f0-9]{32}$'
    or p_token is null or length(p_token) not between 20 and 4096 then return false; end if;
  delete from calendar_internal.android_push_pair_codes
    where code_hash=encode(extensions.digest(p_code,'sha256'),'hex')
      and expires_at>now() and state=p_state
      and challenge=encode(extensions.digest(p_verifier,'sha256'),'hex')
    returning * into link;
  if not found or not exists (
    select 1 from public.couple_members where user_id=link.user_id and couple_id=link.couple_id
  ) then return false; end if;
  insert into public.android_push_devices(token,user_id,couple_id)
    values(p_token,link.user_id,link.couple_id)
    on conflict(token) do update set user_id=excluded.user_id,couple_id=excluded.couple_id,expires_at=excluded.expires_at;
  return true;
end $$;

revoke all on function public.create_android_push_pair_code(uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_android_push_pair_code(uuid,text,text) to authenticated;
revoke all on function public.claim_android_push_device(text,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_android_push_device(text,text,text,text) to anon;

grant select(id,user_id,expires_at), delete on public.android_push_devices to authenticated;
create policy android_push_owner_read on public.android_push_devices for select to authenticated
  using (user_id=auth.uid());
create policy android_push_owner_delete on public.android_push_devices for delete to authenticated
  using (user_id=auth.uid());
