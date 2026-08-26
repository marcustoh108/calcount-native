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
