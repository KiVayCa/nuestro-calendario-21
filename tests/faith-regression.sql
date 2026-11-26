begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000041','faith-a@example.invalid'),
 ('11000000-0000-4000-8000-000000000042','faith-b@example.invalid'),
 ('11000000-0000-4000-8000-000000000043','faith-c@example.invalid');
insert into public.couples(id,name,created_by) values
 ('21000000-0000-4000-8000-000000000041','Faith fixture','11000000-0000-4000-8000-000000000041'),
 ('21000000-0000-4000-8000-000000000043','Other fixture','11000000-0000-4000-8000-000000000043');
insert into public.couple_members(couple_id,user_id) values
 ('21000000-0000-4000-8000-000000000041','11000000-0000-4000-8000-000000000041'),
 ('21000000-0000-4000-8000-000000000041','11000000-0000-4000-8000-000000000042'),
 ('21000000-0000-4000-8000-000000000043','11000000-0000-4000-8000-000000000043');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000041',true);
do $$ declare prayer_id uuid; begin
 insert into public.couple_faith(couple_id,created_by,kind,title,body) values
 ('21000000-0000-4000-8000-000000000041',auth.uid(),'prayer','Test prayer','Private test') returning id into prayer_id;
 perform set_config('test.prayer',prayer_id::text,true);
 insert into public.couple_faith(couple_id,created_by,kind) values('21000000-0000-4000-8000-000000000041',auth.uid(),'devotional');
 begin insert into public.couple_faith(couple_id,created_by,kind) values('21000000-0000-4000-8000-000000000041',auth.uid(),'devotional'); raise exception 'Duplicate daily reading'; exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000042',true);
do $$ begin
 if not exists(select 1 from public.couple_faith where id=current_setting('test.prayer')::uuid) then raise exception 'Partner cannot read'; end if;
 insert into public.couple_faith(couple_id,created_by,kind,parent_id) values('21000000-0000-4000-8000-000000000041',auth.uid(),'support',current_setting('test.prayer')::uuid);
 begin insert into public.couple_faith(couple_id,created_by,kind,parent_id) values('21000000-0000-4000-8000-000000000041',auth.uid(),'support',current_setting('test.prayer')::uuid); raise exception 'Duplicate support'; exception when unique_violation then null; end;
 update public.couple_faith set answered=true where id=current_setting('test.prayer')::uuid;
 if found then raise exception 'Partner edited author prayer'; end if;
 insert into public.couple_faith(couple_id,created_by,kind) values('21000000-0000-4000-8000-000000000041',auth.uid(),'devotional');
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000041',true);
update public.couple_faith set answered=true where id=current_setting('test.prayer')::uuid;
do $$ begin
 if not exists(select 1 from public.couple_faith where id=current_setting('test.prayer')::uuid and answered) then raise exception 'Author cannot mark answered'; end if;
 if (select count(*) from public.couple_faith where kind='devotional')<>2 then raise exception 'Daily reading count failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000043',true);
do $$ begin
 if exists(select 1 from public.couple_faith) then raise exception 'Private journal exposed'; end if;
 begin insert into public.couple_faith(couple_id,created_by,kind,parent_id) values('21000000-0000-4000-8000-000000000043',auth.uid(),'support',current_setting('test.prayer')::uuid); raise exception 'Cross-space support accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Faith privacy, daily reading, support and author permissions passed' as result;
