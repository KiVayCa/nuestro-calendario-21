alter table public.couple_game_matches drop constraint couple_game_matches_kind_check;
alter table public.couple_game_matches add constraint couple_game_matches_kind_check check(kind in ('tic','connect','bingo','wordbingo','ludo','naval','colors','checkers','snakes','hangman'));
alter table public.couple_game_matches add column game_state jsonb not null default '{}';
create table public.couple_game_private (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.couple_game_matches(id) on delete cascade deferrable initially deferred,
 couple_id uuid not null references public.couples(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 payload integer[] not null, created_at timestamptz not null default now(), unique(match_id,user_id)
);
alter table public.couple_game_private enable row level security;
revoke all on public.couple_game_private from public,anon,authenticated;
grant select on public.couple_game_private to authenticated;
create policy game_private_own on public.couple_game_private for select to authenticated using(user_id=auth.uid() and public.is_couple_member(couple_id));
alter publication supabase_realtime add table public.couple_game_private;
create table nc21_private.game_words (match_id uuid primary key references public.couple_game_matches(id) on delete cascade deferrable initially deferred, word text not null);
alter table nc21_private.game_words enable row level security;
revoke all on nc21_private.game_words from public,anon,authenticated;

create function nc21_private.checker_moves(b integer[],p integer,forced integer default -1) returns integer[] language plpgsql immutable set search_path='' as $$
declare i integer; r integer; c integer; dr integer; dc integer; dst integer; mid integer; v integer; jumps integer[]:='{}'; steps integer[]:='{}';
begin
 for i in 0..63 loop
   if forced>=0 and i<>forced then continue;end if;
   v:=b[i+1];if v not in (p,p+2) then continue;end if;r:=i/8;c:=i%8;
   for dr in -1..1 by 2 loop for dc in -1..1 by 2 loop
     if v<=2 and ((p=1 and dr<0) or (p=2 and dr>0)) then continue;end if;
     if r+dr<0 or r+dr>7 or c+dc<0 or c+dc>7 then continue;end if;
     mid:=(r+dr)*8+c+dc;
     if b[mid+1]=0 and forced<0 then steps:=array_append(steps,i*64+mid);end if;
     if b[mid+1] in (3-p,5-p) and r+2*dr between 0 and 7 and c+2*dc between 0 and 7 then
       dst:=(r+2*dr)*8+c+2*dc;if b[dst+1]=0 then jumps:=array_append(jumps,i*64+dst);end if;
     end if;
   end loop;end loop;
 end loop;
 return case when cardinality(jumps)>0 then jumps else steps end;
end $$;
revoke all on function nc21_private.checker_moves(integer[],integer,integer) from public,anon,authenticated;

create or replace function public.manage_game_match() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_couple_member(old.couple_id) or old.archived_at is not null then raise exception 'No autorizado';end if;
 if new.archived_at is not null then
   if old.created_by<>auth.uid() then raise exception 'Solo quien creó la partida puede eliminarla';end if;
   new:=old; new.archived_at:=now(); return new;
 end if;
 if old.kind in ('ludo','naval','colors','checkers','snakes','hangman') then return new;end if;
 if new.last_move=-2 then
   if old.status<>'active' or (old.kind<>'bingo' and auth.uid() is distinct from old.created_by and auth.uid() is distinct from old.opponent_id) then raise exception 'No se puede reiniciar esta partida';end if;
   new:=old;
   if old.kind<>'wordbingo' then new.board:=array_fill(0,array[case old.kind when 'tic' then 9 when 'connect' then 42 else 25 end]);end if;
   new.called_numbers:='{}';new.move_count:=0;new.last_move:=-2;new.reset_version:=old.reset_version+1;
   new.turn_user_id:=case when old.kind='bingo' then null else old.created_by end;new.winner_id:=null;return new;
 end if;return new;
end $$;
drop trigger validate_game_match on public.couple_game_matches;
create trigger validate_game_match before insert or update on public.couple_game_matches for each row when(new.kind in ('tic','connect','bingo') and new.archived_at is null and new.last_move is distinct from -2) execute function public.validate_game_match();

-- Hidden words and hands are written only by this trigger. The caller is verified
-- against the couple and both match participants before any privileged operation.
create function nc21_private.advance_extra_game() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); other uuid; u uuid; p integer; q integer; a integer; i integer; j integer; n integer; die integer; pos integer; target integer; idx integer; off integer; val integer; src integer; dst integer; mid integer; capture boolean; promoted boolean; keep_turn boolean:=false; won boolean:=false; tied boolean:=false; b integer[]; hand integer[]; opphand integer[]; fleet integer[]; starts integer[]; legal integer[]; w text; mask text; letter text; hits integer; misses integer; state jsonb; resetting boolean:=false;
begin
 if actor is null or not public.is_couple_member(new.couple_id) or (actor is distinct from new.created_by and actor is distinct from new.opponent_id) then raise exception 'No autorizado';end if;
 if tg_op='INSERT' then
   if new.created_by<>actor or new.opponent_id is null or new.opponent_id=actor or not exists(select 1 from public.couple_members m where m.couple_id=new.couple_id and m.user_id=new.opponent_id) then raise exception 'Pareja inválida';end if;
   resetting:=true;
 elsif new.last_move=-2 then
   if old.status<>'active' then raise exception 'Partida terminada';end if;
   new:=old;new.reset_version:=old.reset_version+1;resetting:=true;
 end if;
 if resetting then
   new.turn_user_id:=new.created_by;new.winner_id:=null;new.status:='active';new.move_count:=0;new.last_move:=null;new.game_state:='{}';
   if new.kind='snakes' then new.board:=array[0,0];new.game_state:='{"die":0}';
   elsif new.kind='ludo' then new.board:=array_fill(-1,array[8]);new.game_state:='{"die":0,"legal":[]}';
   elsif new.kind='checkers' then
     new.board:=array_fill(0,array[64]);for i in 0..63 loop if (i/8+i%8)%2=1 then if i/8<3 then new.board[i+1]:=1;elsif i/8>4 then new.board[i+1]:=2;end if;end if;end loop;
     new.game_state:=jsonb_build_object('legal',to_jsonb(nc21_private.checker_moves(new.board,1)),'forced',-1);
   elsif new.kind='naval' then
     new.board:=array_fill(0,array[50]);
     foreach u in array array[new.created_by,new.opponent_id] loop
       fleet:='{}';for i in 1..3 loop select x into n from generate_series(0,23) x where x%5<4 and not(x=any(fleet)) and not(x+1=any(fleet)) order by random() limit 1;fleet:=fleet||array[n,n+1];end loop;
       insert into public.couple_game_private(match_id,couple_id,user_id,payload) values(new.id,new.couple_id,u,fleet) on conflict(match_id,user_id) do update set payload=excluded.payload;
     end loop;
   elsif new.kind='colors' then
     new.board:=array[]::integer[];foreach u in array array[new.created_by,new.opponent_id] loop
       hand:=array(select floor(random()*40)::integer from generate_series(1,7));insert into public.couple_game_private(match_id,couple_id,user_id,payload) values(new.id,new.couple_id,u,hand) on conflict(match_id,user_id) do update set payload=excluded.payload;
     end loop;new.game_state:=jsonb_build_object('top',floor(random()*40)::integer,'counts',jsonb_build_array(7,7));
   else
     new.board:='{}';select x into w from unnest(array['TERNURA','ESPERANZA','AVENTURA','COMPANEROS','CARINO','PROMESA','GRATITUD','CONFIANZA','MATRIMONIO','ABRAZOS','SONRISA','CANCI0N','ESTRELLAS','HOGAR','ENAMORADOS','BENDICION','CORAZON','PRINCESA','PACIENCIA','RECUERDOS',' FAMILIA']) x order by random() limit 1;w:=replace(btrim(w),'0','O');
     insert into nc21_private.game_words(match_id,word) values(new.id,w) on conflict(match_id) do update set word=excluded.word;new.game_state:=jsonb_build_object('mask',repeat('_',length(w)),'misses',0,'scores',jsonb_build_array(0,0));
   end if;return new;
 end if;
 if old.status<>'active' or old.turn_user_id is distinct from actor or new.last_move is null then raise exception 'No es tu turno';end if;
 a:=new.last_move;new:=old;new.last_move:=a;new.move_count:=old.move_count+1;
 p:=case when actor=old.created_by then 1 else 2 end;q:=3-p;other:=case when p=1 then old.opponent_id else old.created_by end;b:=old.board;state:=old.game_state;
 if old.kind='snakes' then
   if a<>-10 then raise exception 'Tira el dado';end if;die:=1+floor(random()*6)::integer;pos:=b[p];if pos+die<=100 then pos:=pos+die;end if;pos:=case pos when 4 then 14 when 9 then 31 when 20 then 38 when 28 then 84 when 40 then 59 when 51 then 67 when 63 then 81 when 71 then 91 when 17 then 7 when 54 then 34 when 62 then 19 when 64 then 60 when 87 then 24 when 93 then 73 when 95 then 75 when 99 then 78 else pos end;b[p]:=pos;state:=jsonb_build_object('die',die,'player',p);won:=pos=100;
 elsif old.kind='ludo' then
   die:=coalesce((state->>'die')::integer,0);off:=(p-1)*4;
   if a=-10 then
     if die<>0 then raise exception 'Ya tiraste';end if;die:=1+floor(random()*6)::integer;legal:='{}';for i in 0..3 loop pos:=b[off+i+1];if (pos=-1 and die=5) or (pos>=0 and pos<40 and pos+die<=40) then legal:=array_append(legal,i);end if;end loop;keep_turn:=cardinality(legal)>0;state:=jsonb_build_object('die',case when keep_turn then die else 0 end,'last_die',die,'player',p,'legal',to_jsonb(legal));
   else
     if a<0 or a>3 or die=0 or not (state->'legal' @> to_jsonb(array[a])) then raise exception 'Ficha inválida';end if;idx:=off+a+1;pos:=case when b[idx]=-1 then 0 else b[idx]+die end;b[idx]:=pos;
     if pos<40 then target:=(pos+(p-1)*20)%40;if target not in(0,20) then for i in (q-1)*4+1..q*4 loop if b[i]>=0 and b[i]<40 and (b[i]+(q-1)*20)%40=target then b[i]:=-1;end if;end loop;end if;end if;
     won:=b[off+1:off+4]=array[40,40,40,40];state:=jsonb_build_object('die',0,'last_die',die,'player',p,'legal','[]'::jsonb);
   end if;
 elsif old.kind='naval' then
   if a<0 or a>=25 then raise exception 'Casilla inválida';end if;idx:=(p-1)*25+a+1;if b[idx]<>0 then raise exception 'Ya disparaste aquí';end if;select payload into fleet from public.couple_game_private where match_id=old.id and user_id=other;b[idx]:=case when a=any(fleet) then 2 else 1 end;won:=(select count(*) from unnest(b[(p-1)*25+1:p*25]) x where x=2)=6;state:=jsonb_build_object('hit',b[idx]=2,'player',p,'cell',a);
 elsif old.kind='colors' then
   select payload into hand from public.couple_game_private where match_id=old.id and user_id=actor;select payload into opphand from public.couple_game_private where match_id=old.id and user_id=other;val:=(state->>'top')::integer;
   if a=-10 then if cardinality(hand)>=100 then raise exception 'Mano llena';end if;hand:=array_append(hand,floor(random()*40)::integer);
   else if a<0 or a>=cardinality(hand) then raise exception 'Carta inválida';end if;n:=hand[a+1];if n/10<>val/10 and n%10<>val%10 then raise exception 'No coincide color ni número';end if;val:=n;hand:=array(select x from unnest(hand) with ordinality v(x,i) where v.i<>a+1 order by v.i);end if;
   update public.couple_game_private set payload=hand where match_id=old.id and user_id=actor;won:=cardinality(hand)=0;state:=jsonb_build_object('top',val,'counts',case when p=1 then jsonb_build_array(cardinality(hand),cardinality(opphand)) else jsonb_build_array(cardinality(opphand),cardinality(hand)) end);
 elsif old.kind='checkers' then
   if a<0 or a>4095 or not(state->'legal' @> to_jsonb(array[a])) then raise exception 'Movimiento inválido';end if;src:=a/64;dst:=a%64;val:=b[src+1];b[src+1]:=0;b[dst+1]:=val;capture:=abs(dst/8-src/8)=2;promoted:=val<=2 and ((p=1 and dst/8=7) or (p=2 and dst/8=0));if promoted then b[dst+1]:=p+2;end if;
   if capture then mid:=((src/8+dst/8)/2)*8+(src%8+dst%8)/2;b[mid+1]:=0;end if;
   legal:='{}';if capture and not promoted then legal:=nc21_private.checker_moves(b,p,dst);end if;keep_turn:=cardinality(legal)>0;if not keep_turn then legal:=nc21_private.checker_moves(b,q);won:=cardinality(legal)=0;end if;state:=jsonb_build_object('legal',to_jsonb(legal),'forced',case when keep_turn then dst else -1 end);if new.move_count>=200 and not won then tied:=true;end if;
 else
   if a<0 or a>25 or a=any(b) then raise exception 'Letra inválida';end if;letter:=chr(65+a);b:=array_append(b,a);select word into w from nc21_private.game_words where match_id=old.id;mask:='';hits:=0;for i in 1..length(w) loop if ascii(substr(w,i,1))-65=any(b) then mask:=mask||substr(w,i,1);else mask:=mask||'_';end if;if substr(w,i,1)=letter then hits:=hits+1;end if;end loop;misses:=(state->>'misses')::integer+case when hits=0 then 1 else 0 end;legal:=array[(state->'scores'->>0)::integer,(state->'scores'->>1)::integer];legal[p]:=legal[p]+hits;state:=jsonb_build_object('mask',mask,'misses',misses,'scores',to_jsonb(legal));if position('_' in mask)=0 then if legal[p]>legal[q] then won:=true;elsif legal[p]=legal[q] then tied:=true;else new.status:='won';new.winner_id:=other;end if;elsif misses>=8 then tied:=true;state:=state||jsonb_build_object('word',w);end if;
 end if;
 new.board:=b;new.game_state:=state;
 if won then new.status:='won';new.winner_id:=actor;new.turn_user_id:=null;elsif tied then new.status:='draw';new.turn_user_id:=null;elsif new.status='won' then new.turn_user_id:=null;else new.turn_user_id:=case when keep_turn then actor else other end;end if;return new;
end $$;
revoke all on function nc21_private.advance_extra_game() from public,anon,authenticated;
create trigger b_advance_extra_game before insert or update on public.couple_game_matches for each row when(new.kind in ('ludo','naval','colors','checkers','snakes','hangman') and new.archived_at is null) execute function nc21_private.advance_extra_game();
