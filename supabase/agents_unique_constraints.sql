-- =============================================================================
-- Add uniqueness so the same agent cannot be added twice.
--   card_url: always required — uniqueness is a plain UNIQUE constraint.
--   url:      may be null (when a card has no self-reported url) — use a
--             partial unique index so we only enforce uniqueness on non-null
--             values.
-- Idempotent — safe to re-run.
-- =============================================================================

alter table public.agents
  drop constraint if exists agents_card_url_unique;

alter table public.agents
  add constraint agents_card_url_unique unique (card_url);

drop index if exists public.agents_url_unique_idx;

create unique index agents_url_unique_idx
  on public.agents (url)
  where url is not null;
