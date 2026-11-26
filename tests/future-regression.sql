begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000051','future-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000052','future-b@example.invalid'),
 ('11000000-0000-4000-8000-000000000053','future-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000051','Future fixture','11000000-0000-4000-8000-000000000051'),
 ('21000000-0000-4000-8000-000000000053','Other fixture','11000000-0000-4000-8000-000000000053');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000051','11000000-0000-4000-8000-000000000051'),
 ('21000000-0000-4000-8000-000000000051','11000000-0000-4000-8000-000000000052'),
 ('21000000-0000-4000-8000-000000000053','11000000-0000-4000-8000-000000000053');
insert into public.goals(id,couple_id,created_by,title,target_amount) values
 ('31000000-0000-4000-8000-000000000051','21000000-0000-4000-8000-000000000051','11000000-0000-4000-8000-000000000051','Test savings',200),
 ('31000000-0000-4000-8000-000000000053','21000000-0000-4000-8000-000000000053','11000000-0000-4000-8000-000000000053','Other savings',300);
insert into public.plans(id,couple_id,created_by,title,plan_date) values
 ('41000000-0000-4000-8000-000000000051','21000000-0000-4000-8000-000000000051','11000000-0000-4000-8000-000000000051','Test plan',current_date),
 ('41000000-0000-4000-8000-000000000053','21000000-0000-4000-8000-000000000053','11000000-0000-4000-8000-000000000053','Other plan',current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000051',true);
do $$ declare pid uuid; begin
 pid:=public.create_future_project('21000000-0000-4000-8000-000000000051','Hogar','Test','home','active',current_date+30,'31000000-0000-4000-8000-000000000051',null,array['Compare','Save']);
 perform set_config('test.future',pid::text,true);
 if (select count(*) from public.couple_future_steps where project_id=pid)<>2 then raise exception 'Template failed'; end if;
 begin update public.couple_future_projects set goal_id='31000000-0000-4000-8000-000000000053' where id=pid; raise exception 'Other goal linked'; exception when insufficient_privilege then null; end;
 begin update public.couple_future_steps set plan_id='41000000-0000-4000-8000-000000000053' where project_id=pid; raise exception 'Other plan linked'; exception when insufficient_privilege then null; end;
 update public.couple_future_steps set plan_id='41000000-0000-4000-8000-000000000051' where project_id=pid and title='Compare';
 begin perform public.create_future_project('21000000-0000-4000-8000-000000000051','Bad project','','home','active',null,null,null,array['']);raise exception 'Invalid step accepted';exception when check_violation then null; end;
 if exists(select 1 from public.couple_future_projects where title='Bad project') then raise exception 'Atomic creation failed';end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000052',true);
do $$ begin
 update public.couple_future_steps set done=true where project_id=current_setting('test.future')::uuid and title='Compare';
 if not found then raise exception 'Partner could not complete step';end if;
 update public.couple_future_projects set status='done' where id=current_setting('test.future')::uuid;
 if not found then raise exception 'Partner could not edit';end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000053',true);
do $$ begin
 if exists(select 1 from public.couple_future_projects) or exists(select 1 from public.couple_future_steps) then raise exception 'Other pair data visible';end if;
 begin insert into public.couple_future_steps(couple_id,project_id,created_by,title) values('21000000-0000-4000-8000-000000000053',current_setting('test.future')::uuid,auth.uid(),'Unauthorized');raise exception 'Other project linked';exception when foreign_key_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000051',true);
delete from public.couple_future_projects where id=current_setting('test.future')::uuid;
do $$ begin
 if exists(select 1 from public.couple_future_steps where project_id=current_setting('test.future')::uuid) then raise exception 'Steps not removed';end if;
 if not exists(select 1 from public.goals where id='31000000-0000-4000-8000-000000000051') or not exists(select 1 from public.plans where id='41000000-0000-4000-8000-000000000051') then raise exception 'Linked data removed';end if;
end $$;
reset role;
rollback;
select 'Future projects sharing, atomicity, links and isolation passed' as result;
