export interface Activity {
  emoji: string;
  name: string;
  /** MET value (Metabolic Equivalent of Task) — standard published figures, e.g. the Compendium of Physical Activities. */
  met: number;
}

export const ACTIVITIES: Activity[] = [
  { emoji: "🚶", name: "Brisk walking", met: 4.3 },
  { emoji: "🏃", name: "Jogging", met: 7.0 },
  { emoji: "🏃‍♂️", name: "Running", met: 9.8 },
  { emoji: "🏊", name: "Swimming", met: 8.0 },
  { emoji: "🚴", name: "Cycling", met: 7.5 },
  { emoji: "🏋️", name: "Strength training", met: 5.0 },
  { emoji: "🧘", name: "Yoga", met: 3.0 },
  { emoji: "💃", name: "Dancing", met: 5.5 },
];

/** Standard formula: kcal/min = MET x 3.5 x weight(kg) / 200. */
export function caloriesPerMinute(met: number, weightKg: number): number {
  return (met * 3.5 * weightKg) / 200;
}

export function minutesToBurn(calories: number, met: number, weightKg: number): number {
  const perMin = caloriesPerMinute(met, weightKg);
  if (perMin <= 0) return 0;
  return Math.round(calories / perMin);
}

export interface ActivitySuggestion extends Activity {
  minutes: number;
}

/** For a given calorie target and body weight, how long each activity takes to burn it off. */
export function suggestActivities(calories: number, weightKg: number): ActivitySuggestion[] {
  return ACTIVITIES.map((a) => ({ ...a, minutes: minutesToBurn(calories, a.met, weightKg) }));
}
