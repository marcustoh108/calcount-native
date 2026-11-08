# Building YumBalance for the stores

Store builds are made in Expo's cloud with **EAS Build**, using the settings in `eas.json`.

- `production` makes the Android App Bundle (`.aab`) for Google Play (and the iOS build once Apple
  approves the developer account). EAS numbers each build automatically (`autoIncrement`).
- `preview` makes an `.apk` you can install directly on an Android phone for a quick check.
- Both include the server address and the **public** anon key, because EAS never sees the
  git-ignored `.env.local`. Never put the service role / secret key or the Anthropic key in `eas.json`.
- `app.json` blocks the advertising ID permission (`AD_ID`), matching the Play Console declaration
  that YumBalance doesn't use advertising ID.

## First Android build (on your Mac, in the project folder)

1. `npm install -g eas-cli` (once).
2. `eas login` with your Expo account.
3. `eas init` (once). It links the project to your Expo account and adds `extra.eas.projectId` to
   `app.json`; commit that change.
4. `eas build --platform android --profile production`. When asked to generate a new Android
   keystore, answer **Yes**: EAS stores it safely and uses it for every future build. Never delete it.
5. When the build finishes (about 15–20 minutes), download the `.aab` from the link it prints.
6. Play Console → YumBalance → **Test and release → Internal testing → Create new release** → upload
   the `.aab`, add yourself as a tester, then install the app from the opt-in link on your phone.

In-app purchases (RevenueCat) need a build like this; they don't run inside Expo Go.
