-- ═══════════════════════════════════════════════════════════
--  Migration 003 — Notification settings en profiles
--  Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists notification_settings jsonb not null default
    '{"runway_low":true,"invoices_overdue":true,"weekly_summary":true,"monthly_summary":true,"expense_spike":true}'::jsonb;
