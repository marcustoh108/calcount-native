import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { LEGAL } from "../lib/legal/config";
import { useTheme } from "../lib/theme";

type PlanId = "yearly" | "monthly";

const PLANS: { id: PlanId; title: string; price: string; period: string; note: string; badge?: string }[] = [
  {
    id: "yearly",
    title: "Yearly",
    price: LEGAL.yearlyPrice,
    period: "per year",
    note: "Billed once a year · works out to about US$6.67/month",
    badge: "Save 49%",
  },
  { id: "monthly", title: "Monthly", price: LEGAL.monthlyPrice, period: "per month", note: "Billed every month" },
];

const FEATURES = [
  "📷 AI food scans with calories & macros",
  "🩺 Safety checks for diabetes, gout, blood pressure & more",
  "🎯 Personal calorie, protein, carb & weight goals",
  "📈 Weight and nutrition trends over 12 months",
];

export default function Paywall() {
  const theme = useTheme();
  const [plan, setPlan] = useState<PlanId>("yearly");
  const selected = PLANS.find((p) => p.id === plan)!;

  function startTrial() {
    // In-app purchases need a native store integration (StoreKit / Google Play Billing, e.g. via
    // RevenueCat) and a development build — they can't run inside Expo Go. Until that's wired up,
    // be upfront rather than pretending a trial started.
    Alert.alert(
      "Purchases not available yet",
      `Subscriptions will be handled by the App Store / Google Play once in-app purchases are set up. You haven't been charged, and your ${selected.title.toLowerCase()} plan choice wasn't saved.`,
    );
  }

  function restore() {
    Alert.alert("Restore purchases", "No purchases were found on this device.");
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
        {PLANS.map((p) => {
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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

      <Pressable onPress={startTrial} style={[styles.cta, { backgroundColor: theme.primary }]}>
        <Text style={{ color: theme.primaryText, fontWeight: "900", fontSize: 16 }}>START {LEGAL.trialDays}-DAY FREE TRIAL</Text>
      </Pressable>

      <Text style={[styles.fine, { color: theme.textMuted }]}>
        {LEGAL.trialDays} days free, then {selected.price} {selected.period}. Payment is charged to your Apple ID or
        Google Play account when the trial ends. The subscription renews automatically at the same price unless
        cancelled at least 24 hours before the end of the trial or current period. Manage or cancel anytime in your
        App Store / Google Play account settings.
      </Text>

      <View style={styles.links}>
        <Pressable onPress={restore}>
          <Text style={[styles.link, { color: theme.primary }]}>Restore purchases</Text>
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
