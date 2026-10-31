-- Vantorflow control-plane migration. Review project-specific retention/legal settings before production.
-- Admin-only reads/writes are performed server-side with SUPABASE_SERVICE_ROLE_KEY.
create extension if not exists pgcrypto;

-- Per-account controls and billing-ready hooks. Auth identity remains in auth.users.
create table if not exists public.user_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','terminated')),
  suspended_at timestamptz,
  terminated_at timestamptz,
  ai_monthly_cap integer not null default 100 check (ai_monthly_cap >= 0),
  plan_tier text not null default 'free' check (plan_tier in ('free','starter','pro','business','custom')),
  billing_customer_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usage records must be inserted by every AI route after it validates and accounts the request.
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  request_id text,
  tokens_input integer not null default 0 check (tokens_input >= 0),
  tokens_output integer not null default 0 check (tokens_output >= 0),
  tokens_total integer generated always as (tokens_input + tokens_output) stored,
  outcome text not null default 'success' check (outcome in ('success','rejected','error')),
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events(user_id,created_at desc);
create index if not exists ai_usage_events_created_idx on public.ai_usage_events(created_at desc);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_user_created_idx on public.activity_log(user_id,created_at desc);

create table if not exists public.abuse_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  rule_key text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','reviewing','resolved','false_positive')),
  details jsonb not null default '{}'::jsonb,
  action_taken text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists abuse_flags_status_created_idx on public.abuse_flags(status,created_at desc);
create index if not exists abuse_flags_user_created_idx on public.abuse_flags(user_id,created_at desc);

create table if not exists public.admin_config (
  config_key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.admin_config(config_key,enabled,config) values
('abuse_detection',false,'{"mode":"monitor","request_rate_per_minute":60,"monthly_ai_cap_action":"flag","suspicious_pattern_action":"flag","auto_suspend":false}')
on conflict(config_key) do nothing;

-- Rate limit desk login attempts by the server-composed email + IP key.
create table if not exists public.admin_login_attempts (
  attempt_key text primary key,
  failures integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.record_admin_login_attempt(p_key text,p_success boolean default false,p_check_only boolean default false)
returns boolean language plpgsql security definer set search_path=public as $$
declare r public.admin_login_attempts%rowtype;
begin
  if p_key is null or length(p_key)>256 then return false; end if;
  insert into public.admin_login_attempts(attempt_key) values(p_key) on conflict do nothing;
  select * into r from public.admin_login_attempts where attempt_key=p_key for update;
  if r.locked_until is not null and r.locked_until>now() then return false; end if;
  if p_check_only then return true; end if;
  if p_success then
    update public.admin_login_attempts set failures=0,window_started_at=now(),locked_until=null,updated_at=now() where attempt_key=p_key;
    return true;
  end if;
  if r.window_started_at < now()-interval '15 minutes' then
    update public.admin_login_attempts set failures=1,window_started_at=now(),locked_until=null,updated_at=now() where attempt_key=p_key;
  elsif r.failures+1>=5 then
    update public.admin_login_attempts set failures=r.failures+1,locked_until=now()+interval '15 minutes',updated_at=now() where attempt_key=p_key;
  else
    update public.admin_login_attempts set failures=r.failures+1,updated_at=now() where attempt_key=p_key;
  end if;
  return true;
end; $$;
revoke all on function public.record_admin_login_attempt(text,boolean,boolean) from public, anon, authenticated;
grant execute on function public.record_admin_login_attempt(text,boolean,boolean) to service_role;

create or replace function public.moderate_user(p_user_id uuid,p_actor_id uuid,p_action text,p_cap integer default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.user_controls%rowtype; v_status text;
begin
  if p_user_id=p_actor_id then raise exception 'Administrator cannot moderate own account'; end if;
  if p_action not in ('suspend','unsuspend','terminate','set_cap') then raise exception 'Unsupported action'; end if;
  if p_action='set_cap' and (p_cap is null or p_cap<0 or p_cap>1000000) then raise exception 'Invalid cap'; end if;
  insert into public.user_controls(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select * into r from public.user_controls where user_id=p_user_id for update;
  if p_action='suspend' then update public.user_controls set status='suspended',suspended_at=now(),updated_at=now() where user_id=p_user_id returning status into v_status;
  elsif p_action='unsuspend' then update public.user_controls set status='active',suspended_at=null,updated_at=now() where user_id=p_user_id returning status into v_status;
  elsif p_action='terminate' then update public.user_controls set status='terminated',terminated_at=now(),updated_at=now() where user_id=p_user_id returning status into v_status;
  else update public.user_controls set ai_monthly_cap=p_cap,updated_at=now() where user_id=p_user_id returning status into v_status; end if;
  insert into public.activity_log(user_id,actor_id,action,details) values(p_user_id,p_actor_id,'admin_'||p_action,jsonb_build_object('status',v_status,'cap',p_cap,'reason',left(coalesce(p_reason,''),500)));
  return jsonb_build_object('ok',true,'status',v_status);
end; $$;
revoke all on function public.moderate_user(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.moderate_user(uuid,uuid,text,integer,text) to service_role;

-- No browser-role policies. All privileged access stays on the server.
alter table public.user_controls enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.activity_log enable row level security;
alter table public.abuse_flags enable row level security;
alter table public.admin_config enable row level security;
alter table public.admin_login_attempts enable row level security;
revoke all on public.user_controls,public.ai_usage_events,public.activity_log,public.abuse_flags,public.admin_config,public.admin_login_attempts from anon,authenticated;
grant all on public.user_controls,public.ai_usage_events,public.activity_log,public.abuse_flags,public.admin_config,public.admin_login_attempts to service_role;
notify pgrst,'reload schema';
