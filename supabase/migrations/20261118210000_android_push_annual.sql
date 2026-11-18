alter table public.android_push_devices
  alter column expires_at set default (now() + interval '1 year'),
  add column expiry_notice_for timestamptz;

-- Extend active links from their last registration date.
update public.android_push_devices
set expires_at = expires_at - interval '90 days' + interval '1 year'
where expires_at > now();

create function public.android_push_expiring_devices()
returns table(token text, expires_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select d.token, d.expires_at
  from public.android_push_devices d
  where d.expires_at > now() and d.expires_at <= now() + interval '7 days'
    and d.expiry_notice_for is distinct from d.expires_at
    and exists (
      select 1 from public.couple_members m
      where m.user_id=d.user_id and m.couple_id=d.couple_id
    )
  order by d.expires_at limit 100;
$$;

revoke all on function public.android_push_expiring_devices() from public, anon, authenticated;
grant execute on function public.android_push_expiring_devices() to service_role;
