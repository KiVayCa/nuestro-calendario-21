create table if not exists public.budget_recurring_templates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('income','expense')),
  title text not null,
  amount numeric not null check (amount > 0),
  category text not null default 'otros',
  notes text,
  day_of_month integer not null default 1 check (day_of_month between 1 and 31),
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_recurring_templates_date_check check (end_date is null or end_date >= start_date)
);

alter table public.budget_recurring_templates enable row level security;
grant select, insert, update, delete on public.budget_recurring_templates to authenticated;

drop policy if exists "Couple members can read recurring budget templates" on public.budget_recurring_templates;
create policy "Couple members can read recurring budget templates"
  on public.budget_recurring_templates for select to authenticated
  using (public.is_couple_member(couple_id));

drop policy if exists "Members can create own recurring budget templates" on public.budget_recurring_templates;
create policy "Members can create own recurring budget templates"
  on public.budget_recurring_templates for insert to authenticated
  with check (
    public.is_couple_member(couple_id)
    and created_by = (select auth.uid())
    and owner_user_id = (select auth.uid())
  );

drop policy if exists "Members can update own recurring budget templates" on public.budget_recurring_templates;
create policy "Members can update own recurring budget templates"
  on public.budget_recurring_templates for update to authenticated
  using (public.is_couple_member(couple_id) and owner_user_id = (select auth.uid()))
  with check (public.is_couple_member(couple_id) and owner_user_id = (select auth.uid()));

drop policy if exists "Members can delete own recurring budget templates" on public.budget_recurring_templates;
create policy "Members can delete own recurring budget templates"
  on public.budget_recurring_templates for delete to authenticated
  using (public.is_couple_member(couple_id) and owner_user_id = (select auth.uid()));

alter table public.shared_expenses
  add column if not exists recurring_template_id uuid references public.budget_recurring_templates(id) on delete set null,
  add column if not exists recurrence_month date;

create unique index if not exists shared_expenses_recurring_month_unique_idx
  on public.shared_expenses (recurring_template_id, recurrence_month);
create index if not exists budget_recurring_templates_couple_owner_idx
  on public.budget_recurring_templates (couple_id, owner_user_id, active);

drop policy if exists "Members can notify their partner" on public.notifications;
create policy "Members can notify their partner"
  on public.notifications for insert to authenticated
  with check (
    public.is_couple_member(couple_id)
    and actor_user_id = (select auth.uid())
    and recipient_user_id <> (select auth.uid())
    and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = notifications.couple_id
        and cm.user_id = notifications.recipient_user_id
    )
  );
grant insert on public.notifications to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'budget_recurring_templates'
  ) then
    alter publication supabase_realtime add table public.budget_recurring_templates;
  end if;
end $$;
