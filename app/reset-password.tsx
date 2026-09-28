import { router } from "expo-router";
import React, { useState } from "react";
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

import { isEmailValid, isPasswordValid, passwordChecks } from "../lib/account";
import { AuthFailure, useAuth } from "../lib/backend/AuthContext";
import { useTheme } from "../lib/theme";

/** Password reset by emailed code — no web page or deep link needed. */
export default function ResetPassword() {
  const theme = useTheme();
  const { sendPasswordResetCode, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }];
  const canReset = code.trim().length >= 6 && isPasswordValid(password);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof AuthFailure ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Reset your password</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {codeSent
            ? `Enter the code we emailed to ${email.trim()} and choose a new password.`
            : "Enter your account email and we'll send you a reset code."}
        </Text>

        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          editable={!codeSent}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor={theme.textMuted}
          style={[inputStyle, codeSent && { opacity: 0.6 }]}
        />

        {codeSent && (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Reset code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              placeholder="6-digit code"
              placeholderTextColor={theme.textMuted}
              maxLength={10}
              style={inputStyle}
            />
            <Text style={[styles.label, { color: theme.text }]}>New password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              placeholder="Create a new password"
              placeholderTextColor={theme.textMuted}
              style={inputStyle}
            />
            <View style={{ gap: 3, marginTop: 8 }}>
              {passwordChecks(password).map((c) => (
                <Text key={c.label} style={{ color: c.met ? theme.safe : theme.textMuted, fontSize: 12.5 }}>
                  {c.met ? "✓" : "○"} {c.label}
                </Text>
              ))}
            </View>
          </>
        )}

        {!!error && <Text style={{ color: theme.danger, fontSize: 12.5, marginTop: 14 }}>{error}</Text>}

        {codeSent ? (
          <Pressable
            onPress={() =>
              run(async () => {
                await resetPassword(email, code, password);
                Alert.alert("Password updated", "You're signed in with your new password.");
                router.back();
              })
            }
            disabled={!canReset || busy}
            style={[styles.cta, { backgroundColor: theme.primary, opacity: canReset && !busy ? 1 : 0.45 }]}
          >
            {busy ? <ActivityIndicator color={theme.primaryText} /> : <Text style={[styles.ctaText, { color: theme.primaryText }]}>Set new password</Text>}
          </Pressable>
        ) : (
          <Pressable
            onPress={() =>
              run(async () => {
                await sendPasswordResetCode(email);
                setCodeSent(true);
              })
            }
            disabled={!isEmailValid(email) || busy}
            style={[styles.cta, { backgroundColor: theme.primary, opacity: isEmailValid(email) && !busy ? 1 : 0.45 }]}
          >
            {busy ? <ActivityIndicator color={theme.primaryText} /> : <Text style={[styles.ctaText, { color: theme.primaryText }]}>Send reset code</Text>}
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14.5, lineHeight: 21 },
  label: { fontSize: 15, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  cta: { marginTop: 24, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontWeight: "800", fontSize: 16 },
});
