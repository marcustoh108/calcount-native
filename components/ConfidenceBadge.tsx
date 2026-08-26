import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { AnalysisConfidence } from "../lib/types";

const LABEL: Record<AnalysisConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — please review",
};

export function ConfidenceBadge({ confidence }: { confidence: AnalysisConfidence }) {
  const theme = useTheme();
  const color = confidence === "high" ? theme.safe : confidence === "medium" ? theme.caution : theme.avoid;
  return (
    <View style={[styles.wrap, { borderColor: color, backgroundColor: `${color}1A` }]}>
      <Text style={[styles.text, { color }]}>{LABEL[confidence]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: { fontSize: 12, fontWeight: "700" },
});
