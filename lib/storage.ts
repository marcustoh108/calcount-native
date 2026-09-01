import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { DEFAULT_HEALTH_PROFILE, DailyWaterLog, ExerciseEntry, FoodEntry, HealthProfile, SavedFood } from "./types";

const KEYS = {
  healthProfile: "calcount:health-profile",
  foodLog: "calcount:food-log",
  savedFoods: "calcount:saved-foods",
  waterLog: "calcount:water-log",
  streak: "calcount:streak",
  exerciseLog: "calcount:exercise-log",
} as const;

const SECURE_KEYS = {
  anthropicApiKey: "calcount-anthropic-api-key",
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
