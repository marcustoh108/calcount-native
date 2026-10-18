import { type ErrorBoundaryProps, Stack } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../lib/backend/AuthContext";
import { serverMode } from "../lib/backend/supabase";
import { AppStateProvider } from "../lib/store/AppStateContext";
import { PendingScanProvider } from "../lib/store/PendingScanContext";
import { useTheme } from "../lib/theme";

function RootStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="result"
        options={{ presentation: "modal", title: "Review" }}
      />
      <Stack.Screen name="search" options={{ presentation: "modal", title: "Search food" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", title: "Choose a plan" }} />
      <Stack.Screen name="legal" options={{ title: "" }} />
      <Stack.Screen name="sign-in" options={{ presentation: "modal", title: "Sign in" }} />
      <Stack.Screen name="reset-password" options={{ presentation: "modal", title: "Reset password" }} />
    </Stack>
  );
}

/**
 * A store build must talk to YumBalance's server: without it the app would fall back to local
 * test mode, where accounts and the daily scan limit live on the phone and can be bypassed. If a
 * release build is ever made without the server settings, it stops here instead of running unsafely.
 */
function MissingServerConfig() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: theme.bg }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", textAlign: "center" }}>
        YumBalance can't start
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 10 }}>
        This version of the app is missing its server settings. Please update YumBalance from the App Store or Google
        Play, or contact connect@avencia.io.
      </Text>
    </View>
  );
}

/**
 * Shown instead of a blank or frozen screen if something unexpected goes wrong while drawing a
 * screen. The user's saved data is untouched; "Try again" redraws the app.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  console.error("Screen crashed:", error);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: theme.bg }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", textAlign: "center" }}>Something went wrong</Text>
      <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 10 }}>
        Your meals and settings are safe. Tap below to try again. If this keeps happening, contact connect@avencia.io.
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{ marginTop: 20, backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 }}
      >
        <Text style={{ color: theme.primaryText, fontWeight: "800" }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  if (!serverMode && !__DEV__) return <MissingServerConfig />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppStateProvider>
            <PendingScanProvider>
              <RootStack />
            </PendingScanProvider>
          </AppStateProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
