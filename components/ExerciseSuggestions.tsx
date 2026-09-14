import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { suggestActivities } from "../lib/health/exerciseCalculator";
import { useTheme } from "../lib/theme";

const DEFAULT_WEIGHT_KG = 70;

interface Props {
  targetCalories: number;
  weightKg: number | null;
  title: string;
}

export function ExerciseSuggestions({ targetCalories, weightKg, title }: Props) {
  const theme = useTheme();
  const suggestions = suggestActivities(targetCalories, weightKg ?? DEFAULT_WEIGHT_KG);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <View style={styles.grid}>
        {suggestions.map((s) => (
          <View key={s.name} style={[styles.chip, { backgroundColor: theme.cardAlt }]}>
            <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
            <Text style={[styles.chipText, { color: theme.text }]}>
              {s.name} · {s.minutes} min
            </Text>
          </View>
        ))}
      </View>
      {!weightKg && (
        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 10 }}>
          Estimated using an average 70kg body weight — add yours in Settings for a more accurate estimate.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  chipText: { fontSize: 12.5, fontWeight: "600" },
});
