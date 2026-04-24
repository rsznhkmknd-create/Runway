-- ═══════════════════════════════════════════════════════════
--  Migration 004 — Plan + usage counters
--  Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Plan en profiles
alter table public.profiles
  add column if not exists plan             text not null default 'starter',
  add column if not exists plan_started_at  timestamptz not null default now(),
  add column if not exists plan_renews_at   timestamptz;

-- Constraint sobre plan (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check
      check (plan in ('starter','growth','pro'));
  end if;
end $$;

-- Usage counters mensuales
create table if not exists public.usage_counters (
  id                 uuid primary key default uuid_generate_v4(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  period_start       date not null,
  imports_count      int not null default 0,
  ai_invoices_count  int not null default 0,
  reports_count      int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (profile_id, period_start)
);

alter table public.usage_counters enable row level security;

-- Policy idempotente
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usage_counters' and policyname = 'usage_counters_own'
  ) then
    create policy "usage_counters_own" on public.usage_counters
      for all using (
        profile_id in (
          select id from public.profiles
          where clerk_id = current_setting('app.clerk_user_id', true)
        )
      );
  end if;
end $$;

create index if not exists idx_usage_counters_profile_period
  on public.usage_counters(profile_id, period_start desc);

-- Trigger updated_at
drop trigger if exists usage_counters_updated_at on public.usage_counters;
create trigger usage_counters_updated_at
  before update on public.usage_counters
  for each row execute function update_updated_at();
