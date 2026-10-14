import type { HealthCondition, SafetyAssessment } from "../types";
import type { DailyTotals, MacroTargets } from "../utils/nutrition";

/**
 * The "This week" summary on Trends: plain sentences about calories, protein, carbs and fat,
 * plus how often scans flagged a health risk, e.g. "Protein low 4 of 7 days" or
 * "Sodium flagged 3 times". Pure and on-device: it reads only the user's own food log.
 */

export interface WeekDay {
  /** Meals logged that day. Days with nothing logged are left out of every count. */
  count: number;
  totals: DailyTotals;
}

export interface Insight {
  tone: "good" | "watch";
  text: string;
}

export interface WeeklyInsights {
  daysLogged: number;
  insights: Insight[];
}

/** Fewer logged days than this and the week says too little to summarise. */
export const MIN_DAYS_FOR_INSIGHTS = 2;

// Thresholds on a day's totals relative to the user's targets.
const PROTEIN_LOW = 0.8; // under 80% of the protein target
const OVER = 1.1; // more than 10% above a calorie, carb or fat target

const FLAG_SUBJECT: Record<HealthCondition | "allergy", string> = {
  hypertension: "Sodium",
  diabetes: "Sugar and carbs",
  prediabetes: "Sugar and carbs",
  gout: "Purines",
  kidney_disease: "Potassium",
  high_cholesterol: "Saturated fat",
  celiac: "Gluten",
  allergy: "Allergens",
};

function times(n: number): string {
  return n === 1 ? "once" : `${n} times`;
}

export function weeklyInsights(
  week: WeekDay[],
  targets: MacroTargets,
  calorieGoal: number | null,
  /** Each logged meal's health flags this week, one array per meal. */
  mealFlags: SafetyAssessment[][],
): WeeklyInsights {
  const logged = week.filter((d) => d.count > 0);
  const n = logged.length;
  if (n < MIN_DAYS_FOR_INSIGHTS) return { daysLogged: n, insights: [] };

  const insights: Insight[] = [];
  const of = (k: number) => `${k} of ${n} days`;

  if (calorieGoal && calorieGoal > 0) {
    const over = logged.filter((d) => d.totals.calories > calorieGoal * OVER).length;
    insights.push(
      over > 0
        ? { tone: "watch", text: `Calories over your goal ${of(over)}` }
        : { tone: "good", text: "Calories within your goal every day logged" },
    );
  }

  const proteinLow = logged.filter((d) => d.totals.proteinG < targets.proteinG * PROTEIN_LOW).length;
  insights.push(
    proteinLow > 0
      ? { tone: "watch", text: `Protein low ${of(proteinLow)} (target ${Math.round(targets.proteinG)} g)` }
      : { tone: "good", text: "Protein on target every day logged" },
  );

  const carbsHigh = logged.filter((d) => d.totals.carbsG > targets.carbsG * OVER).length;
  insights.push(
    carbsHigh > 0
      ? { tone: "watch", text: `Carbs above target ${of(carbsHigh)} (target ${Math.round(targets.carbsG)} g)` }
      : { tone: "good", text: "Carbs within target every day logged" },
  );

  const fatHigh = logged.filter((d) => d.totals.fatG > targets.fatG * OVER).length;
  insights.push(
    fatHigh > 0
      ? { tone: "watch", text: `Fat above target ${of(fatHigh)} (target ${Math.round(targets.fatG)} g)` }
      : { tone: "good", text: "Fat within target every day logged" },
  );

  // Meals flagged per subject, most frequent first. A meal counts once per subject, so a meal
  // flagged for both diabetes and prediabetes is one "Sugar and carbs" flag, not two.
  const counts = new Map<string, number>();
  for (const flags of mealFlags) {
    const subjects = new Set(flags.filter((f) => f.level !== "safe").map((f) => FLAG_SUBJECT[f.condition]));
    for (const subject of subjects) counts.set(subject, (counts.get(subject) ?? 0) + 1);
  }
  for (const [subject, count] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3)) {
    insights.push({ tone: "watch", text: `${subject} flagged ${times(count)}` });
  }

  return { daysLogged: n, insights };
}
