import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
import { lookupBarcode, OpenFoodFactsError } from "../../lib/api/openFoodFacts";
import { fetchScanUsage, scanBarcodeOnServer, scanPhotoOnServer, ServerScanError } from "../../lib/backend/api";
import { useAuth } from "../../lib/backend/AuthContext";
import { serverMode } from "../../lib/backend/supabase";
import { ApiKeyStorage } from "../../lib/storage";
import { DAILY_SCAN_LIMIT, useAppState } from "../../lib/store/AppStateContext";
import { usePendingScan } from "../../lib/store/PendingScanContext";
import { useTheme } from "../../lib/theme";
import { MEAL_TYPES, MealType } from "../../lib/types";
import { suggestMealTypeForNow } from "../../lib/utils/date";
import { PreparedPhoto, preparePhotoForAnalysis } from "../../lib/utils/photo";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type ScanMode = "photo" | "barcode";

export default function Scan() {
  const theme = useTheme();
  const { hasApiKey, scansToday, recordScan, syncScanUsage } = useAppState();
  const { email } = useAuth();
  const needsSignIn = serverMode && !email;
  const scansLeft = Math.max(0, DAILY_SCAN_LIMIT - scansToday);
  const limitReached = scansLeft === 0;
  const { setPending } = usePendingScan();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<ScanMode>("photo");
  const [mealType, setMealType] = useState<MealType>(suggestMealTypeForNow());
  const [sharedPlate, setSharedPlate] = useState(false);
  const [contextNote, setContextNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const lastBarcodeRef = useRef<string | null>(null);

  // Server mode: always show the server's count of today's scans when this tab opens.
  useFocusEffect(
    useCallback(() => {
      if (!serverMode || !email) return;
      fetchScanUsage()
        .then((usage) => syncScanUsage(usage.used))
        .catch(() => {
          // Offline or server unavailable: keep the last known count; scans are still checked server-side.
        });
    }, [email, syncScanUsage]),
  );

  function showLimitReached(message?: string) {
    Alert.alert(
      "Daily scan limit reached",
      message ??
        `You've used all ${DAILY_SCAN_LIMIT} scans for today. Your scans reset at midnight — you can still log food with Search in the meantime.`,
    );
  }

  function promptSignIn() {
    Alert.alert("Sign in to scan", "Scans are linked to your YumBalance account. Sign in or create an account to continue.", [
      { text: "Not now", style: "cancel" },
      { text: "Sign in", onPress: () => router.push("/sign-in") },
    ]);
  }

  /** Returns true when a scan may start; otherwise explains why not. */
  function canStartScan(): boolean {
    if (needsSignIn) {
      promptSignIn();
      return false;
    }
    if (limitReached) {
      showLimitReached();
      return false;
    }
    return true;
  }

  async function handleServerError(err: unknown, title: string) {
    if (!(err instanceof ServerScanError)) {
      Alert.alert(title, "Something went wrong. Please try again.");
      return;
    }
    if (err.used != null) await syncScanUsage(err.used);
    if (err.code === "limit_reached") showLimitReached(err.message);
    else if (err.code === "unauthorized") promptSignIn();
    else {
      // In Expo Go / dev builds, show the server's technical reason so problems can be diagnosed.
      const message = __DEV__ && err.detail ? `${err.message}\n\n(${err.detail})` : err.message;
      Alert.alert(err.code === "not_found" ? "Not found" : title, message);
    }
  }

  async function runAnalysis(photoUri: string | null, base64: string | null, mimeType: "image/jpeg") {
    if (!canStartScan()) return;
    const note = [sharedPlate ? "This is a restaurant or shared plate; portions are uncertain." : null, contextNote]
      .filter(Boolean)
      .join(" ");

    if (serverMode) {
      if (!base64) {
        Alert.alert("Couldn't analyze photo", "That photo couldn't be read. Try again.");
        return;
      }
      setAnalyzing(true);
      try {
        const result = await scanPhotoOnServer({ base64, mimeType, contextNote: note });
        await syncScanUsage(result.used);
        setPending({ photoUri, analysis: result.analysis, mealType });
        router.push("/result");
      } catch (err) {
        await handleServerError(err, "Couldn't analyze photo");
      } finally {
        setAnalyzing(false);
      }
      return;
    }

    setAnalyzing(true);
    try {

      const apiKey = await ApiKeyStorage.load();
      const analysis =
        apiKey && base64
          ? await analyzeFoodPhoto({ apiKey, base64, mimeType, contextNote: note })
          : await mockAnalyzeFoodPhoto();

      await recordScan();
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
    if (!canStartScan()) return;
    let prepared: PreparedPhoto;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      prepared = await preparePhotoForAnalysis(photo.uri, photo.width, photo.height);
    } catch {
      Alert.alert("Camera error", "Couldn't take that photo. Try again.");
      return;
    }
    await runAnalysis(prepared.uri, prepared.base64, "image/jpeg");
  }

  async function handleBarcodeScanned(barcode: string) {
    if (analyzing || lastBarcodeRef.current === barcode) return;
    lastBarcodeRef.current = barcode;
    if (!canStartScan()) {
      setTimeout(() => {
        lastBarcodeRef.current = null;
      }, 4000);
      return;
    }
    setAnalyzing(true);

    if (serverMode) {
      try {
        const result = await scanBarcodeOnServer(barcode);
        await syncScanUsage(result.used);
        setPending({ photoUri: null, analysis: result.analysis, mealType });
        router.push("/result");
      } catch (err) {
        await handleServerError(err, "Lookup failed");
      } finally {
        setAnalyzing(false);
        setTimeout(() => {
          lastBarcodeRef.current = null;
        }, 2000);
      }
      return;
    }

    try {
      const analysis = await lookupBarcode(barcode);
      if (!analysis) {
        Alert.alert("Not found", "That barcode isn't in the food database. Try Search or a photo instead.");
        return;
      }
      await recordScan();
      setPending({ photoUri: null, analysis, mealType });
      router.push("/result");
    } catch (err) {
      Alert.alert("Lookup failed", err instanceof OpenFoodFactsError ? err.message : "Couldn't look up that barcode.");
    } finally {
      setAnalyzing(false);
      setTimeout(() => {
        lastBarcodeRef.current = null;
      }, 2000);
    }
  }

  async function handlePickFromGallery() {
    if (analyzing) return;
    if (!canStartScan()) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    let prepared: PreparedPhoto;
    try {
      prepared = await preparePhotoForAnalysis(asset.uri, asset.width, asset.height);
    } catch {
      Alert.alert("Couldn't open photo", "That photo couldn't be opened. Try a different one.");
      return;
    }
    await runAnalysis(prepared.uri, prepared.base64, "image/jpeg");
  }

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.bg, padding: 24 }]}>
        <Text style={[styles.permTitle, { color: theme.text }]}>Camera access needed</Text>
        <Text style={[styles.permBody, { color: theme.textMuted }]}>
          YumBalance needs your camera to identify food and estimate calories. Your photos stay on your
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
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
        }}
        onBarcodeScanned={mode === "barcode" ? (result) => handleBarcodeScanned(result.data) : undefined}
      />

      <SafeAreaView style={styles.overlaySafe} edges={["top"]}>
        {needsSignIn ? (
          <Pressable onPress={() => router.push("/sign-in")} style={[styles.demoBanner, { backgroundColor: `${theme.caution}CC` }]}>
            <Text style={styles.demoBannerText}>Sign in to scan — tap here</Text>
          </Pressable>
        ) : (
          !serverMode &&
          !hasApiKey && (
            <View style={[styles.demoBanner, { backgroundColor: `${theme.caution}CC` }]}>
              <Text style={styles.demoBannerText}>Demo mode — add an API key in Settings for real scans</Text>
            </View>
          )
        )}
        <View style={styles.modeRow}>
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => setMode("photo")}
              style={[styles.modeBtn, mode === "photo" && styles.modeBtnActive]}
            >
              <Text style={styles.modeBtnText}>📷 Photo</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("barcode")}
              style={[styles.modeBtn, mode === "barcode" && styles.modeBtnActive]}
            >
              <Text style={styles.modeBtnText}>🔖 Barcode</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => router.push("/search")} style={styles.searchBtn}>
            <Text style={styles.modeBtnText}>🔍 Search</Text>
          </Pressable>
        </View>
        <View style={[styles.limitPill, limitReached && { backgroundColor: `${theme.avoid}E6` }]}>
          <Text style={styles.limitPillText}>
            {limitReached ? `Daily limit reached · ${DAILY_SCAN_LIMIT}/${DAILY_SCAN_LIMIT} scans used` : `${scansLeft} of ${DAILY_SCAN_LIMIT} scans left today`}
          </Text>
        </View>
        {mode === "barcode" && (
          <Text style={styles.barcodeHint}>Point the camera at a barcode — it'll look up automatically.</Text>
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
          {mode === "photo" && (
            <Chip
              label={sharedPlate ? "Shared/restaurant plate ✓" : "Shared/restaurant plate?"}
              selected={sharedPlate}
              onPress={() => setSharedPlate((v) => !v)}
            />
          )}
        </ScrollView>

        {mode === "photo" && (
          <TextInput
            value={contextNote}
            onChangeText={setContextNote}
            placeholder="Optional note: e.g. 'I only ate half' or 'no dressing'"
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.noteInput}
          />
        )}

        {mode === "photo" ? (
          <View style={styles.actionsRow}>
            <Pressable onPress={handlePickFromGallery} style={styles.galleryBtn} disabled={analyzing}>
              <Text style={styles.galleryBtnText}>🖼️</Text>
            </Pressable>

            <Pressable
              onPress={handleCapture}
              style={[styles.shutterOuter, limitReached && { opacity: 0.35 }]}
              disabled={analyzing}
              accessibilityLabel={limitReached ? "Daily scan limit reached" : "Take photo"}
            >
              {analyzing ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
            </Pressable>

            <View style={{ width: 52 }} />
          </View>
        ) : (
          analyzing && <ActivityIndicator color="#fff" style={{ marginVertical: 10 }} />
        )}
        {analyzing && <Text style={styles.analyzingText}>{mode === "barcode" ? "Looking up…" : "Analyzing…"}</Text>}
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
  modeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 10 },
  modeToggle: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, padding: 3, gap: 2 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  modeBtnActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  modeBtnText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  searchBtn: { backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  limitPill: {
    alignSelf: "center",
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  limitPillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  barcodeHint: {
    color: "#fff",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 14,
    marginHorizontal: 30,
  },
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
