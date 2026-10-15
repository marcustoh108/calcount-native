-- Security checks run by CI against a fresh database after all migrations. They fail the build if
-- a future migration accidentally opens the database to the public `anon` key or to signed-in
-- users (`authenticated`), who can call the database directly with the app's public key.
do $$
declare
  r record;
begin
  -- Every table in the public schema has row-level security on, and the public roles hold no
  -- table privileges at all: only the Edge Functions (service_role) read or write data.
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    assert (select relrowsecurity from pg_class where oid = format('public.%I', r.relname)::regclass),
      format('row-level security is off on public.%s', r.relname);
    assert not has_table_privilege('anon', format('public.%I', r.relname), 'select,insert,update,delete'),
      format('anon can access public.%s', r.relname);
    assert not has_table_privilege('authenticated', format('public.%I', r.relname), 'select,insert,update,delete'),
      format('authenticated can access public.%s', r.relname);
  end loop;

  -- Functions that run with elevated rights (security definer) can only be called by the server,
  -- except the website's newsletter sign-up, which is public on purpose and validated in SQL.
  for r in
    select p.oid::regprocedure as fn, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    if r.proname = 'subscribe_newsletter' then
      continue;
    end if;
    assert not has_function_privilege('anon', r.fn, 'execute'), format('anon can call %s', r.fn);
    assert not has_function_privilege('authenticated', r.fn, 'execute'), format('authenticated can call %s', r.fn);
    assert has_function_privilege('service_role', r.fn, 'execute'), format('the server cannot call %s', r.fn);
  end loop;

  -- Each elevated function pins its search_path, so nobody can slip in a look-alike table or function.
  for r in
    select p.oid::regprocedure as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    assert false, format('%s has no fixed search_path', r.fn);
  end loop;
end $$;
