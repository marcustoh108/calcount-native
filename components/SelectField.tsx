import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../lib/theme";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string | null;
}

interface Props {
  label?: string;
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  searchPlaceholder?: string;
}

/** A dropdown-style field that opens a searchable full-screen list — fits long lists like every country or language. */
export function SelectField({ label, placeholder, value, options, onChange, searchPlaceholder = "Search" }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <View>
      {!!label && <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: theme.border, backgroundColor: theme.card }]}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selected?.label ?? placeholder}` : undefined}
      >
        <Text style={{ color: selected ? theme.text : theme.textMuted, fontSize: 14, flex: 1 }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>▼</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{label ?? placeholder}</Text>
            <Pressable onPress={close} hitSlop={10}>
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 15 }}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.textMuted}
            autoCorrect={false}
            style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />
          <FlatList
            data={filtered}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={30}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  style={[styles.option, { borderBottomColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: isSelected ? "700" : "400" }}>
                      {item.label}
                    </Text>
                    {!!item.sublabel && <Text style={{ color: theme.textMuted, fontSize: 12.5 }}>{item.sublabel}</Text>}
                  </View>
                  {isSelected && <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "800" }}>✓</Text>}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: theme.textMuted, textAlign: "center", marginTop: 30 }}>No matches</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  option: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
