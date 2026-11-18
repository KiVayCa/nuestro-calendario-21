create table public.letter_reactions (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 letter_id uuid not null references public.love_letters(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 emoji text not null check (emoji in ('❤️','🥰','🥹','😍','🤗','🙏')),
 created_at timestamptz not null default now(),
 unique(letter_id,user_id)
);
create index letter_reactions_couple_idx on public.letter_reactions(couple_id);
alter table public.letter_reactions enable row level security;
revoke all on public.letter_reactions from anon, authenticated;
grant select,insert,update,delete on public.letter_reactions to authenticated;
-- Invoker subqueries use love_letters RLS, including scheduled content restrictions.
create policy reactions_read on public.letter_reactions for select to authenticated using (
 public.is_couple_member(couple_id) and exists(select 1 from public.love_letters l where l.id=letter_id and l.couple_id=letter_reactions.couple_id)
);
create policy reactions_insert on public.letter_reactions for insert to authenticated with check (
 user_id=(select auth.uid()) and public.is_couple_member(couple_id) and exists(select 1 from public.love_letters l where l.id=letter_id and l.couple_id=letter_reactions.couple_id)
);
create policy reactions_update on public.letter_reactions for update to authenticated using (
 user_id=(select auth.uid()) and public.is_couple_member(couple_id) and exists(select 1 from public.love_letters l where l.id=letter_id and l.couple_id=letter_reactions.couple_id)
) with check (
 user_id=(select auth.uid()) and public.is_couple_member(couple_id) and exists(select 1 from public.love_letters l where l.id=letter_id and l.couple_id=letter_reactions.couple_id)
);
create policy reactions_delete on public.letter_reactions for delete to authenticated using (
 user_id=(select auth.uid()) and public.is_couple_member(couple_id)
);
alter publication supabase_realtime add table public.letter_reactions;

