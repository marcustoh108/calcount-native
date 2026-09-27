import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { HEALTH_CONDITION_LABELS, SafetyAssessment } from "../lib/types";

const LEVEL_ICON: Record<SafetyAssessment["level"], string> = {
  safe: "✓",
  caution: "!",
  avoid: "✕",
};

export function SafetyList({ assessments }: { assessments: SafetyAssessment[] }) {
  const theme = useTheme();

  if (assessments.length === 0) {
    return (
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>
        Add health conditions or allergies in Personal to see personalized safety checks here.
      </Text>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {assessments.map((a, idx) => {
        const color = theme[a.level];
        const label = a.condition === "allergy" ? "Allergy watch" : HEALTH_CONDITION_LABELS[a.condition];
        return (
          <View
            key={`${a.condition}-${idx}`}
            style={[styles.row, { borderColor: color, backgroundColor: `${color}14` }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: color }]}>
              <Text style={styles.icon}>{LEVEL_ICON[a.level]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
              <Text style={[styles.reason, { color: theme.textMuted }]}>{a.reason}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: "flex-start" },
  iconWrap: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  icon: { color: "#fff", fontWeight: "800", fontSize: 12 },
  label: { fontWeight: "700", fontSize: 14 },
  reason: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
});
