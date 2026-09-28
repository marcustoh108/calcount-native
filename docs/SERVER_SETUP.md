# CalCount server setup (Supabase + Anthropic)

This connects CalCount to its own server so that **the daily limit of 5 scans can't be bypassed**:
the AI key lives only on the server, and every photo or barcode scan is checked against the
account *and* the phone, using the server's clock (Singapore time).

Until you finish these steps the app keeps working in "local mode" (on-phone account, your own
Anthropic key or demo results), so nothing breaks in the meantime.

**Time needed:** about 45 minutes. **Cost to start:** free (Supabase free plan) plus Anthropic
credits (from US$5).

---

## Part 1 — Create an Anthropic API key for the server (with billing)

This key is what the server uses to read food photos. It is **only** ever stored on the server.

1. Go to **https://console.anthropic.com** (it may redirect to platform.claude.com — that's the same
   console) and **Sign up** with your company email, e.g. `admin@avencia-solutions.com`.
2. When asked, create an **organization** named **Avencia Private Limited**.
3. Turn on billing: open **Settings → Billing** (or **Plans & Billing**).
   - Add a **payment method** (company credit card).
   - **Buy credits** — US$10–20 is plenty for testing (each scan costs roughly 1–2 US cents).
   - Optional but recommended: turn on **auto-reload** so credits top up automatically, with a
     sensible reload amount.
4. Set a spending cap so a bug can never run up a big bill: **Settings → Limits** → set a
   **monthly spend limit** (e.g. US$50 while testing; raise it at launch).
5. Create the key: **Settings → API Keys → Create Key**.
   - Name it `calcount-server`.
   - **Copy the key immediately** (it starts with `sk-ant-api03-…`). It's shown only once. Keep it
     in a password manager.
6. Do **not** paste this key into the app's Settings screen or into `.env.local` — it goes into
   Supabase in Part 3 only.

> If the key ever leaks, delete it in **Settings → API Keys** and create a new one, then repeat the
> `secrets set` command in Part 3.

---

## Part 2 — Create the Supabase project and database

1. Go to **https://supabase.com** → **Start your project** → sign in with **GitHub** (the same
   account that owns this repo is simplest).
2. Create an **organization**: name **Avencia Private Limited**, plan **Free** (upgrade later).
3. **New project**:
   - Name: `calcount`
   - Database password: click **Generate a password** and save it in your password manager.
   - Region: **Southeast Asia (Singapore)** — keeps data in Singapore for PDPA.
   - Click **Create new project** and wait ~2 minutes.
4. Create the scan-limit tables: left menu **SQL Editor → New query**. Open
   [`supabase/migrations/20260928000000_scan_limits.sql`](../supabase/migrations/20260928000000_scan_limits.sql)
   from this repo, copy **all** of it, paste it in, and click **Run**. You should see "Success. No
   rows returned".

## Part 3 — Configure sign-in emails

CalCount confirms accounts and resets passwords with **6-digit codes** typed into the app (no web
links needed). Set that up:

1. **Authentication → Sign In / Providers → Email**: make sure **Email** is enabled and
   **Confirm email** is **on**. Set **Minimum password length** to **8** and **Password
   requirements** to include letters, digits and symbols. Save.
2. **Authentication → Emails → Templates** (called *Email Templates* in some versions):
   - **Confirm signup** — replace the message body with:
     ```html
     <h2>Confirm your CalCount account</h2>
     <p>Enter this code in the CalCount app:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
     <p>If you didn't sign up for CalCount, you can ignore this email.</p>
     ```
   - **Reset password** (sometimes "Reset Password" / "Recovery") — replace the body with:
     ```html
     <h2>Reset your CalCount password</h2>
     <p>Enter this code in the CalCount app to choose a new password:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
     <p>If you didn't ask to reset your password, you can ignore this email.</p>
     ```
   Save both.
3. **Important before real users sign up:** Supabase's built-in email sender only delivers to your
   own team's addresses and a few emails per hour — fine for testing with your own email, not for
   customers. Before launch, go to **Authentication → Emails → SMTP Settings** and connect a
   sending service (for example **Resend**, which has a free tier) using your domain
   `avencia-solutions.com`, with sender name **CalCount** and sender address e.g.
   `no-reply@avencia-solutions.com`.

## Part 4 — Deploy the server functions (from your Mac)

In Terminal:

```bash
cd /Users/admin/calcount-native
git pull
npm install

npx supabase login                         # opens the browser; approve access
npx supabase link --project-ref YOUR_REF   # YOUR_REF = the id in your project URL:
                                           # https://supabase.com/dashboard/project/YOUR_REF
                                           # (if asked for the database password, use the one from Part 2)

npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-PASTE-YOUR-KEY
npx supabase functions deploy scan --no-verify-jwt
npx supabase functions deploy delete-account --no-verify-jwt
```

- `--no-verify-jwt` is intentional: both functions check the user's login themselves (this works
  with both Supabase's old and new API keys).
- If a deploy complains that **Docker** isn't running, add `--use-api` to the deploy commands.
- Check it worked: **Edge Functions** in the dashboard should list `scan` and `delete-account`.

## Part 5 — Point the app at your server

1. In the Supabase dashboard open **Project Settings → API Keys** (or **Settings → API**) and copy:
   - the **Project URL** (`https://YOUR_REF.supabase.co`)
   - the **anon / publishable** key (starts with `eyJ…` or `sb_publishable_…`) — **not** the
     `service_role` / secret key.
2. In `/Users/admin/calcount-native`, create a file named **`.env.local`** (copy `.env.example`)
   and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=PASTE-THE-ANON-OR-PUBLISHABLE-KEY
   ```
   `.env.local` is already git-ignored, so it won't be committed.
3. Restart Expo so it picks up the new values: `npx expo start --clear`, then scan the QR code.

## Part 6 — Test it

1. On the phone: **Settings → Delete account & all data** to restart onboarding (this only clears
   the app on that phone).
2. Go through onboarding. At **Create your account**, use your own email (the built-in sender only
   emails your team until you add SMTP in Part 3). Enter the 6-digit code from the email.
3. Scan 5 meals. The 6th should be blocked with "Daily scan limit reached". Settings shows
   "Scans today: 5 of 5".
4. Try the bypasses — all should still be blocked today: delete and re-create the account, change
   the phone's date, or reinstall the app.
5. In Supabase, **Table Editor → scan_usage** shows the counters (one row per account and one per
   phone per day).
6. **Settings → Delete account & all data** also removes the account from **Authentication →
   Users**.

## Before launch

- Upgrade Supabase to **Pro** (about US$25/month). Free projects pause after a week without use.
- Connect custom SMTP (Part 3, step 3).
- Raise your Anthropic monthly spend limit to match expected usage (roughly users × 5 scans × 30
  days × US$0.01–0.02 in the worst case).
- Next hardening step: Apple **App Attest** / Google **Play Integrity**, so only the genuine app
  can call the server. See `docs/STORE_ACCOUNTS.md` for the accounts this and subscriptions need.
