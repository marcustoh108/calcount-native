import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";

interface Props {
  consumed: number;
  goal: number | null;
}

/** Lightweight progress bar "ring" substitute — avoids pulling in an SVG dependency. */
export function CalorieProgress({ consumed, goal }: Props) {
  const theme = useTheme();
  const pct = goal ? Math.min(1, consumed / goal) : 0;
  const over = goal != null && consumed > goal;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.big, { color: theme.text }]}>{Math.round(consumed)}</Text>
        <Text style={[styles.of, { color: theme.textMuted }]}>
          {goal ? ` / ${goal} kcal` : " kcal today"}
        </Text>
      </View>
      {goal != null && (
        <View style={[styles.track, { backgroundColor: theme.cardAlt }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${pct * 100}%`,
                backgroundColor: over ? theme.avoid : theme.primary,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "baseline" },
  big: { fontSize: 34, fontWeight: "800" },
  of: { fontSize: 15, fontWeight: "500" },
  track: { height: 10, borderRadius: 6, marginTop: 8, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
});
