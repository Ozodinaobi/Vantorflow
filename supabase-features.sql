-- Vantorflow FEATURES migration (10 modules). Safe to re-run: every statement uses
-- "if not exists", "add column if not exists" or "drop ... if exists".
-- Run once in Supabase > SQL Editor > New query > paste all > Run.
--
-- Creates ONLY what the code in this repo reads or writes:
--   opportunities: outcome_result, outcome_reason, outcome_notes, outcome_at   (lib/intelligence, api outcome route)
--   vf_qualifications  (api/opportunities/[id]/qualification)
--   vf_approvals       (api/opportunities/[id]/approval)
--   vf_answer_library  (api/library, api/generate)
--   vf_companies       (api/companies)
--
-- The app talks to these tables with the service role key (server only), which bypasses RLS.
-- The RLS policies below are an extra guard: a signed-in user only sees and changes their own rows.

-- ---------------------------------------------------------------------
-- 1. Win / loss outcome columns on the legacy opportunities table
-- ---------------------------------------------------------------------
alter table public.opportunities add column if not exists outcome_result text;
alter table public.opportunities add column if not exists outcome_reason text;
alter table public.opportunities add column if not exists outcome_notes text;
alter table public.opportunities add column if not exists outcome_at timestamptz;

alter table public.opportunities drop constraint if exists opportunities_outcome_result_check;
alter table public.opportunities add constraint opportunities_outcome_result_check
  check (outcome_result is null or outcome_result in ('Won','Lost'));

-- ---------------------------------------------------------------------
-- 2. Qualification: 7 scores (1 to 5), notes, computed verdict. One row per opportunity.
-- ---------------------------------------------------------------------
create table if not exists public.vf_qualifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id    uuid not null unique,
  capability_fit    integer not null check (capability_fit between 1 and 5),
  past_performance  integer not null check (past_performance between 1 and 5),
  resources         integer not null check (resources between 1 and 5),
  compliance_risk   integer not null check (compliance_risk between 1 and 5),
  relationship      integer not null check (relationship between 1 and 5),
  pricing_position  integer not null check (pricing_position between 1 and 5),
  known_risks       integer not null check (known_risks between 1 and 5),
  notes             text not null default '',
  verdict           text not null check (verdict in ('Qualified','Review','Declined')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Approvals: request with a note, then approve or reject with a signature name.
-- ---------------------------------------------------------------------
create table if not exists public.vf_approvals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,
  status            text not null default 'Requested' check (status in ('Requested','Approved','Rejected')),
  request_note      text not null default '',
  requested_at      timestamptz not null default now(),
  decided_by        text,
  decision_note     text,
  decided_at        timestamptz
);

-- ---------------------------------------------------------------------
-- 4. Answer library: saved question and answer pairs, reused when drafting.
-- ---------------------------------------------------------------------
create table if not exists public.vf_answer_library (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question    text not null,
  answer      text not null,
  tags        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Companies and contractors registry.
-- The API accepts Company, Contractor, Subcontractor, Partner, so all four are allowed here.
-- ---------------------------------------------------------------------
create table if not exists public.vf_companies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null default 'Company',
  contact     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.vf_companies drop constraint if exists vf_companies_kind_check;
alter table public.vf_companies add constraint vf_companies_kind_check
  check (kind in ('Company','Contractor','Subcontractor','Partner'));

-- ---------------------------------------------------------------------
-- 6. Row Level Security: enabled, one policy per table, own rows only.
-- ---------------------------------------------------------------------
alter table public.vf_qualifications enable row level security;
alter table public.vf_approvals      enable row level security;
alter table public.vf_answer_library enable row level security;
alter table public.vf_companies      enable row level security;

drop policy if exists vf_qualifications_own on public.vf_qualifications;
create policy vf_qualifications_own on public.vf_qualifications
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists vf_approvals_own on public.vf_approvals;
create policy vf_approvals_own on public.vf_approvals
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists vf_answer_library_own on public.vf_answer_library;
create policy vf_answer_library_own on public.vf_answer_library
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists vf_companies_own on public.vf_companies;
create policy vf_companies_own on public.vf_companies
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Make the API pick up the new tables and columns straight away.
notify pgrst, 'reload schema';
