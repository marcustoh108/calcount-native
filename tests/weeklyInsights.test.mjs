// The "This week" summary on Trends.
import assert from "node:assert/strict";
import { test } from "node:test";

import { weeklyInsights } from "../lib/insights/weeklyInsights.ts";

const targets = { proteinG: 100, carbsG: 200, fatG: 60 };
const day = (calories, proteinG, carbsG = 150, fatG = 50, count = 2) => ({
  count,
  totals: { calories, proteinG, carbsG, fatG, sugarG: 0, fiberG: 0, sodiumMg: 0, potassiumMg: 0, saturatedFatG: 0 },
});
const empty = { count: 0, totals: day(0, 0, 0, 0).totals };
const texts = (r) => r.insights.map((i) => i.text);

test("counts only logged days: 'Protein low 4 of 6 days'", () => {
  const week = [day(1900, 50), day(1900, 60), day(1900, 110), day(1900, 70), day(1900, 75), day(1900, 105), empty];
  const r = weeklyInsights(week, targets, 2000, []);
  assert.equal(r.daysLogged, 6);
  assert.ok(texts(r).includes("Protein low 4 of 6 days (target 100 g)"));
  assert.ok(texts(r).includes("Calories within your goal every day logged"));
});

test("flags are counted once per meal and subject, most frequent first", () => {
  const week = [day(2500, 120, 260, 80), day(1800, 120), empty, empty, empty, empty, empty];
  const sodium = { condition: "hypertension", level: "avoid", reason: "" };
  const sugar = (c) => ({ condition: c, level: "caution", reason: "" });
  const meals = [[sodium], [sodium, sugar("diabetes"), sugar("prediabetes")], [sodium], [{ condition: "gout", level: "safe", reason: "" }]];
  const t = texts(weeklyInsights(week, targets, 2000, meals));
  assert.ok(t.includes("Calories over your goal 1 of 2 days"));
  assert.ok(t.includes("Carbs above target 1 of 2 days (target 200 g)"));
  assert.ok(t.includes("Fat above target 1 of 2 days (target 60 g)"));
  assert.deepEqual(t.filter((x) => x.includes("flagged")), ["Sodium flagged 3 times", "Sugar and carbs flagged once"]);
});

test("needs at least two logged days", () => {
  const r = weeklyInsights([day(1800, 120), empty, empty, empty, empty, empty, empty], targets, 2000, []);
  assert.deepEqual(r.insights, []);
  assert.equal(r.daysLogged, 1);
});
