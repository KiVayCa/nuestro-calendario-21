create table public.couple_adventures (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('experience','surprise','coupon')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  details text not null default '' check (char_length(details)<=1000),
  category text not null default 'romantica' check (category in ('romantica','naturaleza','gastronomia','creativa','hogar','viaje','especial')),
  status text not null default 'pending' check (status in ('pending','revealed','done','redeemed','cancelled')),
  target_date date,
  plan_id uuid references public.plans(id) on delete set null,
  memory_id uuid references public.memories(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint surprise_no_public_secret check (kind <> 'surprise' or (title='Cita sorpresa' and details='')),
  constraint kind_status check ((kind='experience' and status in ('pending','done','cancelled')) or (kind='surprise' and status in ('pending','revealed','done','cancelled')) or (kind='coupon' and status in ('pending','redeemed','cancelled')))
);
create index adventures_couple_created on public.couple_adventures(couple_id,created_at desc,id);
create index adventures_plan on public.couple_adventures(plan_id);
create index adventures_memory on public.couple_adventures(memory_id);
create table public.adventure_secrets (
  adventure_id uuid primary key references public.couple_adventures(id) on delete cascade,
  details text not null check (char_length(btrim(details)) between 1 and 1000)
);
alter table public.couple_adventures enable row level security;
alter table public.adventure_secrets enable row level security;
revoke all on public.couple_adventures,public.adventure_secrets from public,anon,authenticated;
grant select on public.couple_adventures,public.adventure_secrets to authenticated;
grant insert (id,couple_id,created_by,kind,title,details,category,target_date) on public.couple_adventures to authenticated;
grant insert (adventure_id,details) on public.adventure_secrets to authenticated;
grant update (status,plan_id,memory_id) on public.couple_adventures to authenticated;
create policy adventures_read on public.couple_adventures for select to authenticated using (public.is_couple_member(couple_id));
create policy adventures_create on public.couple_adventures for insert to authenticated with check (created_by=(select auth.uid()) and public.is_couple_member(couple_id));
create policy adventures_update on public.couple_adventures for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy secret_read on public.adventure_secrets for select to authenticated using (exists (select 1 from public.couple_adventures a where a.id=adventure_id and a.kind='surprise' and public.is_couple_member(a.couple_id) and (a.created_by=(select auth.uid()) or a.status in ('revealed','done'))));
create policy secret_create on public.adventure_secrets for insert to authenticated with check (exists (select 1 from public.couple_adventures a where a.id=adventure_id and a.kind='surprise' and a.status='pending' and a.created_by=(select auth.uid()) and public.is_couple_member(a.couple_id)));

create function public.check_adventure_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.status is distinct from old.status then
    if not ((old.status='pending' and new.status='cancelled' and old.created_by=auth.uid())
      or (old.kind='experience' and old.status='pending' and new.status='done')
      or (old.kind='surprise' and old.status='pending' and new.status='revealed' and old.created_by=auth.uid())
      or (old.kind='surprise' and old.status='revealed' and new.status='done')
      or (old.kind='coupon' and old.status='pending' and new.status='redeemed' and old.created_by<>auth.uid())) then
      raise exception 'Cambio de estado no permitido' using errcode='42501';
    end if;
    if new.status in ('done','redeemed') then new.completed_at=now(); end if;
  end if;
  if new.plan_id is distinct from old.plan_id and new.plan_id is not null then
    if new.kind='coupon' or new.status in ('cancelled','done') or (new.kind='surprise' and new.status='pending' and old.created_by<>auth.uid())
      or not exists(select 1 from public.plans p where p.id=new.plan_id and p.couple_id=new.couple_id) then
      raise exception 'Plan no permitido' using errcode='42501';
    end if;
  end if;
  if new.memory_id is distinct from old.memory_id and new.memory_id is not null then
    if new.status<>'done' or not exists(select 1 from public.memories m where m.id=new.memory_id and m.couple_id=new.couple_id) then
      raise exception 'Recuerdo no permitido' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.check_adventure_update() from public,anon,authenticated;
create trigger check_adventure_update before update on public.couple_adventures for each row execute function public.check_adventure_update();

create function public.create_adventure(p_couple_id uuid,p_kind text,p_title text,p_details text,p_category text,p_date date)
returns uuid language plpgsql security invoker set search_path='' as $$
declare adventure_id uuid := gen_random_uuid();
begin
  insert into public.couple_adventures(id,couple_id,created_by,kind,title,details,category,target_date)
  values(adventure_id,p_couple_id,auth.uid(),p_kind,case when p_kind='surprise' then 'Cita sorpresa' else p_title end,
    case when p_kind='surprise' then '' else coalesce(p_details,'') end,
    case when p_kind='surprise' then 'especial' else p_category end,p_date);
  if p_kind='surprise' then
    insert into public.adventure_secrets(adventure_id,details) values(adventure_id,p_details);
  end if;
  return adventure_id;
end $$;
revoke all on function public.create_adventure(uuid,text,text,text,text,date) from public,anon;
grant execute on function public.create_adventure(uuid,text,text,text,text,date) to authenticated;
alter publication supabase_realtime add table public.couple_adventures;
