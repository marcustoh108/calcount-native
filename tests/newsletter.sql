-- Newsletter checks run by CI against a fresh database after all migrations.
do $$
declare
  i integer;
begin
  perform public.subscribe_newsletter('First@Example.com');
  perform public.subscribe_newsletter('first@example.com '); -- same address again: no error, no duplicate
  assert (select count(*) from public.newsletter_subscribers) = 1, 'duplicate address stored once';

  begin
    perform public.subscribe_newsletter('not-an-email');
    assert false, 'invalid address should be rejected';
  exception when sqlstate '22023' then null;
  end;

  -- Fill the 10-minute window (30 new addresses), then a new one is refused...
  for i in 2..30 loop
    perform public.subscribe_newsletter(format('person%s@example.com', i));
  end loop;
  begin
    perform public.subscribe_newsletter('one-too-many@example.com');
    assert false, 'rate limit should refuse the 31st new address';
  exception when sqlstate '53400' then null;
  end;
  -- ...but an address already on the list can still re-subscribe.
  perform public.subscribe_newsletter('first@example.com');

  raise notice 'All newsletter tests passed';
end;
$$;
