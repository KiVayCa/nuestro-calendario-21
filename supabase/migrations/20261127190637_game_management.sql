alter table public.couple_game_matches add column archived_at timestamptz;
alter table public.couple_game_results add column archived_at timestamptz;
grant update(archived_at) on public.couple_game_matches,public.couple_game_results to authenticated;
alter policy game_match_move on public.couple_game_matches using(public.is_couple_member(couple_id) and archived_at is null and (kind='bingo' or turn_user_id=auth.uid() or created_by=auth.uid())) with check(public.is_couple_member(couple_id));
create policy game_result_archive on public.couple_game_results for update to authenticated using(public.is_couple_member(couple_id) and user_id=auth.uid() and archived_at is null) with check(public.is_couple_member(couple_id) and user_id=auth.uid() and archived_at is not null);
drop index public.game_one_active_bingo;
create unique index game_one_active_bingo on public.couple_game_matches(couple_id) where kind='bingo' and status='active' and archived_at is null;

create function public.manage_game_match() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_couple_member(old.couple_id) or old.archived_at is not null then raise exception 'No autorizado';end if;
 if new.archived_at is not null then
   if old.created_by<>auth.uid() then raise exception 'Solo quien creó la partida puede eliminarla';end if;
   new:=old; new.archived_at:=now(); return new;
 end if;
 if new.last_move=-2 then
   if old.kind<>'bingo' or old.status<>'active' then raise exception 'Solo se puede reiniciar el bingo de actividades activo';end if;
   new:=old;new.board:=array_fill(0,array[25]);new.move_count:=0;new.last_move:=-2;return new;
 end if;
 return new;
end $$;
revoke all on function public.manage_game_match() from public,anon,authenticated;
create trigger a_manage_game_match before update on public.couple_game_matches for each row execute function public.manage_game_match();
drop trigger validate_game_match on public.couple_game_matches;
create trigger validate_game_match before insert or update on public.couple_game_matches for each row when(new.kind<>'wordbingo' and new.archived_at is null and new.last_move is distinct from -2) execute function public.validate_game_match();
drop trigger validate_word_bingo on public.couple_game_matches;
create trigger validate_word_bingo before insert or update on public.couple_game_matches for each row when(new.kind='wordbingo' and new.archived_at is null and new.last_move is distinct from -2) execute function public.validate_word_bingo();
