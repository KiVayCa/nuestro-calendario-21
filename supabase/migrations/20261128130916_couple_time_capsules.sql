create table public.couple_capsules (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 title text not null check(char_length(btrim(title)) between 1 and 120),
 category text not null check(category in ('love','dream','milestone','gratitude','other')),
 opens_on date not null,
 created_at timestamptz not null default now(),
 archived_at timestamptz
);
create table public.couple_capsule_messages (
 capsule_id uuid primary key references public.couple_capsules(id) on delete cascade,
 message text not null check(char_length(btrim(message)) between 1 and 10000)
);
create index couple_capsules_space_date on public.couple_capsules(couple_id,opens_on);
alter table public.couple_capsules enable row level security;
alter table public.couple_capsule_messages enable row level security;
revoke all on public.couple_capsules,public.couple_capsule_messages from public,anon,authenticated;
grant select on public.couple_capsules,public.couple_capsule_messages to authenticated;
grant insert(couple_id,created_by,title,category,opens_on) on public.couple_capsules to authenticated;
grant insert(capsule_id,message) on public.couple_capsule_messages to authenticated;
grant update(archived_at) on public.couple_capsules to authenticated;
create policy capsule_read on public.couple_capsules for select to authenticated using(public.is_couple_member(couple_id));
create policy capsule_create on public.couple_capsules for insert to authenticated with check(created_by=(select auth.uid()) and public.is_couple_member(couple_id) and opens_on > (now() at time zone 'America/Bogota')::date);
create policy capsule_archive on public.couple_capsules for update to authenticated using(created_by=(select auth.uid()) and public.is_couple_member(couple_id) and archived_at is null) with check(created_by=(select auth.uid()) and public.is_couple_member(couple_id) and archived_at is not null);
create policy capsule_message_read on public.couple_capsule_messages for select to authenticated using(exists(select 1 from public.couple_capsules c where c.id=capsule_id and public.is_couple_member(c.couple_id) and c.archived_at is null and c.opens_on <= (now() at time zone 'America/Bogota')::date));
create policy capsule_message_create on public.couple_capsule_messages for insert to authenticated with check(exists(select 1 from public.couple_capsules c where c.id=capsule_id and c.created_by=(select auth.uid()) and public.is_couple_member(c.couple_id) and c.archived_at is null and c.opens_on > (now() at time zone 'America/Bogota')::date));
create function public.create_couple_capsule(p_couple_id uuid,p_title text,p_category text,p_opens_on date,p_message text) returns uuid language plpgsql security invoker set search_path='' as $$
declare new_id uuid;
begin
 insert into public.couple_capsules(couple_id,created_by,title,category,opens_on) values(p_couple_id,auth.uid(),btrim(p_title),p_category,p_opens_on) returning id into new_id;
 insert into public.couple_capsule_messages(capsule_id,message) values(new_id,btrim(p_message));
 return new_id;
end $$;
revoke all on function public.create_couple_capsule(uuid,text,text,date,text) from public,anon;
grant execute on function public.create_couple_capsule(uuid,text,text,date,text) to authenticated;
alter publication supabase_realtime add table public.couple_capsules;
select cron.schedule('couple-capsule-unlock','*/5 * * * *',$job$
 insert into public.notifications(couple_id,recipient_user_id,actor_user_id,event_type,title,body,target_tab,target_id,reminder_key)
 select c.couple_id,m.user_id,c.created_by,'capsule_unlocked','Una cápsula del tiempo ya puede abrirse 💌','Llegó el día de descubrir su mensaje.','letters',c.id,'capsule:'||c.id::text
 from public.couple_capsules c join public.couple_members m on m.couple_id=c.couple_id
 where c.archived_at is null and c.opens_on <= (now() at time zone 'America/Bogota')::date
 on conflict(recipient_user_id,reminder_key) where reminder_key is not null do nothing;
$job$);
