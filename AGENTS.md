# Expo HAS CHANGED

This project is pinned to **Expo SDK 54** (not the newest SDK). The public Expo Go app on the
Apple App Store / Google Play Store has been stuck on SDK 54 for months because newer Expo Go
releases (55, 56, 57) have been stuck in Apple's app review queue with no ETA. Building against a
newer SDK means the app simply won't open in most people's Expo Go.

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

If a future Expo Go app-store release catches up past SDK 54, it's safe to upgrade this project
(`npx expo install expo@latest --fix`) — just confirm the target SDK is actually installable via
the App Store/Play Store first, not just published on npm.
