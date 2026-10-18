// Damaged saved data must never crash the app or stop it from starting.
import assert from "node:assert/strict";
import { test } from "node:test";

import { foodEntries, healthProfile, objectList } from "../lib/storageGuards.ts";

const good = {
  id: "a1",
  createdAt: "2026-10-18T08:00:00.000Z",
  servings: 1.5,
  analysis: { foodName: "Rice", nutrients: { calories: 200 } },
  safety: [{ condition: "gout", level: "caution", reason: "" }],
};

test("non-lists become empty lists", () => {
  for (const raw of [null, undefined, "x", 42, { a: 1 }]) {
    assert.deepEqual(objectList(raw), []);
    assert.deepEqual(foodEntries(raw), []);
  }
});

test("broken food entries are dropped, good ones kept", () => {
  const out = foodEntries([
    good,
    null,
    "junk",
    { ...good, id: 7 },
    { ...good, createdAt: "not a date" },
    { ...good, analysis: null },
    { ...good, analysis: { foodName: "No nutrients" } },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].servings, 1.5);
  assert.equal(out[0].safety.length, 1);
});

test("missing servings and health flags get safe defaults", () => {
  const [entry] = foodEntries([{ ...good, servings: "2", safety: undefined }]);
  assert.equal(entry.servings, 1);
  assert.deepEqual(entry.safety, []);
});

test("a damaged profile falls back to defaults with real lists", () => {
  const defaults = { conditions: [], allergies: [], dailyCalorieGoal: null };
  assert.deepEqual(healthProfile("garbage", defaults), defaults);
  const p = healthProfile({ conditions: "gout", allergies: ["peanut", 3], dailyCalorieGoal: 1800 }, defaults);
  assert.deepEqual(p.conditions, []);
  assert.deepEqual(p.allergies, ["peanut"]);
  assert.equal(p.dailyCalorieGoal, 1800);
});
