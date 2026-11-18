alter table public.love_letters
  add column content_html text check (length(content_html) <= 100000),
  add column paper text check (paper in ('classic','rose','lavender','sea','gold','night')),
  add column audio_path text;

alter table public.letter_reactions drop constraint letter_reactions_emoji_check;
alter table public.letter_reactions add constraint letter_reactions_emoji_check
  check (emoji in ('❤️','🥰','🥹','😍','🤗','🙏','😘','💘','😭','❤️‍🔥','💓'));

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
      letter.content_html := null;
      letter.audio_path := null;
    end if;
    return next letter;
  end loop;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('letter-audio','letter-audio',false,5242880,
  array['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/x-m4a']);

create policy letter_audio_owner_upload on storage.objects for insert to authenticated
with check (bucket_id='letter-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy letter_audio_read on storage.objects for select to authenticated
using (bucket_id='letter-audio' and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists (
    select 1 from public.love_letters l where l.audio_path=storage.objects.name
      and public.is_couple_member(l.couple_id) and (l.unlock_at is null or l.unlock_at<=now())
  )
));

create policy letter_audio_owner_delete on storage.objects for delete to authenticated
using (bucket_id='letter-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);

create function calendar_internal.check_letter_audio_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.audio_path is not null
    and (tg_op = 'INSERT' or new.audio_path is distinct from old.audio_path)
    and auth.uid() is not null
    and new.audio_path !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}$') then
    raise exception 'Audio no autorizado' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger letter_audio_owner before insert or update of audio_path on public.love_letters
for each row execute function calendar_internal.check_letter_audio_owner();
