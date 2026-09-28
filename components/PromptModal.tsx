import React, { useEffect, useState } from "react";
import { KeyboardTypeOptions, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../lib/theme";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  initialValue?: string;
  confirmLabel?: string;
  keyboardType?: KeyboardTypeOptions;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function PromptModal({
  visible,
  title,
  message,
  initialValue,
  confirmLabel = "Save",
  keyboardType,
  onCancel,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    if (visible) setValue(initialValue ?? "");
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {!!message && <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>}
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            keyboardType={keyboardType}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.actionBtn}>
              <Text style={{ color: theme.textMuted, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(value)} style={styles.actionBtn}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", borderRadius: 16, padding: 18 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  message: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 20 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 4 },
});
