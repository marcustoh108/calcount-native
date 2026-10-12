-- YumBalance: stop time-zone switching from earning extra scans.
--
-- Days end at each user's local midnight (see 20261002000000_scan_limits_local_day.sql). Moving
-- the phone back to an earlier time zone used to reopen "yesterday" with a fresh count, so
-- flipping between far-apart zones could beat the daily limit. From now on a user's (and a
-- phone's) scan day never moves backwards: if the phone's zone says an earlier day than one
-- already used, the scan is counted on the latest day used instead.
--
-- New _v3 functions; the _v2 ones stay so the deployed Edge Function keeps working until the new
-- one is deployed. Run this file first, then deploy `scan`.

-- The day a scan counts on: the phone's local day, or the latest day this user or phone has
-- already used, whichever is later.
create or replace function public.effective_scan_day(p_user_id uuid, p_device_id text, p_day date)
returns date
language sql
stable
set search_path = ''
as $$
  select greatest(
    p_day,
    coalesce((select max(s.day) from public.scan_usage s where s.subject = 'user:' || p_user_id::text), p_day),
    coalesce((select max(s.day) from public.scan_usage s where s.subject = 'device:' || p_device_id), p_day)
  );
$$;

create or replace function public.claim_scan_v3(
  p_user_id uuid,
  p_device_id text,
  p_limit integer,
  p_day date,
  p_global_cap integer
)
returns table (allowed boolean, used integer, scan_limit integer, reason text, global_day date, day date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
begin
  perform public.check_scan_day(p_day);
  v_day := public.effective_scan_day(p_user_id, p_device_id, p_day);
  return query
    select c.allowed, c.used, c.scan_limit, c.reason, c.global_day, v_day
    from public.claim_scan_v2(p_user_id, p_device_id, p_limit, v_day, p_global_cap) c;
end;
$$;

create or replace function public.scan_status_v3(p_user_id uuid, p_device_id text, p_day date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.check_scan_day(p_day);
  return public.scan_status_v2(p_user_id, p_device_id, public.effective_scan_day(p_user_id, p_device_id, p_day));
end;
$$;

revoke all on function public.effective_scan_day(uuid, text, date) from public, anon, authenticated;
revoke all on function public.claim_scan_v3(uuid, text, integer, date, integer) from public, anon, authenticated;
revoke all on function public.scan_status_v3(uuid, text, date) from public, anon, authenticated;
grant execute on function public.effective_scan_day(uuid, text, date) to service_role;
grant execute on function public.claim_scan_v3(uuid, text, integer, date, integer) to service_role;
grant execute on function public.scan_status_v3(uuid, text, date) to service_role;
