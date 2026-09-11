import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "../components/Chip";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { PromptModal } from "../components/PromptModal";
import { SafetyList } from "../components/SafetyList";
import { assessFoodSafety } from "../lib/health/safetyRules";
import { scheduleReminder } from "../lib/notifications";
import { useAppState } from "../lib/store/AppStateContext";
import { usePendingScan } from "../lib/store/PendingScanContext";
import { useTheme } from "../lib/theme";
import { FoodAnalysis, FoodEntry, MEAL_TYPES, MealType, NutrientEstimate, SavedFood } from "../lib/types";
import { round } from "../lib/utils/nutrition";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type EditableField = keyof Pick<
  NutrientEstimate,
  "calories" | "proteinG" | "carbsG" | "sugarG" | "fatG" | "saturatedFatG" | "sodiumMg" | "potassiumMg"
>;

const EDIT_FIELDS: { key: EditableField; label: string; suffix: string }[] = [
  { key: "calories", label: "Calories", suffix: "kcal" },
  { key: "proteinG", label: "Protein", suffix: "g" },
  { key: "carbsG", label: "Carbs", suffix: "g" },
  { key: "sugarG", label: "Sugar", suffix: "g" },
  { key: "fatG", label: "Fat", suffix: "g" },
  { key: "saturatedFatG", label: "Saturated fat", suffix: "g" },
  { key: "sodiumMg", label: "Sodium", suffix: "mg" },
  { key: "potassiumMg", label: "Potassium", suffix: "mg" },
];

function withServings(analysis: FoodAnalysis, servings: number): FoodAnalysis {
  const n = analysis.nutrients;
  return {
    ...analysis,
    nutrients: {
      ...n,
      calories: n.calories * servings,
      proteinG: n.proteinG * servings,
      carbsG: n.carbsG * servings,
      sugarG: n.sugarG * servings,
      addedSugarG: n.addedSugarG * servings,
      fiberG: n.fiberG * servings,
      fatG: n.fatG * servings,
      saturatedFatG: n.saturatedFatG * servings,
      sodiumMg: n.sodiumMg * servings,
      potassiumMg: n.potassiumMg * servings,
      cholesterolMg: n.cholesterolMg * servings,
    },
  };
}

export default function Result() {
  const theme = useTheme();
  const { pending, setPending } = usePendingScan();
  const { profile, addEntry, saveFood } = useAppState();

  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(pending?.analysis ?? null);
  const [mealType, setMealType] = useState<MealType>(pending?.mealType ?? "snack");
  const [servings, setServings] = useState(1);
  const [editingNutrition, setEditingNutrition] = useState(false);
  const [saveFoodModalVisible, setSaveFoodModalVisible] = useState(false);

  const scaled = useMemo(() => (analysis ? withServings(analysis, servings) : null), [analysis, servings]);
  const safety = useMemo(() => (scaled ? assessFoodSafety(scaled, profile) : []), [scaled, profile]);

  if (!pending || !analysis || !scaled) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textMuted }}>Nothing to review. Go back and scan a food.</Text>
        <Pressable onPress={() => router.back()} style={[styles.cta, { backgroundColor: theme.primary, marginTop: 16 }]}>
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  function updateField(key: EditableField, text: string) {
    const value = Number(text);
    setAnalysis((prev) => {
      if (!prev) return prev;
      return { ...prev, nutrients: { ...prev.nutrients, [key]: Number.isFinite(value) && value >= 0 ? value : 0 } };
    });
  }

  function adjustServings(delta: number) {
    setServings((prev) => Math.max(0.25, Math.round((prev + delta) * 4) / 4));
  }

  async function handleSave() {
    if (!pending || !analysis) return;
    const entry: FoodEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      mealType,
      photoUri: pending.photoUri,
      analysis,
      safety,
      servings,
      source: pending.photoUri ? "camera" : "manual",
      notes: null,
    };
    await addEntry(entry);
    if (profile.postMealWalkReminders) {
      scheduleReminder(
        "Time for a stroll? 🚶",
        `A short walk after ${entry.analysis.foodName.toLowerCase()} can help digestion and blood sugar.`,
        20,
      ).catch(() => {});
    }
    setPending(null);
    router.dismissTo("/(tabs)/diary");
  }

  async function confirmSaveAsFood(name: string) {
    setSaveFoodModalVisible(false);
    if (!name.trim() || !analysis) return;
    const food: SavedFood = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      analysis,
      createdAt: new Date().toISOString(),
    };
    await saveFood(food);
    Alert.alert("Saved", `"${food.name}" added to your quick-add list.`);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {pending.photoUri && <Image source={{ uri: pending.photoUri }} style={styles.photo} contentFit="cover" />}

        <TextInput
          value={analysis.foodName}
          onChangeText={(text) => setAnalysis((prev) => (prev ? { ...prev, foodName: text } : prev))}
          style={[styles.nameInput, { color: theme.text }]}
        />
        {!!analysis.description && (
          <Text style={[styles.description, { color: theme.textMuted }]}>{analysis.description}</Text>
        )}

        <View style={styles.row}>
          <ConfidenceBadge confidence={analysis.confidence} />
        </View>
        {!!analysis.confidenceNotes && (
          <Text style={[styles.confidenceNote, { color: theme.textMuted }]}>ⓘ {analysis.confidenceNotes}</Text>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Meal</Text>
        <View style={styles.chipWrap}>
          {MEAL_TYPES.map((m) => (
            <Chip key={m} label={MEAL_LABELS[m]} selected={mealType === m} onPress={() => setMealType(m)} />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Portion</Text>
        <Text style={[styles.portionDesc, { color: theme.textMuted }]}>
          AI estimate: {analysis.portionDescription}. Adjust below if you ate more or less than what's pictured.
        </Text>
        <View style={[styles.stepper, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Pressable onPress={() => adjustServings(-0.25)} style={styles.stepperBtn}>
            <Text style={[styles.stepperBtnText, { color: theme.text }]}>–</Text>
          </Pressable>
          <Text style={[styles.stepperValue, { color: theme.text }]}>{servings}× portion</Text>
          <Pressable onPress={() => adjustServings(0.25)} style={styles.stepperBtn}>
            <Text style={[styles.stepperBtnText, { color: theme.text }]}>+</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.macroHeaderRow}>
            <Text style={[styles.calorieBig, { color: theme.text }]}>{round(scaled.nutrients.calories)} kcal</Text>
            <Pressable onPress={() => setEditingNutrition((v) => !v)}>
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>
                {editingNutrition ? "Done" : "Adjust numbers"}
              </Text>
            </Pressable>
          </View>

          {!editingNutrition ? (
            <View style={styles.macroGrid}>
              <MacroStat label="Protein" value={`${round(scaled.nutrients.proteinG)}g`} theme={theme} />
              <MacroStat label="Carbs" value={`${round(scaled.nutrients.carbsG)}g`} theme={theme} />
              <MacroStat label="Sugar" value={`${round(scaled.nutrients.sugarG)}g`} theme={theme} />
              <MacroStat label="Fat" value={`${round(scaled.nutrients.fatG)}g`} theme={theme} />
              <MacroStat label="Sat. fat" value={`${round(scaled.nutrients.saturatedFatG)}g`} theme={theme} />
              <MacroStat label="Sodium" value={`${round(scaled.nutrients.sodiumMg)}mg`} theme={theme} />
              <MacroStat label="Potassium" value={`${round(scaled.nutrients.potassiumMg)}mg`} theme={theme} />
              <MacroStat label="Cholesterol" value={`${round(scaled.nutrients.cholesterolMg)}mg`} theme={theme} />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Values are per the base portion (before the {servings}× multiplier above).
              </Text>
              {EDIT_FIELDS.map((f) => (
                <View key={f.key} style={styles.editRow}>
                  <Text style={[styles.editLabel, { color: theme.text }]}>{f.label}</Text>
                  <TextInput
                    value={String(round(analysis.nutrients[f.key]))}
                    onChangeText={(t) => updateField(f.key, t)}
                    keyboardType="numeric"
                    style={[styles.editInput, { color: theme.text, borderColor: theme.border }]}
                  />
                  <Text style={{ color: theme.textMuted, fontSize: 12, width: 34 }}>{f.suffix}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {analysis.ingredients.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingredients (estimated)</Text>
            <View style={{ gap: 6 }}>
              {analysis.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <Text style={{ color: theme.text, fontSize: 13.5 }}>
                    {ing.name}
                    {ing.likelyHidden ? " · hidden" : ""}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>{Math.round(ing.estimatedGrams)}g</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Health safety</Text>
        <SafetyList assessments={safety} />

        <Pressable onPress={handleSave} style={[styles.cta, { backgroundColor: theme.primary, marginTop: 24 }]}>
          <Text style={{ color: theme.primaryText, fontWeight: "800", fontSize: 16 }}>Save to diary</Text>
        </Pressable>
        <Pressable onPress={() => setSaveFoodModalVisible(true)} style={styles.secondaryCta}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>⭐ Save as My Food for one-tap logging</Text>
        </Pressable>
      </ScrollView>

      <PromptModal
        visible={saveFoodModalVisible}
        title="Save as My Food"
        message="Give this food a name so you can log it in one tap next time."
        initialValue={analysis.foodName}
        onCancel={() => setSaveFoodModalVisible(false)}
        onConfirm={confirmSaveAsFood}
      />
    </SafeAreaView>
  );
}

function MacroStat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.macroStat}>
      <Text style={[styles.macroValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 16, paddingBottom: 48, gap: 4 },
  photo: { width: "100%", height: 220, borderRadius: 16, marginBottom: 14 },
  nameInput: { fontSize: 22, fontWeight: "800", padding: 0 },
  description: { fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  row: { flexDirection: "row", marginTop: 10 },
  confidenceNote: { fontSize: 12.5, marginTop: 6, lineHeight: 17 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  portionDesc: { fontSize: 13, marginBottom: 10, lineHeight: 18 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 12, padding: 6 },
  stepperBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stepperBtnText: { fontSize: 22, fontWeight: "700" },
  stepperValue: { fontSize: 15, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  macroHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calorieBig: { fontSize: 24, fontWeight: "800" },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 14 },
  macroStat: { width: "22%" },
  macroValue: { fontSize: 15, fontWeight: "700" },
  macroLabel: { fontSize: 11, marginTop: 2 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editLabel: { flex: 1, fontSize: 13.5 },
  editInput: { width: 80, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, textAlign: "right" },
  ingredientRow: { flexDirection: "row", justifyContent: "space-between" },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  secondaryCta: { alignItems: "center", paddingVertical: 14 },
});
