import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../lib/theme";

interface Props {
  /** 0-1. Values above 1 are clamped visually but the ring shows "full + overflow" tint. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  /** Big number in the center, e.g. "1,420" */
  value: string;
  /** Small text under the value, e.g. "kcal" */
  unit?: string;
  /** Label under the whole dial, e.g. "Calories" */
  label?: string;
  overColor?: string;
}

export function RadialGauge({
  progress,
  size = 120,
  strokeWidth = 12,
  color,
  trackColor,
  value,
  unit,
  label,
  overColor,
}: Props) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const isOver = progress > 1;
  const dashOffset = circumference * (1 - clamped);
  const ringColor = isOver && overColor ? overColor : color;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor ?? theme.cardAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.value, { color: theme.text, fontSize: size * 0.19 }]} numberOfLines={1}>
            {value}
          </Text>
          {!!unit && (
            <Text style={[styles.unit, { color: theme.textMuted, fontSize: size * 0.1 }]}>{unit}</Text>
          )}
        </View>
      </View>
      {!!label && <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  value: { fontWeight: "800" },
  unit: { fontWeight: "600", marginTop: 1 },
  label: { fontSize: 12.5, fontWeight: "600", marginTop: 8 },
});
