import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SelectField } from "../../components/SelectField";
import { LANGUAGE_OPTIONS } from "../../lib/data/languages";
import { assessFoodSafety } from "../../lib/health/safetyRules";
import { LEGAL } from "../../lib/legal/config";
import { cancelDailyWorkoutReminder } from "../../lib/notifications";
import { ApiKeyStorage } from "../../lib/storage";
import { DAILY_SCAN_LIMIT, useAppState } from "../../lib/store/AppStateContext";
import { useTheme } from "../../lib/theme";
import { FoodEntry } from "../../lib/types";
import { suggestMealTypeForNow } from "../../lib/utils/date";


export default function Settings() {
  const theme = useTheme();
  const {
    profile,
    updateProfile,
    hasApiKey,
    setApiKeyPresent,
    savedFoods,
    removeSavedFood,
    addEntry,
    account,
    scansToday,
    deleteAllData,
  } = useAppState();

  const [apiKeyInput, setApiKeyInput] = useState("");

  async function emailSupport() {
    const url = `mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent(`${LEGAL.appName} support`)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("No email app found", `Please email us at ${LEGAL.contactEmail}.`);
    }
  }

  function confirmDeleteEverything() {
    Alert.alert(
      "Delete account & all data?",
      "This permanently erases your account, profile, food log, weight history and settings from this device. It can't be undone. (Any App Store / Google Play subscription must be cancelled separately in your store account.)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            await cancelDailyWorkoutReminder();
            await deleteAllData();
            router.replace("/onboarding");
          },
        },
      ],
    );
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
    Alert.alert("Logged", `"${food.name}" added to today's log.`);
    router.push("/(tabs)/overview");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: theme.text }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>{account ? account.email : "No account on this device"}</Text>
          <Pressable onPress={() => router.push("/paywall")} style={[styles.trialBtn, { backgroundColor: theme.primary }]}>
            <Text style={{ color: theme.primaryText, fontWeight: "900" }}>START {LEGAL.trialDays}-DAY FREE TRIAL</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>AI scanning</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>
            {hasApiKey ? "✅ Connected to Anthropic" : "🧪 Demo mode (sample results only)"}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 6, lineHeight: 18 }}>
            CalCount calls the Anthropic API directly from your device using your own key — nothing is
            sent to any CalCount server. Get a key at console.anthropic.com.
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
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 10 }}>
            Scans today: {Math.min(scansToday, DAILY_SCAN_LIMIT)} of {DAILY_SCAN_LIMIT}
          </Text>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Language</Text>
        <SelectField
          placeholder="Select a language"
          value={profile.language}
          options={LANGUAGE_OPTIONS}
          onChange={(code) => updateProfile((p) => ({ ...p, language: code }))}
          searchPlaceholder="Search languages"
        />
        <Text style={{ color: theme.textMuted, fontSize: 11.5, marginTop: 6 }}>
          CalCount is available in English. More languages are coming soon.
        </Text>

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

        <Text style={[styles.section, { color: theme.text }]}>Help</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }} selectable>
            For support matters, please drop us an email at{" "}
            <Text style={{ color: theme.primary, fontWeight: "700" }}>{LEGAL.contactEmail}</Text>
          </Text>
          <Pressable onPress={emailSupport} style={[styles.trialBtn, { backgroundColor: theme.primary }]}>
            <Text style={{ color: theme.primaryText, fontWeight: "800" }}>Email support</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Legal</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 4 }]}>
          <Pressable
            onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } })}
            style={[styles.linkRow, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>Privacy Policy</Text>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } })} style={styles.linkRow}>
            <Text style={{ color: theme.text, fontWeight: "600" }}>Terms of Use</Text>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>About</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontSize: 12.5, lineHeight: 18 }}>
            CalCount's health-safety guidance is generated from general nutrition heuristics and AI
            photo estimates. It is not medical advice and can be wrong — always confirm with a doctor
            or dietitian for medical decisions, especially around diabetes, kidney disease, or other
            serious conditions.
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 10 }}>
            {LEGAL.appName} is made by {LEGAL.owner}, Singapore.
          </Text>
        </View>

        <Pressable onPress={confirmDeleteEverything} style={[styles.deleteBtn, { borderColor: theme.danger }]}>
          <Text style={{ color: theme.danger, fontWeight: "800" }}>Delete account & all data</Text>
        </Pressable>
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
  trialBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 12 },
  linkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  deleteBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 28 },
});
