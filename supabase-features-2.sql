-- =====================================================================
-- VANTORFLOW FEATURES BATCH 2 MIGRATION. Append-only. Safe to re-run.
-- Paste the whole file into Supabase > SQL Editor > New query > Run.
-- The app keeps working without this; new features show "coming online after setup" until it is run.
-- =====================================================================

-- F12: go/no-go matrix stored alongside the existing qualification row
alter table public.vf_qualifications add column if not exists go_no_go_score numeric;
alter table public.vf_qualifications add column if not exists criterion_scores jsonb;

-- F3: client portal share links (read-only proposal view)
create table if not exists public.vf_share_links (
  token           text primary key,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_by      uuid references auth.users(id) on delete set null,
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- F4: teams skeleton (directory only, no real multi-tenancy yet)
create table if not exists public.vf_team_members (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  member_email  text not null,
  role          text not null default 'bidder' check (role in ('owner','bidder','approver')),
  status        text not null default 'invited' check (status in ('invited','active')),
  created_at    timestamptz not null default now(),
  unique (owner_id, member_email)
);

-- F5: notification center
create table if not exists public.vf_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  kind        text not null default 'info',
  dedupe_key  text,
  read        boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- F6: document templates (letterheads and proposal wrappers)
create table if not exists public.vf_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null default 'proposal' check (kind in ('letterhead','proposal')),
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- F9: audit trail
create table if not exists public.vf_audit (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  action          text not null,
  detail          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- F11: file attachments (metadata; bytes live in the 'attachments' storage bucket)
create table if not exists public.vf_attachments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  path            text not null,
  name            text not null,
  size            integer not null default 0,
  created_at      timestamptz not null default now()
);

-- F13: comments
create table if not exists public.vf_comments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

-- F15: bid checklists
create table if not exists public.vf_checklists (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  title           text not null,
  items           jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Row Level Security: on, own rows only (the server uses the service role; these guard direct access).
alter table public.vf_share_links   enable row level security;
alter table public.vf_team_members  enable row level security;
alter table public.vf_notifications enable row level security;
alter table public.vf_templates     enable row level security;
alter table public.vf_audit         enable row level security;
alter table public.vf_attachments   enable row level security;
alter table public.vf_comments      enable row level security;
alter table public.vf_checklists    enable row level security;

drop policy if exists vf_share_links_own on public.vf_share_links;
create policy vf_share_links_own on public.vf_share_links for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vf_team_members_own on public.vf_team_members;
create policy vf_team_members_own on public.vf_team_members for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists vf_notifications_own on public.vf_notifications;
create policy vf_notifications_own on public.vf_notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vf_templates_own on public.vf_templates;
create policy vf_templates_own on public.vf_templates for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vf_audit_own on public.vf_audit;
create policy vf_audit_own on public.vf_audit for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vf_attachments_own on public.vf_attachments;
create policy vf_attachments_own on public.vf_attachments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vf_comments_own on public.vf_comments;
create policy vf_comments_own on public.vf_comments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vf_checklists_own on public.vf_checklists;
create policy vf_checklists_own on public.vf_checklists for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- F11: private storage bucket for attachments (10MB limit enforced by the app and the bucket).
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

-- Make the API pick up the new tables and columns straight away.
notify pgrst, 'reload schema';
