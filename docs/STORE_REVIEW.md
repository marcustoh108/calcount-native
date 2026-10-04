# Getting YumBalance approved: App Store and Google Play

What to enter in App Store Connect and Google Play Console so it matches the website and the app.
Reviewers compare all three, and mismatches are the most common reason for rejection.

## Links to enter

| Field | App Store Connect | Google Play Console | URL |
|---|---|---|---|
| Privacy policy | App Information → Privacy Policy URL | App content → Privacy policy | https://avencia.io/yumbalance/privacy/ |
| Support | Version → Support URL | Store settings → Website + Email | https://avencia.io/yumbalance/support/ · admin@avencia-solutions.com |
| Marketing | Version → Marketing URL | — | https://avencia.io/yumbalance/ |
| Terms of Use (EULA) | App Information → License Agreement → custom, or the link in the description (below) | Store listing description (below) | https://avencia.io/yumbalance/terms/ |
| Account deletion | Not a field. Apple checks the in-app Settings → Delete account | App content → Data safety → "Delete account URL" | https://avencia.io/yumbalance/delete-account/ |
| Developer website | Membership details | Developer page → Website | https://avencia.io |

Use exactly **Avencia Private Limited** as the seller/developer name everywhere. It must match the D-U-N-S record and the website footer.

## Text to end the store description with

Apple requires subscription apps to show these links in the description or the EULA field. Paste this at the end of the description in both stores:

> YumBalance Premium is an auto-renewing subscription: US$79.99 per year or US$12.99 per month (local prices shown in the store), with a 3-day free trial for eligible new subscribers. Payment is charged to your Apple ID / Google Play account when the trial ends and renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your account settings.
> Terms of Use: https://avencia.io/yumbalance/terms/
> Privacy Policy: https://avencia.io/yumbalance/privacy/
> YumBalance gives general wellness and nutrition guidance based on estimates. It is not a medical device and does not provide medical advice.

## Health wording (both stores are strict here)

- Describe it as **"calorie and nutrition tracker"** that **"flags what to watch"** for conditions. Never say it diagnoses, treats or prevents anything, or that a food is "safe for" a condition.
- Keep the disclaimer in the description (above), on the website (already there) and in the app (onboarding consent and the result screen).
- Category: **Health & Fitness** (Apple) / **Health & Fitness** (Google).
- Google Play → App content → **Health apps** declaration: choose *Nutrition and weight management* (and *Diet and nutrition tracking* if listed). Answer that it is **not** a medical device and doesn't use Health Connect.

## Apple: App Privacy ("nutrition label")

App Store Connect → App Privacy. Tracking: **No** (no ads, no advertising IDs, no data brokers).

| Data type | Collected? | Linked to user | Purpose |
|---|---|---|---|
| Contact info → Email address | Yes | Yes | App functionality (account) |
| Identifiers → User ID | Yes | Yes | App functionality |
| Identifiers → Device ID (random install ID used for the scan limit) | Yes | No | App functionality, fraud prevention |
| User content → Photos | Yes (sent to Anthropic for analysis, not stored by us) | No | App functionality |
| Purchases → Purchase history | Yes, once subscriptions go live (Apple/RevenueCat) | Yes | App functionality |
| Health & fitness, food log, weight, conditions | **No.** Stored only on the phone | — | — |
| Search history | **No.** Sent straight to Open Food Facts in real time, not kept by us | — | — |

## Google Play: Data safety

App content → Data safety. Answer:
- Data **encrypted in transit**: Yes.
- Users can **request deletion**: Yes, and enter the delete-account URL above.
- **Personal info → Email address:** collected, required, *Account management*, not shared.
- **Photos and videos → Photos:** collected, **processed ephemerally**, *App functionality*, not shared. Anthropic counts as a service provider, which isn't "sharing" under Google's rules.
- **Device or other IDs:** collected, *App functionality* and *Fraud prevention*, not shared.
- **Financial info → Purchase history:** collected once subscriptions go live, *App functionality*.
- **Health and fitness:** **not collected.** It stays on the phone.

## AI disclosure (Apple guideline 5.1.2(i))

Apple requires apps to say clearly when personal data goes to a third-party AI and to get permission first. This is covered in three places:
- The sign-up/onboarding consent checkbox says meal photos and notes are sent to **Anthropic** for analysis. The account can't be created without ticking it.
- The Privacy Policy names Anthropic, both in the summary and in section 4.
- The YumBalance web page says it in the privacy section.

## Notes for the reviewer (App Review Information / Play "App access")

1. Create a review account in the app, e.g. **appreview@avencia-solutions.com**. First add it as an alias of your Microsoft 365 mailbox so you can receive the confirmation code. Confirm it, finish onboarding and log one meal.
2. Enter the email and password in **App Store Connect → App Review Information → Sign-in required** and in **Play Console → App content → App access**.
3. Paste in the notes:
   > YumBalance is a calorie and nutrition tracker. Sign in with the demo account above. Tap Scan to photograph any meal (or a food photo on screen) to see the AI nutrition estimate; Search works without scanning. Subscriptions are offered through in-app purchase with a 3-day free trial. Account deletion: Settings → Delete account & all data. Meal photos are analysed by Anthropic's API after the user consents at sign-up; health details stay on the device. The app gives general wellness guidance and is not a medical device.
4. The demo account has the normal 5 scans a day. Reviewers rarely need more. If a review is rejected for hitting the limit, tell Claude Code to raise the limit for that one account.

## Before you press Submit

- [ ] All links in the table above open (try them on your phone).
- [ ] The in-app paywall shows the plan names, prices, period, trial terms, **Restore purchases**, and links to Terms and Privacy. This comes with the in-app purchase work (RevenueCat).
- [ ] Subscription products are created in both stores with the same prices as the website, attached to the app version, and submitted together with it.
- [ ] Screenshots show the real app. Avoid screenshots with medical claims ("cures", "treats").
- [ ] Age rating questionnaire answered honestly: no violence or gambling; "medical or treatment information" = general nutrition guidance.
- [ ] Demo account works and is confirmed.
- [ ] The health check page shows `"ok":true`, so scanning works while the reviewer tests.
