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

/**
 * Mifflin-St Jeor BMR, then scaled by a "moderately active" activity factor (1.55) to
 * estimate maintenance calories. This is a population-average estimate, not a
 * clinical prescription — surfaced as a starting suggestion the user can override.
 */
export function estimateRecommendedCalories({ weightKg, heightCm, age, sex }: BodyMetricsInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === "male" ? base + 5 : sex === "female" ? base - 161 : base - 78;
  const activityFactor = 1.55;
  return Math.round((bmr * activityFactor) / 50) * 50;
}
