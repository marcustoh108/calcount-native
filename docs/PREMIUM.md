# Premium on the server

The app only offers AI photo scans to Premium members, and the `scan` server function checks it
too, so nobody can get free AI scans by bypassing the app. RevenueCat is the source of truth.

- `supabase/migrations/20261115000000_premium_status.sql`: a server-only table caching who has
  Premium (no public access; see `tests/security.sql`).
- `revenuecat-webhook`: RevenueCat calls it when a subscription changes. It re-reads the account
  from RevenueCat and stores the answer.
- `scan`: for a photo scan, trusts a stored "yes" for up to 6 hours (never past its end date);
  otherwise asks RevenueCat. Non-members get `premium_required` and the app opens the plans
  screen. Barcode scans stay free. Enforcement is off until `PREMIUM_REQUIRED=true`.

## Turning it on (in this order)

1. **Database:** Supabase → SQL Editor → run `supabase/migrations/20261115000000_premium_status.sql`.
2. **RevenueCat secret key:** RevenueCat → API keys → **+ New secret API key** (v1), name
   `Supabase server`. Store it, never in the app or chat:
   `npx supabase secrets set REVENUECAT_SECRET_KEY=sk_...`
3. **Webhook password:** make a long random value (`openssl rand -hex 32`) and store it:
   `npx supabase secrets set REVENUECAT_WEBHOOK_AUTH=<value>`
4. **Deploy:** `npx supabase functions deploy revenuecat-webhook --no-verify-jwt`, then
   `npx supabase functions deploy scan --no-verify-jwt` and
   `npx supabase functions deploy delete-account --no-verify-jwt`.
5. **RevenueCat → Integrations → Webhooks → + Add:** URL
   `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`, Authorization header =
   the same value as step 3, environment **Both production and sandbox**, events **All**. Send a
   test event; it should show **200**.
6. **Switch on:** `npx supabase secrets set PREMIUM_REQUIRED=true`. To switch off instantly:
   `npx supabase secrets unset PREMIUM_REQUIRED`.

Turn it on only once Premium can be bought on every platform people scan from. Until the App
Store subscriptions exist, iPhone users couldn't subscribe and would lose photo scans.

## Reviewer and support accounts

Grant Premium in RevenueCat → Customers → (the account) → **Grant entitlement** → `premium`.
The server picks it up on the account's next photo scan.
