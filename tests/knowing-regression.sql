begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000081','knowing-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000082','knowing-b@example.invalid'),
 ('11000000-0000-4000-8000-000000000083','knowing-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000081','Knowing fixture','11000000-0000-4000-8000-000000000081'),
 ('21000000-0000-4000-8000-000000000083','Other fixture','11000000-0000-4000-8000-000000000083');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000081','11000000-0000-4000-8000-000000000081'),
 ('21000000-0000-4000-8000-000000000081','11000000-0000-4000-8000-000000000082'),
 ('21000000-0000-4000-8000-000000000083','11000000-0000-4000-8000-000000000083');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000081',true);
insert into public.couple_knowing_answers(couple_id,user_id,question_key,answer) values
 ('21000000-0000-4000-8000-000000000081',auth.uid(),'connection-01','Private A'),
 ('21000000-0000-4000-8000-000000000081',auth.uid(),'love-v1','12345123');
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000082',true);
do $$ begin
 if exists(select 1 from public.couple_knowing_answers) then raise exception 'Premature reveal'; end if;
 begin insert into public.couple_knowing_answers(couple_id,user_id,question_key,answer) values('21000000-0000-4000-8000-000000000081','11000000-0000-4000-8000-000000000081','connection-02','Spoof');raise exception 'Spoof accepted';exception when insufficient_privilege then null;end;
 begin insert into public.couple_knowing_answers(couple_id,user_id,question_key,answer) values('21000000-0000-4000-8000-000000000081',auth.uid(),'love-v1','99999999');raise exception 'Bad quiz accepted';exception when check_violation then null;end;
end $$;
insert into public.couple_knowing_answers(couple_id,user_id,question_key,answer) values('21000000-0000-4000-8000-000000000081',auth.uid(),'connection-01','Private B');
do $$ begin
 if (select count(*) from public.couple_knowing_answers where question_key='connection-01')<>2 then raise exception 'Reveal failed';end if;
 if exists(select 1 from public.couple_knowing_answers where question_key='love-v1') then raise exception 'Unrelated quiz revealed';end if;
 begin update public.couple_knowing_answers set answer='Changed' where user_id=auth.uid();raise exception 'Edit allowed';exception when insufficient_privilege then null;end;
 begin insert into public.couple_knowing_answers(couple_id,user_id,question_key,answer) values('21000000-0000-4000-8000-000000000081',auth.uid(),'connection-01','Duplicate');raise exception 'Duplicate allowed';exception when unique_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000081',true);
do $$ begin if (select count(*) from public.couple_knowing_answers where question_key='connection-01')<>2 then raise exception 'First respondent cannot see';end if;end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000083',true);
do $$ begin if exists(select 1 from public.couple_knowing_answers) then raise exception 'Other couple exposed';end if;end $$;
reset role;
rollback;
select 'Knowing privacy, paired reveal, unique and immutable answers passed' as result;
