create table public.couple_wedding (
 id uuid primary key default gen_random_uuid(), couple_id uuid not null unique references public.couples(id) on delete cascade,
 created_by uuid not null references auth.users(id), wedding_date date, date_id uuid references public.important_dates(id) on delete set null,
 project_id uuid references public.couple_future_projects(id) on delete set null, honeymoon_project_id uuid references public.couple_future_projects(id) on delete set null,
 goal_id uuid references public.goals(id) on delete set null, budget numeric(14,2) not null default 0 check(budget>=0),
 created_at timestamptz not null default now()
);
create table public.couple_wedding_items (
 id uuid primary key default gen_random_uuid(),couple_id uuid not null references public.couples(id) on delete cascade,created_by uuid not null references auth.users(id),
 kind text not null check(kind in ('guest','vendor','budget','task','schedule','honeymoon','faith')),
 title text not null check(char_length(btrim(title)) between 1 and 120),category text not null default '' check(char_length(category)<=80),
 status text not null default 'pending' check(status in ('pending','confirmed','declined','quoted','booked','done')),
 note text not null default '' check(char_length(note)<=2000),amount numeric(14,2) not null default 0 check(amount>=0),
 party_size integer not null default 1 check(party_size between 1 and 100),
 assignee_id uuid references auth.users(id) on delete set null, target_date date,target_time time,plan_id uuid references public.plans(id) on delete set null,
 created_at timestamptz not null default now(),
 check(case kind when 'guest' then status in ('pending','confirmed','declined') when 'vendor' then status in ('pending','quoted','booked','declined') else status in ('pending','done') end),
 check(kind in ('budget','vendor','honeymoon') or amount=0),
 check(kind='guest' or party_size=1)
);
create index wedding_items_space on public.couple_wedding_items(couple_id,created_at desc);
alter table public.couple_wedding enable row level security;
alter table public.couple_wedding_items enable row level security;
revoke all on public.couple_wedding,public.couple_wedding_items from public,anon,authenticated;
grant select,delete on public.couple_wedding_items to authenticated;
grant select on public.couple_wedding to authenticated;
grant insert(couple_id,created_by,wedding_date,date_id,project_id,honeymoon_project_id,goal_id,budget) on public.couple_wedding to authenticated;
grant update(wedding_date,date_id,project_id,honeymoon_project_id,goal_id,budget) on public.couple_wedding to authenticated;
grant insert(couple_id,created_by,kind,title,category,status,note,amount,party_size,assignee_id,target_date,target_time,plan_id) on public.couple_wedding_items to authenticated;
grant update(title,category,status,note,amount,party_size,assignee_id,target_date,target_time,plan_id) on public.couple_wedding_items to authenticated;
create policy wedding_read on public.couple_wedding for select to authenticated using(public.is_couple_member(couple_id));
create policy wedding_insert on public.couple_wedding for insert to authenticated with check(created_by=(select auth.uid()) and public.is_couple_member(couple_id)
 and (date_id is null or exists(select 1 from public.important_dates d where d.id=date_id and d.couple_id=couple_wedding.couple_id))
 and (project_id is null or exists(select 1 from public.couple_future_projects p where p.id=project_id and p.couple_id=couple_wedding.couple_id and p.category='marriage'))
 and (honeymoon_project_id is null or exists(select 1 from public.couple_future_projects p where p.id=honeymoon_project_id and p.couple_id=couple_wedding.couple_id and p.category='travel'))
 and (goal_id is null or exists(select 1 from public.goals g where g.id=goal_id and g.couple_id=couple_wedding.couple_id)));
create policy wedding_update on public.couple_wedding for update to authenticated using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id)
 and (date_id is null or exists(select 1 from public.important_dates d where d.id=date_id and d.couple_id=couple_wedding.couple_id))
 and (project_id is null or exists(select 1 from public.couple_future_projects p where p.id=project_id and p.couple_id=couple_wedding.couple_id and p.category='marriage'))
 and (honeymoon_project_id is null or exists(select 1 from public.couple_future_projects p where p.id=honeymoon_project_id and p.couple_id=couple_wedding.couple_id and p.category='travel'))
 and (goal_id is null or exists(select 1 from public.goals g where g.id=goal_id and g.couple_id=couple_wedding.couple_id)));
create policy wedding_item_read on public.couple_wedding_items for select to authenticated using(public.is_couple_member(couple_id));
create policy wedding_item_insert on public.couple_wedding_items for insert to authenticated with check(created_by=(select auth.uid()) and public.is_couple_member(couple_id)
 and (assignee_id is null or exists(select 1 from public.couple_members m where m.user_id=assignee_id and m.couple_id=couple_wedding_items.couple_id))
 and (plan_id is null or exists(select 1 from public.plans p where p.id=plan_id and p.couple_id=couple_wedding_items.couple_id)));
create policy wedding_item_update on public.couple_wedding_items for update to authenticated using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id)
 and (assignee_id is null or exists(select 1 from public.couple_members m where m.user_id=assignee_id and m.couple_id=couple_wedding_items.couple_id))
 and (plan_id is null or exists(select 1 from public.plans p where p.id=plan_id and p.couple_id=couple_wedding_items.couple_id)));
create policy wedding_item_delete on public.couple_wedding_items for delete to authenticated using(public.is_couple_member(couple_id));
alter publication supabase_realtime add table public.couple_wedding,public.couple_wedding_items;
