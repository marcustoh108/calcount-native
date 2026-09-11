import { DailyRiskFlag } from "../health/dailyLimits";
import { DailyTotals, MacroTargets } from "../utils/nutrition";

export interface Tip {
  icon: string;
  text: string;
}

export interface TipContext {
  totals: DailyTotals;
  targets: MacroTargets;
  dailyCalorieGoal: number | null;
  remaining: number | null;
  exerciseCalories: number;
  waterCupsToday: number;
  mealsLoggedToday: number;
  riskFlags: DailyRiskFlag[];
  hourOfDay: number;
}

const RISK_TIP_TEXT: Record<string, string> = {
  Sodium: "Sodium is running over your guide today — go easy on salty, processed, or takeout food for your next meal.",
  Potassium: "Potassium is over your guide today — lean on lower-potassium veggies (green beans, cauliflower) for your next meal.",
  Sugar: "Sugar is over your guide today — swap a sweet snack for fruit, nuts, or plain yogurt for the rest of the day.",
  "Saturated fat": "Saturated fat is over your guide today — choose grilled, baked, or steamed over fried for your next meal.",
};

/**
 * Rule-based, contextual "stay on track" tips — no ML, just plain-language nudges
 * derived from what's already logged today. Capped at 4 so the card stays scannable.
 */
export function generateTips(ctx: TipContext): Tip[] {
  const tips: Tip[] = [];
  const { totals, targets, remaining, exerciseCalories, waterCupsToday, mealsLoggedToday, riskFlags, hourOfDay } = ctx;

  for (const flag of riskFlags) {
    if (flag.over && RISK_TIP_TEXT[flag.label]) {
      tips.push({ icon: "⚠️", text: RISK_TIP_TEXT[flag.label] });
    }
  }

  if (remaining != null && remaining < 0) {
    tips.push({
      icon: "🚶",
      text: `You're ${Math.abs(Math.round(remaining))} kcal over today's goal — a 15–20 minute walk or a lighter dinner can help balance it out.`,
    });
  } else if (mealsLoggedToday > 0) {
    tips.push({
      icon: "🚶",
      text: "A short 10–15 minute stroll after eating can help digestion and keep blood sugar steadier.",
    });
  }

  if (totals.proteinG < targets.proteinG * 0.5 && hourOfDay >= 14) {
    tips.push({
      icon: "🥚",
      text: "You're behind on protein today — eggs, Greek yogurt, chicken, fish, or tofu are easy ways to catch up.",
    });
  }

  if (totals.sugarG >= 40) {
    tips.push({
      icon: "🍓",
      text: "Sugar's adding up today — an apple, berries, or orange satisfies a sweet craving with fiber instead of added sugar.",
    });
  } else if (totals.fiberG > 0 && totals.fiberG < 12 && mealsLoggedToday >= 1) {
    tips.push({
      icon: "🥦",
      text: "Fiber is on the low side today — a piece of fruit, a side salad, or beans with your next meal will help.",
    });
  }

  if (waterCupsToday < 4 && hourOfDay >= 12) {
    tips.push({
      icon: "💧",
      text: `Only ${waterCupsToday} cup${waterCupsToday === 1 ? "" : "s"} of water so far — try to get one in with your next meal.`,
    });
  }

  if (remaining != null && remaining > 600 && hourOfDay >= 18 && mealsLoggedToday <= 1) {
    tips.push({
      icon: "🍽️",
      text: `You still have ${Math.round(remaining)} kcal left today and not much logged — make sure you're eating enough, not just cutting back.`,
    });
  }

  if (exerciseCalories === 0 && hourOfDay >= 16 && mealsLoggedToday > 0) {
    tips.push({
      icon: "🏃",
      text: "No activity logged yet today — even a brisk 20-minute walk supports both weight and fitness goals.",
    });
  }

  return tips.slice(0, 4);
}
