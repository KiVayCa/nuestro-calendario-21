alter table public.love_letters drop constraint love_letters_paper_check;
alter table public.love_letters add constraint love_letters_paper_check
  check (paper in ('classic','rose','lavender','sea','gold','night',
    'sakura','forest','sunset','moon','ocean','daisy'));

create function calendar_internal.protect_locked_letter_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.is_locked is true and
    (to_jsonb(old) - array['is_locked','opened_at','updated_at']) is distinct from
    (to_jsonb(new) - array['is_locked','opened_at','updated_at']) then
    raise exception 'Desbloquea la carta antes de editarla' using errcode='42501';
  end if;
  return new;
end;
$$;

create trigger love_letters_protect_locked_edit before update on public.love_letters
for each row execute function calendar_internal.protect_locked_letter_edit();
