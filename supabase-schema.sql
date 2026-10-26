-- Vantorflow schema. Run ONCE in Supabase > SQL Editor > New query > paste all > Run.
-- Safe to re-run: every statement uses "if not exists" or "drop ... if exists".
--
-- Uses NEW table names (opportunity_records, rfq_records) so the old legacy tables
-- "opportunities" and "rfqs" are NOT touched. Do not rename or drop legacy tables.
--
-- Access model: the app talks to these tables only from the server, with the service role key.
-- Row Level Security is ON with NO policies, so browser/anon/authenticated clients can read nothing.

create extension if not exists pgcrypto;

-- One row per bid/tender being worked on
create table if not exists public.opportunity_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  buyer       text not null default '',
  value       numeric,
  deadline    date,
  scope       text,
  status      text not null default 'Intake'
              check (status in ('Intake','Analysis','Requirements','Response','Approval','Submission','Outcome')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The raw RFQ text pasted at intake, linked to one opportunity
create table if not exists public.rfq_records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  opportunity_id   uuid not null references public.opportunity_records(id) on delete cascade,
  title            text not null,
  buyer            text not null default '',
  deadline         date,
  estimated_value  numeric,
  rfq_text         text not null,
  created_at       timestamptz not null default now()
);

-- Requirements extracted from the RFQ. Unique (opportunity_id, number) stops duplicate numbers.
create table if not exists public.requirements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunity_records(id) on delete cascade,
  number          integer not null,
  text            text not null,
  category        text not null default 'Other'
                  check (category in ('Technical','Commercial','Compliance','Delivery','Other')),
  section         text
                  check (section is null or section in ('Executive Summary','Technical Solution','Delivery Plan','Pricing','Compliance')),
  created_at      timestamptz not null default now(),
  unique (opportunity_id, number)
);

-- One generated draft per opportunity per section. Unique pair means regenerate updates, never copies.
create table if not exists public.response_sections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunity_records(id) on delete cascade,
  section         text not null
                  check (section in ('Executive Summary','Technical Solution','Delivery Plan','Pricing','Compliance')),
  draft           text not null default '',
  updated_at      timestamptz not null default now(),
  unique (opportunity_id, section)
);

-- Keep updated_at fresh on opportunity_records
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists opportunity_records_touch on public.opportunity_records;
create trigger opportunity_records_touch before update on public.opportunity_records
  for each row execute function public.touch_updated_at();

-- Lock the tables: RLS on, no policies. Only the service role (server) can read or write.
alter table public.opportunity_records enable row level security;
alter table public.rfq_records         enable row level security;
alter table public.requirements        enable row level security;
alter table public.response_sections   enable row level security;

-- Make the API pick up the new tables straight away.
notify pgrst, 'reload schema';

-- =====================================================================
-- FEATURES MIGRATION (10 modules). Append-only. Safe to re-run.
-- Paste this whole block into Supabase > SQL Editor > New query > Run.
-- Adds: outcome columns on opportunities (Won/Lost), and new tables:
-- vf_qualifications, vf_approvals, vf_answer_library, vf_companies (vf_ prefix avoids the legacy companies table).
-- The app keeps working without this block; the new features show
-- "coming online after setup" until it is run.
-- =====================================================================

-- Win/loss outcome on the legacy opportunities table
alter table public.opportunities add column if not exists outcome_result text
  check (outcome_result is null or outcome_result in ('Won','Lost'));
alter table public.opportunities add column if not exists outcome_reason text;
alter table public.opportunities add column if not exists outcome_notes text;
alter table public.opportunities add column if not exists outcome_at timestamptz;

-- Qualification: 7 scored fields (1 to 5), notes, computed verdict. One row per opportunity.
create table if not exists public.vf_qualifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
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

-- Approvals: a request with a note, then approve or reject with a signature name and timestamp.
create table if not exists public.vf_approvals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,
  status            text not null default 'Requested' check (status in ('Requested','Approved','Rejected')),
  request_note      text not null default '',
  requested_at      timestamptz not null default now(),
  decided_by        text,
  decision_note     text,
  decided_at        timestamptz
);

-- Answer library: saved question and answer pairs, reused as context when drafting.
create table if not exists public.vf_answer_library (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  question    text not null,
  answer      text not null,
  tags        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Companies registry: contractors and partner companies used in generation.
create table if not exists public.vf_companies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null default 'Company' check (kind in ('Company','Contractor','Partner')),
  contact     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.vf_qualifications enable row level security;
alter table public.vf_approvals      enable row level security;
alter table public.vf_answer_library enable row level security;
alter table public.vf_companies      enable row level security;

notify pgrst, 'reload schema';
