begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','nc21-audit-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','nc21-audit-b@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','nc21-audit-c@example.invalid');
insert into public.couples(id,name,created_by) values ('20000000-0000-4000-8000-000000000001','Automated regression fixture','10000000-0000-4000-8000-000000000001');
insert into public.couple_members(couple_id,user_id) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.goals(id,couple_id,created_by,title,target_amount) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test goal',200);
insert into public.love_letters(id,couple_id,created_by,title,content,unlock_at) values ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Scheduled test','Private content',now()+interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare result public.goal_movements; balance numeric; count_events integer;
begin
 result:=public.record_goal_movement('30000000-0000-4000-8000-000000000001',100,'First contribution','50000000-0000-4000-8000-000000000001');
 result:=public.record_goal_movement('30000000-0000-4000-8000-000000000001',100,'Retry','50000000-0000-4000-8000-000000000001');
 select current_amount into balance from public.goals where id='30000000-0000-4000-8000-000000000001';
 if balance<>100 then raise exception 'Idempotency failed'; end if;
 begin
  perform public.record_goal_movement('30000000-0000-4000-8000-000000000001',-101,'Overdraft','50000000-0000-4000-8000-000000000002');
  raise exception 'Overdraft accepted';
 exception when raise_exception then if sqlerrm='Overdraft accepted' then raise; end if; end;
 begin
  update public.goals set current_amount=999 where id='30000000-0000-4000-8000-000000000001';
  raise exception 'Direct balance update accepted';
 exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.love_letters where id='40000000-0000-4000-8000-000000000001') then raise exception 'Author cannot read draft'; end if;
 perform public.record_partner_notification('20000000-0000-4000-8000-000000000001','goal_created','Test','Test','goals','30000000-0000-4000-8000-000000000001');
end; $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$
declare balance numeric; events integer;
begin
 if exists(select 1 from public.love_letters where id='40000000-0000-4000-8000-000000000001') then raise exception 'Scheduled letter leaked to partner'; end if;
 if not exists(select 1 from public.list_couple_letters('20000000-0000-4000-8000-000000000001') where id='40000000-0000-4000-8000-000000000001' and title='Scheduled test' and content is null and unlock_at>now()) then raise exception 'Scheduled preview missing or content leaked'; end if;
 perform public.record_goal_movement('30000000-0000-4000-8000-000000000001',120,'Partner contribution','50000000-0000-4000-8000-000000000003');
 select current_amount into balance from public.goals where id='30000000-0000-4000-8000-000000000001';
 if balance<>220 then raise exception 'Partner balance failed'; end if;
 select count(*) into events from public.notifications where target_id='30000000-0000-4000-8000-000000000001' and event_type='goal_created';
 if events<>1 then raise exception 'Duplicate creation notification'; end if;
end; $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from public.goal_movements where goal_id='30000000-0000-4000-8000-000000000001') then raise exception 'Ledger leaked to outsider'; end if;
 begin
  perform public.record_goal_movement('30000000-0000-4000-8000-000000000001',1,'Unauthorized','50000000-0000-4000-8000-000000000004');
  raise exception 'Unauthorized movement accepted';
 exception when raise_exception then if sqlerrm='Unauthorized movement accepted' then raise; end if; end;
end; $$;
do $$ begin
 begin
  perform public.list_couple_letters('20000000-0000-4000-8000-000000000001');
  raise exception 'Unauthorized preview accepted';
 exception when raise_exception then if sqlerrm='Unauthorized preview accepted' then raise; end if; end;
end; $$;
reset role;
update public.love_letters set unlock_at=now()-interval '1 minute' where id='40000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if not exists(select 1 from public.list_couple_letters('20000000-0000-4000-8000-000000000001') where content='Private content') then raise exception 'Due letter did not unlock'; end if;
end; $$;
rollback;
select 'PASS: retries, overdrafts, balance permissions, two members, scheduled letters, notification deduplication and outsider isolation. Fixtures rolled back.' as result;
