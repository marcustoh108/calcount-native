// Premium purchases: the right store package is picked for each plan, Premium is read from the
// "premium" entitlement, and store errors become messages a person can act on.
import assert from "node:assert/strict";
import { test } from "node:test";

import { hasPremium, packageForPlan, purchaseErrorMessage, withTimeout } from "../lib/purchases/plans.ts";

const pkg = (identifier, packageType) => ({ identifier, packageType });

test("each plan picks its own package, by type or by RevenueCat's default identifier", () => {
  const offering = [pkg("$rc_monthly", "MONTHLY"), pkg("$rc_annual", "ANNUAL")];
  assert.equal(packageForPlan(offering, "yearly")?.identifier, "$rc_annual");
  assert.equal(packageForPlan(offering, "monthly")?.identifier, "$rc_monthly");
  assert.equal(packageForPlan([pkg("yearly", "CUSTOM")], "yearly")?.identifier, "yearly");
  assert.equal(packageForPlan([pkg("$rc_lifetime", "LIFETIME")], "yearly"), undefined);
});

test("Premium comes only from an active 'premium' entitlement", () => {
  assert.equal(hasPremium({ entitlements: { active: { premium: {} } } }), true);
  assert.equal(hasPremium({ entitlements: { active: { pro: {} } } }), false);
  assert.equal(hasPremium({ entitlements: { active: {} } }), false);
  assert.equal(hasPremium(null), false);
});

test("a cancelled purchase shows nothing; other failures explain what to do", () => {
  assert.equal(purchaseErrorMessage({ code: "1", userCancelled: true }), null);
  assert.equal(purchaseErrorMessage({ code: "1" }), null);
  assert.match(purchaseErrorMessage({ code: "10" }), /internet/);
  assert.match(purchaseErrorMessage({ code: "6" }), /Restore purchases/);
  assert.match(purchaseErrorMessage(new Error("boom")), /haven't been charged/);
});

test("a store call that hangs is stopped instead of leaving the screen waiting", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 20, "timed out"), /timed out/);
  assert.equal(await withTimeout(Promise.resolve(5), 1000, "timed out"), 5);
});
