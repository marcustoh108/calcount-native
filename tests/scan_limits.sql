-- Scan-limit checks run by CI against a fresh database after all migrations.
-- Any failed assertion raises an error and fails the job.
do $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_user uuid := '11111111-1111-1111-1111-111111111111';
  r record;
  i integer;
begin
  -- Five scans allowed per local day, the sixth refused.
  for i in 1..5 loop
    select * into r from public.claim_scan_v2(v_user, 'device-aaaa', 5, v_today, 0);
    assert r.allowed and r.used = i, format('scan %s should be allowed', i);
  end loop;
  select * into r from public.claim_scan_v2(v_user, 'device-aaaa', 5, v_today, 0);
  assert not r.allowed and r.reason = 'limit', 'sixth scan should be refused';

  -- A user already on tomorrow (e.g. Auckland) has a separate count.
  select * into r from public.claim_scan_v2(v_user, 'device-aaaa', 5, v_today + 1, 0);
  assert r.allowed and r.used = 1, 'next local day starts fresh';

  -- A refund gives the scan back on the day it was claimed.
  assert public.release_scan_v2(v_user, 'device-aaaa', v_today, null) = 4, 'refund';
  assert public.scan_status_v2(v_user, 'device-aaaa', v_today) = 4, 'status after refund';

  -- The same phone can't reset the limit with a new account.
  select * into r from public.claim_scan_v2('22222222-2222-2222-2222-222222222222', 'device-aaaa', 5, v_today, 0);
  assert r.allowed, 'fifth scan on this phone';
  select * into r from public.claim_scan_v2('22222222-2222-2222-2222-222222222222', 'device-aaaa', 5, v_today, 0);
  assert not r.allowed, 'new account on the same phone is still limited';

  -- Days no time zone can be on are rejected.
  begin
    perform public.claim_scan_v2(v_user, 'device-aaaa', 5, v_today + 3, 0);
    assert false, 'far-future day should be rejected';
  exception when sqlstate '22023' then null;
  end;

  -- The service-wide cap refuses with reason 'busy', and a refund frees a slot.
  select * into r from public.claim_scan_v2('33333333-3333-3333-3333-333333333333', 'device-cccc', 5, v_today, 2);
  assert r.allowed, 'global 1';
  select * into r from public.claim_scan_v2('44444444-4444-4444-4444-444444444444', 'device-dddd', 5, v_today, 2);
  assert r.allowed, 'global 2';
  select * into r from public.claim_scan_v2('55555555-5555-5555-5555-555555555555', 'device-eeee', 5, v_today, 2);
  assert not r.allowed and r.reason = 'busy', 'global cap reached';
  perform public.release_scan_v2('33333333-3333-3333-3333-333333333333', 'device-cccc', v_today, r.global_day);
  select * into r from public.claim_scan_v2('55555555-5555-5555-5555-555555555555', 'device-eeee', 5, v_today, 2);
  assert r.allowed, 'slot freed by refund';

  raise notice 'All scan-limit tests passed';
end;
$$;
