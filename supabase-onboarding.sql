-- Vantorflow onboarding state. Run in Supabase SQL Editor when ready.
-- Safe to re-run. Existing accounts are not marked incomplete; new signups initialize onboarding
-- in auth user metadata from the app, with this table as the durable progress store.

create table if not exists public.vf_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  current_step integer not null default 0 check (current_step between 0 and 4),
  completed_steps integer[] not null default '{}',
  skipped_steps integer[] not null default '{}',
  selected_template text check (selected_template is null or selected_template in ('branded', 'plain')),
  updated_at timestamptz not null default now()
);

create or replace function public.vf_onboarding_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vf_onboarding_touch on public.vf_onboarding;
create trigger vf_onboarding_touch before update on public.vf_onboarding
  for each row execute function public.vf_onboarding_touch_updated_at();

alter table public.vf_onboarding enable row level security;

-- Browser roles have no direct access. Server-side service role calls are user-scoped.
notify pgrst, 'reload schema';
