-- YumBalance: daily scan limit on each user's own calendar day, plus a service-wide safety cap.
--
-- The first version counted days in Singapore time, so a user in London saw their scans reset at
-- 5pm and a user in New York at noon. These `_v2` functions take the day from the caller instead:
-- the `scan` Edge Function works it out from the phone's time zone and the server's clock (never
-- the phone's clock), and the database refuses any day more than one day away from today in UTC,
-- which is the widest gap any real time zone has. Changing the phone's time zone therefore can't
-- earn more than one extra day's scans, once.
--
-- Also adds a service-wide cap on scans per UTC day ('global' row) so a flood of new accounts
-- can't run up the AI bill. It's set by the Edge Function (SCAN_GLOBAL_DAILY_CAP); 0 turns it off.
--
-- The original functions stay in place so the deployed Edge Function keeps working until the new
-- one is deployed. Run this file first, then deploy `scan`.

-- Rejects days no time zone can be on right now (UTC−12 … UTC+14).
create or replace function public.check_scan_day(p_day date)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_utc date := (now() at time zone 'utc')::date;
begin
  if p_day is null or p_day < v_utc - 1 or p_day > v_utc + 1 then
    raise exception 'invalid scan day' using errcode = '22023';
  end if;
end;
$$;

-- Atomically checks and consumes one scan for this user + device on their local day `p_day`.
-- Returns allowed = false (without consuming) once the user, the device, or the whole service
-- has reached its limit; `reason` says which ('limit' or 'busy'). `global_day` must be passed
-- back to release_scan_v2 if the scan is refunded.
create or replace function public.claim_scan_v2(
  p_user_id uuid,
  p_device_id text,
  p_limit integer,
  p_day date,
  p_global_cap integer
)
returns table (allowed boolean, used integer, scan_limit integer, reason text, global_day date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_global_day date := (now() at time zone 'utc')::date;
  v_user text := 'user:' || p_user_id::text;
  v_device text := 'device:' || p_device_id;
  v_user_count integer;
  v_device_count integer;
  v_global_count integer := 0;
  v_use_global boolean := coalesce(p_global_cap, 0) > 0;
begin
  if p_user_id is null then
    raise exception 'user id required' using errcode = '22023';
  end if;
  if p_device_id is null or p_device_id !~ '^[A-Za-z0-9-]{8,100}$' then
    raise exception 'invalid device id' using errcode = '22023';
  end if;
  perform public.check_scan_day(p_day);

  insert into public.scan_usage (subject, day)
  values (v_user, p_day), (v_device, p_day)
  on conflict (subject, day) do nothing;
  if v_use_global then
    insert into public.scan_usage (subject, day) values ('global', v_global_day)
    on conflict (subject, day) do nothing;
  end if;

  -- Lock every row this scan touches in one fixed order, so two scans started at the same moment
  -- can't both slip under a limit, and can't deadlock each other.
  perform 1 from public.scan_usage s
  where (s.day = p_day and s.subject in (v_user, v_device))
     or (v_use_global and s.subject = 'global' and s.day = v_global_day)
  order by s.subject, s.day
  for update;

  select s.count into v_user_count from public.scan_usage s where s.subject = v_user and s.day = p_day;
  select s.count into v_device_count from public.scan_usage s where s.subject = v_device and s.day = p_day;
  if v_use_global then
    select s.count into v_global_count from public.scan_usage s where s.subject = 'global' and s.day = v_global_day;
  end if;

  if v_user_count >= p_limit or v_device_count >= p_limit then
    return query select false, greatest(v_user_count, v_device_count), p_limit, 'limit'::text, v_global_day;
    return;
  end if;
  if v_use_global and v_global_count >= p_global_cap then
    return query select false, greatest(v_user_count, v_device_count), p_limit, 'busy'::text, v_global_day;
    return;
  end if;

  update public.scan_usage
  set count = count + 1, updated_at = now()
  where (day = p_day and subject in (v_user, v_device))
     or (v_use_global and subject = 'global' and day = v_global_day);

  -- Housekeeping: counters are only needed for today; drop anything older than 30 days.
  if random() < 0.02 then
    delete from public.scan_usage where day < v_global_day - 30;
  end if;

  return query select true, greatest(v_user_count, v_device_count) + 1, p_limit, null::text, v_global_day;
end;
$$;

-- Gives back a scan the server consumed but couldn't deliver (AI error, barcode not found), on
-- the same days it was claimed — even if midnight passed while the scan was running.
create or replace function public.release_scan_v2(
  p_user_id uuid,
  p_device_id text,
  p_day date,
  p_global_day date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  update public.scan_usage
  set count = greatest(count - 1, 0), updated_at = now()
  where (day = p_day and subject in ('user:' || p_user_id::text, 'device:' || p_device_id))
     or (p_global_day is not null and subject = 'global' and day = p_global_day);

  select coalesce(max(s.count), 0) into v_used
  from public.scan_usage s
  where s.day = p_day and s.subject in ('user:' || p_user_id::text, 'device:' || p_device_id);
  return v_used;
end;
$$;

-- Usage on the user's local day `p_day` for this user + device (whichever is higher).
create or replace function public.scan_status_v2(p_user_id uuid, p_device_id text, p_day date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  perform public.check_scan_day(p_day);
  select coalesce(max(s.count), 0) into v_used
  from public.scan_usage s
  where s.day = p_day
    and s.subject in ('user:' || p_user_id::text, 'device:' || p_device_id);
  return v_used;
end;
$$;

revoke all on function public.check_scan_day(date) from public, anon, authenticated;
revoke all on function public.claim_scan_v2(uuid, text, integer, date, integer) from public, anon, authenticated;
revoke all on function public.release_scan_v2(uuid, text, date, date) from public, anon, authenticated;
revoke all on function public.scan_status_v2(uuid, text, date) from public, anon, authenticated;
grant execute on function public.check_scan_day(date) to service_role;
grant execute on function public.claim_scan_v2(uuid, text, integer, date, integer) to service_role;
grant execute on function public.release_scan_v2(uuid, text, date, date) to service_role;
grant execute on function public.scan_status_v2(uuid, text, date) to service_role;
