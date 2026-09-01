import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionSheetModal } from "../../components/ActionSheetModal";
import { AddExerciseModal } from "../../components/AddExerciseModal";
import { DateStrip } from "../../components/DateStrip";
import { MacroDonut } from "../../components/MacroDonut";
import { MealCard } from "../../components/MealCard";
import { RadialGauge } from "../../components/RadialGauge";
import { dailyRiskFlags } from "../../lib/health/dailyLimits";
import { useAppState } from "../../lib/store/AppStateContext";
import { useTheme } from "../../lib/theme";
import { CalorieViewMode, ExerciseEntry, FoodEntry, MEAL_TYPES, MealType } from "../../lib/types";
import { dayKeyFromIso, formatDayLabel, lastNDays, todayKey } from "../../lib/utils/date";
import {
  DAILY_WATER_GOAL_CUPS,
  macroTargets,
  round,
  sumExerciseCalories,
  sumTotals,
  weeklyCalorieBudget,
} from "../../lib/utils/nutrition";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function Diary() {
  const theme = useTheme();
  const {
    entries,
    exerciseEntries,
    profile,
    updateProfile,
    removeEntries,
    duplicateEntry,
    addExercise,
    removeExercise,
    waterCupsToday,
    streakDays,
    addWaterCup,
  } = useAppState();

  const [dateKey, setDateKey] = useState(todayKey());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeEntry, setActiveEntry] = useState<FoodEntry | null>(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  const dayEntries = useMemo(
    () => entries.filter((e) => dayKeyFromIso(e.createdAt) === dateKey),
    [entries, dateKey],
  );
  const dayExercise = useMemo(
    () => exerciseEntries.filter((e) => dayKeyFromIso(e.createdAt) === dateKey),
    [exerciseEntries, dateKey],
  );
  const exerciseCalories = useMemo(() => sumExerciseCalories(dayExercise), [dayExercise]);
  const totals = useMemo(() => sumTotals(dayEntries), [dayEntries]);
  const riskFlags = useMemo(() => dailyRiskFlags(totals, profile), [totals, profile]);
  const targets = useMemo(() => macroTargets(profile.dailyCalorieGoal), [profile.dailyCalorieGoal]);
  const loggedKeys = useMemo(() => new Set(entries.map((e) => dayKeyFromIso(e.createdAt))), [entries]);
  const remaining =
    profile.dailyCalorieGoal != null ? profile.dailyCalorieGoal - totals.calories + exerciseCalories : null;

  const week = useMemo(() => new Set(lastNDays(7)), []);
  const weeklyFoodEntries = useMemo(() => entries.filter((e) => week.has(dayKeyFromIso(e.createdAt))), [entries, week]);
  const weeklyExerciseEntries = useMemo(
    () => exerciseEntries.filter((e) => week.has(dayKeyFromIso(e.createdAt))),
    [exerciseEntries, week],
  );
  const weeklyConsumed = useMemo(() => sumTotals(weeklyFoodEntries).calories, [weeklyFoodEntries]);
  const weeklyExerciseCalories = useMemo(() => sumExerciseCalories(weeklyExerciseEntries), [weeklyExerciseEntries]);
  const weeklyBudget = profile.dailyCalorieGoal != null ? weeklyCalorieBudget(profile.dailyCalorieGoal) : null;
  const weeklyRemaining = weeklyBudget != null ? weeklyBudget - weeklyConsumed + weeklyExerciseCalories : null;

  function setViewMode(mode: CalorieViewMode) {
    updateProfile((prev) => ({ ...prev, calorieViewMode: mode }));
  }

  async function handleLogExercise(activityName: string, caloriesBurned: number) {
    // Build the timestamp from dateKey's Y/M/D with the current time-of-day, in local time —
    // `new Date(dateKey)` would parse the date-only string as UTC and can land on the wrong local day.
    const now = new Date();
    const [y, m, d] = dateKey.split("-").map(Number);
    const createdAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
    const entry: ExerciseEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
      activityName,
      caloriesBurned,
    };
    await addExercise(entry);
    setExerciseModalVisible(false);
  }

  const grouped = useMemo(() => {
    return MEAL_TYPES.map((type) => ({
      type,
      items: dayEntries.filter((e) => e.mealType === type),
    })).filter((g) => g.items.length > 0);
  }, [dayEntries]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleLongPress(entry: FoodEntry) {
    setSelectionMode(true);
    setSelected(new Set([entry.id]));
  }

  function handlePress(entry: FoodEntry) {
    if (selectionMode) {
      toggleSelected(entry.id);
    } else {
      setActiveEntry(entry);
    }
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  function confirmBulkDelete() {
    Alert.alert("Delete entries?", `Remove ${selected.size} logged item(s)?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeEntries(Array.from(selected));
          exitSelection();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.dateLabel, { color: theme.text }]}>{formatDayLabel(dateKey)}</Text>
        <DateStrip selectedKey={dateKey} loggedKeys={loggedKeys} onSelect={setDateKey} />

        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {profile.dailyCalorieGoal != null && (
            <View style={[styles.viewModeToggle, { backgroundColor: theme.cardAlt }]}>
              <Pressable
                onPress={() => setViewMode("daily")}
                style={[styles.viewModeBtn, profile.calorieViewMode === "daily" && { backgroundColor: theme.primary }]}
              >
                <Text
                  style={{
                    color: profile.calorieViewMode === "daily" ? theme.primaryText : theme.textMuted,
                    fontWeight: "700",
                    fontSize: 12.5,
                  }}
                >
                  Daily
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode("weekly")}
                style={[styles.viewModeBtn, profile.calorieViewMode === "weekly" && { backgroundColor: theme.primary }]}
              >
                <Text
                  style={{
                    color: profile.calorieViewMode === "weekly" ? theme.primaryText : theme.textMuted,
                    fontWeight: "700",
                    fontSize: 12.5,
                  }}
                >
                  Weekly budget
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.heroRow}>
            {profile.dailyCalorieGoal != null && profile.calorieViewMode === "weekly" && weeklyRemaining != null && weeklyBudget != null ? (
              <RadialGauge
                size={132}
                strokeWidth={14}
                progress={weeklyConsumed / weeklyBudget}
                color={theme.dialCalories}
                overColor={theme.avoid}
                value={Math.abs(round(weeklyRemaining)).toLocaleString()}
                unit={weeklyRemaining >= 0 ? "kcal left" : "kcal over"}
                label={`${round(weeklyConsumed).toLocaleString()} eaten of ${round(weeklyBudget).toLocaleString()} this week`}
              />
            ) : profile.dailyCalorieGoal != null && remaining != null ? (
              <RadialGauge
                size={132}
                strokeWidth={14}
                progress={totals.calories / profile.dailyCalorieGoal}
                color={theme.dialCalories}
                overColor={theme.avoid}
                value={Math.abs(round(remaining)).toLocaleString()}
                unit={remaining >= 0 ? "kcal left" : "kcal over"}
                label={`${round(totals.calories).toLocaleString()} eaten of ${profile.dailyCalorieGoal.toLocaleString()}${
                  exerciseCalories > 0 ? ` (+${round(exerciseCalories)} exercise)` : ""
                }`}
              />
            ) : (
              <RadialGauge
                size={132}
                strokeWidth={14}
                progress={0}
                color={theme.dialCalories}
                value={round(totals.calories).toLocaleString()}
                unit="kcal"
                label="today — set a goal in Settings"
              />
            )}
          </View>

          <Pressable onPress={() => setExerciseModalVisible(true)} style={styles.exerciseRow}>
            <Text style={{ color: theme.text, fontWeight: "600", fontSize: 13 }}>
              🔥 {exerciseCalories > 0 ? `${round(exerciseCalories)} kcal from exercise` : "Log exercise"}
            </Text>
            <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>+ Add</Text>
          </Pressable>
          {dayExercise.length > 0 && (
            <View style={{ gap: 4, marginTop: 6 }}>
              {dayExercise.map((ex) => (
                <View key={ex.id} style={styles.exerciseItemRow}>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    {ex.activityName} · {round(ex.caloriesBurned)} kcal
                  </Text>
                  <Pressable onPress={() => removeExercise(ex.id)} hitSlop={8}>
                    <Text style={{ color: theme.danger, fontSize: 14 }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.macroRow}>
            <RadialGauge
              size={78}
              strokeWidth={8}
              progress={totals.proteinG / targets.proteinG}
              color={theme.dialProtein}
              value={`${round(totals.proteinG)}`}
              unit="g"
              label="Protein"
            />
            <RadialGauge
              size={78}
              strokeWidth={8}
              progress={totals.carbsG / targets.carbsG}
              color={theme.dialCarbs}
              value={`${round(totals.carbsG)}`}
              unit="g"
              label="Carbs"
            />
            <RadialGauge
              size={78}
              strokeWidth={8}
              progress={totals.fatG / targets.fatG}
              color={theme.dialFat}
              value={`${round(totals.fatG)}`}
              unit="g"
              label="Fat"
            />
          </View>

          <View style={styles.donutRow}>
            <MacroDonut
              size={96}
              strokeWidth={15}
              segments={[
                { label: "Protein", grams: totals.proteinG, kcalPerGram: 4, color: theme.dialProtein },
                { label: "Carbs", grams: totals.carbsG, kcalPerGram: 4, color: theme.dialCarbs },
                { label: "Fat", grams: totals.fatG, kcalPerGram: 9, color: theme.dialFat },
              ]}
            />
          </View>

          <View style={styles.statsRow}>
            <Pressable onPress={addWaterCup} style={styles.waterDial}>
              <RadialGauge
                size={60}
                strokeWidth={7}
                progress={waterCupsToday / DAILY_WATER_GOAL_CUPS}
                color={theme.dialWater}
                value={`${waterCupsToday}`}
                unit="cups"
              />
              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>tap to add water</Text>
            </Pressable>
            <View style={[styles.streakChip, { backgroundColor: `${theme.dialSodium}1A`, borderColor: theme.dialSodium }]}>
              <Text style={{ fontSize: 22 }}>🔥</Text>
              <Text style={{ color: theme.text, fontWeight: "800", fontSize: 18, marginTop: 2 }}>{streakDays}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>day streak</Text>
            </View>
          </View>
          {riskFlags.length > 0 && (
            <View style={{ marginTop: 12, gap: 4 }}>
              {riskFlags.map((f) => (
                <Text
                  key={f.condition}
                  style={{ fontSize: 12, color: f.over ? theme.avoid : theme.textMuted, fontWeight: f.over ? "700" : "400" }}
                >
                  {f.over ? "⚠ " : ""}
                  {f.message}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.type}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: theme.textMuted, textAlign: "center" }}>
              Nothing logged {dateKey === todayKey() ? "today" : "this day"} yet. Scan a meal to get started.
            </Text>
          </View>
        }
        renderItem={({ item: group }) => {
          const groupTotal = sumTotals(group.items).calories;
          return (
            <View style={styles.mealGroup}>
              <View style={styles.mealGroupHeader}>
                <Text style={[styles.mealGroupTitle, { color: theme.text }]}>{MEAL_LABELS[group.type]}</Text>
                <Text style={[styles.mealGroupTotal, { color: theme.textMuted }]}>{Math.round(groupTotal)} kcal</Text>
              </View>
              <View style={{ gap: 8 }}>
                {group.items.map((entry) => (
                  <MealCard
                    key={entry.id}
                    entry={entry}
                    selected={selected.has(entry.id)}
                    selectionMode={selectionMode}
                    onPress={() => handlePress(entry)}
                    onLongPress={() => handleLongPress(entry)}
                  />
                ))}
              </View>
            </View>
          );
        }}
      />

      <Pressable onPress={() => router.push("/(tabs)/scan")} style={[styles.fab, { backgroundColor: theme.primary }]}>
        <Text style={{ fontSize: 26 }}>＋</Text>
      </Pressable>

      {selectionMode && (
        <View style={[styles.selectionBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: "600" }}>{selected.size} selected</Text>
          <View style={{ flexDirection: "row", gap: 18 }}>
            <Pressable onPress={exitSelection}>
              <Text style={{ color: theme.textMuted, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirmBulkDelete} disabled={selected.size === 0}>
              <Text style={{ color: theme.danger, fontWeight: "700" }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ActionSheetModal
        visible={!!activeEntry}
        title={activeEntry?.analysis.foodName}
        onClose={() => setActiveEntry(null)}
        actions={[
          {
            label: "Log this again",
            onPress: async () => {
              if (activeEntry) await duplicateEntry(activeEntry.id);
              setActiveEntry(null);
            },
          },
          {
            label: "Delete",
            destructive: true,
            onPress: async () => {
              if (activeEntry) await removeEntries([activeEntry.id]);
              setActiveEntry(null);
            },
          },
          { label: "Cancel", onPress: () => setActiveEntry(null) },
        ]}
      />

      <AddExerciseModal
        visible={exerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        onLog={handleLogExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  dateLabel: { fontSize: 16, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 12 },
  viewModeToggle: { flexDirection: "row", alignSelf: "center", borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  viewModeBtn: { paddingHorizontal: 14, paddingVertical: 7 },
  heroRow: { alignItems: "center" },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#8888",
  },
  exerciseItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  macroRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 18 },
  donutRow: { alignItems: "center", marginTop: 20 },
  statsRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-around", marginTop: 18 },
  waterDial: { alignItems: "center" },
  streakChip: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  listContent: { padding: 16, paddingBottom: 120, gap: 18 },
  mealGroup: { gap: 8 },
  mealGroupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  mealGroupTitle: { fontSize: 15, fontWeight: "700" },
  mealGroupTotal: { fontSize: 13 },
  empty: { paddingTop: 60, paddingHorizontal: 20 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  selectionBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
