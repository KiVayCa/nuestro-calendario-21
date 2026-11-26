alter table public.couple_settings
  add column home_title text check(home_title is null or char_length(btrim(home_title)) between 1 and 100),
  add column home_subtitle text check(home_subtitle is null or char_length(btrim(home_subtitle)) between 1 and 240);

create table public.couple_personalization (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_order text[] not null default '{}' check(cardinality(module_order)<=25),
  hidden_modules text[] not null default '{}' check(cardinality(hidden_modules)<=25),
  shortcuts text[] not null default '{}' check(cardinality(shortcuts)<=6),
  home_sections text[] not null default array['stats','next','recap','countdown','week','question','summary'] check(cardinality(home_sections)<=7),
  density text not null default 'comfortable' check(density in ('comfortable','compact')),
  text_size text not null default 'normal' check(text_size in ('normal','large')),
  motion text not null default 'system' check(motion in ('system','reduced')),
  created_at timestamptz not null default now(),
  unique(couple_id,user_id)
);
alter table public.couple_personalization enable row level security;
revoke all on public.couple_personalization from public,anon,authenticated;
grant select on public.couple_personalization to authenticated;
grant insert(couple_id,user_id,module_order,hidden_modules,shortcuts,home_sections,density,text_size,motion) on public.couple_personalization to authenticated;
grant update(couple_id,user_id,module_order,hidden_modules,shortcuts,home_sections,density,text_size,motion) on public.couple_personalization to authenticated;
create policy personalization_read on public.couple_personalization for select to authenticated using(user_id=(select auth.uid()) and public.is_couple_member(couple_id));
create policy personalization_insert on public.couple_personalization for insert to authenticated with check(user_id=(select auth.uid()) and public.is_couple_member(couple_id));
create policy personalization_update on public.couple_personalization for update to authenticated using(user_id=(select auth.uid()) and public.is_couple_member(couple_id)) with check(user_id=(select auth.uid()) and public.is_couple_member(couple_id));
alter publication supabase_realtime add table public.couple_personalization;
