begin;
insert into auth.users(id,email) values ('11000000-0000-4000-8000-000000000091','bingo-a@example.invalid'),('11000000-0000-4000-8000-000000000092','bingo-b@example.invalid'),('11000000-0000-4000-8000-000000000093','bingo-c@example.invalid');
insert into public.couples(id,name,created_by) values ('21000000-0000-4000-8000-000000000091','Bingo test','11000000-0000-4000-8000-000000000091');
insert into public.couple_members(couple_id,user_id) values ('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000091'),('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000092');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
do $$ declare m uuid; m2 uuid; g public.couple_game_matches; i integer; begin
 insert into public.couple_game_matches(couple_id,created_by,opponent_id,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'11000000-0000-4000-8000-000000000092','wordbingo') returning id into m;
 insert into public.couple_game_matches(couple_id,created_by,opponent_id,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'11000000-0000-4000-8000-000000000092','wordbingo') returning id into m2;
 if m=m2 then raise exception 'Fresh board failed';end if;
 select * into g from public.couple_game_matches where id=m;
 if cardinality(g.board)<>50 or cardinality(g.called_numbers)<>0 or (select count(distinct x) from unnest(g.board[1:25]) x)<>25 or (select count(distinct x) from unnest(g.board[26:50]) x)<>25 then raise exception 'Bad cards';end if;
 update public.couple_game_matches set last_move=-1 where id=m;
 begin update public.couple_game_matches set last_move=-1 where id=m; if found then raise exception 'Double turn';end if; exception when raise_exception then if sqlerrm='Double turn' then raise;end if;end;
 for i in 1..74 loop
   select * into g from public.couple_game_matches where id=m;
   exit when g.status<>'active';
   perform set_config('request.jwt.claim.sub',g.turn_user_id::text,true);
   update public.couple_game_matches set last_move=-1 where id=m;
 end loop;
 select * into g from public.couple_game_matches where id=m;
 if g.status not in ('won','draw') or cardinality(g.called_numbers)<>(select count(distinct x) from unnest(g.called_numbers) x) then raise exception 'Draw or winner failed';end if;
 if not exists(select 1 from public.couple_game_matches where id=m2 and move_count=0 and cardinality(called_numbers)=0) then raise exception 'New board not empty';end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000093',true);
do $$ begin if exists(select 1 from public.couple_game_matches) then raise exception 'Privacy violation';end if;end $$;
reset role;
rollback;
select 'Word bingo cards, draws, winner, new match and privacy passed' as result;
