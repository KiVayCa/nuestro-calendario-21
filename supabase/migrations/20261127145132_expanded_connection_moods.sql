alter table public.couple_connection drop constraint connection_content;
alter table public.couple_connection add constraint connection_content check (
 (kind in ('heart','hug','thinking') and body is null)
 or (kind='compliment' and body is not null and char_length(btrim(body)) between 1 and 500)
 or (kind='mood' and body is not null and body in ('happy','calm','tired','sad','stressed','love','excited','grateful','hopeful','proud','peaceful','playful','motivated','surprised','anxious','worried','overwhelmed','frustrated','angry','lonely','nostalgic','sick','confused','sleepy'))
);
