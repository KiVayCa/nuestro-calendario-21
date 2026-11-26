begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000061','personal-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000062','personal-b@example.invalid'),
 ('11000000-0000-4000-8000-000000000063','personal-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000061','Personal fixture','11000000-0000-4000-8000-000000000061'),
 ('21000000-0000-4000-8000-000000000063','Other fixture','11000000-0000-4000-8000-000000000063');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000061','11000000-0000-4000-8000-000000000061'),
 ('21000000-0000-4000-8000-000000000061','11000000-0000-4000-8000-000000000062'),
 ('21000000-0000-4000-8000-000000000063','11000000-0000-4000-8000-000000000063');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000061',true);
insert into public.couple_personalization(couple_id,user_id,module_order,shortcuts,density)
 values('21000000-0000-4000-8000-000000000061',auth.uid(),array['home','fe'],array['fe'],'compact')
 on conflict(couple_id,user_id) do update set module_order=excluded.module_order,density=excluded.density;
insert into public.couple_personalization(couple_id,user_id,module_order,density)
 values('21000000-0000-4000-8000-000000000061',auth.uid(),array['calendar','home'],'comfortable')
 on conflict(couple_id,user_id) do update set module_order=excluded.module_order,density=excluded.density;
insert into public.couple_settings(couple_id,updated_by,home_title,home_subtitle)
 values('21000000-0000-4000-8000-000000000061',auth.uid(),'Test cover','Together')
 on conflict(couple_id) do update set home_title=excluded.home_title,home_subtitle=excluded.home_subtitle,updated_by=excluded.updated_by;
do $$ begin
 if not exists(select 1 from public.couple_personalization where density='comfortable' and module_order[1]='calendar') then raise exception 'Upsert failed';end if;
 begin insert into public.couple_personalization(couple_id,user_id) values('21000000-0000-4000-8000-000000000061','11000000-0000-4000-8000-000000000062');raise exception 'User impersonation';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000062',true);
do $$ begin
 if exists(select 1 from public.couple_personalization) then raise exception 'Private preferences visible to partner';end if;
 update public.couple_personalization set density='compact' where user_id='11000000-0000-4000-8000-000000000061';
 if found then raise exception 'Partner edited private preference';end if;
 if not exists(select 1 from public.couple_settings where home_title='Test cover') then raise exception 'Shared cover missing';end if;
 update public.couple_settings set home_title='Shared update',updated_by=auth.uid() where couple_id='21000000-0000-4000-8000-000000000061';
 if not found then raise exception 'Shared cover not editable';end if;
end $$;
insert into public.couple_personalization(couple_id,user_id,text_size) values('21000000-0000-4000-8000-000000000061',auth.uid(),'large');
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000063',true);
do $$ begin
 if exists(select 1 from public.couple_personalization) or exists(select 1 from public.couple_settings where couple_id='21000000-0000-4000-8000-000000000061') then raise exception 'Outside pair data visible';end if;
end $$;
reset role;
rollback;
select 'Personal preference isolation, upsert and shared cover passed' as result;
