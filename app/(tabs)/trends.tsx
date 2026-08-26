import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppState } from "../../lib/store/AppStateContext";
import { useTheme } from "../../lib/theme";
import { dayKeyFromIso, formatDayLabel, todayKey } from "../../lib/utils/date";
import { round, sumTotals } from "../../lib/utils/nutrition";

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(todayKey(d));
  }
  return days;
}

export default function Trends() {
  const theme = useTheme();
  const { entries, profile, streakDays } = useAppState();

  const days = useMemo(() => lastNDays(7), []);
  const perDay = useMemo(
    () =>
      days.map((key) => {
        const dayEntries = entries.filter((e) => dayKeyFromIso(e.createdAt) === key);
        return { key, totals: sumTotals(dayEntries), count: dayEntries.length };
      }),
    [days, entries],
  );

  const maxCalories = Math.max(1, ...perDay.map((d) => d.totals.calories));
  const activeDays = perDay.filter((d) => d.count > 0);
  const avgCalories = activeDays.length
    ? activeDays.reduce((sum, d) => sum + d.totals.calories, 0) / activeDays.length
    : 0;
  const avgProtein = activeDays.length
    ? activeDays.reduce((sum, d) => sum + d.totals.proteinG, 0) / activeDays.length
    : 0;
  const avgSodium = activeDays.length
    ? activeDays.reduce((sum, d) => sum + d.totals.sodiumMg, 0) / activeDays.length
    : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Last 7 days</Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {perDay.map((d) => (
            <View key={d.key} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: theme.textMuted }]}>{formatDayLabel(d.key).slice(0, 3)}</Text>
              <View style={[styles.barTrack, { backgroundColor: theme.cardAlt }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(d.totals.calories / maxCalories) * 100}%`,
                      backgroundColor:
                        profile.dailyCalorieGoal && d.totals.calories > profile.dailyCalorieGoal
                          ? theme.avoid
                          : theme.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, { color: theme.text }]}>{round(d.totals.calories)}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Weekly averages</Text>
        <View style={[styles.card, styles.avgRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Stat label="Avg kcal/day" value={round(avgCalories).toString()} theme={theme} />
          <Stat label="Avg protein" value={`${round(avgProtein)}g`} theme={theme} />
          <Stat label="Avg sodium" value={`${round(avgSodium)}mg`} theme={theme} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.streakBig, { color: theme.text }]}>🔥 {streakDays} day streak</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 4 }}>
            Log at least one meal a day to keep it going.
          </Text>
        </View>

        {profile.conditions.length === 0 && (
          <Text style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 8 }}>
            Add health conditions in Settings to see condition-specific weekly risk trends.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 17 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  title: { fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barLabel: { width: 32, fontSize: 12 },
  barTrack: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },
  barValue: { width: 44, fontSize: 12, textAlign: "right" },
  avgRow: { flexDirection: "row" },
  streakBig: { fontSize: 20, fontWeight: "800" },
});
