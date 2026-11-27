create table public.couple_game_matches (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 opponent_id uuid references auth.users(id) on delete cascade,
 kind text not null check(kind in ('tic','connect','bingo')),
 board integer[] not null default '{}',
 turn_user_id uuid references auth.users(id) on delete cascade,
 winner_id uuid references auth.users(id) on delete cascade,
 status text not null default 'active' check(status in ('active','won','draw','done')),
 last_move integer,
 move_count integer not null default 0,
 created_at timestamptz not null default now()
);
create index game_matches_couple on public.couple_game_matches(couple_id,created_at desc);
create unique index game_one_active_bingo on public.couple_game_matches(couple_id) where kind='bingo' and status='active';
create table public.couple_game_results (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('trivia','memory','puzzle','guess','roulette')),
 score integer not null check(score between 0 and 1000),
 created_at timestamptz not null default now()
);
create index game_results_couple on public.couple_game_results(couple_id,created_at desc);
alter table public.couple_game_matches enable row level security;
alter table public.couple_game_results enable row level security;
revoke all on public.couple_game_matches,public.couple_game_results from public,anon,authenticated;
grant select on public.couple_game_matches,public.couple_game_results to authenticated;
grant insert(couple_id,created_by,opponent_id,kind) on public.couple_game_matches to authenticated;
grant update(last_move) on public.couple_game_matches to authenticated;
grant insert(couple_id,user_id,kind,score) on public.couple_game_results to authenticated;
create policy game_match_read on public.couple_game_matches for select to authenticated using(public.is_couple_member(couple_id));
create policy game_match_create on public.couple_game_matches for insert to authenticated with check(created_by=auth.uid() and public.is_couple_member(couple_id));
create policy game_match_move on public.couple_game_matches for update to authenticated using(public.is_couple_member(couple_id) and (kind='bingo' or turn_user_id=auth.uid())) with check(public.is_couple_member(couple_id));
create policy game_result_read on public.couple_game_results for select to authenticated using(public.is_couple_member(couple_id));
create policy game_result_create on public.couple_game_results for insert to authenticated with check(user_id=auth.uid() and public.is_couple_member(couple_id));

-- The database, not the browser, computes the legal next position and winner.
create function public.validate_game_match() returns trigger language plpgsql security invoker set search_path='' as $$
declare
 actor uuid:=auth.uid(); cell integer; player integer; r integer; c integer; dr integer; dc integer; k integer; hit boolean; won boolean:=false; width integer; height integer; needed integer;
begin
 if actor is null or not public.is_couple_member(new.couple_id) then raise exception 'No autorizado'; end if;
 if tg_op='INSERT' then
   if new.created_by<>actor then raise exception 'Jugador inválido';end if;
   if new.kind='bingo' then new.opponent_id:=null;new.board:=array_fill(0,array[25]);new.turn_user_id:=null;
   else
     if new.opponent_id is null or new.opponent_id=actor or not exists(select 1 from public.couple_members m where m.couple_id=new.couple_id and m.user_id=new.opponent_id) then raise exception 'Pareja inválida';end if;
     new.board:=array_fill(0,array[case when new.kind='tic' then 9 else 42 end]);new.turn_user_id:=actor;
   end if;
   return new;
 end if;
 if old.status<>'active' or new.last_move is null then raise exception 'Partida finalizada o jugada inválida';end if;
 cell:=new.last_move;
 new:=old;
 new.last_move:=cell;
 if old.kind='bingo' then
   if cell<0 or cell>=25 or old.board[cell+1]<>0 then raise exception 'Casilla inválida';end if;
   new.board[cell+1]:=1;new.move_count:=old.move_count+1;
   if new.move_count=25 then new.status:='done';end if;
   return new;
 end if;
 if old.turn_user_id is distinct from actor then raise exception 'No es tu turno';end if;
 player:=case when actor=old.created_by then 1 else 2 end;
 width:=case when old.kind='tic' then 3 else 7 end; height:=case when old.kind='tic' then 3 else 6 end;needed:=case when old.kind='tic' then 3 else 4 end;
 if old.kind='connect' then
   if cell<0 or cell>=width then raise exception 'Columna inválida';end if;
   c:=cell;cell:=-1;
   for r in reverse height-1..0 loop if old.board[r*width+c+1]=0 then cell:=r*width+c;exit;end if;end loop;
 end if;
 if cell<0 or cell>=width*height or old.board[cell+1]<>0 then raise exception 'Casilla ocupada';end if;
 new.board[cell+1]:=player;new.move_count:=old.move_count+1;
 for r in 0..height-1 loop for c in 0..width-1 loop
   for dr in 0..1 loop for dc in -1..1 loop
     if dr=0 and dc<>1 then continue;end if;
     if r+(needed-1)*dr>=height or c+(needed-1)*dc<0 or c+(needed-1)*dc>=width then continue;end if;
     hit:=true;
     for k in 0..needed-1 loop if new.board[(r+k*dr)*width+c+k*dc+1]<>player then hit:=false;exit;end if;end loop;
     if hit then won:=true;end if;
   end loop;end loop;
 end loop;end loop;
 if won then new.status:='won';new.winner_id:=actor;new.turn_user_id:=null;
 elsif new.move_count=width*height then new.status:='draw';new.turn_user_id:=null;
 else new.turn_user_id:=case when actor=old.created_by then old.opponent_id else old.created_by end;end if;
 return new;
end $$;
revoke all on function public.validate_game_match() from public,anon,authenticated;
create trigger validate_game_match before insert or update on public.couple_game_matches for each row execute function public.validate_game_match();
alter publication supabase_realtime add table public.couple_game_matches,public.couple_game_results;
