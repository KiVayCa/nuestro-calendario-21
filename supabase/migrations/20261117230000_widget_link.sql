-- Read-only widget capabilities: no password or Supabase refresh token is exported from the web.
create table public.widget_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  last_seen_at timestamptz
);
alter table public.widget_devices enable row level security;
revoke all on public.widget_devices from public, anon, authenticated;
grant select(id,user_id,couple_id,created_at,expires_at,last_seen_at), delete on public.widget_devices to authenticated;
create policy widget_device_owner_read on public.widget_devices for select to authenticated using (user_id=auth.uid());
create policy widget_device_owner_delete on public.widget_devices for delete to authenticated using (user_id=auth.uid());
create index widget_device_owner_idx on public.widget_devices(user_id);

create table calendar_internal.widget_pair_codes (
  code_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  challenge text not null,
  state text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '90 seconds'
);
revoke all on calendar_internal.widget_pair_codes from public, anon, authenticated;

create function public.create_widget_pair_code(p_couple_id uuid,p_challenge text,p_state text)
returns text language plpgsql security definer set search_path='' as $$
declare code text;
begin
  if auth.uid() is null or p_challenge is null or p_state is null or p_challenge !~ '^[a-f0-9]{64}$' or p_state !~ '^[a-f0-9]{32}$'
    or not exists(select 1 from public.couple_members where couple_id=p_couple_id and user_id=auth.uid()) then
    raise exception 'Invalid widget link' using errcode='42501';
  end if;
  delete from calendar_internal.widget_pair_codes where expires_at<now();
  if (select count(*) from calendar_internal.widget_pair_codes where user_id=auth.uid() and created_at>now()-interval '2 minutes') >= 5 then
    raise exception 'Wait before linking another widget device';
  end if;
  code=encode(extensions.gen_random_bytes(32),'hex');
  insert into calendar_internal.widget_pair_codes(code_hash,user_id,couple_id,challenge,state)
    values(encode(extensions.digest(code,'sha256'),'hex'),auth.uid(),p_couple_id,p_challenge,p_state);
  return code;
end $$;

create function public.claim_widget_device(p_code text,p_verifier text,p_state text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare link calendar_internal.widget_pair_codes; secret text; device public.widget_devices;
begin
  if p_code is null or p_verifier is null or p_state is null or p_code !~ '^[a-f0-9]{64}$' or p_verifier !~ '^[a-f0-9]{64}$' or p_state !~ '^[a-f0-9]{32}$' then return null; end if;
  select * into link from calendar_internal.widget_pair_codes where code_hash=encode(extensions.digest(p_code,'sha256'),'hex') for update;
  if not found or link.expires_at<now() or link.state<>p_state or link.challenge<>encode(extensions.digest(p_verifier,'sha256'),'hex')
    or not exists(select 1 from public.couple_members where user_id=link.user_id and couple_id=link.couple_id) then return null; end if;
  if (select count(*) from public.widget_devices where user_id=link.user_id and expires_at>now()) >= 10 then return null; end if;
  delete from calendar_internal.widget_pair_codes where code_hash=link.code_hash;
  secret=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.widget_devices(user_id,couple_id,token_hash) values(link.user_id,link.couple_id,encode(extensions.digest(secret,'sha256'),'hex')) returning * into device;
  return jsonb_build_object('kind','device','device_token',secret,'device_id',device.id,'expires_at',device.expires_at);
end $$;

create function public.read_widget_snapshot(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare device public.widget_devices; result jsonb;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
  select * into device from public.widget_devices where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
  if not found or not exists(select 1 from public.couple_members where user_id=device.user_id and couple_id=device.couple_id) then return null; end if;
  select jsonb_build_object(
    'plans',coalesce((select jsonb_agg(to_jsonb(p) order by p.plan_date,p.id) from (
      select id,title,plan_date,plan_time,completed,recurrence_enabled,recurrence_type,recurrence_interval,recurrence_days,recurrence_end_date,completed_occurrences,skipped_occurrences,cancelled_occurrences
      from public.plans where couple_id=device.couple_id) p),'[]'::jsonb),
    'settings',coalesce((select jsonb_agg(to_jsonb(s)) from (
      select theme,accent_color,background_color,countdown_date,countdown_title,countdown_source,countdown_source_id
      from public.couple_settings where couple_id=device.couple_id) s),'[]'::jsonb),
    'dates',coalesce((select jsonb_agg(to_jsonb(d) order by d.event_date,d.id) from (
      select id,title,event_date,recurring,recurrence_type,recurrence_interval from public.important_dates where couple_id=device.couple_id) d),'[]'::jsonb)
  ) into result;
  update public.widget_devices set last_seen_at=now() where id=device.id and (last_seen_at is null or last_seen_at<now()-interval '10 minutes');
  return result;
end $$;

create function public.revoke_widget_device(p_token text)
returns void language sql security definer set search_path='' as $$
  delete from public.widget_devices where p_token ~ '^[a-f0-9]{64}$' and token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
$$;
revoke all on function public.create_widget_pair_code(uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_widget_pair_code(uuid,text,text) to authenticated;
revoke all on function public.claim_widget_device(text,text,text) from public,anon,authenticated;
grant execute on function public.claim_widget_device(text,text,text) to anon,authenticated;
revoke all on function public.read_widget_snapshot(text) from public,anon,authenticated;
grant execute on function public.read_widget_snapshot(text) to anon,authenticated;
revoke all on function public.revoke_widget_device(text) from public,anon,authenticated;
grant execute on function public.revoke_widget_device(text) to anon,authenticated;
