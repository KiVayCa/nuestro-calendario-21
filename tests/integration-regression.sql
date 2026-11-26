begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000071','integration-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000072','integration-b@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000071','Integration fixture','11000000-0000-4000-8000-000000000071'),
 ('21000000-0000-4000-8000-000000000072','Other fixture','11000000-0000-4000-8000-000000000072');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000071','11000000-0000-4000-8000-000000000071'),
 ('21000000-0000-4000-8000-000000000072','11000000-0000-4000-8000-000000000072');
insert into public.goals(id,couple_id,created_by,title,target_amount) values
 ('31000000-0000-4000-8000-000000000071','21000000-0000-4000-8000-000000000071','11000000-0000-4000-8000-000000000071','Test goal',200),
 ('31000000-0000-4000-8000-000000000072','21000000-0000-4000-8000-000000000072','11000000-0000-4000-8000-000000000072','Other goal',300);
insert into public.dreams(id,couple_id,created_by,title) values
 ('41000000-0000-4000-8000-000000000071','21000000-0000-4000-8000-000000000071','11000000-0000-4000-8000-000000000071','Test dream');
insert into public.memories(id,couple_id,created_by,title,memory_date,photo_url) values
 ('51000000-0000-4000-8000-000000000071','21000000-0000-4000-8000-000000000071','11000000-0000-4000-8000-000000000071','Test memory',current_date,'fixture/photo.png');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000071',true);
update public.dreams set goal_id='31000000-0000-4000-8000-000000000071' where id='41000000-0000-4000-8000-000000000071';
update public.memories set photo_x=25,photo_y=80,photo_zoom=2 where id='51000000-0000-4000-8000-000000000071';
insert into public.couple_settings(couple_id,updated_by,home_photo_x,home_photo_y,home_photo_zoom)
 values('21000000-0000-4000-8000-000000000071',auth.uid(),30,70,1.5);
do $$ begin
 if not exists(select 1 from public.dreams where goal_id='31000000-0000-4000-8000-000000000071') then raise exception 'Link failed';end if;
 if not exists(select 1 from public.memories where photo_x=25 and photo_y=80 and photo_zoom=2 and photo_url='fixture/photo.png') then raise exception 'Photo metadata failed';end if;
 begin update public.dreams set goal_id='31000000-0000-4000-8000-000000000072' where id='41000000-0000-4000-8000-000000000071';raise exception 'Cross space goal linked';exception when insufficient_privilege then null;end;
 begin update public.memories set photo_zoom=4 where id='51000000-0000-4000-8000-000000000071';raise exception 'Bad zoom accepted';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000072',true);
do $$ begin
 update public.memories set photo_x=2 where id='51000000-0000-4000-8000-000000000071';
 if found then raise exception 'Other space photo edited';end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000071',true);
delete from public.goals where id='31000000-0000-4000-8000-000000000071';
do $$ begin
 if not exists(select 1 from public.dreams where id='41000000-0000-4000-8000-000000000071' and goal_id is null) then raise exception 'Dream lost upon unlink';end if;
end $$;
reset role;
rollback;
select 'Dream links and non-destructive frame permissions passed' as result;
