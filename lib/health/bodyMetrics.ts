export type Sex = "male" | "female" | "other";

export interface BodyMetricsInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}

export type BmiCategory = "Underweight" | "Good" | "Overweight" | "Obese";

/** WHO standard adult BMI thresholds (kg/m^2) — same cutoffs regardless of sex. */
export function computeBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  if (heightM <= 0) return 0;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Good";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export interface IdealWeightRange {
  minKg: number;
  maxKg: number;
}

/** The weight range at this height that falls in the WHO "normal" BMI band (18.5–24.9). */
export function idealWeightRange(heightCm: number): IdealWeightRange {
  const heightM = heightCm / 100;
  return {
    minKg: 18.5 * heightM * heightM,
    maxKg: 24.9 * heightM * heightM,
  };
}

/** Mifflin-St Jeor basal metabolic rate (kcal/day). "Other" uses the midpoint of the male/female constants. */
export function basalMetabolicRate({ weightKg, heightCm, age, sex }: BodyMetricsInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : sex === "female" ? base - 161 : base - 78;
}

export type WeightDirection = "lose" | "maintain" | "gain";

/** The nearest weight inside the WHO healthy BMI range — the current weight if already inside it. */
export function recommendedGoalWeight(weightKg: number, heightCm: number): number {
  const { minKg, maxKg } = idealWeightRange(heightCm);
  if (weightKg > maxKg) return Math.round(maxKg);
  if (weightKg < minKg) return Math.round(minKg);
  return Math.round(weightKg);
}

export function weightDirection(weightKg: number, goalWeightKg: number | null): WeightDirection {
  if (goalWeightKg == null || Math.abs(goalWeightKg - weightKg) < 1) return "maintain";
  return goalWeightKg < weightKg ? "lose" : "gain";
}

export interface DailyPlan {
  /** Mifflin-St Jeor BMR x 1.2 — what the body uses in a day without planned exercise. */
  baselineKcal: number;
  /** Calories to burn through exercise each day. */
  burnKcal: number;
  /** Calories to eat each day. */
  intakeKcal: number;
  direction: WeightDirection;
}

/**
 * Daily eat/burn plan, built so the numbers add up:
 *   intake − (baseline + burn) ≈ −500 kcal/day to lose (~0.5 kg/week), 0 to maintain, +300 to gain.
 * Burn is ~45 min of brisk walking a day when losing, ~30 min (WHO's 150 min/week) otherwise.
 * Intake never drops below a common safe floor (1,500 men / 1,200 otherwise).
 */
export function recommendedDailyPlan(metrics: BodyMetricsInput, goalWeightKg: number | null): DailyPlan {
  const { weightKg, sex } = metrics;
  const baselineKcal = basalMetabolicRate(metrics) * 1.2;
  const direction = weightDirection(weightKg, goalWeightKg);
  const walkKcalPerMin = (4.3 * 3.5 * weightKg) / 200; // brisk walking, 4.3 METs
  const burnKcal = Math.max(150, Math.round((walkKcalPerMin * (direction === "lose" ? 45 : 30)) / 10) * 10);
  const balance = direction === "lose" ? -500 : direction === "gain" ? 300 : 0;
  const floor = sex === "male" ? 1500 : 1200;
  const intakeKcal = Math.max(floor, Math.round((baselineKcal + burnKcal + balance) / 50) * 50);
  return { baselineKcal: Math.round(baselineKcal), burnKcal, intakeKcal, direction };
}
