alter table public.couple_settings add column if not exists countdown_date date;
alter table public.couple_settings add column if not exists countdown_title text check (length(countdown_title) <= 120);

create table if not exists public.plan_reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minutes integer not null check (minutes in (15, 60, 1440))
);
alter table public.plan_reminder_preferences enable row level security;
create policy own_plan_reminder_preference on public.plan_reminder_preferences to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.plan_reminder_preferences to authenticated;

create table if not exists public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  occurrence_date date not null,
  title text not null check (length(trim(title)) between 1 and 140),
  assigned_to uuid references auth.users(id) on delete set null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists plan_tasks_occurrence on public.plan_tasks(plan_id, occurrence_date, created_at);
alter table public.plan_tasks enable row level security;
create policy shared_plan_task on public.plan_tasks to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and public.is_couple_member(p.couple_id)))
  with check (exists (
    select 1 from public.plans p where p.id = plan_id and public.is_couple_member(p.couple_id)
      and (assigned_to is null or exists (
        select 1 from public.couple_members m where m.couple_id = p.couple_id and m.user_id = assigned_to
      ))
  ));
grant select, insert, update, delete on public.plan_tasks to authenticated;

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
