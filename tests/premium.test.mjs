// Server-side Premium: read correctly from RevenueCat, trusted from storage only while fresh and
// active, and only real YumBalance accounts are taken from webhook events.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  accountsInEvent,
  isAccountId,
  premiumFromSubscriber,
  storedPremiumStillValid,
} from "../supabase/functions/_shared/premium.ts";

const NOW = new Date("2026-11-15T10:00:00Z");
const subscriber = (entitlements) => ({ subscriber: { entitlements } });
const USER = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";

test("Premium is active until its expiry date, and forever when it has none", () => {
  assert.deepEqual(premiumFromSubscriber(subscriber({ premium: { expires_date: "2026-11-15T10:30:00Z" } }), NOW), {
    active: true,
    expiresAt: new Date("2026-11-15T10:30:00Z"),
  });
  assert.equal(premiumFromSubscriber(subscriber({ premium: { expires_date: "2026-11-15T09:59:00Z" } }), NOW).active, false);
  assert.deepEqual(premiumFromSubscriber(subscriber({ premium: { expires_date: null } }), NOW), { active: true, expiresAt: null });
});

test("only the 'premium' entitlement counts; anything else or malformed is not Premium", () => {
  assert.equal(premiumFromSubscriber(subscriber({ yumbalance_premium: { expires_date: null } }), NOW).active, false);
  assert.equal(premiumFromSubscriber(subscriber({}), NOW).active, false);
  assert.equal(premiumFromSubscriber({}, NOW).active, false);
  assert.equal(premiumFromSubscriber(null, NOW).active, false);
  assert.equal(premiumFromSubscriber(subscriber({ premium: { expires_date: "not a date" } }), NOW).active, false);
});

test("a stored 'yes' is trusted for 6 hours and never past its expiry; a stored 'no' is always re-checked", () => {
  const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600_000);
  const later = new Date("2026-12-15T00:00:00Z");
  assert.equal(storedPremiumStillValid({ active: true, expiresAt: later, checkedAt: hoursAgo(1) }, NOW), true);
  assert.equal(storedPremiumStillValid({ active: true, expiresAt: null, checkedAt: hoursAgo(5.9) }, NOW), true);
  assert.equal(storedPremiumStillValid({ active: true, expiresAt: later, checkedAt: hoursAgo(7) }, NOW), false);
  assert.equal(storedPremiumStillValid({ active: true, expiresAt: hoursAgo(0.1), checkedAt: hoursAgo(1) }, NOW), false);
  assert.equal(storedPremiumStillValid({ active: false, expiresAt: null, checkedAt: hoursAgo(0) }, NOW), false);
  assert.equal(storedPremiumStillValid(null, NOW), false);
});

test("webhook events yield each YumBalance account once, including transfers, and skip anonymous IDs", () => {
  const other = "2c5f39cb-3fb2-11d2-883f-0016d3cca428";
  assert.deepEqual(
    accountsInEvent({
      event: {
        app_user_id: USER,
        original_app_user_id: "$RCAnonymousID:abc123",
        aliases: [USER.toUpperCase(), "$RCAnonymousID:abc123"],
        transferred_from: [other],
      },
    }),
    [USER, other],
  );
  assert.deepEqual(accountsInEvent({ event: { app_user_id: "$RCAnonymousID:xyz" } }), []);
  assert.deepEqual(accountsInEvent({}), []);
  assert.equal(isAccountId("'; drop table x; --"), false);
});
