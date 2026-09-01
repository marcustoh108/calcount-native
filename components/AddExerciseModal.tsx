import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../lib/theme";
import { QUICK_ACTIVITIES } from "../lib/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onLog: (activityName: string, caloriesBurned: number) => void;
}

/**
 * Manual exercise logging — a substitute for Apple Health / Google Fit auto-sync.
 * Real wearable sync needs a custom native build (outside Expo Go); this gets the
 * same "exercise adds back to your calorie budget" effect without that dependency.
 */
export function AddExerciseModal({ visible, onClose, onLog }: Props) {
  const theme = useTheme();
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [minutes, setMinutes] = useState("30");

  function logQuick(name: string, caloriesPer30Min: number) {
    const mins = Number(minutes) || 30;
    const calories = Math.round((caloriesPer30Min * mins) / 30);
    onLog(name, calories);
    reset();
  }

  function logCustom() {
    const calories = Number(customCalories);
    if (!customName.trim() || !Number.isFinite(calories) || calories <= 0) return;
    onLog(customName.trim(), Math.round(calories));
    reset();
  }

  function reset() {
    setCustomName("");
    setCustomCalories("");
    setMinutes("30");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Log exercise</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Calories burned are added back to today's remaining budget, the same way a wearable sync would.
          </Text>

          <View style={styles.minutesRow}>
            <Text style={{ color: theme.text, fontWeight: "600" }}>Duration</Text>
            <TextInput
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              style={[styles.minutesInput, { color: theme.text, borderColor: theme.border }]}
            />
            <Text style={{ color: theme.textMuted }}>min</Text>
          </View>

          <ScrollView contentContainerStyle={styles.quickGrid}>
            {QUICK_ACTIVITIES.map((a) => (
              <Pressable
                key={a.name}
                onPress={() => logQuick(a.name, a.caloriesPer30Min)}
                style={[styles.quickChip, { borderColor: theme.border, backgroundColor: theme.cardAlt }]}
              >
                <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                <Text style={{ color: theme.text, fontWeight: "600", fontSize: 12.5, marginTop: 4 }}>{a.name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                  ~{Math.round((a.caloriesPer30Min * (Number(minutes) || 30)) / 30)} kcal
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.subtitle, { color: theme.textMuted, marginTop: 14 }]}>Or enter your own:</Text>
          <View style={styles.customRow}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Activity"
              placeholderTextColor={theme.textMuted}
              style={[styles.customInput, { flex: 1.4, color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              value={customCalories}
              onChangeText={setCustomCalories}
              placeholder="kcal"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              style={[styles.customInput, { flex: 1, color: theme.text, borderColor: theme.border }]}
            />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.actionBtn}>
              <Text style={{ color: theme.textMuted, fontWeight: "600" }}>Close</Text>
            </Pressable>
            <Pressable onPress={logCustom} style={styles.actionBtn}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>Log custom</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", borderRadius: 16, padding: 18, maxHeight: "85%" },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 12.5, marginTop: 4, marginBottom: 10, lineHeight: 17 },
  minutesRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  minutesInput: { width: 60, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, textAlign: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickChip: { width: "31%", borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  customRow: { flexDirection: "row", gap: 8 },
  customInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 20, marginTop: 16 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 4 },
});
