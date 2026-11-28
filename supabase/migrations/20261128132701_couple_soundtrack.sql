create table public.couple_music (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 kind text not null check(kind in ('playlist','our_song','dedication','favorite','wedding','memory','jam')),
 title text not null check(char_length(btrim(title)) between 1 and 120),
 artist text not null default '' check(char_length(artist)<=120),
 note text not null default '' check(char_length(note)<=2000),
 spotify_id text,
 jam_url text,
 memory_id uuid references public.memories(id) on delete set null,
 created_at timestamptz not null default now(),
 check((kind='jam' and spotify_id is null and jam_url is not null and char_length(jam_url)<=500 and jam_url ~ '^https://(spotify[.]link/[A-Za-z0-9_-]+|open[.]spotify[.]com/(jam|invite)/[A-Za-z0-9_-]+)([?][A-Za-z0-9_&=.%+-]*)?$') or (kind<>'jam' and jam_url is null and spotify_id is not null and spotify_id ~ '^[A-Za-z0-9]{22}$')),
 check(kind='memory' or memory_id is null)
);
create unique index couple_music_singletons on public.couple_music(couple_id,kind) where kind in ('playlist','our_song');
create index couple_music_space on public.couple_music(couple_id,created_at desc);
alter table public.couple_music enable row level security;
revoke all on public.couple_music from public,anon,authenticated;
grant select on public.couple_music to authenticated;
grant insert(couple_id,created_by,kind,title,artist,note,spotify_id,jam_url,memory_id) on public.couple_music to authenticated;
grant update(title,artist,note,spotify_id,jam_url,memory_id) on public.couple_music to authenticated;
grant delete on public.couple_music to authenticated;
create policy music_read on public.couple_music for select to authenticated using(public.is_couple_member(couple_id));
create policy music_create on public.couple_music for insert to authenticated with check(created_by=(select auth.uid()) and public.is_couple_member(couple_id) and (memory_id is null or exists(select 1 from public.memories m where m.id=memory_id and m.couple_id=couple_music.couple_id)));
create policy music_edit on public.couple_music for update to authenticated using(public.is_couple_member(couple_id) and (created_by=(select auth.uid()) or kind in ('playlist','our_song'))) with check(public.is_couple_member(couple_id) and (created_by=(select auth.uid()) or kind in ('playlist','our_song')) and (memory_id is null or exists(select 1 from public.memories m where m.id=memory_id and m.couple_id=couple_music.couple_id)));
create policy music_delete on public.couple_music for delete to authenticated using(public.is_couple_member(couple_id) and (created_by=(select auth.uid()) or kind in ('playlist','our_song')));
alter publication supabase_realtime add table public.couple_music;
