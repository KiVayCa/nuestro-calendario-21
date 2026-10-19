-- Secure couple membership flows and add per-device push subscriptions.
-- This migration is additive except for removing unsafe direct membership/couple creation policies;
-- the application now uses the guarded SECURITY DEFINER RPCs for those flows.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_couple_user_endpoint_key unique (couple_id, user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_couple_member(couple_id));

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id));

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_couple_member(couple_id))
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id));

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_couple_member(couple_id));

-- Membership creation must only occur through the guarded RPC functions.
drop policy if exists "users can add themselves as member" on public.couple_members;
drop policy if exists "authenticated can create a couple" on public.couples;

create or replace function public.get_or_create_our_couple()
returns public.couples
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  em text := lower(auth.jwt()->>'email');
  nm text;
  c public.couples;
begin
  if uid is null then raise exception 'Debes iniciar sesión'; end if;

  select display_name into nm
  from public.allowed_emails
  where lower(email)=em;

  if nm is null then
    raise exception 'Este correo no está autorizado para Nuestro Calendario #21';
  end if;

  select cp.* into c
  from public.couples cp
  join public.couple_members cm on cm.couple_id=cp.id
  where cm.user_id=uid
  limit 1;

  if found then return c; end if;

  -- Never silently add an unassociated user to an existing couple.
  if exists (select 1 from public.couples) then
    raise exception 'Ya existe un espacio compartido. Usa el código de invitación para unirte.';
  end if;

  insert into public.couples(name,created_by)
  values('Nuestro Calendario #21',uid)
  returning * into c;

  insert into public.couple_members(couple_id,user_id,display_name)
  values(c.id,uid,nm);

  return c;
end;
$function$;

create or replace function public.join_couple(p_join_code text, p_display_name text default null)
returns public.couples
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c public.couples;
  current_user_id uuid := auth.uid();
  em text := lower(auth.jwt()->>'email');
  allowed_name text;
begin
  if current_user_id is null then raise exception 'Debes iniciar sesión'; end if;

  select display_name into allowed_name
  from public.allowed_emails
  where lower(email)=em;

  if allowed_name is null then
    raise exception 'Este correo no está autorizado para Nuestro Calendario #21';
  end if;

  select * into c from public.couples where join_code = upper(trim(p_join_code));
  if not found then raise exception 'Código de pareja no válido'; end if;

  if exists (select 1 from public.couple_members where couple_id=c.id and user_id=current_user_id) then
    return c;
  end if;

  if exists (select 1 from public.couple_members where user_id=current_user_id) then
    raise exception 'Este usuario ya pertenece a otro espacio';
  end if;

  if (select count(*) from public.couple_members where couple_id=c.id) >= 2 then
    raise exception 'Esta pareja ya tiene dos integrantes';
  end if;

  insert into public.couple_members(couple_id,user_id,display_name)
  values(c.id,current_user_id,coalesce(nullif(trim(p_display_name),''),allowed_name));

  return c;
end;
$function$;

-- Keep SECURITY DEFINER RPCs limited to signed-in, allow-listed users.
revoke execute on function public.get_or_create_our_couple() from public, anon;
grant execute on function public.get_or_create_our_couple() to authenticated;

revoke execute on function public.join_couple(text,text) from public, anon;
grant execute on function public.join_couple(text,text) to authenticated;

revoke execute on function public.is_couple_member(uuid) from public, anon;
grant execute on function public.is_couple_member(uuid) to authenticated;

revoke execute on function public.queue_plan_created_notification() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.set_user_profiles_updated_at() set search_path = pg_catalog;
