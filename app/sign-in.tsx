import { router } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { AuthForm } from "../components/AuthForm";
import { useTheme } from "../lib/theme";

/** Sign in (or create an account) after onboarding — e.g. from Settings or the Scan screen. */
export default function SignIn() {
  const theme = useTheme();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <AuthForm initialMode="signIn" onAuthenticated={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
