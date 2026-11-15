-- YumBalance: server-side record of who has Premium, so the `scan` Edge Function can refuse AI
-- photo scans to non-subscribers even if someone bypasses the app's own check.
--
-- RevenueCat is the source of truth. The `revenuecat-webhook` Edge Function and the `scan`
-- function (when it has nothing fresh) fetch the subscriber from RevenueCat's API and store the
-- result here. Like the scan counters, clients never touch this table: RLS is on with no
-- policies, and the functions below are callable only by the service role.

create table if not exists public.premium_status (
  user_id    uuid        primary key,
  active     boolean     not null,
  expires_at timestamptz,             -- null while active means no end date (e.g. a lifetime grant)
  checked_at timestamptz not null default now()
);

alter table public.premium_status enable row level security;
revoke all on public.premium_status from anon, authenticated;

-- Returns the stored status, or no row if the user has never been checked.
create or replace function public.premium_status_get(p_user_id uuid)
returns table (active boolean, expires_at timestamptz, checked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.active, p.expires_at, p.checked_at from public.premium_status p where p.user_id = p_user_id
$$;

-- Saves a fresh status from RevenueCat. Two updates for the same user arriving at once simply
-- leave the later one; each is a complete answer from RevenueCat, so either is correct.
create or replace function public.premium_status_set(p_user_id uuid, p_active boolean, p_expires_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_active is null then
    raise exception 'user id and status required' using errcode = '22023';
  end if;
  insert into public.premium_status (user_id, active, expires_at, checked_at)
  values (p_user_id, p_active, p_expires_at, now())
  on conflict (user_id) do update
    set active = excluded.active, expires_at = excluded.expires_at, checked_at = excluded.checked_at;
end;
$$;

-- Account deletion removes the stored status.
create or replace function public.forget_user_premium(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.premium_status where user_id = p_user_id
$$;

revoke all on function public.premium_status_get(uuid) from public, anon, authenticated;
revoke all on function public.premium_status_set(uuid, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.forget_user_premium(uuid) from public, anon, authenticated;
grant execute on function public.premium_status_get(uuid) to service_role;
grant execute on function public.premium_status_set(uuid, boolean, timestamptz) to service_role;
grant execute on function public.forget_user_premium(uuid) to service_role;
