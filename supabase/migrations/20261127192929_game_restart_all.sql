alter table public.couple_game_matches add column reset_version integer not null default 0;
alter policy game_match_move on public.couple_game_matches using(public.is_couple_member(couple_id) and archived_at is null and (kind='bingo' or turn_user_id=auth.uid() or created_by=auth.uid() or opponent_id=auth.uid())) with check(public.is_couple_member(couple_id));
create or replace function public.manage_game_match() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_couple_member(old.couple_id) or old.archived_at is not null then raise exception 'No autorizado';end if;
 if new.archived_at is not null then
   if old.created_by<>auth.uid() then raise exception 'Solo quien creó la partida puede eliminarla';end if;
   new:=old; new.archived_at:=now(); return new;
 end if;
 if new.last_move=-2 then
   if old.status<>'active' or (old.kind<>'bingo' and auth.uid() is distinct from old.created_by and auth.uid() is distinct from old.opponent_id) then raise exception 'No se puede reiniciar esta partida';end if;
   new:=old;
   if old.kind<>'wordbingo' then new.board:=array_fill(0,array[case old.kind when 'tic' then 9 when 'connect' then 42 else 25 end]);end if;
   new.called_numbers:='{}';new.move_count:=0;new.last_move:=-2;new.reset_version:=old.reset_version+1;
   new.turn_user_id:=case when old.kind='bingo' then null else old.created_by end;
   new.winner_id:=null;return new;
 end if;
 return new;
end $$;
revoke all on function public.manage_game_match() from public,anon,authenticated;
