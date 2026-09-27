import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { AppDemo } from "../components/AppDemo";
import { Chip } from "../components/Chip";
import { SelectField } from "../components/SelectField";
import { isEmailValid, isPasswordValid, passwordChecks } from "../lib/account";
import { COUNTRIES } from "../lib/data/countries";
import { LANGUAGES } from "../lib/data/languages";
import { recommendedDailyPlan, recommendedGoalWeight } from "../lib/health/bodyMetrics";
import { useAppState } from "../lib/store/AppStateContext";
import { useTheme } from "../lib/theme";
import { HEALTH_CONDITION_LABELS, HEALTH_CONDITION_ORDER, HealthCondition, Sex, UnitSystem } from "../lib/types";
import { ftInToCm, parseWeightInput, weightUnit } from "../lib/utils/units";

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.code, label: l.name, sublabel: l.nativeName }));

const STEPS = ["welcome", "about", "health", "region", "account"] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const theme = useTheme();
  const { updateProfile, logWeight, createAccount } = useAppState();
  const [step, setStep] = useState<Step>("welcome");
  const stepIndex = STEPS.indexOf(step);

  // About you
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [weightInput, setWeightInput] = useState("");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFtInput, setHeightFtInput] = useState("");
  const [heightInInput, setHeightInInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);

  // Health
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);

  // Region
  const [country, setCountry] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("en");

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const weightKg = parseWeightInput(weightInput, units);
  const heightCm = useMemo(() => {
    if (units === "metric") {
      const n = Number(heightCmInput);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    const ft = Number(heightFtInput || 0);
    const inches = Number(heightInInput || 0);
    const cm = ftInToCm(ft, inches);
    return Number.isFinite(cm) && cm > 0 ? cm : null;
  }, [units, heightCmInput, heightFtInput, heightInInput]);
  const age = Number(ageInput);
  const ageValid = Number.isInteger(age) && age >= 13 && age <= 120;
  const aboutValid =
    weightKg != null && weightKg >= 20 && weightKg <= 400 && heightCm != null && heightCm >= 90 && heightCm <= 250 && ageValid && sex != null;

  const checks = passwordChecks(password);
  const accountValid = isEmailValid(email) && isPasswordValid(password) && password === confirmPassword && agreed;

  function toggleCondition(c: HealthCondition) {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function addAllergy() {
    const value = allergyInput.trim();
    if (!value) return;
    setAllergies((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setAllergyInput("");
  }

  function next() {
    if (step === "about" && !aboutValid) {
      Alert.alert(
        "A few details missing",
        ageInput && !ageValid
          ? "CalCount is for people aged 13 and over. Please check your age."
          : "Please enter your weight, height, age and gender — they're used to work out your BMI and daily goals.",
      );
      return;
    }
    setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]);
  }

  function back() {
    setStep(STEPS[Math.max(0, stepIndex - 1)]);
  }

  async function finish() {
    if (!accountValid || !aboutValid || weightKg == null || heightCm == null || sex == null) return;
    setSubmitting(true);
    try {
      const metrics = { weightKg, heightCm, age, sex };
      const goalWeightKg = recommendedGoalWeight(weightKg, heightCm);
      const plan = recommendedDailyPlan(metrics, goalWeightKg);
      await createAccount(email, password);
      await updateProfile((prev) => ({
        ...prev,
        conditions,
        allergies,
        units,
        weightKg,
        heightCm,
        age,
        sex,
        country,
        language,
        goalWeightKg,
        dailyCalorieGoal: plan.intakeKcal,
        dailyBurnGoal: plan.burnKcal,
        onboardingComplete: true,
      }));
      await logWeight(weightKg);
      router.replace("/(tabs)/personal");
    } catch {
      Alert.alert("Couldn't create your account", "Something went wrong saving your details. Please try again.");
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }];

  if (step === "welcome") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={[styles.content, { alignItems: "stretch" }]}>
          <Text style={[styles.title, { color: theme.text, textAlign: "center" }]}>Welcome to CalCount</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, textAlign: "center" }]}>
            Know what's on your plate — and whether it's right for your health.
          </Text>
          <View style={{ marginTop: 8 }}>
            <AppDemo />
          </View>
          <Pressable onPress={next} style={[styles.cta, { backgroundColor: theme.primary }]}>
            <Text style={{ color: theme.primaryText, fontWeight: "800", fontSize: 16 }}>Get started</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={back} hitSlop={10}>
            <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 15 }}>‹ Back</Text>
          </Pressable>
          <Text style={{ color: theme.textMuted, fontSize: 12.5, fontWeight: "600" }}>
            Step {stepIndex} of {STEPS.length - 1}
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.cardAlt }]}>
          <View
            style={[styles.progressFill, { backgroundColor: theme.primary, width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === "about" && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>About you</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Used to work out your BMI, ideal weight, and how much to eat and burn each day.
              </Text>

              <Text style={[styles.section, { color: theme.text }]}>Units</Text>
              <View style={styles.chipWrap}>
                <Chip label="Metric (kg, cm)" selected={units === "metric"} onPress={() => setUnits("metric")} />
                <Chip label="Imperial (lb, ft)" selected={units === "imperial"} onPress={() => setUnits("imperial")} />
              </View>

              <Text style={[styles.section, { color: theme.text }]}>Weight ({weightUnit(units)})</Text>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder={units === "metric" ? "e.g. 70" : "e.g. 155"}
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />

              <Text style={[styles.section, { color: theme.text }]}>Height</Text>
              {units === "metric" ? (
                <TextInput
                  value={heightCmInput}
                  onChangeText={setHeightCmInput}
                  keyboardType="decimal-pad"
                  placeholder="cm, e.g. 170"
                  placeholderTextColor={theme.textMuted}
                  style={inputStyle}
                />
              ) : (
                <View style={styles.row}>
                  <TextInput
                    value={heightFtInput}
                    onChangeText={setHeightFtInput}
                    keyboardType="number-pad"
                    placeholder="ft, e.g. 5"
                    placeholderTextColor={theme.textMuted}
                    style={[inputStyle, { flex: 1 }]}
                  />
                  <TextInput
                    value={heightInInput}
                    onChangeText={setHeightInInput}
                    keyboardType="number-pad"
                    placeholder="in, e.g. 7"
                    placeholderTextColor={theme.textMuted}
                    style={[inputStyle, { flex: 1 }]}
                  />
                </View>
              )}

              <Text style={[styles.section, { color: theme.text }]}>Age</Text>
              <TextInput
                value={ageInput}
                onChangeText={setAgeInput}
                keyboardType="number-pad"
                placeholder="e.g. 30"
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />

              <Text style={[styles.section, { color: theme.text }]}>Gender</Text>
              <View style={styles.chipWrap}>
                {SEX_OPTIONS.map((opt) => (
                  <Chip key={opt.value} label={opt.label} selected={sex === opt.value} onPress={() => setSex(opt.value)} />
                ))}
              </View>
            </>
          )}

          {step === "health" && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Your health</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Every scan checks food against these, so you know what's safe for you. Optional — skip if none apply.
              </Text>

              <Text style={[styles.section, { color: theme.text }]}>Existing conditions</Text>
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
              <Text style={[styles.hint, { color: theme.textMuted }]}>e.g. peanuts, shellfish, dairy</Text>
              <View style={styles.row}>
                <TextInput
                  value={allergyInput}
                  onChangeText={setAllergyInput}
                  onSubmitEditing={addAllergy}
                  placeholder="Type an allergy and press Add"
                  placeholderTextColor={theme.textMuted}
                  style={[inputStyle, { flex: 1 }]}
                  returnKeyType="done"
                />
                <Pressable onPress={addAllergy} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
                  <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Add</Text>
                </Pressable>
              </View>
              <View style={[styles.chipWrap, { marginTop: 8 }]}>
                {allergies.map((a) => (
                  <Chip key={a} label={`${a} ✕`} selected onPress={() => setAllergies((prev) => prev.filter((x) => x !== a))} />
                ))}
              </View>
            </>
          )}

          {step === "region" && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Where you are</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Helps us tailor food suggestions and pricing to your region.
              </Text>
              <View style={{ marginTop: 14 }}>
                <SelectField
                  label="Country"
                  placeholder="Select your country"
                  value={country}
                  options={COUNTRY_OPTIONS}
                  onChange={setCountry}
                  searchPlaceholder="Search countries"
                />
              </View>
              <View style={{ marginTop: 14 }}>
                <SelectField
                  label="Preferred language"
                  placeholder="Select a language"
                  value={language}
                  options={LANGUAGE_OPTIONS}
                  onChange={setLanguage}
                  searchPlaceholder="Search languages"
                />
              </View>
            </>
          )}

          {step === "account" && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Create your account</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Your account and data are stored securely on this device.
              </Text>

              <Text style={[styles.section, { color: theme.text }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />
              {email.length > 3 && !isEmailValid(email) && (
                <Text style={{ color: theme.danger, fontSize: 12, marginTop: 4 }}>Enter a valid email address.</Text>
              )}

              <Text style={[styles.section, { color: theme.text }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                placeholder="Create a password"
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />
              <View style={{ gap: 3, marginTop: 8 }}>
                {checks.map((c) => (
                  <Text key={c.label} style={{ color: c.met ? theme.safe : theme.textMuted, fontSize: 12.5 }}>
                    {c.met ? "✓" : "○"} {c.label}
                  </Text>
                ))}
              </View>

              <Text style={[styles.section, { color: theme.text }]}>Confirm password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                placeholder="Type it again"
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <Text style={{ color: theme.danger, fontSize: 12, marginTop: 4 }}>Passwords don't match.</Text>
              )}

              <Pressable
                onPress={() => setAgreed((v) => !v)}
                style={styles.agreeRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <View style={[styles.checkbox, { borderColor: agreed ? theme.primary : theme.border, backgroundColor: agreed ? theme.primary : "transparent" }]}>
                  {agreed && <Text style={{ color: theme.primaryText, fontWeight: "900", fontSize: 13 }}>✓</Text>}
                </View>
                <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19, flex: 1 }}>
                  I'm 18 or older (or have a parent or guardian's permission), I agree to the{" "}
                  <Text
                    style={{ color: theme.primary, fontWeight: "700" }}
                    onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } })}
                  >
                    Terms of Use
                  </Text>{" "}
                  and{" "}
                  <Text
                    style={{ color: theme.primary, fontWeight: "700" }}
                    onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } })}
                  >
                    Privacy Policy
                  </Text>
                  , and I consent to CalCount using the health details I enter. I understand CalCount is not medical advice.
                </Text>
              </Pressable>
            </>
          )}

          {step === "account" ? (
            <Pressable
              onPress={finish}
              disabled={!accountValid || submitting}
              style={[styles.cta, { backgroundColor: theme.primary, opacity: accountValid && !submitting ? 1 : 0.45 }]}
            >
              {submitting ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={{ color: theme.primaryText, fontWeight: "800", fontSize: 16 }}>Create account</Text>
              )}
            </Pressable>
          ) : (
            <Pressable onPress={next} style={[styles.cta, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.primaryText, fontWeight: "800", fontSize: 16 }}>Continue</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8 },
  progressTrack: { height: 5, borderRadius: 3, marginHorizontal: 20, marginTop: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14.5, lineHeight: 21, marginBottom: 4 },
  section: { fontSize: 15, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  hint: { fontSize: 12.5, marginBottom: 8, marginTop: -4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  cta: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  agreeRow: { flexDirection: "row", gap: 10, marginTop: 20, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
});
