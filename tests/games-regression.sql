begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000091','games-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000092','games-b@example.invalid'),
 ('11000000-0000-4000-8000-000000000093','games-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000091','Game test','11000000-0000-4000-8000-000000000091');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000091'),
 ('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000092');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
do $$ declare m uuid; begin
 insert into public.couple_game_matches(couple_id,created_by,opponent_id,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'11000000-0000-4000-8000-000000000092','tic') returning id into m;
 perform set_config('test.tic',m::text,true);
 insert into public.couple_game_matches(couple_id,created_by,opponent_id,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'11000000-0000-4000-8000-000000000092','connect') returning id into m;
 perform set_config('test.connect',m::text,true);
 insert into public.couple_game_matches(couple_id,created_by,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'bingo') returning id into m;
 perform set_config('test.bingo',m::text,true);
 begin insert into public.couple_game_matches(couple_id,created_by,opponent_id,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'11000000-0000-4000-8000-000000000093','tic');raise exception 'Expected bad opponent';exception when raise_exception then if sqlerrm='Expected bad opponent' then raise;end if;end;
 begin update public.couple_game_matches set board=array[1,1,1] where id=current_setting('test.tic')::uuid;raise exception 'Board writable';exception when insufficient_privilege then null;end;
 update public.couple_game_matches set last_move=0 where id=current_setting('test.tic')::uuid;
 begin update public.couple_game_matches set last_move=1 where id=current_setting('test.tic')::uuid; if found then raise exception 'Double turn allowed';end if; exception when raise_exception then if sqlerrm='Double turn allowed' then raise;end if;end;
 update public.couple_game_matches set last_move=0 where id=current_setting('test.connect')::uuid;
 if not exists(select 1 from public.couple_game_matches where id=current_setting('test.connect')::uuid and board[36]=1) then raise exception 'Gravity failed';end if;
 update public.couple_game_matches set last_move=0 where id=current_setting('test.bingo')::uuid;
 insert into public.couple_game_results(couple_id,user_id,kind,score) values('21000000-0000-4000-8000-000000000091',auth.uid(),'trivia',80);
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000092',true);
do $$ begin
 begin update public.couple_game_matches set last_move=0 where id=current_setting('test.tic')::uuid;raise exception 'Expected occupied cell';exception when raise_exception then if sqlerrm='Expected occupied cell' then raise;end if;end;
 update public.couple_game_matches set last_move=3 where id=current_setting('test.tic')::uuid;
 update public.couple_game_matches set last_move=1 where id=current_setting('test.connect')::uuid;
 update public.couple_game_matches set last_move=1 where id=current_setting('test.bingo')::uuid;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
update public.couple_game_matches set last_move=1 where id=current_setting('test.tic')::uuid;
update public.couple_game_matches set last_move=0 where id=current_setting('test.connect')::uuid;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000092',true);
update public.couple_game_matches set last_move=4 where id=current_setting('test.tic')::uuid;
update public.couple_game_matches set last_move=1 where id=current_setting('test.connect')::uuid;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
update public.couple_game_matches set last_move=2 where id=current_setting('test.tic')::uuid;
update public.couple_game_matches set last_move=0 where id=current_setting('test.connect')::uuid;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000092',true);
update public.couple_game_matches set last_move=1 where id=current_setting('test.connect')::uuid;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
update public.couple_game_matches set last_move=0 where id=current_setting('test.connect')::uuid;
do $$ begin
 if (select count(*) from public.couple_game_matches where winner_id=auth.uid() and status='won')<>2 then raise exception 'Winner detection failed';end if;
 if not exists(select 1 from public.couple_game_matches where id=current_setting('test.bingo')::uuid and move_count=2 and board[1]=1 and board[2]=1) then raise exception 'Shared bingo failed';end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000093',true);
do $$ begin if exists(select 1 from public.couple_game_matches) or exists(select 1 from public.couple_game_results) then raise exception 'Other couple exposed';end if;end $$;
reset role;
rollback;
select 'Games turn, gravity, win, bingo and isolation passed' as result;
