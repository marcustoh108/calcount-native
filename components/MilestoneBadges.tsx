import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme";

export interface Milestone {
  emoji: string;
  label: string;
  unlocked: boolean;
}

export function computeMilestones(streakDays: number, totalScans: number): Milestone[] {
  return [
    { emoji: "📸", label: "First scan", unlocked: totalScans >= 1 },
    { emoji: "🔥", label: "3-day streak", unlocked: streakDays >= 3 },
    { emoji: "🗓️", label: "7-day streak", unlocked: streakDays >= 7 },
    { emoji: "🏆", label: "30-day streak", unlocked: streakDays >= 30 },
    { emoji: "🍽️", label: "25 meals logged", unlocked: totalScans >= 25 },
    { emoji: "💯", label: "100 meals logged", unlocked: totalScans >= 100 },
  ];
}

/** Cal AI-style "trophy room" — a light milestones strip rather than a full gamification tab. */
export function MilestoneBadges({ milestones }: { milestones: Milestone[] }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {milestones.map((m) => (
        <View
          key={m.label}
          style={[
            styles.badge,
            {
              backgroundColor: m.unlocked ? `${theme.primary}1A` : theme.cardAlt,
              borderColor: m.unlocked ? theme.primary : theme.border,
            },
          ]}
        >
          <Text style={{ fontSize: 22, opacity: m.unlocked ? 1 : 0.35 }}>{m.emoji}</Text>
          <Text
            style={[
              styles.label,
              { color: m.unlocked ? theme.text : theme.textMuted, opacity: m.unlocked ? 1 : 0.6 },
            ]}
          >
            {m.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 2 },
  badge: {
    width: 92,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  label: { fontSize: 11, fontWeight: "700", textAlign: "center" },
});
