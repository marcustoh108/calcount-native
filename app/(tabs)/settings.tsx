import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BodyMetricsCard } from "../../components/BodyMetricsCard";
import { Chip } from "../../components/Chip";
import { estimateRecommendedCalories } from "../../lib/health/bodyMetrics";
import { assessFoodSafety } from "../../lib/health/safetyRules";
import { ApiKeyStorage } from "../../lib/storage";
import { useAppState } from "../../lib/store/AppStateContext";
import { useTheme } from "../../lib/theme";
import {
  FoodEntry,
  HEALTH_CONDITION_LABELS,
  HEALTH_CONDITION_ORDER,
  HealthCondition,
  Sex,
  UnitSystem,
} from "../../lib/types";
import { suggestMealTypeForNow } from "../../lib/utils/date";

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export default function Settings() {
  const theme = useTheme();
  const { profile, updateProfile, hasApiKey, setApiKeyPresent, savedFoods, removeSavedFood, addEntry } =
    useAppState();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");
  const [calorieGoalInput, setCalorieGoalInput] = useState(profile.dailyCalorieGoal?.toString() ?? "");
  const [weightInput, setWeightInput] = useState(profile.weightKg?.toString() ?? "");
  const [heightInput, setHeightInput] = useState(profile.heightCm?.toString() ?? "");
  const [ageInput, setAgeInput] = useState(profile.age?.toString() ?? "");

  useEffect(() => {
    setCalorieGoalInput(profile.dailyCalorieGoal?.toString() ?? "");
  }, [profile.dailyCalorieGoal]);

  const weightKg = Number(weightInput);
  const heightCm = Number(heightInput);
  const age = Number(ageInput);
  const metricsComplete =
    Number.isFinite(weightKg) &&
    weightKg > 0 &&
    Number.isFinite(heightCm) &&
    heightCm > 0 &&
    Number.isFinite(age) &&
    age > 0 &&
    profile.sex != null;
  const metrics = metricsComplete ? { weightKg, heightCm, age, sex: profile.sex as Sex } : null;

  function saveBodyMetrics() {
    updateProfile((prev) => ({
      ...prev,
      weightKg: Number.isFinite(weightKg) && weightKg > 0 ? weightKg : null,
      heightCm: Number.isFinite(heightCm) && heightCm > 0 ? heightCm : null,
      age: Number.isFinite(age) && age > 0 ? age : null,
    }));
  }

  function setSex(sex: Sex) {
    updateProfile((prev) => ({ ...prev, sex }));
  }

  function toggleCondition(c: HealthCondition) {
    updateProfile((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(c) ? prev.conditions.filter((x) => x !== c) : [...prev.conditions, c],
    }));
  }

  function addAllergy() {
    const value = allergyInput.trim();
    if (!value) return;
    updateProfile((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(value) ? prev.allergies : [...prev.allergies, value],
    }));
    setAllergyInput("");
  }

  function removeAllergy(value: string) {
    updateProfile((prev) => ({ ...prev, allergies: prev.allergies.filter((a) => a !== value) }));
  }

  function saveCalorieGoal() {
    const n = Number(calorieGoalInput);
    updateProfile((prev) => ({ ...prev, dailyCalorieGoal: Number.isFinite(n) && n > 0 ? Math.round(n) : null }));
  }

  function setUnits(units: UnitSystem) {
    updateProfile((prev) => ({ ...prev, units }));
  }

  async function saveApiKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    await ApiKeyStorage.save(trimmed);
    setApiKeyPresent(true);
    setApiKeyInput("");
    Alert.alert("Saved", "Your Anthropic API key is stored securely on this device.");
  }

  async function clearApiKey() {
    await ApiKeyStorage.clear();
    setApiKeyPresent(false);
    Alert.alert("Removed", "Scans will use demo mode until you add a key again.");
  }

  async function quickAddSavedFood(foodId: string) {
    const food = savedFoods.find((f) => f.id === foodId);
    if (!food) return;
    const safety = assessFoodSafety(food.analysis, profile);
    const entry: FoodEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      mealType: suggestMealTypeForNow(),
      photoUri: null,
      analysis: food.analysis,
      safety,
      servings: 1,
      source: "saved_food",
      notes: null,
    };
    await addEntry(entry);
    Alert.alert("Logged", `"${food.name}" added to today's diary.`);
    router.push("/(tabs)/diary");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: theme.text }]}>AI scanning</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>
            {hasApiKey ? "✅ Connected to Anthropic" : "🧪 Demo mode (sample results only)"}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 6, lineHeight: 18 }}>
            CalCount calls the Anthropic API directly from your device using your own key — nothing is
            sent to any CalCount server, and there's no subscription or scan limit. Get a key at
            console.anthropic.com.
          </Text>
          <TextInput
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            placeholder="sk-ant-..."
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 12 }]}
          />
          <View style={styles.buttonRow}>
            <Pressable onPress={saveApiKey} style={[styles.smallBtn, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Save key</Text>
            </Pressable>
            {hasApiKey && (
              <Pressable onPress={clearApiKey} style={styles.smallBtnGhost}>
                <Text style={{ color: theme.danger, fontWeight: "700" }}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Body & metrics</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricField}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Weight (kg)</Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              onEndEditing={saveBodyMetrics}
              keyboardType="decimal-pad"
              placeholder="e.g. 70"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            />
          </View>
          <View style={styles.metricField}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Height (cm)</Text>
            <TextInput
              value={heightInput}
              onChangeText={setHeightInput}
              onEndEditing={saveBodyMetrics}
              keyboardType="decimal-pad"
              placeholder="e.g. 170"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            />
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metricField}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Age</Text>
            <TextInput
              value={ageInput}
              onChangeText={setAgeInput}
              onEndEditing={saveBodyMetrics}
              keyboardType="number-pad"
              placeholder="e.g. 30"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            />
          </View>
          <View style={[styles.metricField, { flex: 2 }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Gender</Text>
            <View style={styles.chipWrap}>
              {SEX_OPTIONS.map((opt) => (
                <Chip key={opt.value} label={opt.label} selected={profile.sex === opt.value} onPress={() => setSex(opt.value)} />
              ))}
            </View>
          </View>
        </View>
        {metrics && (
          <View style={{ marginTop: 10 }}>
            <BodyMetricsCard metrics={metrics} />
          </View>
        )}

        <Text style={[styles.section, { color: theme.text }]}>Health conditions</Text>
        <View style={styles.chipWrap}>
          {HEALTH_CONDITION_ORDER.map((c) => (
            <Chip
              key={c}
              label={HEALTH_CONDITION_LABELS[c]}
              selected={profile.conditions.includes(c)}
              onPress={() => toggleCondition(c)}
            />
          ))}
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Allergies & intolerances</Text>
        <View style={styles.row}>
          <TextInput
            value={allergyInput}
            onChangeText={setAllergyInput}
            onSubmitEditing={addAllergy}
            placeholder="Add an allergy"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />
          <Pressable onPress={addAllergy} style={[styles.smallBtn, { backgroundColor: theme.primary }]}>
            <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Add</Text>
          </Pressable>
        </View>
        <View style={styles.chipWrap}>
          {profile.allergies.map((a) => (
            <Chip key={a} label={`${a} ✕`} selected onPress={() => removeAllergy(a)} />
          ))}
        </View>

        <View style={styles.goalHeaderRow}>
          <Text style={[styles.section, { color: theme.text, marginTop: 0 }]}>
            Daily calorie goal
            {metrics ? ` (Recommended: ${estimateRecommendedCalories(metrics).toLocaleString()})` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          <TextInput
            value={calorieGoalInput}
            onChangeText={setCalorieGoalInput}
            onEndEditing={saveCalorieGoal}
            keyboardType="number-pad"
            placeholder="e.g. 2000"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />
          {metrics && (
            <Pressable
              onPress={() => {
                const recommended = estimateRecommendedCalories(metrics);
                setCalorieGoalInput(String(recommended));
                updateProfile((prev) => ({ ...prev, dailyCalorieGoal: recommended }));
              }}
              style={[styles.smallBtn, { backgroundColor: theme.cardAlt }]}
            >
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 12.5 }}>Use recommended</Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Units</Text>
        <View style={styles.chipWrap}>
          <Chip label="Metric" selected={profile.units === "metric"} onPress={() => setUnits("metric")} />
          <Chip label="Imperial" selected={profile.units === "imperial"} onPress={() => setUnits("imperial")} />
        </View>

        {savedFoods.length > 0 && (
          <>
            <Text style={[styles.section, { color: theme.text }]}>My foods (one-tap logging)</Text>
            <View style={{ gap: 8 }}>
              {savedFoods.map((f) => (
                <View key={f.id} style={[styles.savedRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Pressable onPress={() => quickAddSavedFood(f.id)} style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: "700" }}>{f.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                      {Math.round(f.analysis.nutrients.calories)} kcal · tap to log now
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => removeSavedFood(f.id)} hitSlop={10}>
                    <Text style={{ color: theme.danger, fontSize: 18 }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.section, { color: theme.text }]}>About</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontSize: 12.5, lineHeight: 18 }}>
            CalCount's health-safety guidance is generated from general nutrition heuristics and AI
            photo estimates. It is not medical advice and can be wrong — always confirm with a doctor
            or dietitian for medical decisions, especially around diabetes, kidney disease, or other
            serious conditions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 4 },
  section: { fontSize: 15, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  smallBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  smallBtnGhost: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, justifyContent: "center" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  metricsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  metricField: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  goalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
});
