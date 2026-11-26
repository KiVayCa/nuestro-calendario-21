create table public.couple_connection (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('heart','hug','thinking','compliment','mood')),
  body text,
  created_at timestamptz not null default now(),
  constraint connection_content check (
    (kind in ('heart','hug','thinking') and body is null)
    or (kind='compliment' and body is not null and char_length(btrim(body)) between 1 and 500)
    or (kind='mood' and body is not null and body in ('happy','calm','tired','sad','stressed','love'))
  )
);
create index couple_connection_recent on public.couple_connection(couple_id,created_at desc,id);
alter table public.couple_connection enable row level security;
revoke all on public.couple_connection from public,anon,authenticated;
grant select on public.couple_connection to authenticated;
grant insert (couple_id,sender_user_id,kind,body) on public.couple_connection to authenticated;
create policy connection_read on public.couple_connection for select to authenticated
  using (public.is_couple_member(couple_id));
create policy connection_send on public.couple_connection for insert to authenticated
  with check (sender_user_id=(select auth.uid()) and public.is_couple_member(couple_id));
alter publication supabase_realtime add table public.couple_connection;
