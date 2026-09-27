import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LEGAL } from "../lib/legal/config";
import { PRIVACY_POLICY } from "../lib/legal/privacyPolicy";
import { TERMS_OF_USE } from "../lib/legal/termsOfUse";
import { useTheme } from "../lib/theme";

export default function LegalScreen() {
  const theme = useTheme();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isTerms = doc === "terms";
  const title = isTerms ? "Terms of Use" : "Privacy Policy";
  const sections = isTerms ? TERMS_OF_USE : PRIVACY_POLICY;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12.5, marginBottom: 8 }}>Effective {LEGAL.effectiveDate}</Text>
        {sections.map((s) => (
          <View key={s.heading} style={{ marginTop: 14 }}>
            <Text style={[styles.heading, { color: theme.text }]}>{s.heading}</Text>
            <Text style={[styles.body, { color: theme.text }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "800" },
  heading: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  body: { fontSize: 13.5, lineHeight: 20 },
});
