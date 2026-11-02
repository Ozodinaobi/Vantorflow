-- Runtime guard uses 300 monthly reservations and 10 requests/minute, counted atomically before Gemini.
-- It matches only the user_controls and ai_usage_events columns confirmed in project schema.
-- The service-role-only SECURITY DEFINER RPC is not callable by clients and never reads auth.users.
alter table public.user_controls alter column ai_monthly_cap set default 300;

create or replace function public.ai_usage_reserve(
  p_user_id uuid,
  p_feature text,
  p_request_id text,
  p_ip_hash text default null,
  p_rate_limit integer default 10,
  p_default_monthly_cap integer default 300
)
returns table(allowed boolean, reason text, used integer, cap integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_control public.user_controls%rowtype;
  v_status text;
  v_cap integer;
  v_used integer;
  v_rate integer;
  v_retry integer;
begin
  if p_user_id is null or p_feature is null or length(p_feature) = 0 or length(p_feature) > 80 or p_request_id is null or length(p_request_id) = 0 or length(p_request_id) > 128 or p_default_monthly_cap is null or p_default_monthly_cap < 0 or p_rate_limit is null or p_rate_limit < 1 then
    return query select false, 'invalid_request'::text, 0, greatest(coalesce(p_default_monthly_cap, 0), 0), 0;
    return;
  end if;

  -- Per-user transaction lock serializes both the request cap and rate-window checks.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 913572));

  insert into public.user_controls (user_id, status, ai_monthly_cap)
  values (p_user_id, 'active', p_default_monthly_cap)
  on conflict (user_id) do nothing;

  select * into v_control from public.user_controls where user_id = p_user_id for update;
  v_status := lower(coalesce(v_control.status, 'active'));
  v_cap := greatest(coalesce(v_control.ai_monthly_cap, p_default_monthly_cap), 0);

  if v_status in ('terminated', 'deleted', 'closed') or v_control.terminated_at is not null then
    return query select false, 'terminated'::text, 0, v_cap, 0;
    return;
  end if;
  if v_status in ('suspended', 'disabled', 'blocked') or v_control.suspended_at is not null then
    return query select false, 'suspended'::text, 0, v_cap, 0;
    return;
  end if;
  if v_status <> 'active' then
    return query select false, 'suspended'::text, 0, v_cap, 0;
    return;
  end if;

  select count(*)::integer into v_used
  from public.ai_usage_events
  where user_id = p_user_id
    and created_at >= date_trunc('month', now())
    and created_at < date_trunc('month', now()) + interval '1 month'
    and outcome in ('reserved', 'success', 'error');
  if v_used >= v_cap then
    return query select false, 'monthly_cap'::text, v_used, v_cap, 0;
    return;
  end if;

  select count(*)::integer into v_rate
  from public.ai_usage_events
  where user_id = p_user_id and created_at >= now() - interval '1 minute'
    and outcome in ('reserved', 'success', 'error');
  if v_rate >= greatest(coalesce(p_rate_limit, 10), 1) then
    select greatest(1, 60 - floor(extract(epoch from (now() - min(created_at))))::integer)
    into v_retry from public.ai_usage_events
    where user_id = p_user_id and created_at >= now() - interval '1 minute'
      and outcome in ('reserved', 'success', 'error');
    return query select false, 'rate_limited'::text, v_used, v_cap, coalesce(v_retry, 1);
    return;
  end if;

  -- Insert outcome as 'error' after unexpected failures; blocked service roles fail closed.
  -- Reservation is counted before Gemini is called to prevent parallel calls overspending.
  insert into public.ai_usage_events (
    user_id, feature, request_id, tokens_input, tokens_output, tokens_total,
    outcome, ip_hash, metadata, created_at
  ) values (
    p_user_id, p_feature, p_request_id, 0, 0, 0, 'reserved', p_ip_hash,
    jsonb_build_object('reservation', true), now()
  );

  return query select true, null::text, v_used + 1, v_cap, 0;
end;
$$;

revoke all on function public.ai_usage_reserve(uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_usage_reserve(uuid, text, text, text, integer, integer) to service_role;
