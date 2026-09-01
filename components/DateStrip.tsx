import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { todayKey } from "../lib/utils/date";

interface Props {
  selectedKey: string;
  loggedKeys: Set<string>;
  onSelect: (dateKey: string) => void;
  days?: number;
}

function buildDays(count: number): { key: string; date: Date }[] {
  const out: { key: string; date: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ key: todayKey(d), date: d });
  }
  return out;
}

/** Cal AI-style horizontal date strip: quick day switching with a dot marking days that have entries. */
export function DateStrip({ selectedKey, loggedKeys, onSelect, days = 14 }: Props) {
  const theme = useTheme();
  const items = useMemo(() => buildDays(days), [days]);
  const today = todayKey();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map(({ key, date }) => {
        const selected = key === selectedKey;
        const isToday = key === today;
        const logged = loggedKeys.has(key);
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.card,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.dow, { color: selected ? theme.primaryText : theme.textMuted }]}>
              {date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </Text>
            <Text style={[styles.day, { color: selected ? theme.primaryText : theme.text }]}>{date.getDate()}</Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: logged ? (selected ? theme.primaryText : theme.primary) : "transparent",
                  opacity: isToday && !logged ? 0.4 : 1,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 2, paddingVertical: 2 },
  chip: {
    width: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 4,
  },
  dow: { fontSize: 11, fontWeight: "700" },
  day: { fontSize: 15, fontWeight: "800" },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
