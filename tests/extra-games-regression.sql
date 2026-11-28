begin;
insert into auth.users(id,email) values ('11000000-0000-4000-8000-000000000091','extra-a@example.invalid'),('11000000-0000-4000-8000-000000000092','extra-b@example.invalid'),('11000000-0000-4000-8000-000000000093','extra-c@example.invalid');
insert into public.couples(id,name,created_by) values ('21000000-0000-4000-8000-000000000091','Extra games test','11000000-0000-4000-8000-000000000091');
insert into public.couple_members(couple_id,user_id) values ('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000091'),('21000000-0000-4000-8000-000000000091','11000000-0000-4000-8000-000000000092');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
do $$ declare m uuid; k text; g public.couple_game_matches; a integer; cards integer[]; cell integer; i integer; begin
 foreach k in array array['ludo','naval','colors','checkers','snakes','hangman'] loop
   perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000091',true);
   insert into public.couple_game_matches(couple_id,created_by,opponent_id,kind) values('21000000-0000-4000-8000-000000000091',auth.uid(),'11000000-0000-4000-8000-000000000092',k) returning * into g;m:=g.id;
   if k in ('naval','colors') then
     if (select count(*) from public.couple_game_private where match_id=m)<>1 then raise exception 'Secret visibility failed %',k;end if;
     select payload into cards from public.couple_game_private where match_id=m;if cardinality(cards)<>(case when k='naval' then 6 else 7 end) then raise exception 'Bad hand';end if;
   end if;
   if k='checkers' then a:=(g.game_state->'legal'->>0)::integer;elsif k in ('snakes','ludo','colors') then a:=-10;else a:=0;end if;
   update public.couple_game_matches set last_move=a where id=m;
   select * into g from public.couple_game_matches where id=m;
   if g.move_count<>1 then raise exception 'Move not recorded %',k;end if;
   if k='colors' then if (select cardinality(payload) from public.couple_game_private where match_id=m)<>8 then raise exception 'Draw failed';end if;end if;
   if k='naval' then if g.board[1] not in (1,2) then raise exception 'Shot failed';end if;end if;
   perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000092',true);
   if k in ('naval','colors') and (select count(*) from public.couple_game_private where match_id=m)<>1 then raise exception 'Partner hand leaked';end if;
   update public.couple_game_matches set last_move=-2 where id=m;
   if not exists(select 1 from public.couple_game_matches where id=m and reset_version=1 and move_count=0 and status='active') then raise exception 'Reset failed %',k;end if;
   -- Run each game through ordinary alternating moves to completion (or the
   -- documented checkers cap); the client never sets the winner.
   for i in 1..1800 loop
     select * into g from public.couple_game_matches where id=m;
     exit when g.status<>'active';
     perform set_config('request.jwt.claim.sub',g.turn_user_id::text,true);
     if k='ludo' then a:=coalesce((g.game_state->'legal'->>0)::integer,-10);
     elsif k='snakes' then a:=-10;
     elsif k='checkers' then a:=(g.game_state->'legal'->>0)::integer;
     elsif k='naval' then cell:=case when g.turn_user_id=g.created_by then 0 else 25 end;select x into a from generate_series(0,24) x where g.board[cell+x+1]=0 limit 1;
     elsif k='colors' then
       select payload into cards from public.couple_game_private where match_id=m;cell:=(g.game_state->>'top')::integer;
       select coalesce(min(x-1),-10) into a from generate_subscripts(cards,1) x where cards[x]/10=cell/10 or cards[x]%10=cell%10;
     else select x into a from generate_series(0,25) x where not(x=any(g.board)) limit 1;end if;
     update public.couple_game_matches set last_move=a where id=m;
   end loop;
   if not exists(select 1 from public.couple_game_matches where id=m and status in ('won','draw')) then raise exception 'Game did not finish: %',k;end if;
 end loop;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000093',true);
do $$ begin if exists(select 1 from public.couple_game_matches) or exists(select 1 from public.couple_game_private) then raise exception 'Outsider visibility';end if;end $$;
reset role;
rollback;
select 'Six game creation, legal moves, hidden hands, restart and isolation passed' as result;
