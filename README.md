# YumBalance

A camera-first calorie tracker (Expo / React Native + TypeScript) that identifies food from a
photo, estimates calories and macros, and — its main differentiator — tells you whether that food
is safe for **diabetes, gout, hypertension, kidney disease, high cholesterol/heart disease, and
celiac/gluten sensitivity**, plus your own custom allergies.

## Competitive research

Before building, I compared **Cal AI**, **PlateLens**, and **MyFitnessPal** and looked at what
users say about them (Reddit threads, app reviews, comparison sites).

| App | What it does well | What users complain about |
|---|---|---|
| **Cal AI** | Dead-simple, camera-only flow; huge reach | Misses hidden oil/sugar/sauce; struggles with mixed dishes (sandwiches, composite plates); no coaching, no adaptive expenditure, minimal health-platform integration |
| **PlateLens** | Best-in-class photo accuracy claims; photo **+** manual/barcode logging; AI coach; streaks, water tracking, HealthKit sync | Free tier capped at 3 photo scans/day and 5 coach messages/day; no forward meal planning; weaker on restaurant/shared plates and non-Western cuisine |
| **MyFitnessPal** | Largest food database, recipe import | 2026 redesign backlash: 6–10 taps to log a meal that used to take 2–3, diary no longer shows calories-per-meal at a glance, lost multi-select/copy-meal shortcuts, cluttered home screen |
| **General pattern (r/caloriecounting etc.)** | — | Crowdsourced database entries conflict/are wrong; portion-size guessing is the #1 source of error (studies show 6–75% error vs. weighed food); correcting a bad estimate is entirely on the user, with no easy way to save the correction for next time |
| **All three** | — | **None** of them give condition-specific safety guidance (diabetic-safe? gout-safe?) as a first-class feature — this is the gap YumBalance fills |

## Features and where they came from

**Adopted from the category leaders:**
- One-tap, camera-first scanning (Cal AI)
- Photo **and** manual/quick-add logging, so you're never stuck re-scanning (PlateLens)
- Streaks and a water tracker for light gamification (PlateLens)
- Meal-grouped diary with the calorie subtotal shown per meal, at a glance (what MyFitnessPal broke in its 2026 redesign)

**Built specifically to fix the pain points found in research:**
- **Bring-your-own-key AI scanning** — YumBalance calls the Anthropic API directly with your own key. (Scans are now capped at 5 per day — see "Round three" below.)
- **Confidence badges + explicit uncertainty notes** on every scan (e.g. "frying oil quantity is estimated, not measured") instead of presenting a falsely precise number — addresses the Cal AI hidden-ingredient blind spot and the general "the app is confidently wrong" complaint.
- **Restaurant / shared-plate flag** you set before scanning, which tells the model to reason more conservatively about portions — targets PlateLens's acknowledged weak spot.
- **One-tap portion correction** (a ×0.25 stepper) *and* a full manual macro override, so a bad estimate takes seconds to fix — addresses the "portion size is the #1 source of error, and correcting it is all on you" complaint.
- **"Save as My Food"** — once you've corrected a meal, save it and log it again in one tap, so you never re-fight the same bad estimate twice.
- **Multi-select delete + one-tap "log this again" (duplicate)** in the diary — restores exactly the MyFitnessPal shortcuts users said the redesign removed.
- **Fully usable without an API key** via a built-in demo mode with sample scans — so the core flow can be evaluated with zero setup and zero account.

**The core differentiator — condition-aware safety, on every scan:**
- A transparent, rule-based safety engine (`lib/health/safetyRules.ts`) evaluates each analyzed
  meal against the health conditions you select and gives a `safe / caution / avoid` verdict **with
  a plain-language reason**, not just a badge:
  - **Diabetes** — added sugar, glycemic load, fiber-adjusted carb load
  - **Gout** — purine-rich ingredients (organ meats, shellfish, oily fish), alcohol, fructose
  - **Hypertension** — sodium per portion
  - **Kidney disease** — potassium, sodium + protein load
  - **High cholesterol / heart disease** — saturated fat, cholesterol
  - **Celiac / gluten sensitivity** — gluten-containing ingredients, with "uncertain" flagged for restaurant/sauce situations
  - **Custom allergies** — free-text keyword matching against the identified ingredients
- A **daily risk summary** on the diary screen (e.g. "Sodium today: 2400mg — over your 2000mg guide") aggregates this across everything logged that day, not just per-meal.

None of Cal AI, PlateLens, or MyFitnessPal expose anything like this — the closest comparables are
single-condition apps like *Carbs & Cals* (diabetes only) or *GoCoCo* (additive/processed-food
flags), not a general camera-based tracker with multi-condition support.

## Round two: Cal AI, Lose It!, and MyFitnessPal (2026 pricing + dashboards)

A second research pass focused on pricing and dashboard design specifically:

| App | Free tier | Paid pricing (2026) | Signature dashboard element |
|---|---|---|---|
| **Cal AI** | 3 AI scans/day | $9.99/mo or $29.99/yr typical (dynamic pricing seen $5.99–19.99/mo) | Color-coded macro rings + a horizontal date strip + a "Milestones" badge trophy room |
| **Lose It!** | Basic tracking, no AI scans | $79.99/yr or $299.99 lifetime — **no monthly plan** | A **single dial** showing calories *remaining* (goal − food + exercise), fed by Fitbit/Garmin/Oura/Apple Health sync, plus weekly calorie cycling |
| **MyFitnessPal** | 5 food entries/day | Premium $19.99/mo ($79.99/yr); Premium+ $24.99/mo ($99.99/yr, adds meal planning) | A macro **pie/donut** (share of calories from protein/carb/fat) alongside the calories-remaining equation |
| **YumBalance** | Unlimited scans (you cover the API cost — see Monetization below) | Not yet monetized | All three of the above, adapted (see below) |

**Cautionary tale worth remembering:** Apple pulled Cal AI from the App Store in April 2026 over its
paywall — the weekly-equivalent price was shown more prominently than the actual billed amount, and
the auto-renewal toggle was easy to miss. See **Monetization** below.

**Brought into YumBalance from this round:**
- **Lose It!'s "remaining calories" framing** — the Diary hero dial now reads "X kcal left" (or
  "over"), not just raw calories eaten, and a **Daily / Weekly budget** toggle lets it bank a surplus
  or deficit across a rolling 7 days the way Lose It!'s calorie cycling does (`weeklyCalorieBudget`
  in `lib/utils/nutrition.ts`).
- **MyFitnessPal's macro donut** — `components/MacroDonut.tsx`, a segmented ring showing each
  macro's share of today's calories, next to the existing per-macro gram rings.
- **Cal AI's date strip and milestone badges** — `components/DateStrip.tsx` for one-tap day
  switching (with a dot marking logged days) and `components/MilestoneBadges.tsx`, a light
  trophy-room strip (first scan, streak lengths, meals logged) on Trends.
- **Wearable-sync equivalent, without leaving Expo Go** — real HealthKit/Google Fit sync needs a
  custom native build (`eas build`), which is a separate, bigger undertaking outside Expo Go.
  Instead, `components/AddExerciseModal.tsx` lets you log exercise (quick-pick activities or a
  custom entry), and burned calories are added back into the "remaining" dial exactly like a
  wearable sync would.
- **Manual food search & barcode scanning** — `lib/api/openFoodFacts.ts` calls the free,
  no-API-key Open Food Facts database. In the Scan tab, a mode toggle switches between Photo,
  Barcode (live detection via `expo-camera`'s barcode scanner), and Search (`app/search.tsx`,
  which also searches your saved "My Foods"). This covers the packaged-food case Cal AI's
  photo-only flow can't.

## Monetization (paywall UI built, purchases not wired up yet — read before you finish it)

The plan-picker screen (`app/paywall.tsx`: US$69.90/year or US$12.90/month, 3-day free trial) exists,
but tapping "Start free trial" only explains that purchases aren't available yet — nothing is charged
or recorded. Real purchases need StoreKit / Google Play Billing (e.g. via RevenueCat) in a
**development build**; they can't run inside Expo Go. Before finishing it:
1. **Don't ship a shared API key in the app bundle** — see the note under Setup. Put a small backend
   proxy between the app and Anthropic, gated on subscription status.
2. **Don't repeat Cal AI's mistake**: show the real total price at least as prominently as any
   "per week" framing, and never bury the auto-renewal toggle. This is specifically what got Cal AI
   pulled from the App Store in April 2026.
3. Per-scan cost with `claude-sonnet-5` is roughly 1–2 cents; at $5.99–7.99/mo you'd undercut all
   three competitors above while keeping a healthy margin even for heavy users (see the cost
   breakdown from earlier project discussion for the full math).

## Actual vs. goal, and staying on track

- **`components/CalorieBreakdownRow.tsx`** spells out Goal / Consumed / Burned / Net as plain
  numbers on the Diary screen, alongside the existing calorie dial — the dial shows it as a ring,
  this shows the same numbers as a stat row.
- **`lib/tips/generateTips.ts`** generates up to 4 contextual, rule-based tips from today's actual
  numbers (no ML): a post-meal walk suggestion, fruit/fiber swaps when sugar is high or fiber is
  low, a protein catch-up nudge, a hydration reminder, and condition-specific nudges reusing the
  same `dailyRiskFlags` data as the safety engine. Rendered via `components/TipsCard.tsx`, only for
  the current day (a past day's numbers aren't "stay on track" material).
- **`lib/notifications.ts`** adds an opt-in local (on-device, no push server) reminder — toggle
  "Post-meal walk reminder" in Settings, and saving a meal schedules a one-off notification ~20
  minutes later suggesting a short walk. Confirmed working in Expo Go (unlike *remote* push
  notifications, which Expo Go dropped for Android starting SDK 53 — this only uses local
  scheduling, which Expo Go still supports fine on both platforms).
- The Diary header (date strip through tips) was moved into the `FlatList`'s `ListHeaderComponent`
  so the whole screen scrolls as one unit — it had grown tall enough across these feature rounds
  that a fixed, non-scrolling header started clipping the meal list on smaller screens.

## Body metrics, BMI, and workout support

- **Onboarding and Settings** now ask for weight, height, age, and gender (all optional, editable
  any time). `lib/health/bodyMetrics.ts` computes BMI, a WHO-standard category (Underweight / Good
  / Overweight / Obese), an ideal-weight range for your height, and an estimated daily calorie need
  (Mifflin-St Jeor BMR x a moderate-activity factor) — shown via `components/BodyMetricsCard.tsx`.
- **"(Recommended: X)" next to the Daily calorie goal field is personalized**, not a hardcoded
  number — a flat "2,500" is wrong for most people (it varies hugely by age/sex/weight/height), so
  it's computed from the body-metrics estimate above and a "Use recommended" button fills the goal
  field with it.
- **`lib/health/exerciseCalculator.ts`** uses standard published MET (Metabolic Equivalent of Task)
  values and the formula kcal/min = MET x 3.5 x weight(kg) / 200 to estimate how long common
  activities (jogging, swimming, cycling, strength training, yoga, …) take to burn a calorie
  target — falls back to an average 70kg estimate if weight isn't set.
  `components/ExerciseSuggestions.tsx` shows this on Diary: "burn off" suggestions when over the
  daily goal, general workout ideas otherwise.
- **Daily workout reminder** (`lib/notifications.ts`) — opt-in Settings toggle schedules a repeating
  local notification (6:00 PM) to move and log a workout, alongside the existing post-meal walk
  reminder, using a `DAILY` trigger with a fixed identifier so re-enabling replaces rather than
  duplicates it.
- **`components/PhysioTipCard.tsx`** rotates one general mobility/recovery tip per day (warm-ups,
  low-impact options for sore joints, RICE for minor strains, etc.) from `lib/tips/physioTips.ts` —
  deliberately generic, non-diagnostic education with a standing disclaimer to see a physiotherapist
  or doctor for anything persistent, severe, or sudden. Not a substitute for an actual physio
  assessment.
- **`app/workout-videos.tsx`** links out to YouTube search results by workout category (HIIT, yoga,
  low-impact cardio, strength basics, swimming technique, …) rather than embedding or curating
  specific videos — this avoids fabricating video IDs/channel links that can't be verified to still
  exist, and lets each person pick whatever instructor and pace suits them from real, current
  results. (Explicitly **not** curated by the appearance or ethnicity of whoever's in the video —
  that's not a legitimate selection criterion for a fitness feature.)

## Architecture

- **Expo SDK 57 / React Native / TypeScript**, file-based routing via `expo-router`. The SDK
  version is pinned to whatever the App Store / Play Store's Expo Go app actually supports at the
  time — that target has moved twice in this project's history (57 → 54 → 57 again, as Apple's app
  review caught up) and iOS Expo Go only ever supports its single latest published version, so a
  mismatch always shows as "incompatible" rather than a graceful downgrade. See `AGENTS.md` for how
  to re-check and re-pin this if it happens again.
- `app/` — screens: onboarding, tab navigator (`overview`, `personal`, `scan`, `trends`,
  `reminders`, `workout-videos`, `settings`), a modal `result` screen for reviewing/editing a scan
  before saving, `paywall`, and `legal` (Privacy Policy / Terms of Use).
- `lib/types.ts` — shared domain types (`FoodAnalysis`, `NutrientEstimate`, `HealthProfile`, `FoodEntry`, …).
- `lib/ai/foodRecognition.ts` — calls the Anthropic Messages API directly from the device with a
  vision-capable Claude model, using a prompt engineered to reason about hidden ingredients and
  return structured JSON. `lib/ai/mockAnalyzer.ts` provides the offline demo mode.
- `lib/health/safetyRules.ts` + `lib/health/dailyLimits.ts` — the rules engine described above.
- `lib/store/AppStateContext.tsx` — app-wide state (health profile, food log, saved foods, water,
  streaks) backed by `AsyncStorage`; `lib/store/PendingScanContext.tsx` hands a freshly captured
  photo + analysis from the Scan screen to the Result screen without serializing it through the URL.
- `lib/storage.ts` — persistence; the Anthropic API key specifically is stored in the OS keychain
  via `expo-secure-store`, never in `AsyncStorage`, and is only ever sent from this device straight
  to `api.anthropic.com`.

## Round three: onboarding, Personal, Overview, limits, and legal

- **Onboarding** (`app/onboarding.tsx`) is now a 5-step flow: a self-playing app demo
  (`components/AppDemo.tsx` — dashboard → phone scanning a plate → result dials with gout /
  glucose-intolerance / diabetes commentary, built from live components rather than a video file),
  then weight, height, age, gender and units; conditions and allergies; country and preferred
  language (full ISO lists in `lib/data/`, searchable via `components/SelectField.tsx`); and account
  creation (email + password with ≥8 characters, a letter, a number and a special character, plus
  Terms/Privacy consent). It finishes on the Personal tab with goals pre-filled from the recommendation.
- **Accounts are local only.** There's no YumBalance backend, so the account lives on the device
  (`lib/account.ts`): the password is stored as a salted SHA-256 hash in the keychain. Real sign-in,
  sync, and password reset need a backend (e.g. Supabase/Firebase) — the UI is ready for it.
- **Personal tab** (`app/(tabs)/personal.tsx`): BMI with a WHO-band scale, ideal weight range,
  a recommended daily plan (`recommendedDailyPlan` in `lib/health/bodyMetrics.ts` — eat/burn numbers
  that add up to a ~500 kcal deficit when losing weight), editable goals for weight, calories to eat
  and burn, protein and carbs, plus all profile details (conditions, allergies, units moved here from
  Settings) and the "Start 3-day free trial" entry point.
- **Overview** (renamed from Diary, `app/(tabs)/overview.tsx`) was redesigned away from Cal AI's
  ring-heavy look: a big "kcal left" number with a straight budget bar, a burn-target card with
  exercise examples, **Weight Now** with an Update button, macro bars, and simple ‹ › day switching.
- **Weight trend** on Trends (`components/WeightTrendChart.tsx`) over 3 / 6 / 9 / 12 months, with a
  goal line, drag-to-inspect, and a Start / Now / Change / Lowest summary. Every weigh-in is kept in
  `WeightLogStorage` (one per day).
- **5 scans per day** (`DAILY_SCAN_LIMIT` in `lib/store/AppStateContext.tsx`), counting successful
  photo and barcode scans; Search stays unlimited. The limit resets at local midnight.
- **Settings** now has Language, Privacy Policy, Terms of Use, and **Delete account & all data**
  (required by Apple for apps with account creation). The app is English-only for now, so the language
  pickers offer only English (`SUPPORTED_LANGUAGE_CODES` in `lib/data/languages.ts`); the full
  ISO list stays in that file, ready for when translations are added.
- **Legal documents** live in `lib/legal/`, published by Avencia Private Limited under Singapore
  law, with support and privacy contact admin@avencia-solutions.com (all set in
  `lib/legal/config.ts`). **Have a Singapore lawyer review both documents before release** —
  they're a solid starting draft, not legal advice.
- **Help** in Settings shows the support email and opens the user's mail app.

## Server (Supabase): enforcing the daily scan limit

With a server configured (`.env.local` → `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`),
all photo and barcode scans go through the `scan` Edge Function:

- **The Anthropic key lives only on the server** (a Supabase secret), so the app can't scan without it.
- **Limit of 5 a day per account and per phone**, counted in Singapore time on the database clock by
  `claim_scan()` in [`supabase/migrations/`](supabase/migrations/). Two scans started at the same moment
  can't both slip under the limit, and failed scans are refunded server-side. Deleting and re-creating
  an account, changing the phone's date, or reinstalling doesn't reset it.
- **Real accounts** use Supabase Auth: email and password, with 6-digit email codes for confirmation and
  password reset (`components/AuthForm.tsx`, `app/sign-in.tsx`, `app/reset-password.tsx`), plus
  in-app account deletion (`delete-account` function).
- The AI prompt, response parsing, barcode mapping and the limit live in one file shared by the app
  and the server: [`supabase/functions/_shared/foodAnalysis.ts`](supabase/functions/_shared/foodAnalysis.ts).
- With no server configured the app runs in **local mode**, as before: an on-phone account, your own
  Anthropic key or demo results, and the scan counter in the keychain.

Setup, step by step: **[docs/SERVER_SETUP.md](docs/SERVER_SETUP.md)** (Supabase and the Anthropic key).
Store and subscription accounts: **[docs/STORE_ACCOUNTS.md](docs/STORE_ACCOUNTS.md)** (Apple, Google Play, RevenueCat).

## Setup

```bash
npm install
npx expo start
```

Open in Expo Go (or a dev build) on your phone, or run `npm run android` / `npm run ios` with a
simulator/emulator configured.

The app works immediately in **demo mode** (cycles through sample scans, no account needed). To get
real photo analysis, add your own Anthropic API key in **Settings → AI scanning** (get one at
console.anthropic.com). The key is stored in the device keychain and calls go directly from your
phone to Anthropic — there is no YumBalance backend.

> **Note on shipping to production:** embedding an end-user's own API key in a locally-run app is
> fine for personal use, but if you ever distribute this app to other people, put a small backend
> proxy in front of the Anthropic API instead of shipping a shared key inside the app bundle.

## Disclaimer

The health-safety guidance is generated from general nutrition heuristics and AI photo estimates.
It is **not medical advice**. Always confirm with a doctor or dietitian for medical decisions,
especially around diabetes, kidney disease, or other serious conditions.
