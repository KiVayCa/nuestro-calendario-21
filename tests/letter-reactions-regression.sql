begin;
insert into auth.users(id,email) values
 ('13000000-0000-4000-8000-000000000001','reaction-fixture-a@example.invalid'),
 ('13000000-0000-4000-8000-000000000002','reaction-fixture-b@example.invalid'),
 ('13000000-0000-4000-8000-000000000003','reaction-fixture-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('23000000-0000-4000-8000-000000000001','Reaction fixture','13000000-0000-4000-8000-000000000001');
insert into public.couple_members(couple_id,user_id) values
 ('23000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001'),
 ('23000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000002');
insert into public.love_letters(id,couple_id,created_by,title,content,category,unlock_at) values
 ('33000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','Open','Fixture','libre',null),
 ('33000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','Scheduled','Fixture','futuro',now()+interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','13000000-0000-4000-8000-000000000001',true);
select public.set_letter_reaction('33000000-0000-4000-8000-000000000001','❤️');
do $$ begin
  begin
    perform public.set_letter_reaction('33000000-0000-4000-8000-000000000002','❤️');
    raise exception 'Scheduled letter accepted reaction';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','13000000-0000-4000-8000-000000000002',true);
select public.set_letter_reaction('33000000-0000-4000-8000-000000000001','❤️');
do $$ begin
 if (select count(*) from public.letter_reactions where letter_id='33000000-0000-4000-8000-000000000001' and emoji='❤️') <> 2 then
   raise exception 'Partner count mismatch';
 end if;
end $$;
select public.set_letter_reaction('33000000-0000-4000-8000-000000000001','🥰');
select public.set_letter_reaction('33000000-0000-4000-8000-000000000001',null);
do $$ begin
 if (select count(*) from public.letter_reactions where letter_id='33000000-0000-4000-8000-000000000001' and emoji is not null) <> 1 then
   raise exception 'Reaction was not removed or modified the other reaction';
 end if;
end $$;
select set_config('request.jwt.claim.sub','13000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select from public.letter_reactions where letter_id='33000000-0000-4000-8000-000000000001') then raise exception 'Reaction leaked'; end if;
 begin
   perform public.set_letter_reaction('33000000-0000-4000-8000-000000000001','❤️');
   raise exception 'Outsider could react';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'Letter reactions verified' as result;
