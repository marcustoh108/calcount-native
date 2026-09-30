-- YumBalance: server-enforced daily scan limit.
--
-- Scans are counted per account AND per device (a random ID the app keeps in the phone's
-- keychain), so creating a new account on the same phone doesn't reset the limit. Days are
-- counted in Singapore time using the database clock, so changing the phone's date does nothing.
--
-- Clients never touch this table directly: RLS is on with no policies, and the functions below
-- are callable only by the service role, i.e. from the `scan` and `delete-account` Edge
-- Functions after they have verified the user's login.

create table if not exists public.scan_usage (
  subject    text        not null,  -- 'user:<auth uuid>' or 'device:<random id>'
  day        date        not null,  -- calendar day in Asia/Singapore
  count      integer     not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (subject, day)
);

create index if not exists scan_usage_day_idx on public.scan_usage (day);

alter table public.scan_usage enable row level security;
revoke all on public.scan_usage from anon, authenticated;

create or replace function public.scan_day() returns date
language sql stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Singapore')::date $$;

-- Atomically checks and consumes one scan for this user + device.
-- Returns allowed = false (without consuming) once either has reached the limit.
create or replace function public.claim_scan(p_user_id uuid, p_device_id text, p_limit integer)
returns table (allowed boolean, used integer, scan_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := public.scan_day();
  v_user text := 'user:' || p_user_id::text;
  v_device text := 'device:' || p_device_id;
  v_user_count integer;
  v_device_count integer;
begin
  if p_user_id is null then
    raise exception 'user id required' using errcode = '22023';
  end if;
  if p_device_id is null or p_device_id !~ '^[A-Za-z0-9-]{8,100}$' then
    raise exception 'invalid device id' using errcode = '22023';
  end if;

  insert into public.scan_usage (subject, day)
  values (v_user, v_day), (v_device, v_day)
  on conflict (subject, day) do nothing;

  -- Lock both rows in a fixed order so two scans started at the same moment can't both slip
  -- under the limit (and can't deadlock each other).
  perform 1 from public.scan_usage
  where day = v_day and subject in (v_user, v_device)
  order by subject
  for update;

  select s.count into v_user_count from public.scan_usage s where s.subject = v_user and s.day = v_day;
  select s.count into v_device_count from public.scan_usage s where s.subject = v_device and s.day = v_day;

  if v_user_count >= p_limit or v_device_count >= p_limit then
    return query select false, greatest(v_user_count, v_device_count), p_limit;
    return;
  end if;

  update public.scan_usage
  set count = count + 1, updated_at = now()
  where day = v_day and subject in (v_user, v_device);

  -- Housekeeping: counters are only needed for today; drop anything older than 30 days.
  if random() < 0.02 then
    delete from public.scan_usage where day < v_day - 30;
  end if;

  return query select true, greatest(v_user_count, v_device_count) + 1, p_limit;
end;
$$;

-- Gives back a scan the server consumed but couldn't deliver (AI error, barcode not found).
create or replace function public.release_scan(p_user_id uuid, p_device_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := public.scan_day();
  v_used integer;
begin
  update public.scan_usage
  set count = greatest(count - 1, 0), updated_at = now()
  where day = v_day and subject in ('user:' || p_user_id::text, 'device:' || p_device_id);

  select coalesce(max(s.count), 0) into v_used
  from public.scan_usage s
  where s.day = v_day and s.subject in ('user:' || p_user_id::text, 'device:' || p_device_id);
  return v_used;
end;
$$;

-- Today's usage for this user + device (whichever is higher), for the "x of 5 left" display.
create or replace function public.scan_status(p_user_id uuid, p_device_id text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(s.count), 0)
  from public.scan_usage s
  where s.day = public.scan_day()
    and s.subject in ('user:' || p_user_id::text, 'device:' || p_device_id);
$$;

-- Removes a deleted account's own counters (device counters stay so the limit still applies).
create or replace function public.forget_user_scans(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.scan_usage where subject = 'user:' || p_user_id::text;
$$;

revoke all on function public.claim_scan(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.release_scan(uuid, text) from public, anon, authenticated;
revoke all on function public.scan_status(uuid, text) from public, anon, authenticated;
revoke all on function public.forget_user_scans(uuid) from public, anon, authenticated;
grant execute on function public.claim_scan(uuid, text, integer) to service_role;
grant execute on function public.release_scan(uuid, text) to service_role;
grant execute on function public.scan_status(uuid, text) to service_role;
grant execute on function public.forget_user_scans(uuid) to service_role;
