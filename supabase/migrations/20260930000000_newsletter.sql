-- Newsletter sign-ups from the Avencia website (avencia-solutions.com).
--
-- The website calls subscribe_newsletter() with the public anon key. The table itself is closed to
-- anon and signed-in users, so nobody can read or list the addresses from the browser; only the
-- function can add one, and it validates the address first.

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;

create or replace function public.subscribe_newsletter(p_email text, p_source text default 'website')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_source text := left(coalesce(nullif(trim(p_source), ''), 'website'), 40);
begin
  if length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  -- Signing up again re-subscribes an address that had unsubscribed; otherwise it's a no-op, so the
  -- response never reveals whether an address was already on the list.
  insert into public.newsletter_subscribers (email, source)
  values (v_email, v_source)
  on conflict ((lower(email))) do update set unsubscribed_at = null;
end;
$$;

revoke all on function public.subscribe_newsletter(text, text) from public;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;
