-- Newsletter sign-ups: a rate limit, so a bot can't flood the list through the public website form.
--
-- At most 30 *new* addresses per 10 minutes across the whole site (far above real traffic for a
-- small company site). Re-subscribing an address already on the list is never limited. Over the
-- limit the function raises SQLSTATE 53400, which the website shows as "please try again in a
-- moment". Same signature as before, so the website needs no change.

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at);

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

  if not exists (select 1 from public.newsletter_subscribers where lower(email) = v_email)
     and (select count(*) from public.newsletter_subscribers where created_at > now() - interval '10 minutes') >= 30
  then
    raise exception 'too_many_signups' using errcode = '53400';
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
