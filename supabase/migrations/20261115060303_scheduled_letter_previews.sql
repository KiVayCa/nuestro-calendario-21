-- Metadata is visible to the couple; future content stays on the server.
-- Direct table reads continue to use the existing restrictive RLS policy.
create or replace function public.list_couple_letters(p_couple_id uuid)
returns setof public.love_letters
language plpgsql stable security definer set search_path = '' as $$
declare letter public.love_letters;
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Espacio no autorizado';
  end if;
  for letter in select * from public.love_letters where couple_id = p_couple_id loop
    if letter.created_by <> auth.uid() and letter.unlock_at > now() then
      letter.content := null;
    end if;
    return next letter;
  end loop;
end;
$$;
revoke all on function public.list_couple_letters(uuid) from public, anon;
grant execute on function public.list_couple_letters(uuid) to authenticated;
