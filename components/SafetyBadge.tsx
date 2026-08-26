import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { HEALTH_CONDITION_LABELS, SafetyAssessment } from "../lib/types";

function levelLabel(level: SafetyAssessment["level"]): string {
  if (level === "safe") return "Safe";
  if (level === "caution") return "Caution";
  return "Avoid";
}

export function SafetyBadgeRow({ assessments }: { assessments: SafetyAssessment[] }) {
  const theme = useTheme();
  if (assessments.length === 0) return null;
  return (
    <View style={styles.row}>
      {assessments.map((a, idx) => {
        const color = theme[a.level];
        const label = a.condition === "allergy" ? "Allergy" : HEALTH_CONDITION_LABELS[a.condition];
        return (
          <View
            key={`${a.condition}-${idx}`}
            style={[styles.badge, { borderColor: color, backgroundColor: `${color}1A` }]}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.badgeText, { color }]} numberOfLines={1}>
              {label}: {levelLabel(a.level)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: "600" },
});
