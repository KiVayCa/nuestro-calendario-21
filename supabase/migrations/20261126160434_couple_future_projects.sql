create table public.couple_future_projects (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 1 and 120),
  description text not null default '' check(char_length(description)<=2000),
  category text not null check(category in ('marriage','home','travel','family','faith','personal','other')),
  status text not null default 'planned' check(status in ('planned','active','paused','done')),
  target_date date,
  goal_id uuid references public.goals(id) on delete set null,
  dream_id uuid references public.dreams(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(id,couple_id)
);
create table public.couple_future_steps (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  project_id uuid not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 1 and 120),
  target_date date,
  done boolean not null default false,
  plan_id uuid references public.plans(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key(project_id,couple_id) references public.couple_future_projects(id,couple_id) on delete cascade
);
create index future_projects_couple on public.couple_future_projects(couple_id,created_at desc,id);
create index future_projects_goal on public.couple_future_projects(goal_id);
create index future_projects_dream on public.couple_future_projects(dream_id);
create index future_steps_couple on public.couple_future_steps(couple_id,created_at desc,id);
create index future_steps_project on public.couple_future_steps(project_id,couple_id);
create index future_steps_plan on public.couple_future_steps(plan_id);
alter table public.couple_future_projects enable row level security;
alter table public.couple_future_steps enable row level security;
revoke all on public.couple_future_projects,public.couple_future_steps from public,anon,authenticated;
grant select,delete on public.couple_future_projects,public.couple_future_steps to authenticated;
grant insert(couple_id,created_by,title,description,category,status,target_date,goal_id,dream_id) on public.couple_future_projects to authenticated;
grant update(title,description,category,status,target_date,goal_id,dream_id) on public.couple_future_projects to authenticated;
grant insert(couple_id,project_id,created_by,title,target_date,plan_id) on public.couple_future_steps to authenticated;
grant update(title,target_date,done,plan_id) on public.couple_future_steps to authenticated;
create policy future_project_read on public.couple_future_projects for select to authenticated using(public.is_couple_member(couple_id));
create policy future_project_add on public.couple_future_projects for insert to authenticated with check(
  created_by=(select auth.uid()) and public.is_couple_member(couple_id)
  and (goal_id is null or exists(select 1 from public.goals g where g.id=goal_id and g.couple_id=couple_future_projects.couple_id))
  and (dream_id is null or exists(select 1 from public.dreams d where d.id=dream_id and d.couple_id=couple_future_projects.couple_id))
);
create policy future_project_edit on public.couple_future_projects for update to authenticated using(public.is_couple_member(couple_id)) with check(
  public.is_couple_member(couple_id)
  and (goal_id is null or exists(select 1 from public.goals g where g.id=goal_id and g.couple_id=couple_future_projects.couple_id))
  and (dream_id is null or exists(select 1 from public.dreams d where d.id=dream_id and d.couple_id=couple_future_projects.couple_id))
);
create policy future_project_delete on public.couple_future_projects for delete to authenticated using(public.is_couple_member(couple_id));
create policy future_step_read on public.couple_future_steps for select to authenticated using(public.is_couple_member(couple_id));
create policy future_step_add on public.couple_future_steps for insert to authenticated with check(
  created_by=(select auth.uid()) and public.is_couple_member(couple_id)
  and (plan_id is null or exists(select 1 from public.plans p where p.id=plan_id and p.couple_id=couple_future_steps.couple_id))
);
create policy future_step_edit on public.couple_future_steps for update to authenticated using(public.is_couple_member(couple_id)) with check(
  public.is_couple_member(couple_id)
  and (plan_id is null or exists(select 1 from public.plans p where p.id=plan_id and p.couple_id=couple_future_steps.couple_id))
);
create policy future_step_delete on public.couple_future_steps for delete to authenticated using(public.is_couple_member(couple_id));

-- Create a project and its optional suggested steps in a single transaction.
create function public.create_future_project(p_couple_id uuid,p_title text,p_description text,p_category text,p_status text,p_target_date date,p_goal_id uuid,p_dream_id uuid,p_steps text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare project uuid;
begin
  if coalesce(cardinality(p_steps),0)>20 then raise exception 'Demasiados pasos'; end if;
  insert into public.couple_future_projects(couple_id,created_by,title,description,category,status,target_date,goal_id,dream_id)
  values(p_couple_id,auth.uid(),p_title,coalesce(p_description,''),p_category,p_status,p_target_date,p_goal_id,p_dream_id) returning id into project;
  insert into public.couple_future_steps(couple_id,project_id,created_by,title)
  select p_couple_id,project,auth.uid(),t from unnest(coalesce(p_steps,array[]::text[])) as t;
  return project;
end $$;
revoke all on function public.create_future_project(uuid,text,text,text,text,date,uuid,uuid,text[]) from public,anon;
grant execute on function public.create_future_project(uuid,text,text,text,text,date,uuid,uuid,text[]) to authenticated;
alter publication supabase_realtime add table public.couple_future_projects,public.couple_future_steps;
