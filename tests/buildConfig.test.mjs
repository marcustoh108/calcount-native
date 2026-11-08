// Store builds are made in Expo's cloud (EAS), which never sees the git-ignored .env.local. If the
// server settings were missing there, the released app would open on the "server not configured"
// screen. These checks keep the build settings in line with the store declarations.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const json = (file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const eas = json("eas.json");
const app = json("app.json").expo;

function envFor(profile) {
  const p = eas.build[profile];
  return { ...(p.extends ? envFor(p.extends) : {}), ...(p.env ?? {}) };
}

for (const profile of ["preview", "production"]) {
  test(`the ${profile} build gets the server URL and public anon key`, () => {
    const env = envFor(profile);
    assert.match(env.EXPO_PUBLIC_SUPABASE_URL ?? "", /^https:\/\/[a-z0-9]+\.supabase\.co$/);
    const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
    assert.ok(key.length > 20, "anon key missing");
    // Only the public anon key may be bundled into the app, never a service or secret key.
    const role = key.startsWith("eyJ") ? JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role : null;
    assert.ok(role === "anon" || key.startsWith("sb_publishable_"), "only the public anon key may be built in");
  });
}

test("the production build is an app bundle for Google Play", () => {
  assert.equal(eas.build.production.android.buildType, "app-bundle");
});

test("the advertising ID permission is blocked, matching the Play declaration", () => {
  assert.ok(app.android.blockedPermissions.includes("com.google.android.gms.permission.AD_ID"));
});

test("store identifiers match the Play and App Store records", () => {
  assert.equal(app.android.package, "com.avencia.yumbalance");
  assert.equal(app.ios.bundleIdentifier, "com.avencia.yumbalance");
});
