-- =============================================================================
-- Fix: agents are system-wide, not user-scoped.
-- Drops user_id column + per-user RLS, replaces with system-wide policies.
-- Run after supabase/agents.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop user-scoped policies
-- -----------------------------------------------------------------------------
drop policy if exists agents_select_own on public.agents;
drop policy if exists agents_insert_own on public.agents;
drop policy if exists agents_update_own on public.agents;
drop policy if exists agents_delete_own on public.agents;

-- -----------------------------------------------------------------------------
-- 2. Drop dependent view, then user_id column + index
-- -----------------------------------------------------------------------------
drop view if exists public.agents_with_headers;
drop index if exists public.agents_user_id_idx;
alter table public.agents drop column if exists user_id;

-- -----------------------------------------------------------------------------
-- 3. System-wide RLS: any authenticated user can read/write
-- -----------------------------------------------------------------------------
alter table public.agents enable row level security;

drop policy if exists agents_select_all on public.agents;
create policy agents_select_all on public.agents
  for select to authenticated using (true);

drop policy if exists agents_insert_all on public.agents;
create policy agents_insert_all on public.agents
  for insert to authenticated with check (true);

drop policy if exists agents_update_all on public.agents;
create policy agents_update_all on public.agents
  for update to authenticated using (true) with check (true);

drop policy if exists agents_delete_all on public.agents;
create policy agents_delete_all on public.agents
  for delete to authenticated using (true);

-- -----------------------------------------------------------------------------
-- 4. Rebuild the helper view without user_id
-- -----------------------------------------------------------------------------
drop view if exists public.agents_with_headers;

create view public.agents_with_headers
with (security_invoker = true) as
select
  a.id,
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
