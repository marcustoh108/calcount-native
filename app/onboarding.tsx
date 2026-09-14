import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BodyMetricsCard } from "../components/BodyMetricsCard";
import { Chip } from "../components/Chip";
import { estimateRecommendedCalories } from "../lib/health/bodyMetrics";
import { useAppState } from "../lib/store/AppStateContext";
import { useTheme } from "../lib/theme";
import { HEALTH_CONDITION_LABELS, HEALTH_CONDITION_ORDER, HealthCondition, Sex, UnitSystem } from "../lib/types";

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export default function Onboarding() {
  const theme = useTheme();
  const { updateProfile } = useAppState();

  const [weightInput, setWeightInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);

  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [calorieGoal, setCalorieGoal] = useState("");
  const [units, setUnits] = useState<UnitSystem>("metric");

  const weightKg = Number(weightInput);
  const heightCm = Number(heightInput);
  const age = Number(ageInput);
  const metricsComplete =
    Number.isFinite(weightKg) && weightKg > 0 && Number.isFinite(heightCm) && heightCm > 0 && Number.isFinite(age) && age > 0 && sex != null;
  const metrics = metricsComplete ? { weightKg, heightCm, age, sex: sex as Sex } : null;

  function toggleCondition(c: HealthCondition) {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function addAllergy() {
    const value = allergyInput.trim();
    if (!value) return;
    setAllergies((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setAllergyInput("");
  }

  async function finish() {
    const goal = Number(calorieGoal);
    await updateProfile((prev) => ({
      ...prev,
      conditions,
      allergies,
      dailyCalorieGoal: Number.isFinite(goal) && goal > 0 ? Math.round(goal) : null,
      units,
      onboardingComplete: true,
      weightKg: metrics ? metrics.weightKg : null,
      heightCm: metrics ? metrics.heightCm : null,
      age: metrics ? metrics.age : null,
      sex: metrics ? metrics.sex : null,
    }));
    router.replace("/(tabs)/diary");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.text }]}>Welcome to CalCount</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Point your camera at food to get calories, macros, and a plain-language safety check for
            conditions like diabetes and gout. Tell us what applies to you so every scan can warn you
            about foods that matter.
          </Text>

          <Text style={[styles.section, { color: theme.text }]}>About you</Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Used to estimate your BMI, ideal weight range, and daily calorie need. Optional — skip if
            you'd rather not share this, or add it later in Settings.
          </Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricField}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Weight (kg)</Text>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
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
                  <Chip key={opt.value} label={opt.label} selected={sex === opt.value} onPress={() => setSex(opt.value)} />
                ))}
              </View>
            </View>
          </View>
          {metrics && (
            <View style={{ marginTop: 12 }}>
              <BodyMetricsCard metrics={metrics} />
            </View>
          )}

          <Text style={[styles.section, { color: theme.text }]}>Health conditions</Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Select any that apply. You can change this anytime in Settings.
          </Text>
          <View style={styles.chipWrap}>
            {HEALTH_CONDITION_ORDER.map((c) => (
              <Chip
                key={c}
                label={HEALTH_CONDITION_LABELS[c]}
                selected={conditions.includes(c)}
                onPress={() => toggleCondition(c)}
              />
            ))}
          </View>

          <Text style={[styles.section, { color: theme.text }]}>Allergies & intolerances</Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            e.g. peanuts, shellfish, dairy — we'll flag these in every scan too.
          </Text>
          <View style={styles.row}>
            <TextInput
              value={allergyInput}
              onChangeText={setAllergyInput}
              onSubmitEditing={addAllergy}
              placeholder="Type an allergy and press add"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              returnKeyType="done"
            />
            <Pressable onPress={addAllergy} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Add</Text>
            </Pressable>
          </View>
          <View style={styles.chipWrap}>
            {allergies.map((a) => (
              <Chip
                key={a}
                label={`${a} ✕`}
                selected
                onPress={() => setAllergies((prev) => prev.filter((x) => x !== a))}
              />
            ))}
          </View>

          <View style={styles.goalHeaderRow}>
            <Text style={[styles.section, { color: theme.text, marginTop: 0 }]}>Daily calorie goal (optional)</Text>
            {metrics && (
              <Pressable onPress={() => setCalorieGoal(String(estimateRecommendedCalories(metrics)))}>
                <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 12.5 }}>
                  Use recommended ({estimateRecommendedCalories(metrics).toLocaleString()})
                </Text>
              </Pressable>
            )}
          </View>
          <TextInput
            value={calorieGoal}
            onChangeText={setCalorieGoal}
            placeholder="e.g. 2000"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />

          <Text style={[styles.section, { color: theme.text }]}>Units</Text>
          <View style={styles.chipWrap}>
            <Chip label="Metric (g, kg)" selected={units === "metric"} onPress={() => setUnits("metric")} />
            <Chip label="Imperial (oz, lb)" selected={units === "imperial"} onPress={() => setUnits("imperial")} />
          </View>

          <Pressable onPress={finish} style={[styles.cta, { backgroundColor: theme.primary }]}>
            <Text style={{ color: theme.primaryText, fontWeight: "800", fontSize: 16 }}>Get started</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 6 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14.5, lineHeight: 21, marginBottom: 8 },
  section: { fontSize: 16, fontWeight: "700", marginTop: 18 },
  hint: { fontSize: 12.5, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  cta: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  metricsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  metricField: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  goalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18 },
});
