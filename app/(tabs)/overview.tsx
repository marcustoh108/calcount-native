import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionSheetModal } from "../../components/ActionSheetModal";
import { AddExerciseModal } from "../../components/AddExerciseModal";
import { MealCard } from "../../components/MealCard";
import { PhysioTipCard } from "../../components/PhysioTipCard";
import { PromptModal } from "../../components/PromptModal";
import { TipsCard } from "../../components/TipsCard";
import { dailyRiskFlags } from "../../lib/health/dailyLimits";
import { suggestActivities } from "../../lib/health/exerciseCalculator";
import { useAppState } from "../../lib/store/AppStateContext";
import { generateTips } from "../../lib/tips/generateTips";
import { Theme, useTheme } from "../../lib/theme";
import { CalorieViewMode, ExerciseEntry, FoodEntry, MEAL_TYPES, MealType } from "../../lib/types";
import { dayKeyFromIso, formatDayLabel, lastNDays, todayKey } from "../../lib/utils/date";
import {
  DAILY_WATER_GOAL_CUPS,
  macroTargetsForProfile,
  round,
  sumExerciseCalories,
  sumTotals,
  weeklyCalorieBudget,
} from "../../lib/utils/nutrition";
import { formatWeight, parseWeightInput, weightForInput, weightUnit } from "../../lib/utils/units";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const DEFAULT_WEIGHT_KG = 70;
const DEFAULT_BURN_GOAL = 300;

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d + delta));
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Overview() {
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
    weightLog,
    logWeight,
  } = useAppState();

  const [dateKey, setDateKey] = useState(todayKey());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeEntry, setActiveEntry] = useState<FoodEntry | null>(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const isToday = dateKey === todayKey();

  const dayEntries = useMemo(() => entries.filter((e) => dayKeyFromIso(e.createdAt) === dateKey), [entries, dateKey]);
  const dayExercise = useMemo(
    () => exerciseEntries.filter((e) => dayKeyFromIso(e.createdAt) === dateKey),
    [exerciseEntries, dateKey],
  );
  const exerciseCalories = useMemo(() => sumExerciseCalories(dayExercise), [dayExercise]);
  const totals = useMemo(() => sumTotals(dayEntries), [dayEntries]);
  const riskFlags = useMemo(() => dailyRiskFlags(totals, profile), [totals, profile]);
  const targets = useMemo(() => macroTargetsForProfile(profile), [profile]);
  const goal = profile.dailyCalorieGoal;
  const remaining = goal != null ? goal - totals.calories + exerciseCalories : null;

  const week = useMemo(() => new Set(lastNDays(7)), []);
  const weeklyConsumed = useMemo(
    () => sumTotals(entries.filter((e) => week.has(dayKeyFromIso(e.createdAt)))).calories,
    [entries, week],
  );
  const weeklyExercise = useMemo(
    () => sumExerciseCalories(exerciseEntries.filter((e) => week.has(dayKeyFromIso(e.createdAt)))),
    [exerciseEntries, week],
  );
  const weeklyBudget = goal != null ? weeklyCalorieBudget(goal) : null;
  const weeklyRemaining = weeklyBudget != null ? weeklyBudget - weeklyConsumed + weeklyExercise : null;
  const weekly = profile.calorieViewMode === "weekly" && weeklyBudget != null;

  const burnGoal = profile.dailyBurnGoal ?? DEFAULT_BURN_GOAL;
  const burnLeft = Math.max(0, burnGoal - exerciseCalories);
  const burnIdeas = useMemo(
    () =>
      suggestActivities(burnLeft, profile.weightKg ?? DEFAULT_WEIGHT_KG).filter((a) =>
        ["Brisk walking", "Cycling", "Swimming", "Jogging"].includes(a.name),
      ),
    [burnLeft, profile.weightKg],
  );

  const latestWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1] : null;
  const currentWeightKg = latestWeight?.weightKg ?? profile.weightKg;
  const firstWeightKg = weightLog.length > 1 ? weightLog[0].weightKg : null;

  const tips = useMemo(() => {
    if (!isToday) return [];
    return generateTips({
      totals,
      targets,
      dailyCalorieGoal: goal,
      remaining,
      exerciseCalories,
      waterCupsToday,
      mealsLoggedToday: dayEntries.length,
      riskFlags,
      hourOfDay: new Date().getHours(),
    });
  }, [isToday, totals, targets, goal, remaining, exerciseCalories, waterCupsToday, dayEntries.length, riskFlags]);

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

  async function handleUpdateWeight(text: string) {
    const kg = parseWeightInput(text, profile.units);
    if (kg == null || kg < 20 || kg > 400) {
      Alert.alert("Check that number", `Enter your weight in ${weightUnit(profile.units)}.`);
      return;
    }
    await logWeight(kg);
    setWeightModalVisible(false);
  }

  const grouped = useMemo(
    () =>
      MEAL_TYPES.map((type) => ({ type, items: dayEntries.filter((e) => e.mealType === type) })).filter(
        (g) => g.items.length > 0,
      ),
    [dayEntries],
  );

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];
  const shownLeft = weekly ? weeklyRemaining : remaining;
  const shownEaten = weekly ? weeklyConsumed : totals.calories;
  const shownBudget = weekly ? weeklyBudget : goal;
  const shownBurned = weekly ? weeklyExercise : exerciseCalories;

  const listHeader = (
    <View style={{ gap: 12, marginBottom: 6 }}>
      <View>
        <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "600" }}>{isToday ? greeting() : " "}</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Overview</Text>
          <View style={styles.dayNav}>
            <Pressable onPress={() => setDateKey((k) => shiftDay(k, -1))} hitSlop={10} accessibilityLabel="Previous day">
              <Text style={[styles.dayArrow, { color: theme.primary }]}>‹</Text>
            </Pressable>
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14, minWidth: 92, textAlign: "center" }}>
              {formatDayLabel(dateKey)}
            </Text>
            <Pressable
              onPress={() => setDateKey((k) => shiftDay(k, 1))}
              disabled={isToday}
              hitSlop={10}
              accessibilityLabel="Next day"
            >
              <Text style={[styles.dayArrow, { color: isToday ? theme.border : theme.primary }]}>›</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Calorie budget */}
      <View style={card}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardKicker, { color: theme.textMuted }]}>{weekly ? "THIS WEEK" : "CALORIE BUDGET"}</Text>
          {goal != null && (
            <Pressable onPress={() => setViewMode(weekly ? "daily" : "weekly")} hitSlop={8}>
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 12 }}>
                {weekly ? "Show daily" : "Show weekly"}
              </Text>
            </Pressable>
          )}
        </View>
        {shownBudget != null && shownLeft != null ? (
          <>
            <View style={styles.heroRow}>
              <Text style={[styles.heroNumber, { color: shownLeft >= 0 ? theme.text : theme.avoid }]}>
                {Math.abs(round(shownLeft)).toLocaleString()}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                {shownLeft >= 0 ? " kcal left to eat" : " kcal over budget"}
              </Text>
            </View>
            <ProgressBar value={shownEaten} max={shownBudget + shownBurned} color={theme.dialCalories} theme={theme} />
            <View style={[styles.statRow, { borderTopColor: theme.border }]}>
              <Stat label="Goal" value={round(shownBudget).toLocaleString()} theme={theme} />
              <Stat label="Eaten" value={round(shownEaten).toLocaleString()} theme={theme} />
              <Stat label="Burned" value={`+${round(shownBurned).toLocaleString()}`} theme={theme} />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.heroNumber, { color: theme.text }]}>{round(totals.calories).toLocaleString()}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>kcal eaten</Text>
            <Pressable onPress={() => router.push("/(tabs)/personal")} style={{ marginTop: 8 }}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>Set a calorie goal in Personal ›</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Burn target */}
      <View style={card}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardKicker, { color: theme.textMuted }]}>BURN TARGET</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {round(exerciseCalories)} / {burnGoal} kcal
          </Text>
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {burnLeft > 0 ? `Burn ${round(burnLeft)} more kcal ${isToday ? "today" : "this day"}` : "🎉 Burn goal reached"}
        </Text>
        <ProgressBar value={exerciseCalories} max={burnGoal} color={theme.dialSodium} theme={theme} />
        {burnLeft > 0 && (
          <View style={styles.ideaWrap}>
            {burnIdeas.map((a) => (
              <View key={a.name} style={[styles.idea, { backgroundColor: theme.cardAlt }]}>
                <Text style={{ fontSize: 15 }}>{a.emoji}</Text>
                <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: "600" }}>
                  {a.name.replace("Brisk walking", "Walk")} {a.minutes} min
                </Text>
              </View>
            ))}
          </View>
        )}
        {dayExercise.length > 0 && (
          <View style={{ gap: 4, marginTop: 10 }}>
            {dayExercise.map((ex) => (
              <View key={ex.id} style={styles.rowBetween}>
                <Text style={{ color: theme.textMuted, fontSize: 12.5 }}>
                  ✓ {ex.activityName} · {round(ex.caloriesBurned)} kcal
                </Text>
                <Pressable onPress={() => removeExercise(ex.id)} hitSlop={8}>
                  <Text style={{ color: theme.danger, fontSize: 14 }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Pressable onPress={() => setExerciseModalVisible(true)} style={[styles.outlineBtn, { borderColor: theme.border }]}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>+ Log exercise</Text>
        </Pressable>
      </View>

      {/* Weight now */}
      <View style={[card, styles.weightCard]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardKicker, { color: theme.textMuted }]}>WEIGHT NOW</Text>
          <Text style={[styles.weightValue, { color: theme.text }]}>
            {currentWeightKg != null ? formatWeight(currentWeightKg, profile.units) : "—"}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {firstWeightKg != null && currentWeightKg != null
              ? `${currentWeightKg - firstWeightKg <= 0 ? "▼" : "▲"} ${formatWeight(Math.abs(currentWeightKg - firstWeightKg), profile.units)} since you started`
              : latestWeight
                ? `Updated ${formatDayLabel(dayKeyFromIso(latestWeight.createdAt))}`
                : "Log your weight to track your trend"}
            {profile.goalWeightKg != null ? ` · goal ${formatWeight(profile.goalWeightKg, profile.units, 0)}` : ""}
          </Text>
        </View>
        <Pressable onPress={() => setWeightModalVisible(true)} style={[styles.updateBtn, { backgroundColor: theme.primary }]}>
          <Text style={{ color: theme.primaryText, fontWeight: "800" }}>Update</Text>
        </Pressable>
      </View>

      {/* Macros */}
      <View style={card}>
        <Text style={[styles.cardKicker, { color: theme.textMuted, marginBottom: 10 }]}>MACROS</Text>
        <MacroBar label="Protein" value={totals.proteinG} target={targets.proteinG} color={theme.dialProtein} theme={theme} />
        <MacroBar label="Carbs" value={totals.carbsG} target={targets.carbsG} color={theme.dialCarbs} theme={theme} />
        <MacroBar label="Fat" value={totals.fatG} target={targets.fatG} color={theme.dialFat} theme={theme} />
      </View>

      {/* Water + streak */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable onPress={addWaterCup} style={[card, styles.tile]} accessibilityLabel="Add a cup of water">
          <Text style={{ fontSize: 20 }}>💧</Text>
          <Text style={[styles.tileValue, { color: theme.text }]}>
            {waterCupsToday}
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "600" }}> / {DAILY_WATER_GOAL_CUPS} cups</Text>
          </Text>
          <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "700" }}>Tap to add</Text>
        </Pressable>
        <View style={[card, styles.tile]}>
          <Text style={{ fontSize: 20 }}>🔥</Text>
          <Text style={[styles.tileValue, { color: theme.text }]}>
            {streakDays}
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "600" }}> day{streakDays === 1 ? "" : "s"}</Text>
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Logging streak</Text>
        </View>
      </View>

      {riskFlags.length > 0 && (
        <View style={[card, { gap: 4 }]}>
          <Text style={[styles.cardKicker, { color: theme.textMuted, marginBottom: 4 }]}>HEALTH WATCH</Text>
          {riskFlags.map((f) => (
            <Text
              key={f.condition}
              style={{ fontSize: 12.5, color: f.over ? theme.avoid : theme.textMuted, fontWeight: f.over ? "700" : "400" }}
            >
              {f.over ? "⚠ " : "• "}
              {f.message}
            </Text>
          ))}
        </View>
      )}

      {tips.length > 0 && <TipsCard tips={tips} />}
      <PhysioTipCard />

      <Text style={[styles.mealsHeading, { color: theme.text }]}>Meals</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <FlatList
        data={grouped}
        keyExtractor={(g) => g.type}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={[card, { alignItems: "center", paddingVertical: 24 }]}>
            <Text style={{ color: theme.textMuted, textAlign: "center" }}>
              Nothing logged {isToday ? "today" : "this day"} yet.
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/scan")} style={{ marginTop: 8 }}>
              <Text style={{ color: theme.primary, fontWeight: "800" }}>Scan a meal ›</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={styles.mealGroup}>
            <View style={styles.rowBetween}>
              <Text style={[styles.mealGroupTitle, { color: theme.text }]}>{MEAL_LABELS[group.type]}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>{Math.round(sumTotals(group.items).calories)} kcal</Text>
            </View>
            <View style={{ gap: 8 }}>
              {group.items.map((entry) => (
                <MealCard
                  key={entry.id}
                  entry={entry}
                  selected={selected.has(entry.id)}
                  selectionMode={selectionMode}
                  onPress={() => (selectionMode ? toggleSelected(entry.id) : setActiveEntry(entry))}
                  onLongPress={() => {
                    setSelectionMode(true);
                    setSelected(new Set([entry.id]));
                  }}
                />
              ))}
            </View>
          </View>
        )}
      />

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

      <PromptModal
        visible={weightModalVisible}
        title="Update weight"
        message={`Your weight today, in ${weightUnit(profile.units)}.`}
        initialValue={weightForInput(currentWeightKg, profile.units)}
        keyboardType="decimal-pad"
        onCancel={() => setWeightModalVisible(false)}
        onConfirm={handleUpdateWeight}
      />
    </SafeAreaView>
  );
}

function ProgressBar({ value, max, color, theme }: { value: number; max: number; color: string; theme: Theme }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={[styles.track, { backgroundColor: theme.cardAlt }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: over ? theme.avoid : color }]} />
    </View>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

function MacroBar({ label, value, target, color, theme }: { label: string; value: number; target: number; color: string; theme: Theme }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={[styles.rowBetween, { marginBottom: 5 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>{label}</Text>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12.5 }}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>{round(value)}</Text> / {round(target)} g
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.cardAlt, height: 6, marginTop: 0 }]}>
        <View style={[styles.fill, { width: `${Math.min(1, target > 0 ? value / target : 0) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 110, gap: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageTitle: { fontSize: 28, fontWeight: "900" },
  dayNav: { flexDirection: "row", alignItems: "center", gap: 4 },
  dayArrow: { fontSize: 26, fontWeight: "700", paddingHorizontal: 6 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  cardKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  cardTitle: { fontSize: 17, fontWeight: "800", marginTop: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 6 },
  heroNumber: { fontSize: 44, fontWeight: "900", letterSpacing: -1 },
  track: { height: 10, borderRadius: 5, overflow: "hidden", marginTop: 10 },
  fill: { height: "100%", borderRadius: 5 },
  statRow: { flexDirection: "row", marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  ideaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  idea: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  outlineBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  weightCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  weightValue: { fontSize: 26, fontWeight: "900", marginTop: 4 },
  updateBtn: { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  tile: { flex: 1, gap: 4 },
  tileValue: { fontSize: 22, fontWeight: "900" },
  mealsHeading: { fontSize: 18, fontWeight: "900", marginTop: 8 },
  mealGroup: { gap: 8 },
  mealGroupTitle: { fontSize: 15, fontWeight: "700" },
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
