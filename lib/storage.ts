import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import { supportedLanguageOrDefault } from "./data/languages";
import {
  DEFAULT_HEALTH_PROFILE,
  DailyWaterLog,
  ExerciseEntry,
  FoodEntry,
  HealthProfile,
  LocalAccount,
  SavedFood,
  WeightEntry,
} from "./types";

const KEYS = {
  healthProfile: "calcount:health-profile",
  foodLog: "calcount:food-log",
  savedFoods: "calcount:saved-foods",
  waterLog: "calcount:water-log",
  streak: "calcount:streak",
  exerciseLog: "calcount:exercise-log",
  weightLog: "calcount:weight-log",
} as const;

/** Where scan usage lived before it moved to the keychain; read once for migration. */
const LEGACY_SCAN_USAGE_KEY = "calcount:scan-usage";

/**
 * Kept in the keychain and deliberately NOT removed by clearAllStorage, so deleting the account
 * (or, on iOS, reinstalling the app) can't reset the daily scan limit.
 */
const SCAN_USAGE_SECURE_KEY = "calcount-scan-usage";

/** A random ID for this install, sent with server scans so the limit also applies per phone. Never cleared. */
const DEVICE_ID_SECURE_KEY = "calcount-device-id";

const SECURE_KEYS = {
  anthropicApiKey: "calcount-anthropic-api-key",
  account: "calcount-account",
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const HealthProfileStorage = {
  load: async (): Promise<HealthProfile> => {
    const profile = { ...DEFAULT_HEALTH_PROFILE, ...(await readJson<Partial<HealthProfile>>(KEYS.healthProfile, {})) };
    return { ...profile, language: supportedLanguageOrDefault(profile.language) };
  },
  save: (profile: HealthProfile) => writeJson(KEYS.healthProfile, profile),
};

export const FoodLogStorage = {
  load: () => readJson<FoodEntry[]>(KEYS.foodLog, []),
  save: (entries: FoodEntry[]) => writeJson(KEYS.foodLog, entries),
};

export const ExerciseLogStorage = {
  load: () => readJson<ExerciseEntry[]>(KEYS.exerciseLog, []),
  save: (entries: ExerciseEntry[]) => writeJson(KEYS.exerciseLog, entries),
};

export const SavedFoodsStorage = {
  load: () => readJson<SavedFood[]>(KEYS.savedFoods, []),
  save: (foods: SavedFood[]) => writeJson(KEYS.savedFoods, foods),
};

export const WaterLogStorage = {
  load: () => readJson<DailyWaterLog[]>(KEYS.waterLog, []),
  save: (logs: DailyWaterLog[]) => writeJson(KEYS.waterLog, logs),
};

export const WeightLogStorage = {
  load: () => readJson<WeightEntry[]>(KEYS.weightLog, []),
  save: (entries: WeightEntry[]) => writeJson(KEYS.weightLog, entries),
};

export interface ScanUsage {
  date: string; // yyyy-mm-dd
  count: number;
}

export const ScanUsageStorage = {
  load: async (): Promise<ScanUsage | null> => {
    try {
      const raw = await SecureStore.getItemAsync(SCAN_USAGE_SECURE_KEY);
      if (raw) return JSON.parse(raw) as ScanUsage;
    } catch {
      // Fall through to the legacy copy.
    }
    return readJson<ScanUsage | null>(LEGACY_SCAN_USAGE_KEY, null);
  },
  save: async (usage: ScanUsage) => {
    await SecureStore.setItemAsync(SCAN_USAGE_SECURE_KEY, JSON.stringify(usage));
    await AsyncStorage.removeItem(LEGACY_SCAN_USAGE_KEY);
  },
};

/**
 * The Anthropic API key is stored in the OS keychain (SecureStore), never in
 * AsyncStorage, and is only ever sent directly from this device to
 * api.anthropic.com over HTTPS. See lib/ai/foodRecognition.ts.
 */
export const ApiKeyStorage = {
  load: () => SecureStore.getItemAsync(SECURE_KEYS.anthropicApiKey),
  save: (key: string) => SecureStore.setItemAsync(SECURE_KEYS.anthropicApiKey, key),
  clear: () => SecureStore.deleteItemAsync(SECURE_KEYS.anthropicApiKey),
};

let cachedDeviceId: string | null = null;

export const DeviceIdStorage = {
  get: async (): Promise<string> => {
    if (cachedDeviceId) return cachedDeviceId;
    let id = await SecureStore.getItemAsync(DEVICE_ID_SECURE_KEY);
    if (!id) {
      id = Crypto.randomUUID();
      await SecureStore.setItemAsync(DEVICE_ID_SECURE_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  },
};

export const AccountStorage = {
  load: async (): Promise<LocalAccount | null> => {
    const raw = await SecureStore.getItemAsync(SECURE_KEYS.account);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocalAccount;
    } catch {
      return null;
    }
  },
  save: (account: LocalAccount) => SecureStore.setItemAsync(SECURE_KEYS.account, JSON.stringify(account)),
};

/**
 * Wipes everything CalCount has stored on this device — used by "Delete account & data".
 * The daily scan count and device ID are intentionally kept (see SCAN_USAGE_SECURE_KEY).
 */
export async function clearAllStorage(): Promise<void> {
  await AsyncStorage.multiRemove([...Object.values(KEYS), LEGACY_SCAN_USAGE_KEY]);
  await Promise.all(Object.values(SECURE_KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
