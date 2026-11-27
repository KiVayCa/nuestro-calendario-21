create schema if not exists nc21_private;
revoke all on schema nc21_private from public,anon,authenticated;
grant usage on schema nc21_private to authenticated;

create table public.couple_knowing_answers (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 question_key text not null check(question_key ~ '^(love-v1|[a-z]+-[0-9]{2})$' and length(question_key)<=32),
 answer text not null check(char_length(btrim(answer)) between 1 and 2000),
 created_at timestamptz not null default now(),
 unique(couple_id,user_id,question_key),
 check(question_key <> 'love-v1' or answer ~ '^[1-5]{8}$')
);
alter table public.couple_knowing_answers enable row level security;
revoke all on public.couple_knowing_answers from public,anon,authenticated;
grant select on public.couple_knowing_answers to authenticated;
grant insert(couple_id,user_id,question_key,answer) on public.couple_knowing_answers to authenticated;

-- Only checks the current member's own submission; no answer is returned.
create function nc21_private.knowing_has_answer(p_couple uuid,p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.is_couple_member(p_couple)
 and exists(select 1 from public.couple_knowing_answers a where a.couple_id=p_couple and a.user_id=auth.uid() and a.question_key=p_key);
$$;
revoke all on function nc21_private.knowing_has_answer(uuid,text) from public,anon,authenticated;
grant execute on function nc21_private.knowing_has_answer(uuid,text) to authenticated;
create policy knowing_read on public.couple_knowing_answers for select to authenticated using (
 public.is_couple_member(couple_id) and (user_id=(select auth.uid()) or nc21_private.knowing_has_answer(couple_id,question_key))
);
create policy knowing_insert on public.couple_knowing_answers for insert to authenticated with check (
 user_id=(select auth.uid()) and public.is_couple_member(couple_id)
);
alter publication supabase_realtime add table public.couple_knowing_answers;
