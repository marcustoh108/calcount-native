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

import { Chip } from "../components/Chip";
import { useAppState } from "../lib/store/AppStateContext";
import { useTheme } from "../lib/theme";
import { HEALTH_CONDITION_LABELS, HEALTH_CONDITION_ORDER, HealthCondition, UnitSystem } from "../lib/types";

export default function Onboarding() {
  const theme = useTheme();
  const { updateProfile } = useAppState();

  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [calorieGoal, setCalorieGoal] = useState("");
  const [units, setUnits] = useState<UnitSystem>("metric");

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

          <Text style={[styles.section, { color: theme.text }]}>Daily calorie goal (optional)</Text>
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
});
