-- ═══════════════════════════════════════════════════════════
--  Finsight — Supabase Schema
-- ═══════════════════════════════════════════════════════════

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id                    uuid primary key default uuid_generate_v4(),
  clerk_id              text unique not null,
  email                 text not null,
  full_name             text,
  company_name          text,
  currency              text not null default 'EUR',
  -- Onboarding fields
  industry              text,
  country               text,
  employee_count        text,
  business_type         text,
  website               text,
  main_goal             text,
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_own" on public.profiles
  for all using (clerk_id = current_setting('app.clerk_user_id', true));

-- ── Transactions ─────────────────────────────────────────────
create table public.transactions (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(15,2) not null,
  type        text not null check (type in ('income','expense')),
  category    text not null,
  description text,
  date        date not null,
  created_at  timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "transactions_own" on public.transactions
  for all using (
    profile_id in (
      select id from public.profiles
      where clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

create index idx_transactions_profile_date on public.transactions(profile_id, date desc);

-- ── Invoices ─────────────────────────────────────────────────
create table public.invoices (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  amount      numeric(15,2) not null,
  currency    text not null default 'EUR',
  due_date    date not null,
  status      text not null default 'pending' check (status in ('pending','paid','overdue')),
  created_at  timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "invoices_own" on public.invoices
  for all using (
    profile_id in (
      select id from public.profiles
      where clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

create index idx_invoices_profile_status on public.invoices(profile_id, status);

-- ── Reports ──────────────────────────────────────────────────
create table public.reports (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  type         text not null check (type in ('weekly','monthly')),
  period_start date not null,
  period_end   date not null,
  content      jsonb not null,
  created_at   timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_own" on public.reports
  for all using (
    profile_id in (
      select id from public.profiles
      where clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

create index idx_reports_profile_created on public.reports(profile_id, created_at desc);

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();
