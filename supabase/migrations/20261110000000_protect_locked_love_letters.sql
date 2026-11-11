-- Protect locked love letters at the database layer.
-- The UI already blocks deletion, but RLS must enforce the same rule
-- so direct Supabase requests cannot delete a locked letter.
drop policy if exists letters_delete on public.love_letters;

create policy letters_delete
on public.love_letters
for delete
to authenticated
using (
  public.is_couple_member(couple_id)
  and is_locked = false
);
