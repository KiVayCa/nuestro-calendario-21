alter table public.couple_game_matches drop constraint couple_game_matches_kind_check;
alter table public.couple_game_matches add constraint couple_game_matches_kind_check check(kind in ('tic','connect','bingo','wordbingo'));
alter table public.couple_game_matches add column called_numbers integer[] not null default '{}';
drop trigger validate_game_match on public.couple_game_matches;
create trigger validate_game_match before insert or update on public.couple_game_matches for each row when(new.kind<>'wordbingo') execute function public.validate_game_match();

create function public.validate_word_bingo() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); n integer; card integer; i integer; offset_card integer; won boolean; winners integer[]:='{}';
begin
 if actor is null or not public.is_couple_member(new.couple_id) then raise exception 'No autorizado';end if;
 if tg_op='INSERT' then
   if new.created_by<>actor or new.opponent_id is null or new.opponent_id=actor or not exists(select 1 from public.couple_members m where m.couple_id=new.couple_id and m.user_id=new.opponent_id) then raise exception 'Pareja inválida';end if;
   new.board:='{}';
   for card in 1..2 loop
     new.board:=new.board||array(select x from generate_series(1,75) x order by random() limit 25);
   end loop;
   new.called_numbers:='{}';new.turn_user_id:=actor;return new;
 end if;
 if old.status<>'active' or old.turn_user_id is distinct from actor or new.last_move is distinct from -1 then raise exception 'Sorteo inválido';end if;
 new:=old;
 select x into n from generate_series(1,75) x where not(x=any(old.called_numbers)) order by random() limit 1;
 if n is null then raise exception 'No quedan números';end if;
 new.called_numbers:=array_append(old.called_numbers,n);new.last_move:=n;new.move_count:=old.move_count+1;
 for card in 0..1 loop
   offset_card:=card*25;won:=false;
   for i in 0..4 loop
     if (select bool_and(new.board[offset_card+i*5+j+1]=any(new.called_numbers)) from generate_series(0,4) j) or (select bool_and(new.board[offset_card+j*5+i+1]=any(new.called_numbers)) from generate_series(0,4) j) then won:=true;end if;
   end loop;
   if (select bool_and(new.board[offset_card+j*6+1]=any(new.called_numbers)) from generate_series(0,4) j) or (select bool_and(new.board[offset_card+5+j*4]=any(new.called_numbers)) from generate_series(0,4) j) then won:=true;end if;
   if won then winners:=array_append(winners,card);end if;
 end loop;
 if cardinality(winners)=2 then new.status:='draw';new.turn_user_id:=null;
 elsif cardinality(winners)=1 then new.status:='won';new.winner_id:=case when winners[1]=0 then old.created_by else old.opponent_id end;new.turn_user_id:=null;
 else new.turn_user_id:=case when actor=old.created_by then old.opponent_id else old.created_by end;end if;
 return new;
end $$;
revoke all on function public.validate_word_bingo() from public,anon,authenticated;
create trigger validate_word_bingo before insert or update on public.couple_game_matches for each row when(new.kind='wordbingo') execute function public.validate_word_bingo();
