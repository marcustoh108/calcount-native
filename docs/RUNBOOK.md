# YumBalance runbook: keeping it running, and fixing it fast

One page for when something breaks. The aim is a 15-minute fix, never a rebuild.

## The stack (locked, don't add to it)

| Part | What we use | Where it runs |
|---|---|---|
| App | Expo SDK 57 + expo-router + TypeScript | Phones (Expo Go now, EAS builds for the stores) |
| Server | Supabase: Postgres, Auth, Edge Functions (Deno) | Supabase, Singapore region |
| AI | Anthropic API, one model (`FOOD_MODEL` in `supabase/functions/_shared/foodAnalysis.ts`) | Called only from the `scan` Edge Function |
| Food data | Open Food Facts | Called from the app (search) and `scan` (barcodes) |
| Email | Supabase Auth → Resend SMTP | `no-reply@avencia-solutions.com` |
| Website | Static HTML in `website/`, built by `node website/build.mjs` | Netlify, avencia.io |

## Daily safety nets (already in place)

- **Automatic checks on every change.** GitHub Actions (`.github/workflows/checks.yml`) runs the app typecheck, time-zone tests, an Edge Function check, and database tests for scan limits and the newsletter. A red ✗ on a pull request means don't merge it.
- **Versions are locked.** `package-lock.json` is committed, `.npmrc` saves exact versions, Edge Functions import exact versions (`npm:@anthropic-ai/sdk@0.128.0`), and the database only changes through files in `supabase/migrations/`.
- **Limits that protect the bill.** 5 scans per user per day, plus a service-wide cap (`SCAN_GLOBAL_DAILY_CAP`, default 2,000/day), plus the Anthropic monthly spend limit (US$50) with auto-reload.
- **Timeouts everywhere.** AI 45s with one retry, barcode lookups 15s, food search 10s, the app gives up after 20s (status) or 100s (scan), so nothing hangs.
- **Rate limits.** Scans (above), newsletter sign-ups (30 new per 10 minutes), and Supabase Auth's built-in limits on sign-in and email codes.
- **Health check.** `https://rkntgsaycxxhzkswdtnx.supabase.co/functions/v1/health` returns `{"ok":true}` when the database and the AI key both work, or HTTP 503 naming which is broken.

## Monitoring (set up once, 10 minutes, free)

1. Create a free account at **uptimerobot.com**.
2. **Add New Monitor** → type **HTTP(s)** → URL `https://avencia.io` → interval **5 minutes** → alert contact **admin@avencia-solutions.com** → **Create**.
3. Add a second monitor: type **Keyword**, URL `https://rkntgsaycxxhzkswdtnx.supabase.co/functions/v1/health`, keyword `"ok":true`, alert when the keyword is **not** found, interval 5 minutes.

You'll get an email within 5 minutes of the website or scanning going down.

## When something breaks

1. **Look at the health check** (URL above) in a browser.
   - `database: failed`: a migration wasn't run, or the service key secret is missing. See *Supabase → Edge Functions → health → Logs* for the reason.
   - `ai: failed`: the Anthropic key was deleted or revoked, credit ran out, or the model was retired. Check *Anthropic Console → Billing / API keys*.
2. **Read the logs.** Supabase dashboard → **Edge Functions** → `scan` → **Logs**. Every failure is logged with its reason, e.g. `Anthropic 400: ...` or `claim_scan failed`.
3. **In the app (Expo Go / development builds),** error alerts show the server's technical reason in brackets.
4. **Hand it to Claude Code.** Paste the error and the log line, and say: *"Fix this without changing other functionality. Run the checks before merging."* Then follow the commit and deploy steps it gives you.

## Rolling back

| What | How (about 1 minute) |
|---|---|
| Website | Netlify → **Deploys** → click the last good deploy → **Publish deploy**. |
| An Edge Function | `git log --oneline -- supabase/functions` to find the last good commit, then `git checkout <commit> -- supabase/functions && npx supabase functions deploy scan --no-verify-jwt`, then `git checkout main -- supabase/functions` to return your copy to normal. |
| The app (store builds) | EAS Update → republish the previous update, or ship the previous build. |
| The database | Never edit tables by hand. Write a new migration that undoes the change, and test it in CI first. |

## Deploy order (every time)

1. Run any new file in `supabase/migrations/` in the Supabase SQL Editor (oldest first).
2. Then deploy the functions that changed: `npx supabase functions deploy <name> --no-verify-jwt` (`scan`, `delete-account`, `health`).
3. Then restart the app / publish the app update.

Deploying a function before its migration is the most common way to break scanning.

## Upgrading safely

- **Expo SDK:** follow `AGENTS.md`; it matches the SDK to what Expo Go supports.
- **Anything else:** one package at a time, on a branch, and merge only when CI is green.
- **AI model:** change `FOOD_MODEL` only after scanning 5–10 meals with known calories and comparing.
