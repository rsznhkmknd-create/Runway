-- ═══════════════════════════════════════════════════════════
--  Migration 002 — Campo website en profiles
--  Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists website text;
