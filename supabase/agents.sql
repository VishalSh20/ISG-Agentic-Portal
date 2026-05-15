-- =============================================================================
-- agents table + header encryption
-- Run this once in the Supabase SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;
-- supabase_vault is enabled by default on Supabase projects; if not, enable it
-- via Database -> Extensions before running this file.

-- -----------------------------------------------------------------------------
-- 2. Encryption key in Vault
--    Replace the placeholder with a long random string (>=32 chars).
--    Generate one with:  openssl rand -base64 48
--    After running this block once, DELETE these lines from the file so the
--    key is not committed to git.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'agent_headers_key') then
    perform vault.create_secret(
      'REPLACE_WITH_LONG_RANDOM_STRING',
      'agent_headers_key',
      'Symmetric key for encrypting agent auth headers'
    );
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- 3. Private schema for key accessor
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.headers_key()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'agent_headers_key'
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- 4. agents table
-- -----------------------------------------------------------------------------
create table if not exists public.agents (
  id           text         primary key,
  user_id      uuid         not null references auth.users(id) on delete cascade,
  title        text         not null,
  description  text         not null default '',
  url          text,
  card_url     text         not null,
  skills       jsonb        not null default '[]'::jsonb,
  enabled      boolean      not null default true,
  headers_enc  bytea,           -- pgp_sym_encrypt output; null when no headers
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index if not exists agents_user_id_idx on public.agents(user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
alter table public.agents enable row level security;

drop policy if exists agents_select_own on public.agents;
create policy agents_select_own on public.agents
  for select using (auth.uid() = user_id);

drop policy if exists agents_insert_own on public.agents;
create policy agents_insert_own on public.agents
  for insert with check (auth.uid() = user_id);

drop policy if exists agents_update_own on public.agents;
create policy agents_update_own on public.agents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists agents_delete_own on public.agents;
create policy agents_delete_own on public.agents
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. Encryption RPCs
--    Frontend never sees the key. It calls these to round-trip headers.
-- -----------------------------------------------------------------------------
create or replace function public.encrypt_headers(plaintext text)
returns bytea
language plpgsql
security definer
set search_path = ''
as $$
begin
  if plaintext is null or length(plaintext) = 0 then
    return null;
  end if;
  return pgp_sym_encrypt(plaintext, private.headers_key(), 'cipher-algo=aes256');
end;
$$;

create or replace function public.decrypt_headers(ciphertext bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if ciphertext is null then
    return null;
  end if;
  return pgp_sym_decrypt(ciphertext, private.headers_key());
end;
$$;

revoke all on function public.encrypt_headers(text) from public, anon;
revoke all on function public.decrypt_headers(bytea) from public, anon;
grant execute on function public.encrypt_headers(text) to authenticated;
grant execute on function public.decrypt_headers(bytea) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Convenience view: agents with decrypted headers for the current user
-- -----------------------------------------------------------------------------
create or replace view public.agents_with_headers
with (security_invoker = true) as
select
  a.id,
  a.user_id,
  a.title,
  a.description,
  a.url,
  a.card_url,
  a.skills,
  a.enabled,
  case
    when a.headers_enc is null then null
    else public.decrypt_headers(a.headers_enc)
  end as headers_plaintext,
  a.created_at,
  a.updated_at
from public.agents a;

grant select on public.agents_with_headers to authenticated;
