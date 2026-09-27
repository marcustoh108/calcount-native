import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

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
  scanUsage: "calcount:scan-usage",
} as const;

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
  load: async () => ({
    ...DEFAULT_HEALTH_PROFILE,
    ...(await readJson<Partial<HealthProfile>>(KEYS.healthProfile, {})),
  }),
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
  load: () => readJson<ScanUsage | null>(KEYS.scanUsage, null),
  save: (usage: ScanUsage) => writeJson(KEYS.scanUsage, usage),
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

/** Wipes everything CalCount has stored on this device — used by "Delete account & data". */
export async function clearAllStorage(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
  await Promise.all(Object.values(SECURE_KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
