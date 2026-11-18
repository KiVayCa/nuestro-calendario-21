alter table public.android_push_devices
  add column display_name text check (display_name is null or length(trim(display_name)) between 1 and 60);

grant select(display_name), update(display_name) on public.android_push_devices to authenticated;
create policy android_push_owner_rename on public.android_push_devices for update to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());

create or replace function public.claim_android_push_device(p_code text, p_verifier text, p_state text, p_token text)
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
    on conflict(token) do update set
      display_name = case when android_push_devices.user_id=excluded.user_id
        then android_push_devices.display_name else null end,
      user_id=excluded.user_id,
      couple_id=excluded.couple_id,
      expires_at=excluded.expires_at;
  return true;
end $$;

