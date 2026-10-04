# Avencia website (avencia.io)

The site lives at **https://avencia.io**. The previous address, avencia-solutions.com, is also connected to Netlify and forwards every page to avencia.io (see `website/public/_redirects`). Company email stays on avencia-solutions.com.

The company website, including the YumBalance product page and the pages the app stores require.

| Page | URL | Needed for |
|---|---|---|
| Avencia home | `/` | Apple/Google developer enrollment (live company website) |
| YumBalance | `/yumbalance/` | App marketing |
| Privacy Policy | `/yumbalance/privacy/` | **App Store + Google Play** (privacy policy URL) |
| Account deletion | `/yumbalance/delete-account/` | **Google Play** (delete-account URL); Apple accepts it too |
| Support | `/yumbalance/support/` | **App Store** (support URL) |
| Terms of Use | `/yumbalance/terms/` | App Store (EULA link in the listing and paywall) |
| Website privacy | `/privacy/` | Newsletter sign-ups (PDPA) |

## How it's built

- `website/src/pages/*.html`: page content. `website/build.mjs` wraps each page in the shared header and footer, and generates the YumBalance Privacy Policy and Terms from the app's own text in `lib/legal/`, so the website and app never disagree.
- `website/public/`: the finished site that gets published. After changing anything in `website/src/` or `lib/legal/`, run `node website/build.mjs` and commit `website/public/`.
- There's no framework and no build step on the host: plain HTML, CSS and a little JavaScript. It loads fast and has nothing to break.
- Security: HTTPS only (HSTS), a strict Content-Security-Policy, and no cookies, trackers or third-party scripts (`website/public/_headers`).

## One-time setup

### 1. Database for newsletter sign-ups
Supabase → **SQL Editor** → **New query** → paste all of `supabase/migrations/20260930000000_newsletter.sql` → **Run**. Make sure the target is the database, not Logs. You should see "Success. No rows returned".

### 2. Let the deletion page talk to the server
```
git pull
npx supabase functions deploy delete-account --no-verify-jwt
npx supabase functions deploy scan --no-verify-jwt
```

### 3. Add the public key to the website
In `website/public/assets/config.js`, set `supabaseAnonKey` to the same value as `EXPO_PUBLIC_SUPABASE_ANON_KEY` in your `.env.local`. This key is public by design; never put the service_role or secret key here. Until it's set, the newsletter and web-deletion forms show an "email us" fallback instead.

### 4. Publish on Netlify (free)
1. Go to https://app.netlify.com → **Sign up with GitHub**.
2. **Add new site → Import an existing project → GitHub** → choose `calcount-native`. The settings are read from `netlify.toml` (base `website`, publish `public`, no build command) → **Deploy**.
3. **Domain management → Add a domain** → `avencia.io` → **Add domain** (also add `www.avencia.io`). Then open **Options** next to avencia.io → **Set as primary domain**. Keep `avencia-solutions.com` and `www.avencia-solutions.com` listed too; they forward to avencia.io.
4. At the DNS provider for **avencia.io**, add:
   - **A** record, name **@** → `75.2.60.5` (replace any existing "Parked"/forwarding A record for @).
   - **CNAME** record, name **www** → `<your-site-name>.netlify.app` (currently `aquamarine-centaur-24453b.netlify.app`).
   For **avencia-solutions.com** (GoDaddy) the same two records are already in place. **Never touch** its MX, TXT, `autodiscover`, `msoid`, `sip`, `lyncdiscover`, `email`, `send`, `rsend` or `resend._domainkey` records — they run your email.
5. Back in Netlify → **Domain management → HTTPS** → **Verify DNS configuration**. The free certificate is issued automatically within about an hour. Keep **Force HTTPS** on.

Every change merged to `main` that touches `website/` redeploys automatically.

## Store listings
Full field-by-field guide (privacy labels, Data safety, health wording, reviewer notes): [`STORE_REVIEW.md`](STORE_REVIEW.md).

- **App Store Connect:** Privacy Policy URL `https://avencia.io/yumbalance/privacy/`; Support URL `https://avencia.io/yumbalance/support/`; Marketing URL `https://avencia.io/yumbalance/`.
- **Google Play Console:** Privacy policy `https://avencia.io/yumbalance/privacy/`; **Data safety → Data deletion** URL `https://avencia.io/yumbalance/delete-account/`.

## Email requests you'll receive
The deletion and privacy pages offer email as a fallback. When someone emails asking to delete their account, check it came from the account's email address. Then delete the user in Supabase → **Authentication → Users**, and reply to confirm, within 7 days as the page promises. Newsletter "Unsubscribe" requests: remove or mark the row in `newsletter_subscribers`.
