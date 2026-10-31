-- Phase 1 additions for opportunity deadlines and Go/No-Go scoring.
-- Safe to apply multiple times.
alter table public.opportunities add column if not exists deadline date;
alter table public.opportunities add column if not exists gonogo jsonb;
