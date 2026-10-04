import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { isEmailValid, isPasswordValid, passwordChecks } from "../lib/account";
import { AuthFailure, useAuth } from "../lib/backend/AuthContext";
import { useTheme } from "../lib/theme";

type Mode = "signUp" | "signIn";

interface Props {
  initialMode?: Mode;
  /** Called once the user is signed in (new or existing account). */
  onAuthenticated: () => void | Promise<void>;
}

/** Email + password sign-up / sign-in against the YumBalance server, with email-code confirmation. */
export function AuthForm({ initialMode = "signUp", onAuthenticated }: Props) {
  const theme = useTheme();
  const { signUp, confirmSignUp, resendSignUpCode, signIn } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === "signUp";
  const checks = passwordChecks(password);
  const canSubmit = isSignUp
    ? isEmailValid(email) && isPasswordValid(password) && password === confirmPassword && agreed
    : isEmailValid(email) && password.length > 0;
  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }];

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof AuthFailure ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    run(async () => {
      if (isSignUp) {
        const outcome = await signUp(email, password);
        if (outcome === "confirm_email") {
          setAwaitingCode(true);
          return;
        }
      } else {
        await signIn(email, password);
      }
      await onAuthenticated();
    });
  }

  function confirmCode() {
    run(async () => {
      await confirmSignUp(email, code);
      await onAuthenticated();
    });
  }

  if (awaitingCode) {
    return (
      <View>
        <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          We sent a confirmation email to <Text style={{ color: theme.text, fontWeight: "700" }}>{email.trim()}</Text>. Enter the
          code from it below to finish creating your account.
        </Text>
        <Text style={[styles.label, { color: theme.text }]}>Confirmation code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="Code from the email"
          placeholderTextColor={theme.textMuted}
          style={inputStyle}
          maxLength={10}
        />
        {!!error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
        {!!notice && <Text style={[styles.notice, { color: theme.safe }]}>{notice}</Text>}
        <Pressable
          onPress={confirmCode}
          disabled={busy || code.trim().length < 6}
          style={[styles.cta, { backgroundColor: theme.primary, opacity: busy || code.trim().length < 6 ? 0.45 : 1 }]}
        >
          {busy ? <ActivityIndicator color={theme.primaryText} /> : <Text style={[styles.ctaText, { color: theme.primaryText }]}>Confirm</Text>}
        </Pressable>
        <View style={styles.links}>
          <Pressable
            onPress={() => run(async () => {
              await resendSignUpCode(email);
              setNotice("A new code is on its way.");
            })}
            disabled={busy}
          >
            <Text style={[styles.link, { color: theme.primary }]}>Send a new code</Text>
          </Pressable>
          <Pressable onPress={() => { setAwaitingCode(false); setCode(""); setError(null); }}>
            <Text style={[styles.link, { color: theme.textMuted }]}>Use a different email</Text>
          </Pressable>
        </View>
        {/* If the email contains a confirmation link instead of a code (Supabase's default template),
            the user confirms in the browser and then just signs in. */}
        <Pressable
          onPress={() =>
            run(async () => {
              await signIn(email, password);
              await onAuthenticated();
            })
          }
          disabled={busy}
          style={{ marginTop: 18, alignSelf: "center" }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 13.5, textAlign: "center" }}>
            Got a link instead of a code? Tap it, then{" "}
            <Text style={{ color: theme.primary, fontWeight: "800" }}>continue here</Text>
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.title, { color: theme.text }]}>{isSignUp ? "Create your account" : "Welcome back"}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {isSignUp
          ? "Your account keeps your scans and subscription with you on any phone."
          : "Sign in with the email and password you used before."}
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>Email</Text>
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
        <Text style={[styles.error, { color: theme.danger }]}>Enter a valid email address.</Text>
      )}

      <Text style={[styles.label, { color: theme.text }]}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={isSignUp ? "newPassword" : "password"}
        placeholder={isSignUp ? "Create a password" : "Your password"}
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
      />

      {isSignUp ? (
        <>
          <View style={{ gap: 3, marginTop: 8 }}>
            {checks.map((c) => (
              <Text key={c.label} style={{ color: c.met ? theme.safe : theme.textMuted, fontSize: 12.5 }}>
                {c.met ? "✓" : "○"} {c.label}
              </Text>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Confirm password</Text>
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
            <Text style={[styles.error, { color: theme.danger }]}>Passwords don't match.</Text>
          )}

          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={styles.agreeRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: agreed ? theme.primary : theme.border, backgroundColor: agreed ? theme.primary : "transparent" },
              ]}
            >
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
              , and I consent to YumBalance using the health details I enter and sending the meal photos and notes I scan to its AI provider, Anthropic, for analysis. I understand YumBalance is not medical advice.
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => router.push("/reset-password")} style={{ marginTop: 10, alignSelf: "flex-start" }}>
          <Text style={[styles.link, { color: theme.primary }]}>Forgot password?</Text>
        </Pressable>
      )}

      {!!error && <Text style={[styles.error, { color: theme.danger, marginTop: 14 }]}>{error}</Text>}

      <Pressable
        onPress={submit}
        disabled={!canSubmit || busy}
        style={[styles.cta, { backgroundColor: theme.primary, opacity: canSubmit && !busy ? 1 : 0.45 }]}
      >
        {busy ? (
          <ActivityIndicator color={theme.primaryText} />
        ) : (
          <Text style={[styles.ctaText, { color: theme.primaryText }]}>{isSignUp ? "Create account" : "Sign in"}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          setMode(isSignUp ? "signIn" : "signUp");
          setError(null);
        }}
        style={{ marginTop: 16, alignSelf: "center" }}
      >
        <Text style={{ color: theme.textMuted, fontSize: 14 }}>
          {isSignUp ? "Already have an account? " : "New to YumBalance? "}
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{isSignUp ? "Sign in" : "Create an account"}</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14.5, lineHeight: 21, marginBottom: 4 },
  label: { fontSize: 15, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { fontSize: 12.5, marginTop: 6 },
  notice: { fontSize: 12.5, marginTop: 6 },
  cta: { marginTop: 24, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontWeight: "800", fontSize: 16 },
  links: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginTop: 16 },
  link: { fontSize: 14, fontWeight: "700" },
  agreeRow: { flexDirection: "row", gap: 10, marginTop: 20, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
});
