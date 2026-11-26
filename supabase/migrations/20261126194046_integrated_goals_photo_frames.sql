alter table public.dreams add column goal_id uuid references public.goals(id) on delete set null;
create index dreams_goal_link on public.dreams(goal_id);
create function public.check_dream_goal_link() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.goal_id is not null and not exists(select 1 from public.goals g where g.id=new.goal_id and g.couple_id=new.couple_id) then
    raise exception 'Meta no autorizada' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.check_dream_goal_link() from public,anon,authenticated;
create trigger check_dream_goal_link before insert or update of goal_id,couple_id on public.dreams for each row execute function public.check_dream_goal_link();
alter table public.memories
 add column photo_x numeric not null default 50 check(photo_x between 0 and 100),
 add column photo_y numeric not null default 50 check(photo_y between 0 and 100),
 add column photo_zoom numeric not null default 1 check(photo_zoom between 1 and 3);
alter table public.couple_settings
 add column home_photo_x numeric not null default 50 check(home_photo_x between 0 and 100),
 add column home_photo_y numeric not null default 50 check(home_photo_y between 0 and 100),
 add column home_photo_zoom numeric not null default 1 check(home_photo_zoom between 1 and 3);
