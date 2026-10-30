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
