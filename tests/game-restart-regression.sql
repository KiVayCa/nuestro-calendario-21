begin;
insert into auth.users(id,email) values ('11000000-0000-4000-8000-000000000091','restart-a@example.invalid'),('11000000-0000-4000-8000-000000000092','restart-b@example.invalid'),('11000000-0000-4000-8000-000000000093','restart-c@example.invalid');
insert into public.couples(id,name,created_by) values ('21000000-0000-4000-8000-000000000091','Restart test','11000000-0000-4000-8000-000000000091');
insert into public.couple_members(couple_id,user_id) values ('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000091'),('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000092');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
do $$ declare m uuid; k text; original integer[]; begin
 foreach k in array array['tic','connect','bingo','wordbingo'] loop
   perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
   insert into public.couple_game_matches(couple_id,created_by,opponent_id,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'11000000-0000-4000-8000-000000000092',k) returning id,board into m,original;
   update public.couple_game_matches set last_move=case when k='wordbingo' then -1 else 0 end where id=m;
   perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000092',true);
   update public.couple_game_matches set last_move=-2 where id=m;
   if not exists(select 1 from public.couple_game_matches where id=m and move_count=0 and reset_version=1 and cardinality(called_numbers)=0 and board=original and (k='bingo' or turn_user_id=created_by)) then raise exception 'Reset failed for %',k;end if;
   perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
   update public.couple_game_matches set last_move=case when k='wordbingo' then -1 else 0 end where id=m and reset_version=0;
   if found then raise exception 'Stale action accepted';end if;
   update public.couple_game_matches set last_move=case when k='wordbingo' then -1 else 0 end where id=m and reset_version=1;
   if not exists(select 1 from public.couple_game_matches where id=m and move_count=1) then raise exception 'Move after restart failed';end if;
 end loop;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000093',true);
do $$ begin update public.couple_game_matches set last_move=-2; if found then raise exception 'Outsider reset';end if;end $$;
reset role;
rollback;
select 'All four shared games reset, stale moves rejected, privacy passed' as result;
