-- Vantorflow authentication security features.
-- Run once in the Supabase SQL Editor before enabling these auth flows.
-- Access is intended exclusively through the server using the Supabase service role.

create table if not exists public.vf_auth_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_verified boolean not null default false,
  two_factor_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.vf_auth_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  purpose text not null check (purpose in ('verify','login')),
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, purpose)
);
create index if not exists vf_auth_codes_email_purpose_idx on public.vf_auth_codes(email, purpose);
create index if not exists vf_auth_codes_expires_at_idx on public.vf_auth_codes(expires_at);

create table if not exists public.vf_passkeys (
  credential_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  transports jsonb not null default '[]'::jsonb,
  device_type text,
  backed_up boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists vf_passkeys_user_id_idx on public.vf_passkeys(user_id);

create table if not exists public.vf_webauthn_challenges (
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('register','login')),
  challenge text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, purpose)
);
create index if not exists vf_webauthn_challenges_expires_at_idx on public.vf_webauthn_challenges(expires_at);

-- No direct client access. Server routes use the service role, which bypasses RLS.
alter table public.vf_auth_security enable row level security;
alter table public.vf_auth_codes enable row level security;
alter table public.vf_passkeys enable row level security;
alter table public.vf_webauthn_challenges enable row level security;

notify pgrst, 'reload schema';
