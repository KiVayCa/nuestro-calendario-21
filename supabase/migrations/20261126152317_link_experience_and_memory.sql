create or replace function public.check_adventure_update() returns trigger language plpgsql security invoker set search_path='' as $$
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
    if not (new.status='done' or (new.kind='experience' and new.status='pending'))
      or not exists(select 1 from public.memories m where m.id=new.memory_id and m.couple_id=new.couple_id) then
      raise exception 'Recuerdo no permitido' using errcode='42501';
    end if;
  end if;
  return new;
end $$;

-- One transaction: either both records are saved and linked or neither is.
create function public.save_adventure_memory(
  p_couple_id uuid,p_adventure_id uuid,p_title text,p_description text,
  p_date date,p_memory_category text,p_adventure_category text,
  p_done boolean,p_place_id uuid,p_photo_url text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a_id uuid; m_id uuid; place_name text; rec public.couple_adventures;
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Espacio no autorizado' using errcode='42501';
  end if;
  if p_place_id is not null then
    select name into place_name from public.places where id=p_place_id and couple_id=p_couple_id;
    if not found then raise exception 'Lugar no autorizado' using errcode='42501'; end if;
  end if;
  if p_photo_url is not null and (split_part(p_photo_url,'/',1)<>p_couple_id::text or split_part(p_photo_url,'/',2)<>auth.uid()::text) then
    raise exception 'Foto no autorizada' using errcode='42501';
  end if;
  if p_adventure_id is null then
    a_id:=public.create_adventure(p_couple_id,'experience',p_title,p_description,p_adventure_category,p_date);
  else
    select * into rec from public.couple_adventures where id=p_adventure_id and couple_id=p_couple_id for update;
    if not found or rec.memory_id is not null or not (rec.status='done' or (rec.kind='experience' and rec.status='pending')) then
      raise exception 'La aventura no permite un nuevo recuerdo';
    end if;
    a_id:=rec.id;
  end if;
  insert into public.memories(couple_id,created_by,title,description,memory_date,category,place_id,location,photo_url)
    values(p_couple_id,auth.uid(),p_title,p_description,p_date,p_memory_category,p_place_id,place_name,p_photo_url)
    returning id into m_id;
  update public.couple_adventures set memory_id=m_id,
    status=case when p_done and status='pending' and kind='experience' then 'done' else status end
    where id=a_id and couple_id=p_couple_id;
  return jsonb_build_object('adventure_id',a_id,'memory_id',m_id);
end $$;
revoke all on function public.save_adventure_memory(uuid,uuid,text,text,date,text,text,boolean,uuid,text) from public,anon;
grant execute on function public.save_adventure_memory(uuid,uuid,text,text,date,text,text,boolean,uuid,text) to authenticated;
