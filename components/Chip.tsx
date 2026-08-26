import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../lib/theme";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.cardAlt,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: "600", fontSize: 13.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
