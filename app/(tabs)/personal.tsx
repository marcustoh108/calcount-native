import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "../../components/Chip";
import { SelectField } from "../../components/SelectField";
import { useAuth } from "../../lib/backend/AuthContext";
import { serverMode } from "../../lib/backend/supabase";
import { COUNTRIES } from "../../lib/data/countries";
import { LANGUAGE_OPTIONS } from "../../lib/data/languages";
import {
  BmiCategory,
  bmiCategory,
  computeBMI,
  idealWeightRange,
  recommendedDailyPlan,
  recommendedGoalWeight,
} from "../../lib/health/bodyMetrics";
import { LEGAL } from "../../lib/legal/config";
import { useAppState } from "../../lib/store/AppStateContext";
import { Theme, useTheme } from "../../lib/theme";
import { HEALTH_CONDITION_LABELS, HEALTH_CONDITION_ORDER, HealthCondition, Sex, UnitSystem } from "../../lib/types";
import { macroTargets, round } from "../../lib/utils/nutrition";
import { cmToFtIn, formatWeight, ftInToCm, parseWeightInput, weightForInput, weightUnit } from "../../lib/utils/units";

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

const BMI_NOTE: Record<BmiCategory, string> = {
  Underweight: "Below the WHO healthy range (18.5–24.9).",
  Good: "Within the WHO healthy range (18.5–24.9).",
  Overweight: "Above the WHO healthy range (18.5–24.9).",
  Obese: "Well above the WHO healthy range (18.5–24.9).",
};

function bmiColor(category: BmiCategory, theme: Theme): string {
  if (category === "Good") return theme.safe;
  if (category === "Obese") return theme.avoid;
  return theme.caution;
}

export default function Personal() {
  const theme = useTheme();
  const { profile, updateProfile, logWeight, account } = useAppState();
  const { email: signedInEmail } = useAuth();
  const accountEmail = serverMode ? signedInEmail : (account?.email ?? null);
  const { units } = profile;

  const metrics =
    profile.weightKg != null && profile.heightCm != null && profile.age != null && profile.sex != null
      ? { weightKg: profile.weightKg, heightCm: profile.heightCm, age: profile.age, sex: profile.sex }
      : null;
  const bmi = metrics ? computeBMI(metrics.weightKg, metrics.heightCm) : null;
  const category = bmi != null ? bmiCategory(bmi) : null;
  const ideal = metrics ? idealWeightRange(metrics.heightCm) : null;
  const recGoalWeight = metrics ? recommendedGoalWeight(metrics.weightKg, metrics.heightCm) : null;
  const plan = metrics ? recommendedDailyPlan(metrics, profile.goalWeightKg ?? recGoalWeight) : null;
  const recMacros = macroTargets(profile.dailyCalorieGoal ?? plan?.intakeKcal ?? null);

  function applyRecommendations() {
    if (!plan || recGoalWeight == null) return;
    updateProfile((prev) => ({
      ...prev,
      goalWeightKg: prev.goalWeightKg ?? recGoalWeight,
      dailyCalorieGoal: plan.intakeKcal,
      dailyBurnGoal: plan.burnKcal,
      proteinGoalG: null,
      carbsGoalG: null,
    }));
  }

  function toggleCondition(c: HealthCondition) {
    updateProfile((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(c) ? prev.conditions.filter((x) => x !== c) : [...prev.conditions, c],
    }));
  }

  const [allergyInput, setAllergyInput] = useState("");
  function addAllergy() {
    const value = allergyInput.trim();
    if (!value) return;
    updateProfile((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(value) ? prev.allergies : [...prev.allergies, value],
    }));
    setAllergyInput("");
  }

  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.pageTitle, { color: theme.text }]}>Personal</Text>
        {accountEmail && <Text style={{ color: theme.textMuted, fontSize: 13 }}>{accountEmail}</Text>}

        <Pressable onPress={() => router.push("/paywall")} style={[styles.trialCard, { backgroundColor: theme.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.primaryText, fontWeight: "900", fontSize: 16 }}>
              START {LEGAL.trialDays}-DAY FREE TRIAL
            </Text>
            <Text style={{ color: theme.primaryText, opacity: 0.85, fontSize: 12.5, marginTop: 2 }}>
              Then {LEGAL.yearlyPrice}/year or {LEGAL.monthlyPrice}/month. Cancel anytime.
            </Text>
          </View>
          <Text style={{ color: theme.primaryText, fontSize: 22, fontWeight: "800" }}>›</Text>
        </Pressable>

        {/* BMI */}
        <Text style={[styles.section, { color: theme.text }]}>BMI</Text>
        {metrics && bmi != null && category && ideal ? (
          <View style={card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.bigValue, { color: theme.text }]}>{round(bmi, 1)}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>Body mass index</Text>
              </View>
              <View style={[styles.badge, { borderColor: bmiColor(category, theme), backgroundColor: `${bmiColor(category, theme)}1A` }]}>
                <Text style={{ color: bmiColor(category, theme), fontWeight: "800" }}>{category}</Text>
              </View>
            </View>
            <BmiScale bmi={bmi} />
            <Text style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 8 }}>{BMI_NOTE[category]}</Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Text style={{ color: theme.text, fontSize: 14 }}>
              Ideal weight for your height:{" "}
              <Text style={{ fontWeight: "800" }}>
                {formatWeight(ideal.minKg, units, 0)} – {formatWeight(ideal.maxKg, units, 0)}
              </Text>
            </Text>
            {recGoalWeight != null && (
              <Text style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 4 }}>
                Recommended goal: {formatWeight(recGoalWeight, units, 0)}
              </Text>
            )}
          </View>
        ) : (
          <View style={card}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              Add your weight, height, age and gender below to see your BMI and recommendations.
            </Text>
          </View>
        )}

        {/* Recommended plan */}
        {plan && (
          <>
            <Text style={[styles.section, { color: theme.text }]}>Recommended daily plan</Text>
            <View style={card}>
              <View style={styles.planRow}>
                <View style={[styles.planTile, { backgroundColor: theme.cardAlt }]}>
                  <Text style={{ fontSize: 18 }}>🍽️</Text>
                  <Text style={[styles.planValue, { color: theme.text }]}>{plan.intakeKcal.toLocaleString()}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11.5 }}>kcal to eat</Text>
                </View>
                <View style={[styles.planTile, { backgroundColor: theme.cardAlt }]}>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                  <Text style={[styles.planValue, { color: theme.text }]}>{plan.burnKcal.toLocaleString()}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11.5 }}>kcal to burn</Text>
                </View>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 17, marginTop: 10 }}>
                {plan.direction === "lose"
                  ? "Aims for about a 500 kcal daily deficit — roughly 0.5 kg (1 lb) a week."
                  : plan.direction === "gain"
                    ? "Aims for a gentle ~300 kcal daily surplus to gain weight steadily."
                    : "Keeps you at your current weight."}{" "}
                Your body uses about {plan.baselineKcal.toLocaleString()} kcal a day before exercise.
              </Text>
              <Pressable onPress={applyRecommendations} style={[styles.secondaryBtn, { borderColor: theme.primary }]}>
                <Text style={{ color: theme.primary, fontWeight: "800" }}>Use these as my goals</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Goals */}
        <Text style={[styles.section, { color: theme.text }]}>Goals</Text>
        <View style={[card, { gap: 12 }]}>
          <NumberField
            label={`Goal weight (${weightUnit(units)})`}
            value={profile.goalWeightKg != null ? weightForInput(profile.goalWeightKg, units) : ""}
            placeholder={recGoalWeight != null ? `Recommended ${weightForInput(recGoalWeight, units)}` : "e.g. 65"}
            onSave={(text) => updateProfile((prev) => ({ ...prev, goalWeightKg: parseWeightInput(text, units) }))}
          />
          <NumberField
            label="Calories to eat per day (kcal)"
            value={profile.dailyCalorieGoal?.toString() ?? ""}
            placeholder={plan ? `Recommended ${plan.intakeKcal}` : "e.g. 2000"}
            onSave={(text) => updateProfile((prev) => ({ ...prev, dailyCalorieGoal: positiveInt(text) }))}
          />
          <NumberField
            label="Calories to burn per day (kcal)"
            value={profile.dailyBurnGoal?.toString() ?? ""}
            placeholder={plan ? `Recommended ${plan.burnKcal}` : "e.g. 300"}
            onSave={(text) => updateProfile((prev) => ({ ...prev, dailyBurnGoal: positiveInt(text) }))}
          />
          <NumberField
            label="Protein per day (g)"
            value={profile.proteinGoalG?.toString() ?? ""}
            placeholder={`Recommended ${round(recMacros.proteinG)}`}
            onSave={(text) => updateProfile((prev) => ({ ...prev, proteinGoalG: positiveInt(text) }))}
          />
          <NumberField
            label="Carbs per day (g)"
            value={profile.carbsGoalG?.toString() ?? ""}
            placeholder={`Recommended ${round(recMacros.carbsG)}`}
            onSave={(text) => updateProfile((prev) => ({ ...prev, carbsGoalG: positiveInt(text) }))}
          />
          <Text style={{ color: theme.textMuted, fontSize: 11.5 }}>
            Leave protein or carbs blank to follow the recommendation (30% protein / 40% carbs of your calories).
          </Text>
        </View>

        {/* Profile */}
        <Text style={[styles.section, { color: theme.text }]}>Your details</Text>
        <View style={[card, { gap: 12 }]}>
          <View>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Units</Text>
            <View style={styles.chipWrap}>
              <Chip label="Metric" selected={units === "metric"} onPress={() => updateProfile((p) => ({ ...p, units: "metric" }))} />
              <Chip label="Imperial" selected={units === "imperial"} onPress={() => updateProfile((p) => ({ ...p, units: "imperial" }))} />
            </View>
          </View>
          <NumberField
            label={`Weight now (${weightUnit(units)})`}
            value={weightForInput(profile.weightKg, units)}
            placeholder={units === "metric" ? "e.g. 70" : "e.g. 155"}
            onSave={(text) => {
              const kg = parseWeightInput(text, units);
              if (kg != null) logWeight(kg);
            }}
          />
          <HeightField units={units} heightCm={profile.heightCm} onSave={(cm) => updateProfile((p) => ({ ...p, heightCm: cm }))} />
          <NumberField
            label="Age"
            value={profile.age?.toString() ?? ""}
            placeholder="e.g. 30"
            integer
            onSave={(text) => updateProfile((prev) => ({ ...prev, age: positiveInt(text) }))}
          />
          <View>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Gender</Text>
            <View style={styles.chipWrap}>
              {SEX_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={profile.sex === opt.value}
                  onPress={() => updateProfile((p) => ({ ...p, sex: opt.value }))}
                />
              ))}
            </View>
          </View>
          <SelectField
            label="Country"
            placeholder="Select your country"
            value={profile.country}
            options={COUNTRY_OPTIONS}
            onChange={(code) => updateProfile((p) => ({ ...p, country: code }))}
            searchPlaceholder="Search countries"
          />
          <SelectField
            label="Preferred language"
            placeholder="Select a language"
            value={profile.language}
            options={LANGUAGE_OPTIONS}
            onChange={(code) => updateProfile((p) => ({ ...p, language: code }))}
            searchPlaceholder="Search languages"
          />
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Existing conditions</Text>
        <View style={styles.chipWrap}>
          {HEALTH_CONDITION_ORDER.map((c) => (
            <Chip key={c} label={HEALTH_CONDITION_LABELS[c]} selected={profile.conditions.includes(c)} onPress={() => toggleCondition(c)} />
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
        <View style={[styles.chipWrap, { marginTop: 8 }]}>
          {profile.allergies.map((a) => (
            <Chip
              key={a}
              label={`${a} ✕`}
              selected
              onPress={() => updateProfile((prev) => ({ ...prev, allergies: prev.allergies.filter((x) => x !== a) }))}
            />
          ))}
        </View>

        <Text style={{ color: theme.textMuted, fontSize: 11, lineHeight: 15, marginTop: 20 }}>
          BMI, ideal weight and calorie figures are general estimates (WHO BMI bands, Mifflin-St Jeor equation) and
          don't account for muscle mass, pregnancy, or medical conditions. Not medical advice — check with your doctor
          before changing your diet or exercise.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function positiveInt(text: string): number | null {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** A labelled numeric input that keeps its own draft text and saves when editing ends. */
function NumberField({
  label,
  value,
  placeholder,
  integer,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  integer?: boolean;
  onSave: (text: string) => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => {
          // Only save real edits — re-saving an untouched imperial value would drift through lb↔kg rounding.
          if (text.trim() !== value) onSave(text.trim());
        }}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        returnKeyType="done"
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
      />
    </View>
  );
}

function HeightField({ units, heightCm, onSave }: { units: UnitSystem; heightCm: number | null; onSave: (cm: number | null) => void }) {
  const theme = useTheme();
  const ftIn = heightCm != null ? cmToFtIn(heightCm) : null;
  const [cm, setCm] = useState(heightCm != null ? String(Math.round(heightCm)) : "");
  const [ft, setFt] = useState(ftIn ? String(ftIn.ft) : "");
  const [inches, setInches] = useState(ftIn ? String(ftIn.inches) : "");

  useEffect(() => {
    const f = heightCm != null ? cmToFtIn(heightCm) : null;
    setCm(heightCm != null ? String(Math.round(heightCm)) : "");
    setFt(f ? String(f.ft) : "");
    setInches(f ? String(f.inches) : "");
  }, [heightCm, units]);

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }];

  function saveMetric() {
    const n = Number(cm);
    onSave(Number.isFinite(n) && n > 0 ? n : null);
  }
  function saveImperial() {
    const total = ftInToCm(Number(ft || 0), Number(inches || 0));
    onSave(Number.isFinite(total) && total > 0 ? total : null);
  }

  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Height {units === "metric" ? "(cm)" : "(ft / in)"}</Text>
      {units === "metric" ? (
        <TextInput value={cm} onChangeText={setCm} onEndEditing={saveMetric} keyboardType="decimal-pad" placeholder="e.g. 170" placeholderTextColor={theme.textMuted} style={inputStyle} />
      ) : (
        <View style={styles.row}>
          <TextInput value={ft} onChangeText={setFt} onEndEditing={saveImperial} keyboardType="number-pad" placeholder="ft" placeholderTextColor={theme.textMuted} style={[inputStyle, { flex: 1 }]} />
          <TextInput value={inches} onChangeText={setInches} onEndEditing={saveImperial} keyboardType="number-pad" placeholder="in" placeholderTextColor={theme.textMuted} style={[inputStyle, { flex: 1 }]} />
        </View>
      )}
    </View>
  );
}

/** A horizontal BMI scale (15–35) with the WHO bands and a marker at the user's BMI. */
function BmiScale({ bmi }: { bmi: number }) {
  const theme = useTheme();
  const min = 15;
  const max = 35;
  const pct = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100;
  const bands = [
    { from: min, to: 18.5, color: theme.caution },
    { from: 18.5, to: 25, color: theme.safe },
    { from: 25, to: 30, color: theme.caution },
    { from: 30, to: max, color: theme.avoid },
  ];
  return (
    <View style={{ marginTop: 14 }}>
      <View style={styles.scaleTrack}>
        {bands.map((b) => (
          <View key={b.from} style={{ width: `${pct(b.to) - pct(b.from)}%`, backgroundColor: b.color, height: "100%" }} />
        ))}
      </View>
      <View style={[styles.scaleMarker, { left: `${pct(bmi)}%`, borderColor: theme.card, backgroundColor: theme.text }]} />
      <View style={[styles.rowBetween, { marginTop: 6 }]}>
        {["15", "18.5", "25", "30", "35"].map((l) => (
          <Text key={l} style={{ color: theme.textMuted, fontSize: 10 }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  pageTitle: { fontSize: 26, fontWeight: "900" },
  section: { fontSize: 15, fontWeight: "800", marginTop: 22, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  trialCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, marginTop: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bigValue: { fontSize: 32, fontWeight: "900" },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  planRow: { flexDirection: "row", gap: 10 },
  planTile: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  planValue: { fontSize: 22, fontWeight: "900", marginTop: 4 },
  secondaryBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  smallBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  scaleTrack: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", gap: 2 },
  scaleMarker: { position: "absolute", top: -4, width: 16, height: 18, borderRadius: 8, borderWidth: 3, marginLeft: -8 },
});
