-- ═══════════════════════════════════════════════════════════
--  Migration 006 — Import staging + telemetry
--  Ejecutar en Supabase SQL Editor (no hay CLI configurado).
--  Reversible: ver bloque "ROLLBACK" al final, comentado.
-- ═══════════════════════════════════════════════════════════

-- ── import_staging ─────────────────────────────────────────
-- Holds every row produced by /api/upload/analyze before the user confirms
-- the import. Acts as a 2-phase commit between extraction and the live
-- public.transactions table.
create table if not exists public.import_staging (
  id           uuid primary key default uuid_generate_v4(),
  import_id    uuid not null,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  amount       numeric(15,2),
  type         text check (type in ('income','expense','recurring','receivable','loan')),
  category     text,
  description  text,
  date         date,
  status       text not null default 'pending'
    check (status in ('pending','needs_review','confirmed','rejected')),
  review_flags jsonb,
  raw_row      jsonb not null,
  region_id    text,
  block_type   text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_import_staging_import_id
  on public.import_staging(import_id);
create index if not exists idx_import_staging_profile_status
  on public.import_staging(profile_id, status);

alter table public.import_staging enable row level security;

drop policy if exists import_staging_own on public.import_staging;
create policy import_staging_own on public.import_staging for all
  using (
    profile_id in (
      select id from public.profiles
      where clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- ── import_metrics ─────────────────────────────────────────
-- One row per /api/upload/analyze call, regardless of outcome. Powers the
-- internal cost dashboard and lets us spot regressions when prompt changes
-- inflate token usage.
create table if not exists public.import_metrics (
  id                     uuid primary key default uuid_generate_v4(),
  import_id              uuid not null,
  profile_id             uuid not null references public.profiles(id) on delete cascade,
  filename               text,
  sheets_count           int,
  regions_detected       int,
  regions_by_type        jsonb,
  transactions_extracted int,
  needs_review_count     int,
  skipped_count          int,
  receivables_count      int,
  loans_count            int,
  tokens_input           int,
  tokens_output          int,
  cost_usd               numeric(10,6),
  duration_ms            int,
  created_at             timestamptz not null default now()
);

create index if not exists idx_import_metrics_import_id
  on public.import_metrics(import_id);
create index if not exists idx_import_metrics_profile_created
  on public.import_metrics(profile_id, created_at desc);

alter table public.import_metrics enable row level security;

drop policy if exists import_metrics_own on public.import_metrics;
create policy import_metrics_own on public.import_metrics for all
  using (
    profile_id in (
      select id from public.profiles
      where clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- ═══════════════════════════════════════════════════════════
--  ROLLBACK (descomentar y ejecutar para deshacer)
-- ═══════════════════════════════════════════════════════════
-- drop table if exists public.import_staging;
-- drop table if exists public.import_metrics;
