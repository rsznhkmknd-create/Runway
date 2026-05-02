-- ═══════════════════════════════════════════════════════════
--  Migration 007 — External connections (SII / Fintoc / Transbank)
--  Ejecutar en Supabase SQL Editor.
--  Reversible: ver bloque "ROLLBACK" al final, comentado.
-- ═══════════════════════════════════════════════════════════

-- ── connections ─────────────────────────────────────────────
-- One row per (profile, integration). credentials_encrypted holds an
-- AES-256-GCM payload encoded as { iv, tag, ciphertext } base64 — see
-- lib/crypto.ts. For Fintoc we never persist user credentials; instead
-- we store the link_token returned by the widget (still encrypted, since
-- it can read account data).
create table if not exists public.connections (
  id                    uuid primary key default uuid_generate_v4(),
  profile_id            uuid not null references public.profiles(id) on delete cascade,
  type                  text not null check (type in ('sii','fintoc','transbank')),
  status                text not null default 'active'
    check (status in ('active','disconnected','error')),
  mode                  text not null default 'sandbox'
    check (mode in ('sandbox','live')),
  credentials_encrypted text,
  metadata              jsonb not null default '{}'::jsonb,
  last_sync_at          timestamptz,
  last_error            text,
  records_imported      int  not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (profile_id, type)
);

create index if not exists idx_connections_profile
  on public.connections(profile_id);
create index if not exists idx_connections_status_sync
  on public.connections(status, last_sync_at);

alter table public.connections enable row level security;

drop policy if exists connections_own on public.connections;
create policy connections_own on public.connections for all
  using (
    profile_id in (
      select id from public.profiles
      where clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

create trigger connections_updated_at
  before update on public.connections
  for each row execute function update_updated_at();

-- ── sync_logs ───────────────────────────────────────────────
-- Append-only log of every sync attempt (manual or cron). Kept for
-- debugging, audit and the "última sincronización" UI.
create table if not exists public.sync_logs (
  id                uuid primary key default uuid_generate_v4(),
  connection_id    uuid not null references public.connections(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  synced_at        timestamptz not null default now(),
  records_imported int  not null default 0,
  reconciled_count int  not null default 0,
  status           text not null check (status in ('success','partial','error')),
  error            text,
  duration_ms      int,
  trigger          text not null default 'manual'
    check (trigger in ('manual','cron','onboarding'))
);

create index if not exists idx_sync_logs_connection_synced
  on public.sync_logs(connection_id, synced_at desc);
create index if not exists idx_sync_logs_profile_synced
  on public.sync_logs(profile_id, synced_at desc);

alter table public.sync_logs enable row level security;

drop policy if exists sync_logs_own on public.sync_logs;
create policy sync_logs_own on public.sync_logs for all
  using (
    profile_id in (
      select id from public.profiles
      where clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- ── transactions / invoices: trazabilidad del origen externo ────
-- Permite (a) marcar idempotencia en sync (evitar duplicados) y
-- (b) saber de qué conexión vino cada movimiento.
alter table public.transactions
  add column if not exists source         text,
  add column if not exists external_id    text,
  add column if not exists connection_id  uuid references public.connections(id) on delete set null;

create unique index if not exists uq_transactions_external
  on public.transactions(profile_id, source, external_id)
  where external_id is not null;

alter table public.invoices
  add column if not exists source         text,
  add column if not exists external_id    text,
  add column if not exists connection_id  uuid references public.connections(id) on delete set null,
  add column if not exists invoice_kind   text check (invoice_kind in ('issued','received','boleta')),
  add column if not exists paid_at        timestamptz,
  add column if not exists matched_transaction_id uuid references public.transactions(id) on delete set null;

create unique index if not exists uq_invoices_external
  on public.invoices(profile_id, source, external_id)
  where external_id is not null;

-- ═══════════════════════════════════════════════════════════
--  ROLLBACK (descomentar y ejecutar para deshacer)
-- ═══════════════════════════════════════════════════════════
-- drop index if exists uq_invoices_external;
-- drop index if exists uq_transactions_external;
-- alter table public.invoices
--   drop column if exists matched_transaction_id,
--   drop column if exists paid_at,
--   drop column if exists invoice_kind,
--   drop column if exists connection_id,
--   drop column if exists external_id,
--   drop column if exists source;
-- alter table public.transactions
--   drop column if exists connection_id,
--   drop column if exists external_id,
--   drop column if exists source;
-- drop table if exists public.sync_logs;
-- drop table if exists public.connections;
