alter table public.plans add column if not exists skipped_occurrences date[] not null default '{}';
alter table public.notifications add column if not exists plan_push_done_at timestamptz;
alter table public.notifications add column if not exists plan_push_results jsonb not null default '{}';
-- Previously claimed notices may already have been delivered.
update public.notifications set plan_push_done_at = plan_push_claimed_at
where plan_push_claimed_at is not null and plan_push_done_at is null;

create or replace function public.claim_plan_reminder_push_v2(p_token text)
returns table(id uuid, couple_id uuid, recipient_user_id uuid, title text, body text, target_id uuid, reminder_key text, push_results jsonb, lease timestamptz)
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
      and exists (
        select 1 from public.plans p where p.id = n.target_id
          and case when p.recurrence_enabled then
            not exists (select 1 from unnest(p.skipped_occurrences || p.completed_occurrences) d
              where to_char(d, 'YYYY-MM-DD') = split_part(n.reminder_key, ':', 3))
          else not p.completed and to_char(p.plan_date, 'YYYY-MM-DD') = split_part(n.reminder_key, ':', 3) end
      )
      and n.plan_push_done_at is null
      and (n.plan_push_claimed_at is null or n.plan_push_claimed_at < now() - interval '2 minutes')
      and n.created_at >= now() - interval '20 minutes'
      and exists (select 1 from public.couple_members m where m.couple_id = n.couple_id and m.user_id = n.recipient_user_id)
    order by n.created_at limit 5 for update skip locked
  )
  update public.notifications n set plan_push_claimed_at = now()
  from pending where n.id = pending.id
  returning n.id, n.couple_id, n.recipient_user_id, n.title, n.body, n.target_id, n.reminder_key, n.plan_push_results, n.plan_push_claimed_at;
end;
$$;
revoke all on function public.claim_plan_reminder_push_v2(text) from public, anon, authenticated;
grant execute on function public.claim_plan_reminder_push_v2(text) to service_role;


create or replace function public.record_plan_reminder_push(p_id uuid, p_lease timestamptz, p_results jsonb, p_done boolean)
returns void language sql set search_path = '' as $$
  update public.notifications
  set plan_push_results = plan_push_results || p_results,
      plan_push_done_at = case when p_done then now() else null end
  where id = p_id and plan_push_claimed_at = p_lease and event_type = 'plan_reminder';
$$;
revoke all on function public.record_plan_reminder_push(uuid,timestamptz,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.record_plan_reminder_push(uuid,timestamptz,jsonb,boolean) to service_role;

alter table public.plan_tasks add column if not exists completed_by uuid references auth.users(id) on delete set null;
alter table public.plan_tasks add column if not exists completed_at timestamptz;
create or replace function calendar_internal.stamp_plan_task_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.completed = old.completed then
    new.completed_by := old.completed_by;
    new.completed_at := old.completed_at;
  elsif new.completed then
    new.completed_by := auth.uid();
    new.completed_at := now();
  else
    new.completed_by := null;
    new.completed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists stamp_plan_task_completion on public.plan_tasks;
create trigger stamp_plan_task_completion before insert or update on public.plan_tasks
for each row execute function calendar_internal.stamp_plan_task_completion();

alter table public.couple_settings add column if not exists countdown_source text
  check (countdown_source is null or countdown_source in ('plan','date'));
alter table public.couple_settings add column if not exists countdown_source_id uuid;

-- Allow both members to add photos and notes to the same outing.
create index if not exists memories_by_plan_occurrence
  on public.memories(couple_id, source_plan_id, source_occurrence_date)
  where source_plan_id is not null;
drop index if exists public.memory_per_plan_occurrence;



create or replace function public.reschedule_plan_occurrence(
  p_plan uuid, p_date date, p_new_date date, p_new_time time
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare original public.plans%rowtype; replacement uuid;
begin
  select * into original from public.plans where id = p_plan for update;
  if not found or p_date is null or p_new_date is null or not original.recurrence_enabled or p_date < original.plan_date
    or p_date = any(original.skipped_occurrences) or p_date = any(original.completed_occurrences)
    or (original.recurrence_end_date is not null and p_date > original.recurrence_end_date)
    or p_new_date < (now() at time zone 'America/Bogota')::date then
    raise exception 'No se puede mover esta fecha';
  end if;
  insert into public.plans(couple_id, created_by, title, category, location, place_id, note, budget, plan_date, plan_time, completed, recurrence_enabled, recurrence_type, recurrence_interval)
  values(original.couple_id, auth.uid(), original.title, original.category, original.location, original.place_id,
    original.note, original.budget, p_new_date, p_new_time, false, false, 'none', 1)
  returning id into replacement;
  update public.plans set skipped_occurrences = array_append(skipped_occurrences, p_date) where id = p_plan;
  update public.plan_tasks set plan_id = replacement, occurrence_date = p_new_date where plan_id = p_plan and occurrence_date = p_date;
  update public.memories set source_plan_id = replacement, source_occurrence_date = p_new_date
    where source_plan_id = p_plan and source_occurrence_date = p_date;
  update public.couple_settings set countdown_source_id = replacement, countdown_date = p_new_date
    where couple_id = original.couple_id and countdown_source = 'plan'
      and countdown_source_id = p_plan and countdown_date = p_date;
  return replacement;
end;
$$;
revoke all on function public.reschedule_plan_occurrence(uuid,date,date,time) from public, anon;
grant execute on function public.reschedule_plan_occurrence(uuid,date,date,time) to authenticated;

create or replace function calendar_internal.deliver_reminders(run_at timestamptz default now())
returns void language sql set search_path = '' as $$
  with clock as (
    select local_now::date + offset_day as day, local_now
    from (select run_at at time zone 'America/Bogota' as local_now) clock
    cross join (values (0), (1)) offsets(offset_day)
  ), occurrences as (
    select p.*, c.day, c.local_now, greatest(1, coalesce(p.recurrence_interval, 1)) as gap,
           (extract(year from c.day) - extract(year from p.plan_date))::integer * 12
             + (extract(month from c.day) - extract(month from p.plan_date))::integer as months
    from public.plans p cross join clock c
    where case when p.recurrence_enabled then not (c.day = any(p.completed_occurrences)) and not (c.day = any(p.skipped_occurrences)) else not coalesce(p.completed, false) end
      and p.plan_date <= c.day
      and (p.plan_date = c.day or (p.recurrence_enabled and (p.recurrence_end_date is null or p.recurrence_end_date >= c.day)))
  ), due_plans as (
    select p.*,
           case when p.plan_time is null then 'day' else 'time' end as reminder_kind
    from occurrences p
    where (
      (not coalesce(p.recurrence_enabled, false) or p.recurrence_type is null or p.recurrence_type = 'none')
        and p.day = p.plan_date
      or p.recurrence_enabled and case p.recurrence_type
        when 'daily' then (p.day - p.plan_date) % p.gap = 0
        when 'weekly' then ((p.day - p.plan_date) / 7) % p.gap = 0
          and extract(isodow from p.day)::integer = any(
            case when cardinality(p.recurrence_days) > 0 then p.recurrence_days
              else array[extract(isodow from p.plan_date)::integer] end)
        when 'monthly' then p.months % p.gap = 0 and extract(day from p.day) = least(
          extract(day from p.plan_date),
          extract(day from (date_trunc('month', p.day::timestamp) + interval '1 month - 1 day')))
        when 'yearly' then p.months % (12::bigint * p.gap) = 0
          and extract(day from p.day) = extract(day from p.plan_date)
        else false end
    )
  ), recipient_plans as (
    select p.*, m.user_id, coalesce(pref.minutes, 15) as lead_minutes
    from due_plans p
    join public.couple_members m on m.couple_id = p.couple_id
    left join public.plan_reminder_preferences pref on pref.user_id = m.user_id
  )
  insert into public.notifications(couple_id, recipient_user_id, actor_user_id, event_type, title, body, target_tab, target_id, reminder_key)
  select p.couple_id, p.user_id, p.created_by, 'plan_reminder',
         case when p.day > p.local_now::date then 'Mañana tienen un plan 🗓️' else 'Hoy tienen un plan 🗓️' end,
         p.title || ' · ' || to_char(p.day, 'DD/MM/YYYY')
           || case when p.plan_time is null then '' else ' a las ' || to_char(p.plan_time, 'HH24:MI') end,
         'calendar', p.id, 'plan:' || p.id || ':' || p.day || ':' || coalesce(p.plan_time::text, p.reminder_kind)
  from recipient_plans p
  where p.local_now >= case when p.plan_time is null then
    p.day + time '08:00' - case when p.lead_minutes = 1440 then interval '1 day' else interval '0' end
    else p.day + p.plan_time - make_interval(mins => p.lead_minutes) end
  and case when p.plan_time is null then p.local_now < p.day + interval '1 day'
    else p.local_now <= p.day + p.plan_time end
  union all
  select l.couple_id, m.user_id, l.created_by, 'letter_unlocked', 'Una carta ya está disponible 💌',
         'Ya puedes leer «' || l.title || '».', 'letters', l.id, 'letter:' || l.id || ':' || extract(epoch from l.unlock_at)
  from public.love_letters l join public.couple_members m
    on m.couple_id = l.couple_id and m.user_id <> l.created_by
  where l.notify_on_unlock and l.unlock_at <= run_at
    and l.unlock_at > run_at - interval '1 day'
    and (l.recipient_user_id is null or l.recipient_user_id = m.user_id)
  on conflict (recipient_user_id, reminder_key) where reminder_key is not null do nothing;
$$;
