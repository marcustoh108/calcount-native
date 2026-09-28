import { DailyTotals } from "../utils/nutrition";
import { HealthCondition, HealthProfile } from "../types";

export interface DailyRiskFlag {
  condition: HealthCondition;
  label: string;
  message: string;
  over: boolean;
}

/** Conservative general-population daily ceilings, used only for the at-a-glance daily summary. */
const LIMITS: Partial<Record<HealthCondition, { key: keyof DailyTotals; limit: number; label: string; unit: string }>> = {
  hypertension: { key: "sodiumMg", limit: 2000, label: "Sodium", unit: "mg" },
  kidney_disease: { key: "potassiumMg", limit: 2500, label: "Potassium", unit: "mg" },
  diabetes: { key: "sugarG", limit: 36, label: "Sugar", unit: "g" },
  prediabetes: { key: "sugarG", limit: 36, label: "Sugar", unit: "g" },
  high_cholesterol: { key: "saturatedFatG", limit: 20, label: "Saturated fat", unit: "g" },
};

export function dailyRiskFlags(totals: DailyTotals, profile: HealthProfile): DailyRiskFlag[] {
  const flags: DailyRiskFlag[] = [];
  for (const condition of profile.conditions) {
    const rule = LIMITS[condition];
    if (!rule) continue;
    const value = totals[rule.key];
    const pct = Math.round((value / rule.limit) * 100);
    flags.push({
      condition,
      label: rule.label,
      message: `${rule.label} today: ${Math.round(value)}${rule.unit} (${pct}% of your ${rule.limit}${rule.unit} guide)`,
      over: value > rule.limit,
    });
  }
  return flags;
}
