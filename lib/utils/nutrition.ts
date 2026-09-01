import { ExerciseEntry, FoodEntry, NutrientEstimate } from "../types";

export function scaledNutrients(entry: FoodEntry): NutrientEstimate {
  const n = entry.analysis.nutrients;
  const s = entry.servings;
  return {
    ...n,
    calories: n.calories * s,
    proteinG: n.proteinG * s,
    carbsG: n.carbsG * s,
    sugarG: n.sugarG * s,
    addedSugarG: n.addedSugarG * s,
    fiberG: n.fiberG * s,
    fatG: n.fatG * s,
    saturatedFatG: n.saturatedFatG * s,
    sodiumMg: n.sodiumMg * s,
    potassiumMg: n.potassiumMg * s,
    cholesterolMg: n.cholesterolMg * s,
  };
}

export interface DailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  sodiumMg: number;
  potassiumMg: number;
  saturatedFatG: number;
}

export function sumTotals(entries: FoodEntry[]): DailyTotals {
  return entries.reduce<DailyTotals>(
    (acc, entry) => {
      const n = scaledNutrients(entry);
      acc.calories += n.calories;
      acc.proteinG += n.proteinG;
      acc.carbsG += n.carbsG;
      acc.fatG += n.fatG;
      acc.sugarG += n.sugarG;
      acc.sodiumMg += n.sodiumMg;
      acc.potassiumMg += n.potassiumMg;
      acc.saturatedFatG += n.saturatedFatG;
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, sodiumMg: 0, potassiumMg: 0, saturatedFatG: 0 },
  );
}

export function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const DEFAULT_MACRO_TARGETS: MacroTargets = { proteinG: 110, carbsG: 220, fatG: 65 };

/** Derives gram targets from a calorie goal using a 30/40/30 protein/carb/fat split, falling back to sane defaults with no goal set. */
export function macroTargets(dailyCalorieGoal: number | null): MacroTargets {
  if (!dailyCalorieGoal || dailyCalorieGoal <= 0) return DEFAULT_MACRO_TARGETS;
  return {
    proteinG: (dailyCalorieGoal * 0.3) / 4,
    carbsG: (dailyCalorieGoal * 0.4) / 4,
    fatG: (dailyCalorieGoal * 0.3) / 9,
  };
}

export const DAILY_WATER_GOAL_CUPS = 8;

export function sumExerciseCalories(entries: ExerciseEntry[]): number {
  return entries.reduce((sum, e) => sum + e.caloriesBurned, 0);
}

/**
 * Lose It!-style calorie banking: a rolling 7-day budget instead of a hard daily
 * reset, so an under-budget day leaves room for an over-budget one later in the week.
 */
export function weeklyCalorieBudget(dailyGoal: number): number {
  return dailyGoal * 7;
}
