# YumBalance server setup (Supabase + Anthropic)

This connects YumBalance to its own server so that **the daily limit of 5 scans can't be bypassed**:
the AI key lives only on the server, and every photo or barcode scan is checked against the
account *and* the phone, using the server's clock (Singapore time).

Until you finish these steps the app keeps working in "local mode" (on-phone account, your own
Anthropic key or demo results), so nothing breaks in the meantime.

**Time needed:** about 45 minutes. **Cost to start:** free (Supabase free plan) plus Anthropic
credits (from US$5).

---

## Part 1 — Create an Anthropic API key for the server (with billing)

This key is what the server uses to read food photos. It is **only** ever stored on the server.

**Sign up**
1. Open **https://console.anthropic.com** in a browser (it may redirect to
   `platform.claude.com`; that's the same console).
2. On the sign-in page, type **admin@avencia-solutions.com** in the email box and click
   **Continue with email**. (Don't use "Continue with Google" unless that address is a Google
   account.)
3. Open that mailbox, find the email from Anthropic, and click the sign-in link or type the code it
   contains. There's no password; each login uses a fresh email link or code.
4. First-time setup asks for **your name** and, depending on the version, an **organization
   name**, how you'll use the API, and whether you're a business. Enter:
   - Name: your own name
   - Organization name (if asked): **Avencia Private Limited**
   - Accept the terms and continue.

**Set or check the organization name** (if you weren't asked during sign-up)
5. Click **Settings** (the gear icon or your name at the bottom of the left sidebar) →
   **Organization** (sometimes "General"). In **Organization name**, enter
   **Avencia Private Limited** and **Save**.
   - Already have a Console login with another email (e.g. Gmail)? You can rename that
     organization instead, and invite admin@avencia-solutions.com under **Settings → Members**.

**Turn on billing**
6. **Settings → Billing** (or "Plans & Billing"):
   - **Add payment method**: company card, billing name **Avencia Private Limited**, the
     company's registered address, and the GST number if the company is GST-registered.
   - **Buy credits**: US$10–20 is plenty for testing (each scan is roughly 1–2 US cents).
   - Optional: turn on **auto-reload** so credits top up automatically.
7. **Settings → Limits**: set a **monthly spend limit** (e.g. US$50 while testing).

**Create the key**
8. **Settings → API Keys → Create Key**. Name it `calcount-server`, keep the default workspace,
   and click **Create**.
9. **Copy the key right away.** It starts with `sk-ant-api03-` and is shown only once. Save it
   in your password manager or a note you'll delete later.
10. Don't paste it into the app or `.env.local`. It goes into Supabase in Part 4 only.

> If the key ever leaks, delete it in **Settings → API Keys**, create a new one, and run the
> `secrets set` command in Part 4 again.

---

## Part 2 — Create the Supabase project and database

**Account and organization**
1. Go to **https://supabase.com** → **Start your project** → **Continue with GitHub**. Sign in as
   the GitHub account that owns this repo and click **Authorize Supabase**.
2. **Create a new organization**:
   - Name: **Avencia Private Limited**
   - Type: **Company**
   - Plan: **Free - $0/month**
   - Click **Create organization**.

**Project**
3. On **Create a new project**:
   - Organization: **Avencia Private Limited**
   - Project name: **calcount**
   - Database password: click **Generate a password**, then **Copy**, and save it in your
     password manager.
   - Region: **Southeast Asia (Singapore)**, which keeps data in Singapore for PDPA.
   - Leave the other options at their defaults and click **Create new project**. Setup takes about
     2 minutes.

**Database tables**
4. On your Mac, copy the SQL to the clipboard:
   ```bash
   cd /Users/admin/calcount-native
   git pull
   pbcopy < supabase/migrations/20260928000000_scan_limits.sql
   ```
5. In Supabase's left sidebar, click **SQL Editor** (the `>_` icon) → **+ New query** (or
   "New SQL snippet"). Click in the editor, paste with **Cmd+V**, then click **Run** (or press
   **Cmd+Enter**).
   - If it warns about a **destructive operation**, click **Run this query**. The warning is
     triggered by the permission lines, which lock the table down.
   - You should see **"Success. No rows returned."** Under **Table Editor** you'll now see
     `scan_usage`.

## Part 3 — Configure sign-in emails

YumBalance confirms accounts and resets passwords with **6-digit codes** typed into the app (no web
links needed).

> **Supabase only lets you edit email templates after you connect custom SMTP** (step 3). Until
> then, for testing: in **Sign In / Providers → Email**, turn **Confirm email off** and skip step 2.
> Sign-up then works instantly with no email. Password reset needs the code template, so it only
> works once SMTP and the templates are set up. (If Confirm email is on with the default template,
> users get a link instead of a code; they tap it, then "continue here" in the app.)

1. Left sidebar → **Authentication** → under Configuration, **Sign In / Providers** → click
   **Email**:
   - **Enable Email provider**: on
   - **Confirm email**: on
   - **Minimum password length**: **8**
   - **Password requirements**: **Lowercase, uppercase letters, digits and symbols** (or the
     letters, digits and symbols option)
   - Click **Save**.
2. **Authentication → Emails** (under Notifications; called *Email Templates* in some versions)
   → **Templates** tab:
   - Click **Confirm signup**. Set the subject to `Your YumBalance confirmation code`, and replace the
     **Message body** with:
     ```html
     <h2>Confirm your YumBalance account</h2>
     <p>Enter this code in the YumBalance app:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
     <p>If you didn't sign up for YumBalance, you can ignore this email.</p>
     ```
     Click **Save**.
   - Click **Reset Password**. Set the subject to `Your YumBalance password reset code`, and replace
     the body with:
     ```html
     <h2>Reset your YumBalance password</h2>
     <p>Enter this code in the YumBalance app to choose a new password:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
     <p>If you didn't ask to reset your password, you can ignore this email.</p>
     ```
     Click **Save**.
3. **Before real users sign up:** Supabase's built-in email sender only delivers to your own
   team's addresses, and only a few emails an hour. That's fine for testing, not for customers.
   Before launch, go to **Authentication → Emails → SMTP Settings** and connect a sending service
   (for example **Resend**, which has a free tier) on your domain `avencia-solutions.com`, with
   sender name **YumBalance** and address e.g. `no-reply@avencia-solutions.com`.

## Part 4 — Deploy the server functions (from your Mac)

1. Find your **project ref**: it's the code in the dashboard address,
   `https://supabase.com/dashboard/project/`**`abcdefghijklmnop`**, also shown in
   **Project Settings → General → Project ID**.
2. In Terminal:
   ```bash
   cd /Users/admin/calcount-native
   npm install
   npx supabase login
   ```
   A browser opens; click **Authorize**. If Terminal asks for a **verification code**, copy it
   from the browser page and paste it in.
3. Link this folder to your project (replace `YOUR_REF`):
   ```bash
   npx supabase link --project-ref YOUR_REF
   ```
   If it asks for the **database password**, paste the one from Part 2, or just press Enter to
   skip it (the rest of these steps don't need it).
4. Store the Anthropic key as a server secret (paste your real key after the `=`, no spaces or
   quotes):
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-PASTE-YOUR-KEY
   ```
5. Check which API keys your project has: **Project Settings → API Keys**.
   - If you see a **Legacy API keys** tab with an `anon` and a `service_role` key, you're done
     with this step.
   - If your project **only** has the new keys (`sb_publishable_…` / `sb_secret_…`), open the
     **Secret keys** section, copy the `sb_secret_…` key (create one if none exists), and run:
     ```bash
     npx supabase secrets set CALCOUNT_SERVICE_KEY=sb_secret_PASTE-YOUR-SECRET-KEY
     ```
6. Deploy both functions:
   ```bash
   npx supabase functions deploy scan --no-verify-jwt
   npx supabase functions deploy delete-account --no-verify-jwt
   ```
   - `--no-verify-jwt` is intentional: both functions check the user's login themselves (this
     works with both old and new API keys).
   - If a deploy says **Docker** isn't running, add `--use-api` to the end and run it again.
7. In the dashboard, **Edge Functions** should now list `scan` and `delete-account`. Their
   **Logs** tab is where errors appear if anything goes wrong later.

## Part 5 — Point the app at your server

1. Dashboard → **Project Settings → API Keys** (or **Settings → API**). Copy:
   - the **Project URL**, `https://YOUR_REF.supabase.co` (also under **Project Settings → Data
     API**)
   - the **publishable** key (`sb_publishable_…`) or the legacy **anon** key (`eyJ…`).
     **Never** use the `service_role` or `sb_secret_…` key in the app.
2. In Terminal, create the settings file and open it in TextEdit:
   ```bash
   cd /Users/admin/calcount-native
   cp .env.example .env.local
   open -e .env.local
   ```
   Replace the two example values so the file reads:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=PASTE-THE-PUBLISHABLE-OR-ANON-KEY
   ```
   Save with **Cmd+S** and close TextEdit. `.env.local` is git-ignored, so it's never uploaded
   to GitHub.
3. Restart Expo so it picks up the new values: `npx expo start --clear`. Then fully close Expo Go
   on the phone and scan the new QR code.

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
