# Keeping YumBalance and avencia.io secure

Most break-ins don't come through the code: they come through a stolen password to one of the
accounts that control it. The code side is already locked down (see the end of this page); this
list is the account side, which only you can change. Each item takes a few minutes.

## 1. Turn on two-step sign-in everywhere (most important)

Use an authenticator app (Google Authenticator, Microsoft Authenticator or 1Password), not SMS.

| Account | Where |
|---|---|
| GitHub (controls the code) | github.com → Settings → Password and authentication → Two-factor authentication |
| Supabase (database, server, user accounts) | supabase.com → Account → Security → Multi-factor authentication |
| Anthropic (AI key, billing) | console.anthropic.com → Settings → Security |
| Netlify (website) | app.netlify.com → User settings → Security → Two-factor authentication |
| GoDaddy (domains and email DNS) | GoDaddy → Account Settings → Login & PIN → 2-Step Verification |
| Microsoft 365 (company email) | admin.microsoft.com → Users → your user → Manage multifactor authentication |
| Apple ID / App Store Connect | Required by Apple already; keep it on |
| Google (Play Console) | myaccount.google.com → Security → 2-Step Verification |
| Expo | expo.dev → Account settings → Security |

✅ Each one asks for a code from your phone at your next sign-in.

## 2. Cap what an attacker could spend

- **Anthropic spend limit:** console.anthropic.com → Settings → Limits → set a monthly limit (for
  example US$100) and an email alert at 50%. Even if the key leaked, the bill can't run away.
- **Service-wide scan cap:** already on (2,000 scans a day across all users by default). Change it
  with `npx supabase secrets set SCAN_GLOBAL_DAILY_CAP=<n>`.
- **Supabase spend cap:** Supabase → Organization → Billing → keep "Spend cap" enabled.

## 3. Supabase sign-up protection

Supabase → Authentication:

- **Sign In / Providers → Email:** keep **Confirm email** on, so every account needs a real inbox.
- **Attack Protection:** turn on **Prevent use of leaked passwords**, if your plan offers it.
- **Attack Protection → Bot and abuse protection:** turn on CAPTCHA (Cloudflare Turnstile is free)
  if you ever see waves of fake sign-ups. This needs a small app change, so ask Claude Code first.
- **Rate Limits:** keep the defaults (they limit sign-ups and emails per hour).

## 4. Protect the code on GitHub

github.com/marcustoh108/calcount-native → Settings:

- **Code security → Secret scanning** and **Push protection:** on. GitHub then blocks a commit
  that contains a key.
- **Branches → Add branch ruleset** for `main`: require a pull request, require the status checks
  (**App typecheck and tests**, **Edge Functions typecheck**, **Database migrations and scan-limit tests**)
  to pass, and block force pushes. A broken change can then never reach `main`.
- **Collaborators:** only people who need access.

## 5. Keys: where they live, and what to do if one leaks

| Key | Lives in | Public? |
|---|---|---|
| Supabase URL and anon key | the app (`.env.local`) and the website | Yes, by design. They only allow what the database rules allow |
| Supabase service key (`service_role` / `sb_secret_…`) | Supabase secrets only | **Never** share, screenshot or paste it |
| Anthropic API key | Supabase secrets only | **Never** |
| Supabase access token (for deploys) | your Mac's keychain | **Never** |

If a secret key might have leaked (shown in a screenshot, pasted in a chat, committed):

1. **Anthropic:** console.anthropic.com → API Keys → create a new key, then
   `npx supabase secrets set ANTHROPIC_API_KEY=<new key>`, then delete the old key.
2. **Supabase service key:** Supabase → Project Settings → API Keys → roll the secret key, and
   update `CALCOUNT_SERVICE_KEY` if you set it.
3. Check the health page shows `"ok":true` (see `docs/RUNBOOK.md`).

## 6. Your Mac

- Keep macOS updated and FileVault on (System Settings → Privacy & Security → FileVault).
- Only run commands in Terminal that come from Claude Code or the official docs.

## What the code already does (checked automatically on every change)

- **Database:** row-level security on every table; the app's public key can't read or change any
  table, and only the server can call the scan and account functions.
  `tests/security.sql` fails the build if a future change ever opens one up.
- **Server:** every scan checks the login, enforces 5 scans a day per account and per device on
  the server clock, locks against simultaneous requests, caps total scans per day, validates every
  input, refuses oversized requests, and has a timeout and a friendly error on every outside call.
- **Secrets:** the AI key and service key exist only on the server, never in the app or website.
- **Website:** strict security headers (HTTPS only, no outside scripts, no framing), and all
  libraries are self-hosted.
- **App crashes:** damaged saved data is cleaned up on load instead of crashing the app or
  leaving it stuck on the loading screen (`lib/storageGuards.ts`, tested in
  `tests/storageGuards.test.mjs`), and an unexpected error shows a "Something went wrong · Try
  again" screen instead of a blank one.
- **App:** a store build without the server settings refuses to start, so the scan limit and
  accounts can never fall back to the phone. Health details stay on the phone.
- **Release safety:** typecheck, unit tests, Edge Function checks and database tests must pass
  before anything merges; see `docs/RUNBOOK.md` for rollback.

**Known and accepted:** `npm audit` reports advisories in Expo's build tools (Metro, the Expo CLI).
They run on your Mac while building, not inside the app people install, and npm's suggested "fix"
would downgrade Expo and break the app. They are resolved by moving to the next Expo SDK.
