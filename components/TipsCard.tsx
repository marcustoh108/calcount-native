import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { Tip } from "../lib/tips/generateTips";

export function TipsCard({ tips }: { tips: Tip[] }) {
  const theme = useTheme();
  if (tips.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Tips to stay on track</Text>
      <View style={{ gap: 10 }}>
        {tips.map((tip, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.icon}>{tip.icon}</Text>
            <Text style={[styles.text, { color: theme.textMuted }]}>{tip.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  icon: { fontSize: 17, marginTop: 1 },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
});
