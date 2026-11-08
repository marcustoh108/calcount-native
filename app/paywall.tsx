import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../lib/backend/AuthContext";
import { serverMode } from "../lib/backend/supabase";
import { LEGAL } from "../lib/legal/config";
import { type PlanId, purchaseErrorMessage } from "../lib/purchases/plans";
import { usePremium } from "../lib/purchases/PremiumContext";
import { useTheme } from "../lib/theme";

const PLANS: { id: PlanId; title: string; price: string; period: string; note: string; badge?: string }[] = [
  {
    id: "yearly",
    title: "Yearly",
    price: LEGAL.yearlyPrice,
    period: "per year",
    note: `Billed once a year · works out to about ${LEGAL.yearlyPerMonth}/month`,
    badge: LEGAL.yearlySaving,
  },
  { id: "monthly", title: "Monthly", price: LEGAL.monthlyPrice, period: "per month", note: "Billed every month" },
];

const FEATURES = [
  "📷 AI food scans with calories & macros",
  "🩺 Risk flags for diabetes, gout, blood pressure & more",
  "🎯 Personal calorie, protein, carb & weight goals",
  "📈 Weekly insights on protein, carbs & fat, plus weight trends",
];

export default function Paywall() {
  const theme = useTheme();
  const { email } = useAuth();
  const premium = usePremium();
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  // Show the store's own price (in the person's currency) once it has loaded.
  const plans = PLANS.map((p) => ({ ...p, price: premium.prices[p.id] ?? p.price }));
  const selected = plans.find((p) => p.id === plan)!;

  /** Purchases belong to a YumBalance account, so Premium follows the person to a new phone. */
  function needsAccount(): boolean {
    if (!serverMode || email) return false;
    Alert.alert("Create an account first", "Your subscription is linked to your YumBalance account.", [
      { text: "Not now", style: "cancel" },
      { text: "Sign in", onPress: () => router.push("/sign-in") },
    ]);
    return true;
  }

  async function startTrial() {
    if (!premium.available) {
      Alert.alert(
        "Purchases not available here",
        "Subscriptions work in the YumBalance app from Google Play or the App Store. You haven't been charged.",
      );
      return;
    }
    if (needsAccount()) return;
    setBusy("buy");
    try {
      const outcome = await premium.purchase(plan);
      if (outcome === "purchased") {
        Alert.alert("Welcome to Premium", "Premium is unlocked. Enjoy YumBalance!");
        if (router.canGoBack()) router.back();
      }
    } catch (err) {
      const message = purchaseErrorMessage(err);
      if (message) Alert.alert("Purchase not completed", message);
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (!premium.available) {
      Alert.alert("Restore purchases", "Restoring works in the YumBalance app from Google Play or the App Store.");
      return;
    }
    if (needsAccount()) return;
    setBusy("restore");
    try {
      const restored = await premium.restore();
      Alert.alert(
        "Restore purchases",
        restored ? "Premium is active again." : "No active YumBalance subscription was found for this store account.",
      );
      if (restored && router.canGoBack()) router.back();
    } catch (err) {
      Alert.alert("Restore purchases", purchaseErrorMessage(err) ?? "Restore was cancelled.");
    } finally {
      setBusy(null);
    }
  }

  if (premium.isPremium) {
    return (
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>You have {LEGAL.appName} Premium</Text>
        <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
          All features are unlocked. You can change or cancel your plan in your store account at any time.
        </Text>
        <Pressable onPress={() => premium.manageSubscription()} style={[styles.cta, { backgroundColor: theme.primary }]}>
          <Text style={{ color: theme.primaryText, fontWeight: "900", fontSize: 16 }}>MANAGE SUBSCRIPTION</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Try {LEGAL.appName} Premium free for {LEGAL.trialDays} days</Text>
      <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
        Choose a plan. You won't be charged during the free trial, and you can cancel anytime.
      </Text>

      <View style={{ gap: 6, marginTop: 16 }}>
        {FEATURES.map((f) => (
          <Text key={f} style={{ color: theme.text, fontSize: 14 }}>
            {f}
          </Text>
        ))}
      </View>

      <View style={{ gap: 12, marginTop: 22 }}>
        {plans.map((p) => {
          const active = p.id === plan;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPlan(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[
                styles.plan,
                { backgroundColor: theme.card, borderColor: active ? theme.primary : theme.border, borderWidth: active ? 2 : 1 },
              ]}
            >
              <View style={[styles.radio, { borderColor: active ? theme.primary : theme.border }]}>
                {active && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16 }}>{p.title}</Text>
                  {p.badge && (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                      <Text style={{ color: theme.primaryText, fontWeight: "800", fontSize: 11 }}>{p.badge}</Text>
                    </View>
                  )}
                </View>
                {/* The billed amount is the most prominent price, per App Store guidelines. */}
                <Text style={{ color: theme.text, fontWeight: "800", fontSize: 20, marginTop: 4 }}>
                  {p.price} <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textMuted }}>{p.period}</Text>
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{p.note}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={startTrial}
        disabled={busy != null}
        accessibilityRole="button"
        style={[styles.cta, { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 }]}
      >
        {busy === "buy" ? (
          <ActivityIndicator color={theme.primaryText} />
        ) : (
          <Text style={{ color: theme.primaryText, fontWeight: "900", fontSize: 16 }}>START {LEGAL.trialDays}-DAY FREE TRIAL</Text>
        )}
      </Pressable>

      <Text style={[styles.fine, { color: theme.textMuted }]}>
        {LEGAL.trialDays} days free, then {selected.price} {selected.period}. Payment is charged to your Apple ID or
        Google Play account when the trial ends. The subscription renews automatically at the same price unless
        cancelled at least 24 hours before the end of the trial or current period. Manage or cancel anytime in your
        App Store / Google Play account settings.
      </Text>

      <View style={styles.links}>
        <Pressable onPress={restore} disabled={busy != null}>
          <Text style={[styles.link, { color: theme.primary }]}>{busy === "restore" ? "Restoring…" : "Restore purchases"}</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } })}>
          <Text style={[styles.link, { color: theme.primary }]}>Terms of Use</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } })}>
          <Text style={[styles.link, { color: theme.primary }]}>Privacy Policy</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "900" },
  plan: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cta: { marginTop: 24, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  fine: { fontSize: 11.5, lineHeight: 16, marginTop: 12, textAlign: "center" },
  links: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 18, marginTop: 16 },
  link: { fontSize: 12.5, fontWeight: "700" },
});
