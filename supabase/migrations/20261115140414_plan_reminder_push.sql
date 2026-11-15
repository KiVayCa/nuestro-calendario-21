create extension if not exists pg_net;

select vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'plan_reminder_worker_token')
where not exists (select 1 from vault.secrets where name = 'plan_reminder_worker_token');

alter table public.notifications add column if not exists plan_push_claimed_at timestamptz;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.claim_plan_reminder_push(p_token text)
returns table(id uuid, couple_id uuid, recipient_user_id uuid, title text, body text, target_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'plan_reminder_worker_token' and decrypted_secret = p_token
  ) then
    raise insufficient_privilege using message = 'Invalid reminder worker token';
  end if;
  return query
  with pending as (
    select n.id from public.notifications n
    where n.event_type = 'plan_reminder' and n.reminder_key like 'plan:%'
      and n.plan_push_claimed_at is null
      and n.created_at >= now() - interval '5 minutes'
      and exists (select 1 from public.couple_members m where m.couple_id = n.couple_id and m.user_id = n.recipient_user_id)
    order by n.created_at limit 20 for update skip locked
  )
  update public.notifications n set plan_push_claimed_at = now()
  from pending where n.id = pending.id
  returning n.id, n.couple_id, n.recipient_user_id, n.title, n.body, n.target_id;
end;
$$;
revoke all on function public.claim_plan_reminder_push(text) from public, anon, authenticated;
grant execute on function public.claim_plan_reminder_push(text) to service_role;

create or replace function calendar_internal.schedule_plan_reminder_push(p_project_url text)
returns bigint language sql set search_path = '' as $$
  select cron.schedule('calendar-plan-push', '* * * * *', format(
    'select net.http_post(url := %L, headers := jsonb_build_object(''x-reminder-token'', decrypted_secret), timeout_milliseconds := 120000) from vault.decrypted_secrets where name = ''plan_reminder_worker_token''',
    rtrim(p_project_url, '/') || '/functions/v1/send-plan-reminders'
  ));
$$;
revoke all on function calendar_internal.schedule_plan_reminder_push(text) from public, anon, authenticated;
