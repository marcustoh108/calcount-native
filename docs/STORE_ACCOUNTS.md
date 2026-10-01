# App store and subscription accounts

To publish YumBalance and sell the **US$79.99/year** and **US$12.99/month** plans (with a 3-day free
trial) you need three accounts. Register them as the company, **Avencia Private Limited**, not as
an individual, so the stores show the company as the seller.

**Start with step 0 today** — it's the slowest part.

---

## Step 0 — Get a D-U-N-S number for Avencia Private Limited (free)

Apple and Google both use a D-U-N-S number (a 9-digit company ID from Dun & Bradstreet) to verify
organisations.

1. Check whether the company already has one: https://developer.apple.com/enroll/duns-lookup/
   (sign in with an Apple Account, enter the company's legal name and address exactly as registered
   with ACRA).
2. If none is found, request one from the same page. It's **free** and usually takes **up to 5
   business days** (sometimes longer). Dun & Bradstreet may email or call to confirm details.
3. Keep your ACRA business profile handy — the legal name and address must match everywhere.

---

## Step 1 — Apple Developer Program (US$99 per year)

**You'll need:** the D-U-N-S number · the company website `avencia-solutions.com` · a
company-domain email (e.g. `admin@avencia-solutions.com`, not Gmail) · authority to sign legal
agreements for the company · an Apple Account with two-factor authentication turned on.

1. Create (or use) an **Apple Account** with your company email at https://account.apple.com and
   turn on **two-factor authentication**.
2. Enroll either in the **Apple Developer** app on your iPhone (easiest — pay with Apple Pay) or at
   https://developer.apple.com/programs/enroll/ → **Start your enrollment**.
3. Choose **Company / Organization** as the entity type and enter the legal name
   **Avencia Private Limited**, the D-U-N-S number, the website and your contact details.
4. Apple may **call you** to verify that you can act for the company. Then pay the **US$99/year**
   fee (charged in local currency). Approval usually takes a few days to two weeks.
5. After approval, in **App Store Connect** (https://appstoreconnect.apple.com):
   - **Business → Agreements, Tax, and Banking:** accept the **Paid Apps Agreement** and add the
     company's bank account and tax forms. **Subscriptions and free trials can't go live without
     this.**
   - **Apps → + → New App:** name **YumBalance**, bundle ID **com.avencia.yumbalance** (already set in
     `app.json`), primary language English.
   - Later (with RevenueCat): create an auto-renewable subscription group with a yearly and a
     monthly product, each with a **3-day free trial** introductory offer.

---

## Step 2 — Google Play Console (US$25, one time)

**You'll need:** a Google Account (ideally for `admin@avencia-solutions.com`) · the D-U-N-S number
· the company website, phone and email.

1. Go to https://play.google.com/console/signup and sign in with the company Google Account.
2. Choose **An organization or business** (not "Yourself").
   - Organisation accounts can publish to production straight away. New *personal* accounts must
     first run a closed test with at least 12 testers for 14 days, so organisation is the better
     choice for Avencia.
3. Enter the D-U-N-S number and company details, and pay the **US$25 one-time** fee.
4. Complete **identity and organisation verification**. Google may ask for documents such as the
   ACRA business profile. It usually takes a few days.
5. After approval:
   - **Setup → Payments profile:** set up the merchant (payments) profile with the company's bank
     account. This is needed to sell subscriptions.
   - **Create app:** name **YumBalance**, app, free (with in-app purchases), then fill in the store
     listing, content rating, data safety form (use the Privacy Policy as your guide), and the
     health apps declaration.
   - Later (with RevenueCat): **Monetize → Subscriptions** → create yearly and monthly
     subscriptions, each with a **3-day free trial** offer.

---

## Step 3 — RevenueCat (free to start)

RevenueCat handles subscriptions on both stores through one SDK: trials, renewals, cancellations
and receipts. It's free until your app earns a set amount of monthly revenue; check the current
threshold at https://www.revenuecat.com/pricing.

1. Sign up at https://app.revenuecat.com/signup with your company email (or **Sign in with
   GitHub**).
2. **Create a project** named **YumBalance**.
3. You can do the next part once Steps 1–2 are approved:
   - **Add an App Store app:** bundle ID `com.avencia.yumbalance`, plus an **In-App Purchase key**
     from App Store Connect (**Users and Access → Integrations → In-App Purchase**).
   - **Add a Play Store app:** package name `com.avencia.yumbalance`, plus a **service account
     credentials JSON** from Google Cloud with access granted in Play Console (RevenueCat's setup
     screen links to a step-by-step guide).
   - **Entitlement:** `premium`.
   - **Products:** the yearly (US$79.99) and monthly (US$12.99) subscriptions from both stores,
     attached to `premium`.
   - **Offering:** `default`, with an **Annual** and a **Monthly** package.
4. Tell me when this is done. The remaining work is on my side:
   - Add the RevenueCat SDK to the app. This needs a **development build** made with EAS; in-app
     purchases don't run inside Expo Go.
   - Connect the paywall's **Start 3-day free trial** button to real purchases.
   - Add a RevenueCat webhook to Supabase so the server knows who is subscribed.

---

## Suggested order and timeline

| When | What |
|---|---|
| Today | D-U-N-S lookup/request · Anthropic key · Supabase setup (`docs/SERVER_SETUP.md`) |
| Week 1–2 | Apple Developer + Google Play organisation enrolment (after D-U-N-S) |
| After approval | App Store Connect Paid Apps Agreement + Play payments profile · RevenueCat project |
| Then | Subscriptions wired in, App Attest / Play Integrity, TestFlight and Play internal testing |
