begin;
insert into auth.users(id,email) values ('11000000-0000-4000-8000-000000000094','solo-a@example.invalid'),('11000000-0000-4000-8000-000000000095','solo-b@example.invalid'),('11000000-0000-4000-8000-000000000096','solo-c@example.invalid');
insert into public.couples(id,name,created_by) values ('21000000-0000-4000-8000-000000000094','Solo test','11000000-0000-4000-8000-000000000094');
insert into public.couple_members(couple_id,user_id) values ('21000000-0000-4000-8000-000000000094','11000000-0000-4000-8000-000000000094'),('21000000-0000-4000-8000-000000000094','11000000-0000-4000-8000-000000000095');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000094',true);
insert into public.couple_game_results(couple_id,user_id,kind,score) select '21000000-0000-4000-8000-000000000094',auth.uid(),kind,score from (values ('simon',20),('sudoku',925),('tile2048',16384),('darts',500)) as x(kind,score);
do $$ begin
begin insert into public.couple_game_results(couple_id,user_id,kind,score) values ('21000000-0000-4000-8000-000000000094',auth.uid(),'darts',501);raise exception 'Invalid score accepted';exception when check_violation then null;end;
begin insert into public.couple_game_results(couple_id,user_id,kind,score) values ('21000000-0000-4000-8000-000000000094','11000000-0000-4000-8000-000000000095','simon',20);raise exception 'Foreign identity accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000095',true);
do $$ begin if (select count(*) from public.couple_game_results where couple_id='21000000-0000-4000-8000-000000000094')<>4 then raise exception 'Partner visibility failed';end if;update public.couple_game_results set archived_at=now() where kind='simon' and couple_id='21000000-0000-4000-8000-000000000094';if found then raise exception 'Partner archive allowed';end if;end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000096',true);
do $$ begin if exists(select 1 from public.couple_game_results where couple_id='21000000-0000-4000-8000-000000000094') then raise exception 'Privacy failed';end if;end $$;
reset role;
rollback;
select 'Individual results, limits, partner visibility and isolation passed' as result;
