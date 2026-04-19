-- ═══════════════════════════════════════════════════════════
--  Migration 001 — Onboarding fields en profiles
--  Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists industry             text,
  add column if not exists country              text,
  add column if not exists employee_count       text,
  add column if not exists business_type        text,
  add column if not exists main_goal            text,
  add column if not exists onboarding_completed boolean not null default false;
