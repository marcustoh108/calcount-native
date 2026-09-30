import React from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  cancelDailyWorkoutReminder,
  requestNotificationPermission,
  scheduleDailyWorkoutReminder,
} from "../../lib/notifications";
import { useAppState } from "../../lib/store/AppStateContext";
import { useTheme } from "../../lib/theme";

export default function Reminders() {
  const theme = useTheme();
  const { profile, updateProfile } = useAppState();

  async function toggleWalkReminders(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications disabled",
          "YumBalance can't schedule reminders without notification permission. Enable it for YumBalance in your phone's system settings.",
        );
        return;
      }
    }
    updateProfile((prev) => ({ ...prev, postMealWalkReminders: value }));
  }

  async function toggleWorkoutReminders(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications disabled",
          "YumBalance can't schedule reminders without notification permission. Enable it for YumBalance in your phone's system settings.",
        );
        return;
      }
      await scheduleDailyWorkoutReminder();
    } else {
      await cancelDailyWorkoutReminder();
    }
    updateProfile((prev) => ({ ...prev, workoutReminders: value }));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: theme.textMuted, fontSize: 12.5, marginBottom: 14, lineHeight: 18 }}>
          Local, on-device reminders — nothing is sent to a server, and you can turn either off any
          time.
        </Text>

        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>🚶 Post-meal walk reminder</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 }}>
              A local notification ~20 minutes after you log a meal, suggesting a short walk.
            </Text>
          </View>
          <Switch
            value={profile.postMealWalkReminders}
            onValueChange={toggleWalkReminders}
            trackColor={{ true: theme.primary }}
          />
        </View>

        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>🏋️ Daily workout reminder</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 }}>
              A daily nudge at 6:00 PM to move and log a workout, so calories in and out stay balanced.
            </Text>
          </View>
          <Switch
            value={profile.workoutReminders}
            onValueChange={toggleWorkoutReminders}
            trackColor={{ true: theme.primary }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  row: { flexDirection: "row", alignItems: "center" },
});
