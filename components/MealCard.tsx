import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";
import { FoodEntry } from "../lib/types";
import { formatTime } from "../lib/utils/date";
import { round, scaledNutrients } from "../lib/utils/nutrition";
import { SafetyBadgeRow } from "./SafetyBadge";

interface Props {
  entry: FoodEntry;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function MealCard({ entry, selected, selectionMode, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const nutrients = scaledNutrients(entry);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: selected ? theme.primary : theme.border },
      ]}
    >
      {selectionMode && (
        <View
          style={[
            styles.checkbox,
            { borderColor: theme.primary, backgroundColor: selected ? theme.primary : "transparent" },
          ]}
        />
      )}
      {entry.photoUri ? (
        <Image source={{ uri: entry.photoUri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.cardAlt }]}>
          <Text style={{ color: theme.textMuted, fontSize: 18 }}>🍽️</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {entry.analysis.foodName}
            {entry.servings !== 1 ? ` ×${entry.servings}` : ""}
          </Text>
          <Text style={[styles.time, { color: theme.textMuted }]}>{formatTime(entry.createdAt)}</Text>
        </View>
        <Text style={[styles.macros, { color: theme.textMuted }]}>
          {round(nutrients.calories)} kcal · P{round(nutrients.proteinG)} · C{round(nutrients.carbsG)} · F
          {round(nutrients.fatG)}
        </Text>
        <SafetyBadgeRow assessments={entry.safety} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 10,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 4,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  time: { fontSize: 12 },
  macros: { fontSize: 12.5 },
});
