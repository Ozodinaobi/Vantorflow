-- Automated monitoring of real usage events. This logs flags only. AI handlers must enforce caps/rate limits before serving a request.
create or replace function public.flag_usage_safety_events()
returns trigger language plpgsql security definer set search_path=public as $$
declare cfg public.admin_config%rowtype; cap integer; n_minute integer; n_month integer; threshold integer;
begin
 select * into cfg from public.admin_config where config_key='abuse_detection';
 if not found or not cfg.enabled then return new; end if;
 threshold:=greatest(1,coalesce((cfg.config->>'request_rate_per_minute')::integer,60));
 select count(*) into n_minute from public.ai_usage_events where user_id=new.user_id and created_at>=now()-interval '1 minute';
 if n_minute>threshold then
  insert into public.abuse_flags(user_id,rule_key,severity,details)
  select new.user_id,'request_rate_exceeded','high',jsonb_build_object('observed_events_last_minute',n_minute,'configured_limit',threshold,'policy_action',coalesce(cfg.config->>'suspicious_pattern_action','flag'))
  where not exists(select 1 from public.abuse_flags where user_id=new.user_id and rule_key='request_rate_exceeded' and status in('open','reviewing') and created_at>now()-interval '5 minutes');
 end if;
 select ai_monthly_cap into cap from public.user_controls where user_id=new.user_id;
 if cap is not null then
  select count(*) into n_month from public.ai_usage_events where user_id=new.user_id and created_at>=date_trunc('month',now());
  if n_month>cap then
   insert into public.abuse_flags(user_id,rule_key,severity,details)
   select new.user_id,'monthly_ai_cap_exceeded','medium',jsonb_build_object('observed_calls_this_month',n_month,'configured_cap',cap,'policy_action',coalesce(cfg.config->>'monthly_ai_cap_action','flag'),'enforcement_note','This trigger records a flag after an event. AI routes must check the cap before processing future requests.')
   where not exists(select 1 from public.abuse_flags where user_id=new.user_id and rule_key='monthly_ai_cap_exceeded' and status in('open','reviewing') and created_at>now()-interval '1 day');
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.flag_usage_safety_events() from public,anon,authenticated;
drop trigger if exists ai_usage_safety_monitor on public.ai_usage_events;
create trigger ai_usage_safety_monitor after insert on public.ai_usage_events for each row execute function public.flag_usage_safety_events();
notify pgrst,'reload schema';
