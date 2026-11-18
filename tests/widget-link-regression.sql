begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000001','widget-test-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000002','widget-test-b@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000001','Widget fixture A','11000000-0000-4000-8000-000000000001'),
 ('21000000-0000-4000-8000-000000000002','Widget fixture B','11000000-0000-4000-8000-000000000002');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001'),
 ('21000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002');
insert into public.plans(couple_id,created_by,title,plan_date) values
 ('21000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','Visible fixture',current_date),
 ('21000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002','Other private fixture',current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare code text; begin
 code=public.create_widget_pair_code('21000000-0000-4000-8000-000000000001',encode(extensions.digest(repeat('a',64),'sha256'),'hex'),repeat('b',32));
 perform set_config('widget_test.code',code,true);
 begin perform token_hash from public.widget_devices; raise exception 'Hash column exposed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare device jsonb; snapshot jsonb; begin
 if public.claim_widget_device(current_setting('widget_test.code'),repeat('c',64),repeat('b',32)) is not null then raise exception 'Wrong verifier accepted'; end if;
 if public.claim_widget_device(current_setting('widget_test.code'),repeat('a',64),repeat('c',32)) is not null then raise exception 'Wrong state accepted'; end if;
 device=public.claim_widget_device(current_setting('widget_test.code'),repeat('a',64),repeat('b',32));
 if device is null then raise exception 'Valid link rejected'; end if;
 perform set_config('widget_test.token',device->>'device_token',true);
 snapshot=public.read_widget_snapshot(device->>'device_token');
 if snapshot is null or jsonb_array_length(snapshot->'plans')<>1 or snapshot::text like '%Other private fixture%' then raise exception 'Couple boundary failed'; end if;
 if snapshot->'plans'->0 ? 'note' or snapshot->'plans'->0 ? 'budget' then raise exception 'Unnecessary private fields exposed'; end if;
 if public.claim_widget_device(current_setting('widget_test.code'),repeat('a',64),repeat('b',32)) is not null then raise exception 'Code replay accepted'; end if;
 if public.read_widget_snapshot(repeat('0',64)) is not null then raise exception 'Invalid device token accepted'; end if;
 begin perform id from public.widget_devices; raise exception 'Anonymous table access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.widget_devices set expires_at=now()-interval '1 second' where user_id='11000000-0000-4000-8000-000000000001';
set local role anon;
do $$ begin if public.read_widget_snapshot(current_setting('widget_test.token')) is not null then raise exception 'Expired permission accepted'; end if; end $$;
reset role;
update public.widget_devices set expires_at=now()+interval '1 day' where user_id='11000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.widget_devices) then raise exception 'Device list leaked to another user'; end if;
 begin perform public.create_widget_pair_code('21000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',32));raise exception 'Outsider linked another couple';exception when insufficient_privilege then null;end;
end $$;
reset role;
delete from public.couple_members where user_id='11000000-0000-4000-8000-000000000001';
set local role anon;
do $$ begin
 if public.read_widget_snapshot(current_setting('widget_test.token')) is not null then raise exception 'Membership removal ignored'; end if;
 perform public.revoke_widget_device(current_setting('widget_test.token'));
 if public.read_widget_snapshot(current_setting('widget_test.token')) is not null then raise exception 'Revocation ignored'; end if;
end $$;
reset role;
rollback;
select 'Widget link: proof, state, replay, scope, expiry, RLS, revocation passed' as result;
