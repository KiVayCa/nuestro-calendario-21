alter table public.letter_reactions alter column emoji drop not null;
drop policy reactions_read on public.letter_reactions;
drop policy reactions_insert on public.letter_reactions;
drop policy reactions_update on public.letter_reactions;
drop policy reactions_delete on public.letter_reactions;

revoke all on public.letter_reactions from public, anon, authenticated;
grant select on public.letter_reactions to authenticated;
grant insert (letter_id, couple_id, user_id, emoji), update (emoji) on public.letter_reactions to authenticated;

create policy letter_reactions_read on public.letter_reactions
for select to authenticated using (
  public.is_couple_member(couple_id) and exists (
    select 1 from public.love_letters l
    where l.id = letter_reactions.letter_id and l.couple_id = letter_reactions.couple_id
      and (l.unlock_at is null or l.unlock_at <= now())
  )
);
create policy letter_reactions_insert on public.letter_reactions
for insert to authenticated with check (
  user_id = (select auth.uid()) and public.is_couple_member(couple_id) and exists (
    select 1 from public.love_letters l
    where l.id = letter_reactions.letter_id and l.couple_id = letter_reactions.couple_id
      and (l.unlock_at is null or l.unlock_at <= now())
  )
);
create policy letter_reactions_update on public.letter_reactions
for update to authenticated using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid()) and public.is_couple_member(couple_id) and exists (
    select 1 from public.love_letters l
    where l.id = letter_reactions.letter_id and l.couple_id = letter_reactions.couple_id
      and (l.unlock_at is null or l.unlock_at <= now())
  )
);

create function public.set_letter_reaction(p_letter_id uuid, p_emoji text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  target_couple uuid;
begin
  select l.couple_id into target_couple from public.love_letters l
  where l.id = p_letter_id and (l.unlock_at is null or l.unlock_at <= now());
  if target_couple is null or auth.uid() is null then
    raise exception 'Carta no disponible' using errcode = '42501';
  end if;
  insert into public.letter_reactions (letter_id, couple_id, user_id, emoji)
  values (p_letter_id, target_couple, auth.uid(), p_emoji)
  on conflict (letter_id, user_id) do update set emoji = excluded.emoji;
end;
$$;
revoke all on function public.set_letter_reaction(uuid,text) from public, anon;
grant execute on function public.set_letter_reaction(uuid,text) to authenticated;

