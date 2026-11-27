begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000011','bond-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000012','bond-b@example.invalid'),
 ('11000000-0000-4000-8000-000000000013','bond-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000011','Bond fixture','11000000-0000-4000-8000-000000000011');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000011'),
 ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000012');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000011',true);
insert into public.couple_connection(couple_id,sender_user_id,kind,body) values
 ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000011','heart',null),
 ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000011','mood','happy'),
 ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000011','compliment','Prueba');
insert into public.couple_connection(couple_id,sender_user_id,kind,body)
 select '21000000-0000-4000-8000-000000000011',auth.uid(),'mood',mood from unnest(array['excited','grateful','hopeful','proud','peaceful','playful','motivated','surprised','anxious','worried','overwhelmed','frustrated','angry','lonely','nostalgic','sick','confused','sleepy']) as mood;
do $$ begin
 begin insert into public.couple_connection(couple_id,sender_user_id,kind) values ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000012','heart'); raise exception 'Sender spoofing'; exception when insufficient_privilege then null; end;
 begin insert into public.couple_connection(couple_id,sender_user_id,kind,body) values ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000011','mood','invalid'); raise exception 'Invalid mood'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000012',true);
do $$ begin
 if (select count(*) from public.couple_connection) <> 21 then raise exception 'Partner cannot read'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000013',true);
do $$ begin
 if exists(select 1 from public.couple_connection) then raise exception 'Privacy violation'; end if;
 begin insert into public.couple_connection(couple_id,sender_user_id,kind) values ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000013','heart'); raise exception 'Outsider writing'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Connection: partner access, sender identity, validity and privacy passed' as result;
