import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse } from "react-native-svg";

import { useTheme } from "../lib/theme";
import { RadialGauge } from "./RadialGauge";

/**
 * A looping, self-playing "clip" of the app for the welcome screen: the daily dashboard,
 * then a phone scanning a colorful plate, then the result dials and condition commentary.
 * Built from live components rather than a video file so it stays crisp, themed, and tiny.
 */

type Scene = "dashboard" | "scanning" | "results";
const SCENES: { scene: Scene; ms: number; caption: string }[] = [
  { scene: "dashboard", ms: 4200, caption: "Your day at a glance" },
  { scene: "scanning", ms: 2800, caption: "Snap your plate" },
  { scene: "results", ms: 6000, caption: "Instant nutrition + health check" },
];

const PHONE_W = 240;
const PHONE_H = 430;

/** 0→1 over `duration` ms each time `run` flips to true. */
function useProgress(run: boolean, duration: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!run) {
      setT(0);
      return;
    }
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setT(1 - (1 - p) * (1 - p)); // ease-out
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, duration]);
  return t;
}

export function AppDemo() {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const { scene, caption } = SCENES[index];

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % SCENES.length);
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, SCENES[index].ms);
    return () => clearTimeout(timer);
  }, [index, fade]);

  return (
    <View style={{ alignItems: "center" }}>
      <View style={[styles.phone, { borderColor: "#11151C", backgroundColor: theme.bg }]}>
        <View style={styles.notch} />
        <Animated.View style={{ flex: 1, opacity: fade }}>
          {scene === "dashboard" && <DashboardScene />}
          {scene === "scanning" && <ScanningScene />}
          {scene === "results" && <ResultsScene />}
        </Animated.View>
      </View>
      <Text style={[styles.caption, { color: theme.text }]}>{caption}</Text>
      <View style={styles.dots}>
        {SCENES.map((s, i) => (
          <View key={s.scene} style={[styles.dot, { backgroundColor: i === index ? theme.primary : theme.border }]} />
        ))}
      </View>
    </View>
  );
}

function DashboardScene() {
  const theme = useTheme();
  const t = useProgress(true, 1200);
  const goal = 2000;
  const eaten = Math.round(760 * t);
  const burned = Math.round(120 * t);
  const burnGoal = 300;

  return (
    <View style={styles.scene}>
      <Text style={[styles.sceneKicker, { color: theme.textMuted }]}>TODAY</Text>
      <Text style={[styles.bigNumber, { color: theme.text }]}>{(goal - eaten + burned).toLocaleString()}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11 }}>kcal left to eat</Text>
      <View style={[styles.track, { backgroundColor: theme.cardAlt, marginTop: 8 }]}>
        <View style={[styles.fill, { width: `${(eaten / goal) * 100}%`, backgroundColor: theme.dialCalories }]} />
      </View>
      <View style={styles.statRow}>
        <MiniStat label="Goal" value={goal.toLocaleString()} />
        <MiniStat label="Eaten" value={eaten.toLocaleString()} />
        <MiniStat label="Burned" value={burned.toLocaleString()} />
      </View>

      <View style={[styles.miniCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, fontWeight: "800", fontSize: 12 }}>🔥 Burn {burnGoal - burned} more kcal today</Text>
        <View style={[styles.track, { backgroundColor: theme.cardAlt, marginTop: 6 }]}>
          <View style={[styles.fill, { width: `${(burned / burnGoal) * 100}%`, backgroundColor: theme.dialSodium }]} />
        </View>
        <View style={styles.exerciseWrap}>
          {["🚶 Walk 30m", "🚴 Cycle 20m", "🏊 Swim 15m"].map((e) => (
            <View key={e} style={[styles.exerciseChip, { backgroundColor: theme.cardAlt }]}>
              <Text style={{ color: theme.text, fontSize: 10, fontWeight: "600" }}>{e}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.miniCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, fontWeight: "800", fontSize: 12, marginBottom: 6 }}>Macros</Text>
        {[
          { label: "Protein", value: 48, target: 150, color: theme.dialProtein },
          { label: "Carbs", value: 92, target: 200, color: theme.dialCarbs },
          { label: "Fat", value: 26, target: 67, color: theme.dialFat },
        ].map((m) => (
          <View key={m.label} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>{m.label}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                {Math.round(m.value * t)} / {m.target} g
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.cardAlt, height: 5, marginTop: 3 }]}>
              <View style={[styles.fill, { width: `${((m.value * t) / m.target) * 100}%`, backgroundColor: m.color }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DemoDial({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center" }}>{children}</View>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 13 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

function Plate({ size }: { size: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={c - 2} fill="#F4F1EA" stroke="#DCD6CA" strokeWidth={3} />
      <Circle cx={c} cy={c} r={c * 0.78} fill="#FBF9F4" />
      {/* leafy greens */}
      <Ellipse cx={c * 0.7} cy={c * 0.72} rx={c * 0.3} ry={c * 0.22} fill="#4CAF50" />
      <Ellipse cx={c * 0.62} cy={c * 0.95} rx={c * 0.22} ry={c * 0.18} fill="#2E7D32" />
      {/* salmon */}
      <Ellipse cx={c * 1.3} cy={c * 0.75} rx={c * 0.3} ry={c * 0.17} fill="#FF8A65" />
      {/* sweet potato */}
      <Ellipse cx={c * 1.28} cy={c * 1.28} rx={c * 0.26} ry={c * 0.2} fill="#FFA726" />
      {/* purple cabbage */}
      <Ellipse cx={c * 0.78} cy={c * 1.32} rx={c * 0.24} ry={c * 0.16} fill="#8E44AD" />
      {/* tomatoes */}
      <Circle cx={c * 1.02} cy={c * 1.02} r={c * 0.1} fill="#E53935" />
      <Circle cx={c * 1.14} cy={c * 1.06} r={c * 0.08} fill="#EF5350" />
      {/* corn */}
      <Circle cx={c * 0.98} cy={c * 0.6} r={c * 0.05} fill="#FDD835" />
      <Circle cx={c * 1.06} cy={c * 0.56} r={c * 0.05} fill="#FDD835" />
      <Circle cx={c * 1.04} cy={c * 0.66} r={c * 0.05} fill="#FBC02D" />
    </Svg>
  );
}

function ScanningScene() {
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const press = Animated.sequence([
      Animated.delay(1700),
      Animated.timing(pulse, { toValue: 0.8, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]);
    loop.start();
    press.start();
    return () => {
      loop.stop();
      press.stop();
    };
  }, [sweep, pulse]);

  const plate = 180;
  return (
    <View style={[styles.scene, styles.cameraScene]}>
      <Text style={styles.cameraHint}>Point at your meal</Text>
      <View style={{ width: plate + 16, height: plate + 16, alignItems: "center", justifyContent: "center" }}>
        <Plate size={plate} />
        {/* viewfinder corners */}
        <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
        <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
        <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
        <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
        <Animated.View
          style={[
            styles.scanLine,
            { transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [-plate / 2, plate / 2] }) }] },
          ]}
        />
      </View>
      <Animated.View style={[styles.shutter, { transform: [{ scale: pulse }] }]}>
        <View style={styles.shutterInner} />
      </Animated.View>
    </View>
  );
}

function ResultsScene() {
  const theme = useTheme();
  const t = useProgress(true, 1100);
  const verdicts = [
    { icon: "✅", color: theme.safe, title: "Gout", body: "Low in purines — a good choice." },
    { icon: "⚠️", color: theme.caution, title: "Glucose intolerance", body: "58g carbs — pair with protein, go easy on the sweet potato." },
    { icon: "⚠️", color: theme.caution, title: "Diabetes", body: "Moderate carb load; fiber (9g) helps slow the rise." },
  ];

  return (
    <View style={styles.scene}>
      <Text style={[styles.foodTitle, { color: theme.text }]}>Salmon power bowl</Text>
      <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 8 }}>Confidence: high · ~420g</Text>
      <View style={styles.dialRow}>
        <DemoDial><RadialGauge size={46} strokeWidth={5} progress={0.27 * t} color={theme.dialCalories} value={`${Math.round(540 * t)}`} label="kcal" /></DemoDial>
        <DemoDial><RadialGauge size={46} strokeWidth={5} progress={0.29 * t} color={theme.dialProtein} value={`${Math.round(32 * t)}g`} label="Protein" /></DemoDial>
        <DemoDial><RadialGauge size={46} strokeWidth={5} progress={0.26 * t} color={theme.dialCarbs} value={`${Math.round(58 * t)}g`} label="Carbs" /></DemoDial>
        <DemoDial><RadialGauge size={46} strokeWidth={5} progress={0.28 * t} color={theme.dialFat} value={`${Math.round(18 * t)}g`} label="Fat" /></DemoDial>
      </View>
      <View style={{ gap: 6, marginTop: 10 }}>
        {verdicts.map((v, i) => (
          <View
            key={v.title}
            style={[
              styles.verdict,
              { backgroundColor: theme.card, borderLeftColor: v.color, opacity: Math.min(1, Math.max(0, t * 3 - i * 0.6)) },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: "800", fontSize: 11 }}>
              {v.icon} {v.title}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 10, lineHeight: 13 }}>{v.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 34,
    borderWidth: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  notch: { alignSelf: "center", width: 70, height: 16, borderRadius: 10, backgroundColor: "#11151C", marginTop: 6, zIndex: 2 },
  scene: { flex: 1, padding: 14, paddingTop: 10 },
  sceneKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  bigNumber: { fontSize: 30, fontWeight: "900", marginTop: 2 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  statRow: { flexDirection: "row", marginTop: 10 },
  miniCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
  exerciseWrap: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  exerciseChip: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
  cameraScene: { backgroundColor: "#1B1F27", alignItems: "center", justifyContent: "space-between", paddingBottom: 20 },
  cameraHint: { color: "#fff", fontSize: 11, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  corner: { position: "absolute", width: 22, height: 22, borderColor: "#fff" },
  scanLine: { position: "absolute", left: 6, right: 6, height: 3, borderRadius: 2, backgroundColor: "#34C48A", shadowColor: "#34C48A", shadowOpacity: 0.9, shadowRadius: 6 },
  shutter: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff" },
  foodTitle: { fontSize: 15, fontWeight: "800" },
  dialRow: { flexDirection: "row", justifyContent: "space-between" },
  verdict: { borderLeftWidth: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  caption: { fontSize: 15, fontWeight: "800", marginTop: 14 },
  dots: { flexDirection: "row", gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
