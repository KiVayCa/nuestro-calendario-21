create table public.spotify_account_links (
 user_id uuid primary key references auth.users(id) on delete cascade,
 ciphertext text not null check(char_length(ciphertext) between 1 and 16000),
 expires_at timestamptz not null,
 revision uuid not null default gen_random_uuid(),
 lease_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.spotify_account_links enable row level security;
revoke all on public.spotify_account_links from public,anon,authenticated;
grant select,insert,update,delete on public.spotify_account_links to service_role;
