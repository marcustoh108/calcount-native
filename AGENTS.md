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
