import React from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../lib/theme";

interface VideoCategory {
  emoji: string;
  title: string;
  description: string;
  searchQuery: string;
}

/**
 * Links out to YouTube search results by workout type rather than embedding specific videos —
 * this avoids fabricating video IDs/channel links that can't be verified, and lets each person
 * pick an instructor and style that suits them from real, current results.
 */
const CATEGORIES: VideoCategory[] = [
  { emoji: "🔥", title: "Full-body HIIT", description: "High-intensity, no equipment needed", searchQuery: "full body HIIT workout no equipment" },
  { emoji: "🧘", title: "Beginner yoga", description: "Flexibility and gentle strength", searchQuery: "beginner yoga full body flow" },
  { emoji: "🚶", title: "Low-impact cardio", description: "Easy on the joints", searchQuery: "low impact cardio workout for beginners" },
  { emoji: "🏋️", title: "Strength basics", description: "Home strength training fundamentals", searchQuery: "beginner strength training workout at home" },
  { emoji: "🏊", title: "Swimming technique", description: "Improve form and efficiency", searchQuery: "swimming technique tutorial for beginners" },
  { emoji: "💃", title: "Dance cardio", description: "Fun, high-energy cardio", searchQuery: "dance cardio workout for beginners" },
  { emoji: "🌀", title: "Stretching & mobility", description: "Recovery and flexibility work", searchQuery: "full body stretching and mobility routine" },
  { emoji: "🪑", title: "Chair / seated exercise", description: "Low-impact, joint-friendly options", searchQuery: "seated chair exercise workout for beginners" },
];

export default function WorkoutVideos() {
  const theme = useTheme();

  function openCategory(category: VideoCategory) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(category.searchQuery)}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["bottom"]}>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(c) => c.title}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text style={{ color: theme.textMuted, fontSize: 12.5, marginBottom: 14, lineHeight: 18 }}>
            Opens real, current YouTube results for each style so you can pick an instructor and pace
            that works for you.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openCategory(item)}
            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12.5 }}>{item.description}</Text>
            </View>
            <Text style={{ color: theme.primary, fontWeight: "700" }}>›</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  emoji: { fontSize: 24 },
  rowTitle: { fontSize: 15, fontWeight: "700" },
});
