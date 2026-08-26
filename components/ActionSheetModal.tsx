import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}

export function ActionSheetModal({ visible, title, actions, onClose }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          {!!title && <Text style={[styles.title, { color: theme.textMuted }]}>{title}</Text>}
          {actions.map((a, idx) => (
            <Pressable
              key={idx}
              onPress={a.onPress}
              style={[styles.row, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
            >
              <Text style={{ color: a.destructive ? theme.danger : theme.text, fontWeight: "600", fontSize: 15.5 }}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 30, paddingTop: 6 },
  title: { fontSize: 12, textAlign: "center", paddingVertical: 10 },
  row: { paddingVertical: 15, alignItems: "center" },
});
