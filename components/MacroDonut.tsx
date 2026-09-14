import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../lib/theme";

export interface MacroDonutSegment {
  label: string;
  grams: number;
  kcalPerGram: number;
  color: string;
}

interface Props {
  segments: MacroDonutSegment[];
  size?: number;
  strokeWidth?: number;
}

/** MyFitnessPal-style "macro pie" — here as a segmented ring showing each macro's share of today's calories. */
export function MacroDonut({ segments, size = 108, strokeWidth = 16 }: Props) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const kcalBySegment = segments.map((s) => Math.max(0, s.grams) * s.kcalPerGram);
  const totalKcal = kcalBySegment.reduce((a, b) => a + b, 0);

  let cumulative = 0;
  const arcs = segments.map((seg, i) => {
    const kcal = kcalBySegment[i];
    const fraction = totalKcal > 0 ? kcal / totalKcal : 0;
    const segLen = circumference * fraction;
    const rotation = -90 + cumulative * 360;
    cumulative += fraction;
    return { ...seg, kcal, fraction, segLen, rotation };
  });

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.cardAlt} strokeWidth={strokeWidth} fill="none" />
          {totalKcal > 0
            ? arcs.map((a, i) => (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={a.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${a.segLen} ${circumference - a.segLen}`}
                  rotation={a.rotation}
                  originX={size / 2}
                  originY={size / 2}
                />
              ))
            : null}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.kcal, { color: theme.text }]}>{Math.round(totalKcal)}</Text>
          <Text style={[styles.kcalUnit, { color: theme.textMuted }]}>kcal</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {arcs.map((a, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: a.color }]} />
            <Text style={[styles.legendLabel, { color: theme.text }]}>{a.label}</Text>
            <Text style={[styles.legendPct, { color: theme.textMuted }]}>
              {totalKcal > 0 ? Math.round(a.fraction * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 16 },
  center: { alignItems: "center", justifyContent: "center" },
  kcal: { fontSize: 18, fontWeight: "800" },
  kcalUnit: { fontSize: 10, fontWeight: "600" },
  legend: { gap: 8, flex: 1 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13.5, fontWeight: "600" },
  legendPct: { fontSize: 13, fontWeight: "700" },
});
