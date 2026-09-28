import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OpenFoodFactsError, searchFoodByName } from "../lib/api/openFoodFacts";
import { useAppState } from "../lib/store/AppStateContext";
import { usePendingScan } from "../lib/store/PendingScanContext";
import { useTheme } from "../lib/theme";
import { FoodAnalysis } from "../lib/types";
import { suggestMealTypeForNow } from "../lib/utils/date";
import { round } from "../lib/utils/nutrition";

export default function Search() {
  const theme = useTheme();
  const { savedFoods } = useAppState();
  const { setPending } = usePendingScan();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodAnalysis[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchingSaved = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return savedFoods.filter((f) => f.name.toLowerCase().includes(q));
  }, [query, savedFoods]);

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const found = await searchFoodByName(trimmed);
      setResults(found);
    } catch (err) {
      setError(err instanceof OpenFoodFactsError ? err.message : "Search failed. Try again.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function pickAnalysis(analysis: FoodAnalysis) {
    setPending({ photoUri: null, analysis, mealType: suggestMealTypeForNow() });
    router.push("/result");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["bottom"]}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={runSearch}
          placeholder="Search a food, e.g. 'greek yogurt'"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          returnKeyType="search"
          autoFocus
        />
        <Pressable onPress={runSearch} style={[styles.searchBtn, { backgroundColor: theme.primary }]}>
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Search</Text>
        </Pressable>
      </View>

      <FlatList
        data={results ?? []}
        keyExtractor={(_, idx) => `off-${idx}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {matchingSaved.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>My foods</Text>
                {matchingSaved.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => pickAnalysis(f.analysis)}
                    style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.text, fontWeight: "700" }}>{f.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                      {round(f.analysis.nutrients.calories)} kcal
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />}
            {!!error && <Text style={{ color: theme.danger, marginTop: 12 }}>{error}</Text>}
            {results != null && (
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Food database results</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && results != null ? (
            <Text style={{ color: theme.textMuted, textAlign: "center", marginTop: 12 }}>
              No matches found. Try a simpler search term. The database covers packaged foods, so for
              restaurant or home-cooked dishes, scan a photo instead.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pickAnalysis(item)}
            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontWeight: "700" }} numberOfLines={1}>
              {item.foodName}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {round(item.nutrients.calories)} kcal · {item.portionDescription}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchRow: { flexDirection: "row", gap: 8, padding: 16 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  searchBtn: { borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 8, marginTop: 4 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, gap: 3 },
});
