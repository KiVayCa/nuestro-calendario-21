alter table public.plans add column if not exists completed_occurrences date[] not null default '{}';

-- Preserve the original date for series previously marked complete.
update public.plans
set completed_occurrences = array[plan_date], completed = false
where recurrence_enabled and completed and plan_date is not null and cardinality(completed_occurrences) = 0;

create or replace function public.set_plan_occurrence_completed(p_plan uuid, p_date date, p_completed boolean)
returns boolean language sql security invoker set search_path = '' as $$
  with changed as (
    update public.plans
    set completed_occurrences = case when p_completed
      then array_append(array_remove(completed_occurrences, p_date), p_date)
      else array_remove(completed_occurrences, p_date) end
    where id = p_plan and recurrence_enabled and p_date >= plan_date
      and (recurrence_end_date is null or p_date <= recurrence_end_date)
    returning id
  )
  select exists(select 1 from changed);
$$;
revoke execute on function public.set_plan_occurrence_completed(uuid,date,boolean) from public, anon;
grant execute on function public.set_plan_occurrence_completed(uuid,date,boolean) to authenticated;

create or replace function calendar_internal.deliver_reminders(run_at timestamptz default now())
returns void language sql set search_path = '' as $$
  with clock as (
    select (run_at at time zone 'America/Bogota')::date as day,
           (run_at at time zone 'America/Bogota')::time as hour
  ), occurrences as (
    select p.*, c.day, c.hour, greatest(1, coalesce(p.recurrence_interval, 1)) as gap,
           (extract(year from c.day) - extract(year from p.plan_date))::integer * 12
             + (extract(month from c.day) - extract(month from p.plan_date))::integer as months
    from public.plans p cross join clock c
    where case when p.recurrence_enabled then not (c.day = any(p.completed_occurrences)) else not coalesce(p.completed, false) end
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
    ) and (
      (p.plan_time is null and p.hour >= time '08:00')
      or p.hour >= greatest(interval '0 seconds', p.plan_time - time '00:00' - interval '15 minutes') + time '00:00'
         and p.hour <= p.plan_time
    )
  )
  insert into public.notifications(couple_id, recipient_user_id, actor_user_id, event_type, title, body, target_tab, target_id, reminder_key)
  select p.couple_id, m.user_id, p.created_by, 'plan_reminder', 'Hoy tienen un plan 🗓️',
         case when p.plan_time is null then 'Hoy tienen ' else 'Hoy a las ' || to_char(p.plan_time, 'HH24:MI') || ' tienen ' end || p.title,
         'calendar', p.id, 'plan:' || p.id || ':' || p.day || ':' || coalesce(p.plan_time::text, p.reminder_kind)
  from due_plans p join public.couple_members m on m.couple_id = p.couple_id
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
