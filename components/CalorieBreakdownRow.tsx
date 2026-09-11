import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { round } from "../lib/utils/nutrition";

interface Props {
  goal: number | null;
  consumed: number;
  burned: number;
}

/** Explicit "actual vs goal" numbers — the dial shows the same data as a ring, this spells it out. */
export function CalorieBreakdownRow({ goal, consumed, burned }: Props) {
  const theme = useTheme();
  const net = consumed - burned;
  const over = goal != null && net > goal;

  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <Stat label="Goal" value={goal != null ? round(goal).toLocaleString() : "—"} color={theme.text} theme={theme} />
      <Stat label="Consumed" value={round(consumed).toLocaleString()} color={theme.dialCalories} theme={theme} />
      <Stat label="Burned" value={round(burned).toLocaleString()} color={theme.dialProtein} theme={theme} />
      <Stat
        label="Net"
        value={round(net).toLocaleString()}
        color={over ? theme.avoid : theme.safe}
        theme={theme}
      />
    </View>
  );
}

function Stat({
  label,
  value,
  color,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginTop: 14,
  },
  stat: { alignItems: "center" },
  value: { fontSize: 16, fontWeight: "800" },
  label: { fontSize: 11, marginTop: 2 },
});
