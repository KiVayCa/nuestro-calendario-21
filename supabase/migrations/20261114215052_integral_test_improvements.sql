-- Applied to the isolated TEST project. Preserve existing goal balances as opening entries.
create table if not exists public.goal_movements (
 id uuid primary key default gen_random_uuid(),
 goal_id uuid not null references public.goals(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 amount numeric not null check (amount::text not in ('NaN','Infinity','-Infinity')),
 balance_after numeric not null check (balance_after >= 0),
 note text,
 kind text not null default 'movement' check (kind in ('opening','movement')),
 request_id uuid not null unique,
 notification_id uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now()
);
create index if not exists goal_movements_goal_date on public.goal_movements(goal_id,created_at desc);
create index if not exists goal_movements_couple on public.goal_movements(couple_id);
create index if not exists goal_movements_author on public.goal_movements(created_by);
create unique index if not exists goal_movements_one_opening on public.goal_movements(goal_id) where kind='opening';
alter table public.goal_movements enable row level security;
create policy goal_movements_read on public.goal_movements for select to authenticated using (public.is_couple_member(couple_id));
grant select on public.goal_movements to authenticated;
revoke insert,update,delete on public.goal_movements from anon,authenticated;
insert into public.goal_movements(goal_id,couple_id,created_by,amount,balance_after,kind,note,request_id)
select id,couple_id,created_by,current_amount,current_amount,'opening','Saldo anterior al historial de movimientos',gen_random_uuid()
from public.goals where current_amount>=0 on conflict do nothing;

-- A narrow RPC serializes both partners' contributions and makes retries idempotent.
create or replace function public.record_goal_movement(p_goal_id uuid,p_amount numeric,p_note text,p_request_id uuid)
returns public.goal_movements language plpgsql security definer set search_path='' as $$
declare g public.goals; existing public.goal_movements; movement public.goal_movements; next_balance numeric;
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if p_request_id is null or p_amount is null or p_amount=0 or p_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Monto o identificador inválido'; end if;
 select * into g from public.goals where id=p_goal_id for update;
 if not found or not public.is_couple_member(g.couple_id) then raise exception 'Meta no disponible'; end if;
 select * into existing from public.goal_movements where request_id=p_request_id;
 if found then
  if existing.goal_id<>p_goal_id or existing.created_by<>auth.uid() or existing.amount<>p_amount then raise exception 'Solicitud ya utilizada para otro movimiento'; end if;
  return existing;
 end if;
 next_balance=g.current_amount+p_amount;
 if next_balance<0 then raise exception 'El retiro supera el saldo disponible'; end if;
 insert into public.goal_movements(goal_id,couple_id,created_by,amount,balance_after,note,request_id)
 values(g.id,g.couple_id,auth.uid(),p_amount,next_balance,left(p_note,1000),p_request_id) returning * into movement;
 update public.goals set current_amount=next_balance,completed=(coalesce(target_amount,0)>0 and next_balance>=target_amount) where id=g.id;
 insert into public.notifications(id,couple_id,recipient_user_id,actor_user_id,event_type,title,body,target_tab,target_id)
 select movement.notification_id,g.couple_id,m.user_id,auth.uid(),'goal_movement',case when p_amount>0 then 'Nuevo aporte a una meta' else 'Retiro de una meta' end,
 g.title||' · '||p_amount::text,'goals',g.id from public.couple_members m where m.couple_id=g.couple_id and m.user_id<>auth.uid() order by m.joined_at limit 1;
 return movement;
end; $$;
revoke all on function public.record_goal_movement(uuid,numeric,text,uuid) from public,anon;
grant execute on function public.record_goal_movement(uuid,numeric,text,uuid) to authenticated;
-- All authenticated balance changes must use the RPC. Metadata remains editable.
revoke update on public.goals from public,anon,authenticated;
grant update(title,description,category,target_amount,target_date,completed,place_id) on public.goals to authenticated;
drop policy if exists goals_insert on public.goals;
create policy goals_insert on public.goals for insert to authenticated with check (public.is_couple_member(couple_id) and created_by=auth.uid() and current_amount=0);

-- Hide scheduled content at the data boundary, including direct REST queries.
drop policy if exists letters_select on public.love_letters;
create policy letters_select on public.love_letters for select to authenticated using (
 public.is_couple_member(couple_id) and (created_by=auth.uid() or unlock_at is null or unlock_at<=now())
);
drop policy if exists letters_update on public.love_letters;
create policy letters_update on public.love_letters for update to authenticated
using (public.is_couple_member(couple_id) and (created_by=auth.uid() or unlock_at is null or unlock_at<=now()))
with check (public.is_couple_member(couple_id) and (created_by=auth.uid() or unlock_at is null or unlock_at<=now()));

-- Reuse the notification already created by an INSERT trigger.
create or replace function public.record_partner_notification(p_couple_id uuid,p_event_type text,p_title text,p_body text,p_target_tab text,p_target_id uuid default null)
returns public.notifications language plpgsql security definer set search_path='' as $$
declare recipient uuid; result public.notifications;
begin
 if auth.uid() is null or not public.is_couple_member(p_couple_id) then raise exception 'Espacio no autorizado'; end if;
 select user_id into recipient from public.couple_members where couple_id=p_couple_id and user_id<>auth.uid() order by joined_at limit 1;
 if recipient is null then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_couple_id::text||auth.uid()::text||coalesce(p_target_id::text,'')||p_event_type,0));
 if p_target_id is not null and p_event_type in ('plan_created','memory_created','letter_created','dream_created','challenge_created','date_created','goal_created','place_created','idea_created','budget_movement_created') then
  select * into result from public.notifications where couple_id=p_couple_id and actor_user_id=auth.uid() and recipient_user_id=recipient and target_id=p_target_id
   and event_type in (p_event_type,case p_event_type when 'date_created' then 'important_date_created' when 'budget_movement_created' then 'expense_created' else p_event_type end)
   order by created_at desc limit 1;
  if found then return result; end if;
 end if;
 insert into public.notifications(couple_id,recipient_user_id,actor_user_id,event_type,title,body,target_tab,target_id)
 values(p_couple_id,recipient,auth.uid(),left(p_event_type,100),left(p_title,200),left(p_body,2000),left(p_target_tab,50),p_target_id) returning * into result;
 return result;
end; $$;
revoke all on function public.record_partner_notification(uuid,text,text,text,text,uuid) from public,anon;
grant execute on function public.record_partner_notification(uuid,text,text,text,text,uuid) to authenticated;
-- Trigger functions are invoked internally, never as public RPC endpoints.
revoke execute on function public.create_couple_activity_notification() from public,anon,authenticated;
-- Authenticated helpers retain their intended callers; triggers have no public entry point.
revoke execute on function public.get_or_create_our_couple() from public,anon;
grant execute on function public.get_or_create_our_couple() to authenticated;
revoke execute on function public.join_couple(text,text) from public,anon;
grant execute on function public.join_couple(text,text) to authenticated;
revoke execute on function public.is_couple_member(uuid) from public,anon;
grant execute on function public.is_couple_member(uuid) to authenticated;
revoke execute on function public.queue_plan_created_notification() from public,anon,authenticated;
