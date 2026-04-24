-- ═══════════════════════════════════════════════════════════
--  Migration 005 — Activity logs
--  Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

create table if not exists public.activity_logs (
  id                 uuid primary key default uuid_generate_v4(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  clerk_user_id      text not null,
  clerk_session_id   text,
  event_type         text not null,
  ip_address         inet,
  country            text,
  city               text,
  device_type        text,
  browser            text,
  os                 text,
  user_agent         text,
  created_at         timestamptz not null default now()
);

-- Constraint sobre event_type (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activity_logs_event_type_check'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_event_type_check
      check (event_type in (
        'session.created',
        'session.ended',
        'session.revoked',
        'account.export',
        'account.delete_requested'
      ));
  end if;
end $$;

alter table public.activity_logs enable row level security;

-- Policy idempotente
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activity_logs' and policyname = 'activity_logs_own'
  ) then
    create policy "activity_logs_own" on public.activity_logs
      for all using (
        profile_id in (
          select id from public.profiles
          where clerk_id = current_setting('app.clerk_user_id', true)
        )
      );
  end if;
end $$;

create index if not exists idx_activity_logs_profile_created
  on public.activity_logs(profile_id, created_at desc);
