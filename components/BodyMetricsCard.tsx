import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  bmiCategory,
  BmiCategory,
  BodyMetricsInput,
  computeBMI,
  estimateRecommendedCalories,
  idealWeightRange,
} from "../lib/health/bodyMetrics";
import { useTheme } from "../lib/theme";
import { round } from "../lib/utils/nutrition";

const CATEGORY_NOTE: Record<BmiCategory, string> = {
  Underweight: "Below the WHO-defined healthy range.",
  Good: "Within the WHO-defined healthy range.",
  Overweight: "Above the WHO-defined healthy range.",
  Obese: "Well above the WHO-defined healthy range.",
};

export function BodyMetricsCard({ metrics }: { metrics: BodyMetricsInput }) {
  const theme = useTheme();
  const bmi = computeBMI(metrics.weightKg, metrics.heightCm);
  const category = bmiCategory(bmi);
  const ideal = idealWeightRange(metrics.heightCm);
  const recommendedCalories = estimateRecommendedCalories(metrics);
  const color =
    category === "Good" ? theme.safe : category === "Underweight" || category === "Overweight" ? theme.caution : theme.avoid;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.row}>
        <View>
          <Text style={[styles.bmiValue, { color: theme.text }]}>{round(bmi, 1)}</Text>
          <Text style={[styles.bmiLabel, { color: theme.textMuted }]}>BMI</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: color }]}>
          <Text style={{ color, fontWeight: "800" }}>{category}</Text>
        </View>
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 6 }}>{CATEGORY_NOTE[category]}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {round(ideal.minKg)}–{round(ideal.maxKg)} kg
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Ideal weight range</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text }]}>~{recommendedCalories.toLocaleString()} kcal</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Estimated daily need</Text>
        </View>
      </View>

      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 10, lineHeight: 15 }}>
        BMI is a rough screening tool, not a full health assessment — it doesn't account for muscle
        mass, body composition, or individual health. Estimated calorie need assumes moderate
        activity. Not medical advice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bmiValue: { fontSize: 30, fontWeight: "800" },
  bmiLabel: { fontSize: 12, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  stat: { flex: 1 },
  statValue: { fontSize: 15, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 2 },
});
