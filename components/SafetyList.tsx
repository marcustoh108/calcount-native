import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { riskFlags } from "../lib/health/safetyRules";
import { HEALTH_CONDITION_LABELS, SafetyAssessment } from "../lib/types";

const LEVEL_ICON: Record<SafetyAssessment["level"], string> = {
  safe: "✓",
  caution: "!",
  avoid: "!!",
};

const LEVEL_LABEL: Record<SafetyAssessment["level"], string> = {
  safe: "",
  caution: "Watch",
  avoid: "Higher risk",
};

/**
 * Risk flags for the user's health conditions and allergies. Only risks are shown; the list
 * never says a food is safe for a condition.
 */
export function SafetyList({ assessments, hasConditions }: { assessments: SafetyAssessment[]; hasConditions: boolean }) {
  const theme = useTheme();
  const flags = riskFlags(assessments);

  if (flags.length === 0) {
    return (
      <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 18 }}>
        {hasConditions
          ? "No risks flagged for the conditions or allergies you've added. This is an estimate, not a confirmation that the food is safe for you."
          : "Add health conditions or allergies in Personal and YumBalance will flag meals that may carry a risk for them."}
      </Text>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {flags.map((a, idx) => {
        const color = theme[a.level];
        const label = a.condition === "allergy" ? "Allergy" : HEALTH_CONDITION_LABELS[a.condition];
        return (
          <View
            key={`${a.condition}-${idx}`}
            style={[styles.row, { borderColor: color, backgroundColor: `${color}14` }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: color }]}>
              <Text style={styles.icon}>{LEVEL_ICON[a.level]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.text }]}>
                {label} · {LEVEL_LABEL[a.level]}
              </Text>
              <Text style={[styles.reason, { color: theme.textMuted }]}>{a.reason}</Text>
            </View>
          </View>
        );
      })}
      <Text style={{ color: theme.textMuted, fontSize: 11.5, lineHeight: 16 }}>
        Flags are general estimates from your photo, not medical advice. Follow your doctor's or dietitian's guidance.
      </Text>
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
