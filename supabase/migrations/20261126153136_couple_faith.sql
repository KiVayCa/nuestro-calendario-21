create table public.couple_faith (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('prayer','gratitude','reflection','devotional','support')),
  title text not null default '',
  body text not null default '',
  answered boolean not null default false,
  parent_id uuid references public.couple_faith(id) on delete cascade,
  entry_date date not null default ((now() at time zone 'America/Bogota')::date),
  created_at timestamptz not null default now(),
  constraint faith_content check(
    (kind in ('prayer','gratitude','reflection') and parent_id is null and char_length(btrim(title)) between 1 and 120 and char_length(body)<=2000)
    or (kind='devotional' and parent_id is null and title='' and body='')
    or (kind='support' and parent_id is not null and title='' and body='')
  ),
  constraint faith_answered check(not answered or kind='prayer')
);
create index faith_couple_recent on public.couple_faith(couple_id,created_at desc,id);
create index faith_parent on public.couple_faith(parent_id);
create unique index faith_daily_devotional on public.couple_faith(couple_id,created_by,entry_date) where kind='devotional';
create unique index faith_daily_support on public.couple_faith(parent_id,created_by,entry_date) where kind='support';
alter table public.couple_faith enable row level security;
revoke all on public.couple_faith from public,anon,authenticated;
grant select on public.couple_faith to authenticated;
grant insert(couple_id,created_by,kind,title,body,parent_id) on public.couple_faith to authenticated;
grant update(title,body,answered) on public.couple_faith to authenticated;
grant delete on public.couple_faith to authenticated;
create policy faith_read on public.couple_faith for select to authenticated using(public.is_couple_member(couple_id));
create policy faith_create on public.couple_faith for insert to authenticated with check(
  created_by=(select auth.uid()) and public.is_couple_member(couple_id)
  and (kind<>'support' or exists(select 1 from public.couple_faith p where p.id=couple_faith.parent_id and p.couple_id=couple_faith.couple_id and p.kind='prayer' and not p.answered))
);
create policy faith_edit on public.couple_faith for update to authenticated using(public.is_couple_member(couple_id) and created_by=(select auth.uid()) and kind in ('prayer','gratitude','reflection')) with check(public.is_couple_member(couple_id) and created_by=(select auth.uid()) and kind in ('prayer','gratitude','reflection'));
create policy faith_delete on public.couple_faith for delete to authenticated using(public.is_couple_member(couple_id) and created_by=(select auth.uid()) and kind in ('prayer','gratitude','reflection','devotional','support'));
alter publication supabase_realtime add table public.couple_faith;
