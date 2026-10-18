-- Add shared notification center, couple budget tracking and daily questions.
-- Additive migration: existing tables and records are not modified or deleted.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text,
  target_tab text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);
create index if not exists notifications_couple_created_idx
  on public.notifications (couple_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "Recipients can read their own notifications" on public.notifications;
create policy "Recipients can read their own notifications"
  on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()) and public.is_couple_member(couple_id));
drop policy if exists "Recipients can mark their own notifications read" on public.notifications;
create policy "Recipients can mark their own notifications read"
  on public.notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()) and public.is_couple_member(couple_id))
  with check (recipient_user_id = (select auth.uid()) and public.is_couple_member(couple_id));
drop policy if exists "Recipients can delete their own notifications" on public.notifications;
create policy "Recipients can delete their own notifications"
  on public.notifications for delete to authenticated
  using (recipient_user_id = (select auth.uid()) and public.is_couple_member(couple_id));
grant select, update, delete on public.notifications to authenticated;

create table if not exists public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  paid_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'otros',
  spent_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_expenses_couple_date_idx
  on public.shared_expenses (couple_id, spent_on desc);
alter table public.shared_expenses enable row level security;
drop policy if exists "Couples can read shared expenses" on public.shared_expenses;
create policy "Couples can read shared expenses"
  on public.shared_expenses for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists "Members can add shared expenses" on public.shared_expenses;
create policy "Members can add shared expenses"
  on public.shared_expenses for insert to authenticated
  with check (public.is_couple_member(couple_id) and created_by = (select auth.uid()) and paid_by = (select auth.uid()));
drop policy if exists "Members can update shared expenses" on public.shared_expenses;
create policy "Members can update shared expenses"
  on public.shared_expenses for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
drop policy if exists "Members can delete shared expenses" on public.shared_expenses;
create policy "Members can delete shared expenses"
  on public.shared_expenses for delete to authenticated
  using (public.is_couple_member(couple_id));
grant select, insert, update, delete on public.shared_expenses to authenticated;

create table if not exists public.daily_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_date date not null default current_date,
  question_text text not null,
  answer text not null check (length(trim(answer)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, user_id, question_date)
);
create index if not exists daily_answers_couple_date_idx
  on public.daily_answers (couple_id, question_date desc);
alter table public.daily_answers enable row level security;
drop policy if exists "Couples can read daily answers" on public.daily_answers;
create policy "Couples can read daily answers"
  on public.daily_answers for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists "Members can add their own daily answers" on public.daily_answers;
create policy "Members can add their own daily answers"
  on public.daily_answers for insert to authenticated
  with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));
drop policy if exists "Members can update their own daily answers" on public.daily_answers;
create policy "Members can update their own daily answers"
  on public.daily_answers for update to authenticated
  using (public.is_couple_member(couple_id) and user_id = (select auth.uid()))
  with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));
drop policy if exists "Members can delete their own daily answers" on public.daily_answers;
create policy "Members can delete their own daily answers"
  on public.daily_answers for delete to authenticated
  using (public.is_couple_member(couple_id) and user_id = (select auth.uid()));
grant select, insert, update, delete on public.daily_answers to authenticated;

create or replace function public.create_couple_activity_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_couple_id uuid;
  v_actor_id uuid;
  v_target_id uuid;
  v_title text;
begin
  v_couple_id := nullif(v_row->>'couple_id', '')::uuid;
  v_actor_id := coalesce(
    nullif(v_row->>'created_by', '')::uuid,
    nullif(v_row->>'updated_by', '')::uuid,
    auth.uid()
  );
  v_target_id := nullif(v_row->>'id', '')::uuid;
  v_title := coalesce(nullif(v_row->>'title', ''), nullif(v_row->>'name', ''), TG_ARGV[1]);
  if v_couple_id is null or v_actor_id is null then
    return new;
  end if;

  insert into public.notifications
    (couple_id, recipient_user_id, actor_user_id, event_type, title, body, target_tab, target_id)
  select
    v_couple_id,
    member.user_id,
    v_actor_id,
    TG_ARGV[0],
    TG_ARGV[1] || ': ' || v_title,
    'Tu pareja agregó algo nuevo a su espacio compartido. ❤️',
    TG_ARGV[2],
    v_target_id
  from public.couple_members member
  where member.couple_id = v_couple_id
    and member.user_id <> v_actor_id;

  return new;
end;
$$;
revoke all on function public.create_couple_activity_notification() from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('plans','plan_created','Nuevo plan','calendar'),
      ('memories','memory_created','Nuevo recuerdo','memories'),
      ('love_letters','letter_created','Nueva carta','letters'),
      ('dreams','dream_created','Nuevo sueño','dreams'),
      ('challenges','challenge_created','Nuevo reto','challenges'),
      ('important_dates','important_date_created','Nueva fecha importante','dates'),
      ('goals','goal_created','Nueva meta','goals'),
      ('places','place_created','Nuevo lugar','places'),
      ('activity_ideas','idea_created','Nueva idea','ideas'),
      ('shared_expenses','expense_created','Nuevo gasto compartido','budget')
    ) as x(table_name,event_type,label,target_tab)
  loop
    execute format('drop trigger if exists notify_couple_activity on public.%I', t.table_name);
    execute format(
      'create trigger notify_couple_activity after insert on public.%I for each row execute function public.create_couple_activity_notification(%L,%L,%L)',
      t.table_name, t.event_type, t.label, t.target_tab
    );
  end loop;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_expenses') then
    alter publication supabase_realtime add table public.shared_expenses;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='daily_answers') then
    alter publication supabase_realtime add table public.daily_answers;
  end if;
end;
$$;
