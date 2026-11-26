begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000021','adventure-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000022','adventure-b@example.invalid'),
 ('11000000-0000-4000-8000-000000000023','adventure-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000021','Adventure fixture','11000000-0000-4000-8000-000000000021'),
 ('21000000-0000-4000-8000-000000000023','Other fixture','11000000-0000-4000-8000-000000000023');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000021','11000000-0000-4000-8000-000000000021'),
 ('21000000-0000-4000-8000-000000000021','11000000-0000-4000-8000-000000000022'),
 ('21000000-0000-4000-8000-000000000023','11000000-0000-4000-8000-000000000023');
insert into public.plans(id,couple_id,created_by,title,plan_date) values
 ('31000000-0000-4000-8000-000000000021','21000000-0000-4000-8000-000000000021','11000000-0000-4000-8000-000000000021','Test plan',current_date),
 ('31000000-0000-4000-8000-000000000023','21000000-0000-4000-8000-000000000023','11000000-0000-4000-8000-000000000023','Other plan',current_date);
insert into public.memories(id,couple_id,created_by,title,memory_date) values
 ('41000000-0000-4000-8000-000000000021','21000000-0000-4000-8000-000000000021','11000000-0000-4000-8000-000000000021','Test memory',current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000021',true);
do $$ declare fixture_id uuid; begin
 fixture_id:=public.create_adventure('21000000-0000-4000-8000-000000000021','surprise','','Private fixture','especial',current_date);
 if not exists(select 1 from public.adventure_secrets where adventure_id=fixture_id and details='Private fixture') then raise exception 'Author cannot read'; end if;
 perform set_config('test.surprise',fixture_id::text,true);
 fixture_id:=public.create_adventure('21000000-0000-4000-8000-000000000021','coupon','Coffee','','especial',null);
 perform set_config('test.coupon',fixture_id::text,true);
 begin update public.couple_adventures set status='redeemed' where couple_adventures.id=fixture_id; raise exception 'Creator redeemed own coupon'; exception when insufficient_privilege then null; end;
 fixture_id:=public.create_adventure('21000000-0000-4000-8000-000000000021','experience','Picnic','','naturaleza',current_date);
 perform set_config('test.experience',fixture_id::text,true);
 begin update public.couple_adventures set plan_id='31000000-0000-4000-8000-000000000023' where couple_adventures.id=fixture_id; raise exception 'Other couple linked'; exception when insufficient_privilege then null; end;
 update public.couple_adventures set plan_id='31000000-0000-4000-8000-000000000021' where couple_adventures.id=fixture_id;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000022',true);
do $$ begin
 if not exists(select 1 from public.couple_adventures where id=current_setting('test.surprise')::uuid and title='Cita sorpresa' and details='') then raise exception 'Surprise placeholder missing'; end if;
 if exists(select 1 from public.adventure_secrets where adventure_id=current_setting('test.surprise')::uuid) then raise exception 'Secret visible early'; end if;
 begin update public.couple_adventures set status='revealed' where id=current_setting('test.surprise')::uuid; raise exception 'Recipient revealed secret'; exception when insufficient_privilege then null; end;
 update public.couple_adventures set status='redeemed' where id=current_setting('test.coupon')::uuid and status='pending';
 if not exists(select 1 from public.couple_adventures where id=current_setting('test.coupon')::uuid and completed_at is not null) then raise exception 'Coupon not redeemed'; end if;
 begin update public.couple_adventures set status='pending' where id=current_setting('test.coupon')::uuid; raise exception 'Coupon reopened'; exception when insufficient_privilege then null; end;
 update public.couple_adventures set status='done' where id=current_setting('test.experience')::uuid;
 update public.couple_adventures set memory_id='41000000-0000-4000-8000-000000000021' where id=current_setting('test.experience')::uuid;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000021',true);
update public.couple_adventures set status='revealed' where id=current_setting('test.surprise')::uuid;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000022',true);
do $$ begin
 if not exists(select 1 from public.adventure_secrets where adventure_id=current_setting('test.surprise')::uuid and details='Private fixture') then raise exception 'Reveal not visible'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000023',true);
do $$ begin
 if exists(select 1 from public.couple_adventures where couple_id='21000000-0000-4000-8000-000000000021') or exists(select 1 from public.adventure_secrets) then raise exception 'Couple boundary failed'; end if;
end $$;
reset role;
rollback;
select 'Adventures privacy, coupon redemption, completion and links passed' as result;
