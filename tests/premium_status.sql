-- Server-side Premium status: saving, reading, overwriting and forgetting an account's record.
do $$
declare
  u uuid := '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
  r record;
begin
  assert (select count(*) from public.premium_status_get(u)) = 0, 'unknown user has no record';

  perform public.premium_status_set(u, true, now() + interval '1 year');
  select * into r from public.premium_status_get(u);
  assert r.active and r.expires_at > now(), 'active Premium is stored with its end date';

  perform public.premium_status_set(u, false, null);
  select * into r from public.premium_status_get(u);
  assert not r.active and r.expires_at is null, 'a newer answer replaces the old one';
  assert (select count(*) from public.premium_status where user_id = u) = 1, 'one row per user';

  perform public.forget_user_premium(u);
  assert (select count(*) from public.premium_status_get(u)) = 0, 'account deletion removes the record';

  begin
    perform public.premium_status_set(null, true, null);
    assert false, 'a missing user id must be refused';
  exception when sqlstate '22023' then
    null;
  end;
end $$;
