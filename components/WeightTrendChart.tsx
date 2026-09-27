import React, { useEffect, useMemo, useRef, useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { useTheme } from "../lib/theme";
import { UnitSystem, WeightEntry } from "../lib/types";
import { kgToLb, weightUnit } from "../lib/utils/units";

export const WEIGHT_RANGES = [3, 6, 9, 12] as const;
export type WeightRangeMonths = (typeof WEIGHT_RANGES)[number];

interface Props {
  entries: WeightEntry[]; // oldest first
  units: UnitSystem;
  goalWeightKg: number | null;
}

const CHART_H = 180;
const PAD = { top: 14, right: 12, bottom: 22, left: 40 };

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Single-series weight line over the last 3/6/9/12 months, with a goal reference line and drag-to-inspect. */
export function WeightTrendChart({ entries, units, goalWeightKg }: Props) {
  const theme = useTheme();
  const [range, setRange] = useState<WeightRangeMonths>(3);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    [],
  );

  const toUnits = (kg: number) => (units === "imperial" ? kgToLb(kg) : kg);
  const unit = weightUnit(units);

  const from = useMemo(() => monthsAgo(range), [range]);
  const points = useMemo(
    () =>
      entries
        .filter((e) => new Date(e.createdAt) >= from)
        .map((e) => ({
          t: new Date(e.createdAt).getTime(),
          v: units === "imperial" ? kgToLb(e.weightKg) : e.weightKg,
        })),
    [entries, from, units],
  );

  const goal = goalWeightKg != null ? toUnits(goalWeightKg) : null;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = CHART_H - PAD.top - PAD.bottom;

  const scale = useMemo(() => {
    const values = points.map((p) => p.v);
    if (goal != null) values.push(goal);
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    const padding = Math.max(1, (hi - lo) * 0.15);
    lo = Math.floor(lo - padding);
    hi = Math.ceil(hi + padding);
    const t0 = from.getTime();
    const t1 = Date.now();
    return {
      lo,
      hi,
      x: (t: number) => PAD.left + ((t - t0) / Math.max(1, t1 - t0)) * plotW,
      y: (v: number) => PAD.top + (1 - (v - lo) / Math.max(1e-6, hi - lo)) * plotH,
    };
  }, [points, goal, from, plotW, plotH]);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scale.x(p.t).toFixed(1)},${scale.y(p.v).toFixed(1)}`)
    .join(" ");
  const showMarkers = points.length <= 30;
  const active = activeIndex != null ? points[activeIndex] : null;

  function pickNearest(e: GestureResponderEvent) {
    if (points.length === 0) return;
    if (clearTimer.current) clearTimeout(clearTimer.current);
    const x = e.nativeEvent.locationX;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(scale.x(p.t) - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActiveIndex(best);
  }

  const first = points[0];
  const last = points[points.length - 1];
  const change = first && last ? last.v - first.v : null;
  const lowest = points.length ? Math.min(...points.map((p) => p.v)) : null;
  const gridValues = [scale.lo, (scale.lo + scale.hi) / 2, scale.hi];

  return (
    <View>
      <View style={[styles.segment, { backgroundColor: theme.cardAlt }]}>
        {WEIGHT_RANGES.map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setRange(m);
              setActiveIndex(null);
            }}
            style={[styles.segmentBtn, range === m && { backgroundColor: theme.card }]}
            accessibilityRole="button"
            accessibilityState={{ selected: range === m }}
          >
            <Text style={{ color: range === m ? theme.text : theme.textMuted, fontWeight: "700", fontSize: 12.5 }}>
              {m} months
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={{ height: CHART_H, marginTop: 12 }}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => points.length > 0}
        onMoveShouldSetResponder={() => points.length > 0}
        onResponderGrant={pickNearest}
        onResponderMove={pickNearest}
        onResponderRelease={() => {
          clearTimer.current = setTimeout(() => setActiveIndex(null), 1500);
        }}
        accessibilityLabel={
          last
            ? `Weight over the last ${range} months: from ${first.v.toFixed(1)} to ${last.v.toFixed(1)} ${unit}`
            : `No weight entries in the last ${range} months`
        }
      >
        {/* Everything drawn inside ignores touches, so locationX is always relative to the chart. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {width > 0 && (
            <Svg width={width} height={CHART_H}>
              {gridValues.map((v) => (
                <Line
                  key={v}
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={scale.y(v)}
                  y2={scale.y(v)}
                  stroke={theme.border}
                  strokeWidth={1}
                />
              ))}
              {goal != null && (
                <Line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={scale.y(goal)}
                  y2={scale.y(goal)}
                  stroke={theme.textMuted}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
              )}
              {points.length > 1 && (
                <Path
                  d={path}
                  stroke={theme.dialCalories}
                  strokeWidth={2}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {points.map((p, i) =>
                showMarkers || i === points.length - 1 ? (
                  <Circle
                    key={p.t}
                    cx={scale.x(p.t)}
                    cy={scale.y(p.v)}
                    r={4}
                    fill={theme.dialCalories}
                    stroke={theme.card}
                    strokeWidth={2}
                  />
                ) : null,
              )}
              {active && (
                <>
                  <Line
                    x1={scale.x(active.t)}
                    x2={scale.x(active.t)}
                    y1={PAD.top}
                    y2={CHART_H - PAD.bottom}
                    stroke={theme.textMuted}
                    strokeWidth={1}
                  />
                  <Circle
                    cx={scale.x(active.t)}
                    cy={scale.y(active.v)}
                    r={6}
                    fill={theme.dialCalories}
                    stroke={theme.card}
                    strokeWidth={2}
                  />
                </>
              )}
            </Svg>
          )}

          {/* Axis labels as native text so they follow the theme's text tokens and font scaling. */}
          {width > 0 &&
            gridValues.map((v) => (
              <Text key={`l${v}`} style={[styles.yLabel, { top: scale.y(v) - 7, color: theme.textMuted }]}>
                {Math.round(v)}
              </Text>
            ))}
          {goal != null && width > 0 && (
            <Text style={[styles.goalLabel, { top: scale.y(goal) - 16, color: theme.textMuted }]}>
              Goal {goal.toFixed(0)}
            </Text>
          )}
          <Text style={[styles.xLabel, { left: PAD.left, color: theme.textMuted }]}>{formatShortDate(from)}</Text>
          <Text style={[styles.xLabel, { right: PAD.right, color: theme.textMuted }]}>Today</Text>

          {active && width > 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.tooltip,
                {
                  backgroundColor: theme.text,
                  left: Math.min(Math.max(0, scale.x(active.t) - 55), width - 110),
                },
              ]}
            >
              <Text style={{ color: theme.bg, fontWeight: "800", fontSize: 13 }}>
                {active.v.toFixed(1)} {unit}
              </Text>
              <Text style={{ color: theme.bg, opacity: 0.8, fontSize: 11 }}>{formatShortDate(new Date(active.t))}</Text>
            </View>
          )}

          {points.length === 0 && (
            <View style={[StyleSheet.absoluteFill, styles.empty]} pointerEvents="none">
              <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: "center" }}>
                No weigh-ins in the last {range} months.{"\n"}Tap "Update" on Weight Now in Overview.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* The same data as numbers, so the trend never depends on reading the line alone. */}
      <View style={[styles.summary, { borderTopColor: theme.border }]}>
        <Summary label="Start" value={first ? `${first.v.toFixed(1)}` : "—"} unit={unit} />
        <Summary label="Now" value={last ? `${last.v.toFixed(1)}` : "—"} unit={unit} />
        <Summary
          label="Change"
          value={change != null ? `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change).toFixed(1)}` : "—"}
          unit={unit}
        />
        <Summary label="Lowest" value={lowest != null ? lowest.toFixed(1) : "—"} unit={unit} />
      </View>
    </View>
  );
}

function Summary({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 15 }}>
        {value}
        {value !== "—" && <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "600" }}> {unit}</Text>}
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", borderRadius: 10, padding: 3 },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 8 },
  yLabel: { position: "absolute", left: 0, width: PAD.left - 6, textAlign: "right", fontSize: 10.5 },
  goalLabel: { position: "absolute", right: PAD.right, fontSize: 10.5, fontWeight: "700" },
  xLabel: { position: "absolute", bottom: 0, fontSize: 10.5 },
  tooltip: {
    position: "absolute",
    top: 0,
    width: 110,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
  },
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  summary: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
