# CalCount

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
| **All three** | — | **None** of them give condition-specific safety guidance (diabetic-safe? gout-safe?) as a first-class feature — this is the gap CalCount fills |

## Features and where they came from

**Adopted from the category leaders:**
- One-tap, camera-first scanning (Cal AI)
- Photo **and** manual/quick-add logging, so you're never stuck re-scanning (PlateLens)
- Streaks and a water tracker for light gamification (PlateLens)
- Meal-grouped diary with the calorie subtotal shown per meal, at a glance (what MyFitnessPal broke in its 2026 redesign)

**Built specifically to fix the pain points found in research:**
- **No paywall or scan limits** — CalCount calls the Anthropic API directly with your own key, so there's no "3 scans/day" ceiling and no subscription (fixes the PlateLens free-tier complaint).
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
| **CalCount** | Unlimited scans (you cover the API cost — see Monetization below) | Not yet monetized | All three of the above, adapted (see below) |

**Cautionary tale worth remembering:** Apple pulled Cal AI from the App Store in April 2026 over its
paywall — the weekly-equivalent price was shown more prominently than the actual billed amount, and
the auto-renewal toggle was easy to miss. See **Monetization** below.

**Brought into CalCount from this round:**
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

## Monetization (not yet built — read before you add a paywall)

CalCount has no payment flow today; it's still BYOK (bring-your-own Anthropic key). Before adding
one:
1. **Don't ship a shared API key in the app bundle** — see the note under Setup. Put a small backend
   proxy between the app and Anthropic, gated on subscription status.
2. **Don't repeat Cal AI's mistake**: show the real total price at least as prominently as any
   "per week" framing, and never bury the auto-renewal toggle. This is specifically what got Cal AI
   pulled from the App Store in April 2026.
3. Per-scan cost with `claude-sonnet-5` is roughly 1–2 cents; at $5.99–7.99/mo you'd undercut all
   three competitors above while keeping a healthy margin even for heavy users (see the cost
   breakdown from earlier project discussion for the full math).

## Architecture

- **Expo SDK 54 / React Native / TypeScript**, file-based routing via `expo-router`. Pinned to 54
  (rather than the newest SDK) because the Expo Go app on the Apple App Store / Google Play Store
  has been stuck on SDK 54 for months — newer SDKs there just show an "incompatible" error.
- `app/` — screens: onboarding, tab navigator (`diary`, `scan`, `trends`, `settings`), and a modal
  `result` screen for reviewing/editing a scan before saving.
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
phone to Anthropic — there is no CalCount backend.

> **Note on shipping to production:** embedding an end-user's own API key in a locally-run app is
> fine for personal use, but if you ever distribute this app to other people, put a small backend
> proxy in front of the Anthropic API instead of shipping a shared key inside the app bundle.

## Disclaimer

The health-safety guidance is generated from general nutrition heuristics and AI photo estimates.
It is **not medical advice**. Always confirm with a doctor or dietitian for medical decisions,
especially around diabetes, kidney disease, or other serious conditions.
