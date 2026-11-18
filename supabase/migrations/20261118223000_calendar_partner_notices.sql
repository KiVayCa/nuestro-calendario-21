alter table public.notifications add column target_date date;

create function public.record_calendar_partner_notification(
  p_couple_id uuid, p_event_type text, p_title text, p_body text,
  p_target_id uuid, p_target_date date
)
returns public.notifications
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
  result public.notifications;
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) or not exists (
    select 1 from public.plans where id = p_target_id and couple_id = p_couple_id
  ) then
    raise exception 'Plan no autorizado' using errcode = '42501';
  end if;
  select user_id into recipient from public.couple_members
    where couple_id = p_couple_id and user_id <> auth.uid()
    order by joined_at limit 1;
  if recipient is null then return null; end if;
  insert into public.notifications (
    couple_id, recipient_user_id, actor_user_id, event_type, title, body,
    target_tab, target_id, target_date
  ) values (
    p_couple_id, recipient, auth.uid(), left(p_event_type,100), left(p_title,200),
    left(p_body,2000), 'calendar', p_target_id, p_target_date
  ) returning * into result;
  return result;
end;
$$;

revoke all on function public.record_calendar_partner_notification(uuid,text,text,text,uuid,date) from public, anon;
grant execute on function public.record_calendar_partner_notification(uuid,text,text,text,uuid,date) to authenticated;
