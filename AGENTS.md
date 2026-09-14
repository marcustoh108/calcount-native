# Expo HAS CHANGED

This project's SDK version must match whatever Expo Go on the Apple App Store / Google Play Store
actually supports — that target has moved twice already in this project's history:

- Originally scaffolded on SDK 57, then downgraded to **SDK 54** (~Aug 2026) because the App
  Store's Expo Go was stuck there for months while SDK 55/56/57 sat in Apple review with no ETA.
- As of ~Sept 2026, the App Store's Expo Go caught up and moved to **SDK 57** — and critically,
  iOS Expo Go only ever supports its *latest* published version; **you cannot install an older
  Expo Go build on iOS**, unlike Android. So once the store version moves, every iOS user's Expo
  Go moves with it, whether or not this project has caught up.

**Before writing any code, or if a user reports Expo Go showing "Project is incompatible with this
version of Expo Go," check what SDK the error message says Expo Go actually is, and match this
project to it** — do not assume the last-known SDK pin is still correct. Read the exact versioned
docs at `https://docs.expo.dev/versions/v<N>.0.0/` for whichever SDK that turns out to be.

To upgrade cleanly, don't guess version numbers — fetch the real ones for that SDK:
- `https://raw.githubusercontent.com/expo/expo/sdk-<N>/templates/expo-template-blank-typescript/package.json`
  for expo/react/react-native/typescript core versions.
- `https://raw.githubusercontent.com/expo/expo/sdk-<N>/packages/expo/bundledNativeModules.json`
  for every other `expo-*` / `react-native-*` package version.

Then edit `package.json` directly with those exact versions, `rm -rf node_modules package-lock.json`,
and `npm install` (add `--legacy-peer-deps` if a fresh install hits an ERESOLVE error over
`react-dom`/`@radix-ui` — that's expo-router's web dependency graph, unrelated to the native app).
Avoid `npx expo install` in this sandboxed environment — its own fetch client doesn't route through
the proxy the same way plain `npm install` does, and reliably fails with "HTTP Proxy Network Error:
Forbidden" here even though the target SDK/versions are correct.

## Expo Go now requires being logged in (SDK 57+, iOS first)

As of SDK 57, opening a project in Expo Go on iOS requires the **same Expo account logged in on
both ends** — the terminal running `npx expo start` and the Expo Go app on the phone. Without this,
Expo Go shows "There was a problem running the requested project... You need to be signed in to
Expo Go and Expo CLI," even when the SDK versions match correctly. This is a real, intentional Expo
change (not a bug in this project) — see https://expo.dev/changelog/expo-go-57-login — currently
enforced on iOS, with Android expected to follow later.

Fix: `npx expo login` in the terminal (free Expo account, sign up if needed), and in Expo Go on the
phone, tap the avatar icon on the Home tab and log into the *same* account. Do this before assuming
a "Project is incompatible" or unexplained load failure is an SDK mismatch — check which error it
actually is first.
