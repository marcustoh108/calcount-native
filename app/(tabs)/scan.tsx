import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "../../components/Chip";
import { analyzeFoodPhoto, FoodRecognitionError } from "../../lib/ai/foodRecognition";
import { mockAnalyzeFoodPhoto } from "../../lib/ai/mockAnalyzer";
import { ApiKeyStorage } from "../../lib/storage";
import { useAppState } from "../../lib/store/AppStateContext";
import { usePendingScan } from "../../lib/store/PendingScanContext";
import { useTheme } from "../../lib/theme";
import { MEAL_TYPES, MealType } from "../../lib/types";
import { suggestMealTypeForNow } from "../../lib/utils/date";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function Scan() {
  const theme = useTheme();
  const { hasApiKey } = useAppState();
  const { setPending } = usePendingScan();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mealType, setMealType] = useState<MealType>(suggestMealTypeForNow());
  const [sharedPlate, setSharedPlate] = useState(false);
  const [contextNote, setContextNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  async function runAnalysis(photoUri: string | null, base64: string | null, mimeType: "image/jpeg") {
    setAnalyzing(true);
    try {
      const note = [sharedPlate ? "This is a restaurant or shared plate; portions are uncertain." : null, contextNote]
        .filter(Boolean)
        .join(" ");

      const apiKey = await ApiKeyStorage.load();
      const analysis =
        apiKey && base64
          ? await analyzeFoodPhoto({ apiKey, base64, mimeType, contextNote: note })
          : await mockAnalyzeFoodPhoto();

      setPending({ photoUri, analysis, mealType });
      router.push("/result");
    } catch (err) {
      const message = err instanceof FoodRecognitionError ? err.message : "Something went wrong analyzing that photo.";
      Alert.alert("Couldn't analyze photo", message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCapture() {
    if (!cameraRef.current || analyzing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (!photo) return;
      await runAnalysis(photo.uri, photo.base64 ?? null, "image/jpeg");
    } catch {
      Alert.alert("Camera error", "Couldn't take that photo. Try again.");
    }
  }

  async function handlePickFromGallery() {
    if (analyzing) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await runAnalysis(asset.uri, asset.base64 ?? null, "image/jpeg");
  }

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.bg, padding: 24 }]}>
        <Text style={[styles.permTitle, { color: theme.text }]}>Camera access needed</Text>
        <Text style={[styles.permBody, { color: theme.textMuted }]}>
          CalCount needs your camera to identify food and estimate calories. Your photos stay on your
          device unless you choose to analyze them.
        </Text>
        <Pressable onPress={requestPermission} style={[styles.cta, { backgroundColor: theme.primary }]}>
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Grant camera access</Text>
        </Pressable>
        <Pressable onPress={handlePickFromGallery} style={styles.linkBtn}>
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Use a photo from my library instead</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={styles.overlaySafe} edges={["top"]}>
        {!hasApiKey && (
          <View style={[styles.demoBanner, { backgroundColor: `${theme.caution}CC` }]}>
            <Text style={styles.demoBannerText}>Demo mode — add an API key in Settings for real scans</Text>
          </View>
        )}
      </SafeAreaView>

      <View style={styles.bottomSheet}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mealRow}
        >
          {MEAL_TYPES.map((m) => (
            <Chip key={m} label={MEAL_LABELS[m]} selected={mealType === m} onPress={() => setMealType(m)} />
          ))}
          <Chip label={sharedPlate ? "Shared/restaurant plate ✓" : "Shared/restaurant plate?"} selected={sharedPlate} onPress={() => setSharedPlate((v) => !v)} />
        </ScrollView>

        <TextInput
          value={contextNote}
          onChangeText={setContextNote}
          placeholder="Optional note: e.g. 'I only ate half' or 'no dressing'"
          placeholderTextColor="rgba(255,255,255,0.5)"
          style={styles.noteInput}
        />

        <View style={styles.actionsRow}>
          <Pressable onPress={handlePickFromGallery} style={styles.galleryBtn} disabled={analyzing}>
            <Text style={styles.galleryBtnText}>🖼️</Text>
          </Pressable>

          <Pressable onPress={handleCapture} style={styles.shutterOuter} disabled={analyzing}>
            {analyzing ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
          </Pressable>

          <View style={{ width: 52 }} />
        </View>
        {analyzing && <Text style={styles.analyzingText}>Analyzing…</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  permTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  permBody: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  cta: { borderRadius: 12, paddingHorizontal: 22, paddingVertical: 13 },
  linkBtn: { marginTop: 16 },
  overlaySafe: { position: "absolute", top: 0, left: 0, right: 0 },
  demoBanner: { marginHorizontal: 16, marginTop: 8, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  demoBannerText: { color: "#1A1300", fontWeight: "700", fontSize: 12.5, textAlign: "center" },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    gap: 10,
  },
  mealRow: { gap: 8, paddingRight: 8 },
  noteInput: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  actionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  galleryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryBtnText: { fontSize: 22 },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" },
  analyzingText: { color: "#fff", textAlign: "center", fontSize: 12.5 },
});
