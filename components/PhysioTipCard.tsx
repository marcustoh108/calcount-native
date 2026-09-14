import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { PHYSIO_DISCLAIMER, tipOfTheDay } from "../lib/tips/physioTips";
import { useTheme } from "../lib/theme";

export function PhysioTipCard() {
  const theme = useTheme();
  const tip = tipOfTheDay();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Movement & recovery</Text>
      <View style={styles.row}>
        <Text style={styles.icon}>{tip.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tipTitle, { color: theme.text }]}>{tip.title}</Text>
          <Text style={[styles.tipBody, { color: theme.textMuted }]}>{tip.body}</Text>
        </View>
      </View>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>{PHYSIO_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  icon: { fontSize: 20, marginTop: 1 },
  tipTitle: { fontSize: 14, fontWeight: "700" },
  tipBody: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  disclaimer: { fontSize: 10.5, marginTop: 10, lineHeight: 14 },
});
