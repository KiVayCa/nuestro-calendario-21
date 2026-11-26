begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000031','memory-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000032','memory-b@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000031','Memory fixture','11000000-0000-4000-8000-000000000031'),
 ('21000000-0000-4000-8000-000000000032','Other fixture','11000000-0000-4000-8000-000000000032');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000031','11000000-0000-4000-8000-000000000031'),
 ('21000000-0000-4000-8000-000000000032','11000000-0000-4000-8000-000000000032');
insert into public.places(id,couple_id,created_by,name) values
 ('31000000-0000-4000-8000-000000000031','21000000-0000-4000-8000-000000000031','11000000-0000-4000-8000-000000000031','Test place'),
 ('31000000-0000-4000-8000-000000000032','21000000-0000-4000-8000-000000000032','11000000-0000-4000-8000-000000000032','Other place');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000031',true);
do $$ declare result jsonb; aid uuid; mid uuid; begin
 result:=public.save_adventure_memory('21000000-0000-4000-8000-000000000031',null,'Picnic','Test',current_date,'cita','naturaleza',false,'31000000-0000-4000-8000-000000000031',null);
 aid:=(result->>'adventure_id')::uuid; mid:=(result->>'memory_id')::uuid;
 if not exists(select 1 from public.couple_adventures where id=aid and memory_id=mid and status='pending') then raise exception 'Pending linkage failed'; end if;
 if not exists(select 1 from public.memories where id=mid and location='Test place' and place_id='31000000-0000-4000-8000-000000000031') then raise exception 'Place failed'; end if;
 update public.couple_adventures set status='done' where id=aid;
 if not exists(select 1 from public.couple_adventures where id=aid and status='done' and memory_id=mid) then raise exception 'Completion failed'; end if;
 begin perform public.save_adventure_memory('21000000-0000-4000-8000-000000000031',aid,'Duplicate','Test',current_date,'cita','naturaleza',true,null,null); raise exception 'Duplicate accepted'; exception when raise_exception then if sqlerrm='Duplicate accepted' then raise; end if; end;
 begin perform public.save_adventure_memory('21000000-0000-4000-8000-000000000031',null,'Wrong location','Test',current_date,'cita','naturaleza',true,'31000000-0000-4000-8000-000000000032',null); raise exception 'Foreign place accepted'; exception when insufficient_privilege then null; end;
 result:=public.save_adventure_memory('21000000-0000-4000-8000-000000000031',null,'Trip','Test',current_date,'viaje','viaje',true,null,null);
 if not exists(select 1 from public.couple_adventures where id=(result->>'adventure_id')::uuid and status='done' and memory_id=(result->>'memory_id')::uuid) then raise exception 'Completed linkage failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000032',true);
do $$ begin
 if exists(select 1 from public.couple_adventures where couple_id='21000000-0000-4000-8000-000000000031') then raise exception 'Private adventure exposed'; end if;
 begin perform public.save_adventure_memory('21000000-0000-4000-8000-000000000031',null,'Unauthorized','Test',current_date,'cita','naturaleza',false,null,null); raise exception 'Unauthorized create'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Experience and memory linkage passed' as result;
