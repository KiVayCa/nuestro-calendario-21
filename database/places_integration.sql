-- Nuestro Calendario #21: relación compartida de lugares.
-- Revisar y ejecutar manualmente en Supabase SQL Editor; este archivo no se aplica solo.
begin;
alter table public.places add column if not exists google_maps_url text;
alter table public.memories add column if not exists place_id uuid;
alter table public.love_letters add column if not exists place_id uuid;
alter table public.challenges add column if not exists place_id uuid;
alter table public.dreams add column if not exists place_id uuid;
alter table public.goals add column if not exists place_id uuid;
alter table public.important_dates add column if not exists place_id uuid;
alter table public.activity_ideas add column if not exists place_id uuid;
alter table public.plans add column if not exists place_id uuid;
create unique index if not exists places_id_couple_id_unique on public.places(id, couple_id);
do $$
begin
 if not exists (select 1 from pg_constraint where conname='memories_place_same_couple_fk') then
  alter table public.memories add constraint memories_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='love_letters_place_same_couple_fk') then
  alter table public.love_letters add constraint love_letters_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='challenges_place_same_couple_fk') then
  alter table public.challenges add constraint challenges_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='dreams_place_same_couple_fk') then
  alter table public.dreams add constraint dreams_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='goals_place_same_couple_fk') then
  alter table public.goals add constraint goals_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='important_dates_place_same_couple_fk') then
  alter table public.important_dates add constraint important_dates_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='activity_ideas_place_same_couple_fk') then
  alter table public.activity_ideas add constraint activity_ideas_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='plans_place_same_couple_fk') then
  alter table public.plans add constraint plans_place_same_couple_fk foreign key(place_id,couple_id) references public.places(id,couple_id) on delete set null (place_id);
 end if;
end $$;
create index if not exists memories_place_id_couple_idx on public.memories(place_id, couple_id);
create index if not exists love_letters_place_id_couple_idx on public.love_letters(place_id, couple_id);
create index if not exists challenges_place_id_couple_idx on public.challenges(place_id, couple_id);
create index if not exists dreams_place_id_couple_idx on public.dreams(place_id, couple_id);
create index if not exists goals_place_id_couple_idx on public.goals(place_id, couple_id);
create index if not exists important_dates_place_id_couple_idx on public.important_dates(place_id, couple_id);
create index if not exists activity_ideas_place_id_couple_idx on public.activity_ideas(place_id, couple_id);
create index if not exists plans_place_id_couple_idx on public.plans(place_id, couple_id);
commit;
