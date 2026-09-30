import { FoodAnalysis, HealthCondition, HealthProfile, SafetyAssessment, SafetyLevel } from "../types";

/**
 * Rule-based, transparent (non-black-box) health safety scoring.
 *
 * None of the big three apps we benchmarked against (Cal AI, PlateLens,
 * MyFitnessPal) surface condition-specific safety guidance at all — this is
 * the core differentiator of YumBalance. Every verdict below carries a
 * human-readable `reason` so the user can see *why*, not just a badge.
 *
 * Thresholds are simplified, conservative heuristics for a single portion,
 * not medical advice - see the in-app disclaimer.
 */

function worse(a: SafetyLevel, b: SafetyLevel): SafetyLevel {
  const rank: Record<SafetyLevel, number> = { safe: 0, caution: 1, avoid: 2 };
  return rank[a] >= rank[b] ? a : b;
}

const HIGH_PURINE_KEYWORDS = [
  "liver",
  "kidney",
  "organ meat",
  "sweetbread",
  "anchovy",
  "anchovies",
  "sardine",
  "mussel",
  "herring",
  "mackerel",
  "scallop",
  "trout",
  "beer",
  "gravy",
];

const MODERATE_PURINE_KEYWORDS = [
  "beef",
  "pork",
  "lamb",
  "chicken",
  "turkey",
  "shrimp",
  "prawn",
  "crab",
  "lobster",
  "tuna",
  "salmon",
  "bacon",
  "sausage",
  "ham",
];

const GLUTEN_KEYWORDS = [
  "wheat",
  "flour",
  "bread",
  "bun",
  "bagel",
  "pasta",
  "noodle",
  "spaghetti",
  "cracker",
  "batter",
  "breaded",
  "breadcrumb",
  "tortilla",
  "barley",
  "rye",
  "malt",
  "beer",
  "soy sauce",
  "couscous",
  "pastry",
  "cake",
  "cookie",
  "pizza dough",
];

function ingredientNames(analysis: FoodAnalysis): string[] {
  const names = analysis.ingredients.map((i) => i.name.toLowerCase());
  names.push(analysis.foodName.toLowerCase());
  names.push(analysis.description.toLowerCase());
  return names;
}

function anyIncludes(haystacks: string[], needles: string[]): string | null {
  for (const needle of needles) {
    if (haystacks.some((h) => h.includes(needle))) return needle;
  }
  return null;
}

function assessDiabetes(analysis: FoodAnalysis): SafetyAssessment {
  const { sugarG, addedSugarG, fiberG, carbsG } = analysis.nutrients;
  const gl = analysis.nutrients.glycemicLoad;

  if (addedSugarG >= 20 || (gl === "high" && fiberG < 3)) {
    return {
      condition: "diabetes",
      level: "avoid",
      reason: `High added sugar (~${Math.round(addedSugarG)}g) and/or a high-glycemic, low-fiber carb load can spike blood glucose sharply.`,
    };
  }
  if (carbsG >= 45 && fiberG < 5) {
    return {
      condition: "diabetes",
      level: "caution",
      reason: `~${Math.round(carbsG)}g of carbs with limited fiber (${Math.round(fiberG)}g) — consider pairing with protein/fiber or reducing portion.`,
    };
  }
  if (sugarG >= 15 && gl !== "low") {
    return {
      condition: "diabetes",
      level: "caution",
      reason: `Moderate sugar content (~${Math.round(sugarG)}g) may raise blood glucose depending on portion and pairing.`,
    };
  }
  return {
    condition: "diabetes",
    level: "safe",
    reason: "Low added sugar and a manageable carb/fiber balance for blood glucose.",
  };
}

function assessGout(analysis: FoodAnalysis): SafetyAssessment {
  const names = ingredientNames(analysis);
  const highHit = anyIncludes(names, HIGH_PURINE_KEYWORDS);
  const alcohol = analysis.nutrients.containsAlcohol;
  const purineLevel = analysis.nutrients.purineLevel;

  if (highHit || purineLevel === "high" || alcohol) {
    return {
      condition: "gout",
      level: "avoid",
      reason: alcohol
        ? "Contains alcohol (especially beer), which raises uric acid and can trigger a gout flare."
        : `High-purine ingredient detected (${highHit ?? "organ meat/shellfish/oily fish"}), which can trigger a gout flare.`,
    };
  }
  const modHit = anyIncludes(names, MODERATE_PURINE_KEYWORDS);
  if (modHit || purineLevel === "moderate" || analysis.nutrients.addedSugarG >= 20) {
    return {
      condition: "gout",
      level: "caution",
      reason: modHit
        ? `Moderate-purine ingredient (${modHit}) — fine occasionally, keep portions modest.`
        : "High-fructose content can raise uric acid; keep portions modest.",
    };
  }
  return {
    condition: "gout",
    level: "safe",
    reason: "Low-purine — generally safe for gout management.",
  };
}

function assessHypertension(analysis: FoodAnalysis): SafetyAssessment {
  const sodium = analysis.nutrients.sodiumMg;
  if (sodium >= 700) {
    return {
      condition: "hypertension",
      level: "avoid",
      reason: `Very high sodium for a single item (~${Math.round(sodium)}mg) — roughly a third of a full day's recommended limit.`,
    };
  }
  if (sodium >= 400) {
    return {
      condition: "hypertension",
      level: "caution",
      reason: `Moderately high sodium (~${Math.round(sodium)}mg) — watch your total for the rest of the day.`,
    };
  }
  return {
    condition: "hypertension",
    level: "safe",
    reason: "Low sodium content relative to daily limits.",
  };
}

function assessKidney(analysis: FoodAnalysis): SafetyAssessment {
  const { potassiumMg, sodiumMg, proteinG } = analysis.nutrients;
  if (potassiumMg >= 600 || (sodiumMg >= 700 && proteinG >= 30)) {
    return {
      condition: "kidney_disease",
      level: "avoid",
      reason: `High potassium and/or sodium+protein load (~${Math.round(potassiumMg)}mg potassium) can be hard on impaired kidneys.`,
    };
  }
  if (potassiumMg >= 350 || sodiumMg >= 400) {
    return {
      condition: "kidney_disease",
      level: "caution",
      reason: `Moderate potassium/sodium (~${Math.round(potassiumMg)}mg potassium) — check against your renal diet limits.`,
    };
  }
  return {
    condition: "kidney_disease",
    level: "safe",
    reason: "Low potassium and sodium load for a kidney-friendly diet.",
  };
}

function assessCholesterol(analysis: FoodAnalysis): SafetyAssessment {
  const { saturatedFatG, cholesterolMg } = analysis.nutrients;
  if (saturatedFatG >= 10 || cholesterolMg >= 200) {
    return {
      condition: "high_cholesterol",
      level: "avoid",
      reason: `High saturated fat (~${Math.round(saturatedFatG)}g) and/or cholesterol (~${Math.round(cholesterolMg)}mg) in one sitting.`,
    };
  }
  if (saturatedFatG >= 5 || cholesterolMg >= 100) {
    return {
      condition: "high_cholesterol",
      level: "caution",
      reason: `Moderate saturated fat (~${Math.round(saturatedFatG)}g) — fine occasionally, balance the rest of the day.`,
    };
  }
  return {
    condition: "high_cholesterol",
    level: "safe",
    reason: "Low in saturated fat and cholesterol.",
  };
}

function assessCeliac(analysis: FoodAnalysis): SafetyAssessment {
  const names = ingredientNames(analysis);
  const hit = anyIncludes(names, GLUTEN_KEYWORDS);
  if (analysis.nutrients.containsGluten === true || hit) {
    return {
      condition: "celiac",
      level: "avoid",
      reason: `Likely contains gluten${hit ? ` (${hit})` : ""} — unsafe for celiac disease or gluten sensitivity.`,
    };
  }
  if (analysis.nutrients.containsGluten === "uncertain" || analysis.isRestaurantOrSharedPlate) {
    return {
      condition: "celiac",
      level: "caution",
      reason: "Gluten content is uncertain (sauces, frying oil, or cross-contamination at a restaurant can hide gluten) — ask before eating if celiac.",
    };
  }
  return {
    condition: "celiac",
    level: "safe",
    reason: "No gluten-containing ingredients detected.",
  };
}

const ASSESSORS: Record<HealthCondition, (a: FoodAnalysis) => SafetyAssessment> = {
  diabetes: assessDiabetes,
  // Same blood-glucose heuristics as diabetes, reported under the user's own condition label.
  prediabetes: (a) => ({ ...assessDiabetes(a), condition: "prediabetes" }),
  gout: assessGout,
  hypertension: assessHypertension,
  kidney_disease: assessKidney,
  high_cholesterol: assessCholesterol,
  celiac: assessCeliac,
};

function assessAllergies(analysis: FoodAnalysis, allergies: string[]): SafetyAssessment | null {
  if (allergies.length === 0) return null;
  const names = ingredientNames(analysis);
  for (const allergy of allergies) {
    const needle = allergy.trim().toLowerCase();
    if (!needle) continue;
    if (names.some((n) => n.includes(needle))) {
      return {
        condition: "allergy",
        level: "avoid",
        reason: `May contain "${allergy}", which you've flagged as an allergy/intolerance.`,
      };
    }
  }
  return null;
}

export function assessFoodSafety(analysis: FoodAnalysis, profile: HealthProfile): SafetyAssessment[] {
  const results: SafetyAssessment[] = profile.conditions.map((c) => ASSESSORS[c](analysis));
  const allergyResult = assessAllergies(analysis, profile.allergies);
  if (allergyResult) results.unshift(allergyResult);
  return results;
}

export function overallSafetyLevel(assessments: SafetyAssessment[]): SafetyLevel {
  return assessments.reduce<SafetyLevel>((acc, a) => worse(acc, a.level), "safe");
}
