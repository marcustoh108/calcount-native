// Health flags are risk-only: a scan never tells anyone a food is "safe" for their condition.
import assert from "node:assert/strict";
import { test } from "node:test";

import { assessFoodSafety, riskFlags } from "../lib/health/safetyRules.ts";

const ALL_CONDITIONS = ["diabetes", "prediabetes", "gout", "hypertension", "kidney_disease", "high_cholesterol", "celiac"];

function meal(nutrients, extra = {}) {
  return {
    foodName: "Test meal",
    description: "",
    cuisineType: null,
    ingredients: [],
    portionDescription: "1 plate",
    portionGrams: 300,
    confidence: "high",
    confidenceNotes: null,
    isRestaurantOrSharedPlate: false,
    ...extra,
    nutrients: {
      calories: 300, proteinG: 10, carbsG: 20, sugarG: 2, addedSugarG: 0, fiberG: 6, fatG: 5,
      saturatedFatG: 1, sodiumMg: 100, potassiumMg: 150, cholesterolMg: 0,
      purineLevel: "low", glycemicLoad: "low", containsGluten: false, containsAlcohol: false,
      ...nutrients,
    },
  };
}

const profile = (conditions, allergies = []) => ({ conditions, allergies });

test("a low-risk meal returns no flags at all, not 'safe' verdicts", () => {
  assert.deepEqual(assessFoodSafety(meal({}), profile(ALL_CONDITIONS)), []);
});

test("only conditions with a risk are flagged", () => {
  const flags = assessFoodSafety(meal({ sodiumMg: 900 }), profile(["gout", "hypertension", "celiac"]));
  assert.deepEqual(flags.map((f) => [f.condition, f.level]), [["hypertension", "avoid"]]);
});

test("no flag ever has the 'safe' level", () => {
  const risky = meal(
    { addedSugarG: 30, purineLevel: "high", sodiumMg: 1200, potassiumMg: 800, saturatedFatG: 15, containsGluten: true },
    { ingredients: [{ name: "peanut sauce", estimatedGrams: 20, likelyHidden: true }] },
  );
  const flags = assessFoodSafety(risky, profile(ALL_CONDITIONS, ["peanut"]));
  assert.equal(flags.length, ALL_CONDITIONS.length + 1);
  assert.ok(flags.every((f) => f.level === "caution" || f.level === "avoid"));
  assert.ok(flags.every((f) => !/\bsafe\b/i.test(f.reason)));
  assert.equal(flags.find((f) => f.condition === "prediabetes")?.level, "avoid");
});

test("'safe' verdicts saved by older versions are hidden", () => {
  const old = [
    { condition: "gout", level: "safe", reason: "Low-purine" },
    { condition: "diabetes", level: "caution", reason: "Carbs" },
  ];
  assert.deepEqual(riskFlags(old).map((f) => f.condition), ["diabetes"]);
});
