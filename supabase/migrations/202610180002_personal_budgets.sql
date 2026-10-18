alter table public.shared_expenses
  add column if not exists entry_type text not null default 'expense'
    check (entry_type in ('income','expense')),
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict;

update public.shared_expenses
set owner_user_id = paid_by
where owner_user_id is null;

alter table public.shared_expenses
  alter column owner_user_id set not null;

create index if not exists shared_expenses_couple_owner_date_idx
  on public.shared_expenses (couple_id, owner_user_id, spent_on desc);

drop policy if exists "Members can add shared expenses" on public.shared_expenses;
create policy "Members can add own budget movements"
  on public.shared_expenses for insert to authenticated
  with check (
    public.is_couple_member(couple_id)
    and created_by = (select auth.uid())
    and paid_by = (select auth.uid())
    and owner_user_id = (select auth.uid())
  );

drop policy if exists "Members can update shared expenses" on public.shared_expenses;
create policy "Members can update own budget movements"
  on public.shared_expenses for update to authenticated
  using (public.is_couple_member(couple_id) and owner_user_id = (select auth.uid()))
  with check (public.is_couple_member(couple_id) and owner_user_id = (select auth.uid()));

drop policy if exists "Members can delete shared expenses" on public.shared_expenses;
create policy "Members can delete own budget movements"
  on public.shared_expenses for delete to authenticated
  using (public.is_couple_member(couple_id) and owner_user_id = (select auth.uid()));

grant select on public.shared_expenses to authenticated;
grant insert, update, delete on public.shared_expenses to authenticated;
