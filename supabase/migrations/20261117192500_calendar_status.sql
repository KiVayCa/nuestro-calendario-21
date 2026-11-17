alter table public.plans add column if not exists cancelled_occurrences date[] not null default '{}';
alter table public.plan_tasks add column if not exists due_date date;
create index if not exists plan_tasks_pending_due on public.plan_tasks(due_date)
where due_date is not null and assigned_to is not null and not completed;

create or replace function public.set_plan_cancelled(p_plan uuid, p_date date, p_cancelled boolean)
returns boolean language sql set search_path = '' as $$
  with changed as (
    update public.plans
      set cancelled_occurrences = case when p_cancelled
        then array_append(array_remove(cancelled_occurrences,p_date),p_date)
        else array_remove(cancelled_occurrences,p_date) end
    where id = p_plan and p_date is not null and p_date >= plan_date
      and (recurrence_enabled or p_date = plan_date)
      and (recurrence_end_date is null or p_date <= recurrence_end_date)
      and (not p_cancelled or not (p_date = any(skipped_occurrences || completed_occurrences)))
      and (recurrence_enabled or not completed)
    returning id
  )
  select exists(select 1 from changed);
$$;
revoke all on function public.set_plan_cancelled(uuid,date,boolean) from public, anon;
grant execute on function public.set_plan_cancelled(uuid,date,boolean) to authenticated;

create table if not exists public.goal_projection_history (
  id bigint generated always as identity primary key,
  goal_id uuid not null references public.goals(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  current_amount numeric not null,
  target_amount numeric,
  target_date date,
  captured_at timestamptz not null default now()
);
create index if not exists goal_projection_history_by_goal on public.goal_projection_history(goal_id, captured_at desc, id desc);
alter table public.goal_projection_history enable row level security;
create policy goal_projection_member on public.goal_projection_history for select to authenticated
  using (public.is_couple_member(couple_id));
revoke all on public.goal_projection_history from public, anon, authenticated;
grant select on public.goal_projection_history to authenticated;

create or replace function calendar_internal.capture_goal_projection()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.goal_projection_history(goal_id,couple_id,current_amount,target_amount,target_date)
  values(new.id,new.couple_id,coalesce(new.current_amount,0),new.target_amount,new.target_date);
  return new;
end;
$$;
revoke all on function calendar_internal.capture_goal_projection() from public, anon, authenticated;
create trigger goal_projection_on_create after insert on public.goals
for each row execute function calendar_internal.capture_goal_projection();
create trigger goal_projection_on_change after update of current_amount,target_amount,target_date on public.goals
for each row when ((old.current_amount,old.target_amount,old.target_date) is distinct from (new.current_amount,new.target_amount,new.target_date))
execute function calendar_internal.capture_goal_projection();
insert into public.goal_projection_history(goal_id,couple_id,current_amount,target_amount,target_date)
select id,couple_id,coalesce(current_amount,0),target_amount,target_date from public.goals;

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
    where ((n.event_type = 'plan_reminder' and n.reminder_key like 'plan:%'
      and exists (
        select 1 from public.plans p where p.id = n.target_id
          and case when p.recurrence_enabled then
            not exists (select 1 from unnest(p.skipped_occurrences || p.completed_occurrences || p.cancelled_occurrences) d
              where to_char(d, 'YYYY-MM-DD') = split_part(n.reminder_key, ':', 3))
          else not p.completed and p.plan_date <> all(p.cancelled_occurrences) and to_char(p.plan_date, 'YYYY-MM-DD') = split_part(n.reminder_key, ':', 3) end
      )
      ) or (n.event_type = 'task_reminder' and exists (
        select 1 from public.plan_tasks t join public.plans p on p.id = t.plan_id
        where p.id = n.target_id and p.couple_id = n.couple_id and not t.completed
          and t.assigned_to = n.recipient_user_id
          and n.reminder_key = 'task:' || t.id || ':' || t.occurrence_date || ':' || t.due_date
          and t.occurrence_date <> all(p.cancelled_occurrences || p.skipped_occurrences)
      )))
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
  where id = p_id and plan_push_claimed_at = p_lease and event_type in ('plan_reminder','task_reminder');
$$;
revoke all on function public.record_plan_reminder_push(uuid,timestamptz,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.record_plan_reminder_push(uuid,timestamptz,jsonb,boolean) to service_role;


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
      and c.day <> all(p.cancelled_occurrences)
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
  union all
  select p.couple_id, t.assigned_to, p.created_by, 'task_reminder', 'Tarea pendiente para hoy',
         t.title || ' · ' || p.title, 'calendar', p.id,
         'task:' || t.id || ':' || t.occurrence_date || ':' || t.due_date
  from public.plan_tasks t join public.plans p on p.id = t.plan_id
  join public.couple_members m on m.couple_id = p.couple_id and m.user_id = t.assigned_to
  where not t.completed and t.occurrence_date <> all(p.cancelled_occurrences || p.skipped_occurrences)
    and t.due_date = (run_at at time zone 'America/Bogota')::date
    and (run_at at time zone 'America/Bogota')::time >= time '08:00'
  on conflict (recipient_user_id, reminder_key) where reminder_key is not null do nothing;
$$;

create or replace function public.monthly_goal_progress(p_couple uuid, p_start date)
returns table(goal_id uuid, change numeric) language sql stable set search_path = '' as $$
  select m.goal_id, sum(m.amount) from public.goal_movements m
  where m.couple_id = p_couple and m.kind = 'movement'
    and m.created_at >= (p_start::timestamp at time zone 'America/Bogota')
    and m.created_at < ((p_start::timestamp + interval '1 month') at time zone 'America/Bogota')
  group by m.goal_id;
$$;
revoke all on function public.monthly_goal_progress(uuid,date) from public, anon;
grant execute on function public.monthly_goal_progress(uuid,date) to authenticated;
