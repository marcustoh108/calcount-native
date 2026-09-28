import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { buildLocalAccount } from "../account";
import {
  AccountStorage,
  ApiKeyStorage,
  clearAllStorage,
  ExerciseLogStorage,
  FoodLogStorage,
  HealthProfileStorage,
  SavedFoodsStorage,
  ScanUsage,
  ScanUsageStorage,
  WaterLogStorage,
  WeightLogStorage,
} from "../storage";
import {
  DEFAULT_HEALTH_PROFILE,
  ExerciseEntry,
  FoodEntry,
  HealthProfile,
  LocalAccount,
  SavedFood,
  WeightEntry,
} from "../types";
import { todayKey } from "../utils/date";

interface AppState {
  ready: boolean;
  profile: HealthProfile;
  entries: FoodEntry[];
  exerciseEntries: ExerciseEntry[];
  savedFoods: SavedFood[];
  waterCupsToday: number;
  streakDays: number;
  hasApiKey: boolean;
  /** Oldest first. */
  weightLog: WeightEntry[];
  scansToday: number;
  account: LocalAccount | null;
  updateProfile: (updater: (prev: HealthProfile) => HealthProfile) => Promise<void>;
  addEntry: (entry: FoodEntry) => Promise<void>;
  updateEntry: (id: string, updater: (prev: FoodEntry) => FoodEntry) => Promise<void>;
  removeEntries: (ids: string[]) => Promise<void>;
  duplicateEntry: (id: string) => Promise<void>;
  addExercise: (entry: ExerciseEntry) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
  saveFood: (food: SavedFood) => Promise<void>;
  removeSavedFood: (id: string) => Promise<void>;
  addWaterCup: () => Promise<void>;
  setApiKeyPresent: (present: boolean) => void;
  /** Records a weigh-in and makes it the profile's current weight. */
  logWeight: (weightKg: number) => Promise<void>;
  /** Counts one scan against today's limit. */
  recordScan: () => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  /** Deletes the account and every piece of data CalCount stored on this device. */
  deleteAllData: () => Promise<void>;
}

export const DAILY_SCAN_LIMIT = 5;

const AppStateReactContext = createContext<AppState | null>(null);

function computeStreak(entries: FoodEntry[]): number {
  const days = new Set(entries.map((e) => todayKey(new Date(e.createdAt))));
  let streak = 0;
  const cursor = new Date();
  // Count backwards from today while each day has at least one logged entry.
  for (;;) {
    const key = todayKey(cursor);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_HEALTH_PROFILE);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [waterCupsToday, setWaterCupsToday] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [scanUsage, setScanUsage] = useState<ScanUsage | null>(null);
  const [account, setAccount] = useState<LocalAccount | null>(null);

  useEffect(() => {
    (async () => {
      const [
        loadedProfile,
        loadedEntries,
        loadedExercise,
        loadedSaved,
        loadedWater,
        key,
        loadedWeights,
        loadedUsage,
        loadedAccount,
      ] = await Promise.all([
        HealthProfileStorage.load(),
        FoodLogStorage.load(),
        ExerciseLogStorage.load(),
        SavedFoodsStorage.load(),
        WaterLogStorage.load(),
        ApiKeyStorage.load(),
        WeightLogStorage.load(),
        ScanUsageStorage.load(),
        AccountStorage.load(),
      ]);
      setProfile(loadedProfile);
      setEntries(loadedEntries);
      setExerciseEntries(loadedExercise);
      setSavedFoods(loadedSaved);
      const today = todayKey();
      setWaterCupsToday(loadedWater.find((w) => w.date === today)?.cupsLogged ?? 0);
      setHasApiKey(Boolean(key));
      setWeightLog(loadedWeights);
      setScanUsage(loadedUsage);
      setAccount(loadedAccount);
      setReady(true);
    })();
  }, []);

  const updateProfile = useCallback(async (updater: (prev: HealthProfile) => HealthProfile) => {
    setProfile((prev) => {
      const next = updater(prev);
      HealthProfileStorage.save(next);
      return next;
    });
  }, []);

  const addEntry = useCallback(async (entry: FoodEntry) => {
    setEntries((prev) => {
      const next = [entry, ...prev];
      FoodLogStorage.save(next);
      return next;
    });
  }, []);

  const updateEntry = useCallback(async (id: string, updater: (prev: FoodEntry) => FoodEntry) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? updater(e) : e));
      FoodLogStorage.save(next);
      return next;
    });
  }, []);

  const removeEntries = useCallback(async (ids: string[]) => {
    setEntries((prev) => {
      const idSet = new Set(ids);
      const next = prev.filter((e) => !idSet.has(e.id));
      FoodLogStorage.save(next);
      return next;
    });
  }, []);

  const duplicateEntry = useCallback(async (id: string) => {
    setEntries((prev) => {
      const source = prev.find((e) => e.id === id);
      if (!source) return prev;
      const copy: FoodEntry = {
        ...source,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      const next = [copy, ...prev];
      FoodLogStorage.save(next);
      return next;
    });
  }, []);

  const addExercise = useCallback(async (entry: ExerciseEntry) => {
    setExerciseEntries((prev) => {
      const next = [entry, ...prev];
      ExerciseLogStorage.save(next);
      return next;
    });
  }, []);

  const removeExercise = useCallback(async (id: string) => {
    setExerciseEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      ExerciseLogStorage.save(next);
      return next;
    });
  }, []);

  const saveFood = useCallback(async (food: SavedFood) => {
    setSavedFoods((prev) => {
      const next = [food, ...prev.filter((f) => f.id !== food.id)];
      SavedFoodsStorage.save(next);
      return next;
    });
  }, []);

  const removeSavedFood = useCallback(async (id: string) => {
    setSavedFoods((prev) => {
      const next = prev.filter((f) => f.id !== id);
      SavedFoodsStorage.save(next);
      return next;
    });
  }, []);

  const addWaterCup = useCallback(async () => {
    const today = todayKey();
    const logs = await WaterLogStorage.load();
    const existing = logs.find((w) => w.date === today);
    const cups = (existing?.cupsLogged ?? 0) + 1;
    const next = [...logs.filter((w) => w.date !== today), { date: today, cupsLogged: cups }];
    await WaterLogStorage.save(next);
    setWaterCupsToday(cups);
  }, []);

  const setApiKeyPresent = useCallback((present: boolean) => setHasApiKey(present), []);

  const logWeight = useCallback(
    async (weightKg: number) => {
      const entry: WeightEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        weightKg,
      };
      setWeightLog((prev) => {
        // One weigh-in per day: a second update today replaces the first.
        const today = todayKey();
        const next = [...prev.filter((w) => todayKey(new Date(w.createdAt)) !== today), entry];
        WeightLogStorage.save(next);
        return next;
      });
      await updateProfile((prev) => ({ ...prev, weightKg }));
    },
    [updateProfile],
  );

  const recordScan = useCallback(async () => {
    const today = todayKey();
    setScanUsage((prev) => {
      const next = { date: today, count: (prev?.date === today ? prev.count : 0) + 1 };
      ScanUsageStorage.save(next);
      return next;
    });
  }, []);

  const createAccount = useCallback(async (email: string, password: string) => {
    const next = await buildLocalAccount(email, password);
    await AccountStorage.save(next);
    setAccount(next);
  }, []);

  const deleteAllData = useCallback(async () => {
    await clearAllStorage();
    setProfile(DEFAULT_HEALTH_PROFILE);
    setEntries([]);
    setExerciseEntries([]);
    setSavedFoods([]);
    setWaterCupsToday(0);
    setHasApiKey(false);
    setWeightLog([]);
    // scanUsage is kept on purpose: deleting data must not reset today's scan limit.
    setAccount(null);
  }, []);

  const streakDays = useMemo(() => computeStreak(entries), [entries]);
  const scansToday = scanUsage?.date === todayKey() ? scanUsage.count : 0;

  const value = useMemo<AppState>(
    () => ({
      ready,
      profile,
      entries,
      exerciseEntries,
      savedFoods,
      waterCupsToday,
      streakDays,
      hasApiKey,
      weightLog,
      scansToday,
      account,
      updateProfile,
      addEntry,
      updateEntry,
      removeEntries,
      duplicateEntry,
      addExercise,
      removeExercise,
      saveFood,
      removeSavedFood,
      addWaterCup,
      setApiKeyPresent,
      logWeight,
      recordScan,
      createAccount,
      deleteAllData,
    }),
    [
      ready,
      profile,
      entries,
      exerciseEntries,
      savedFoods,
      waterCupsToday,
      streakDays,
      hasApiKey,
      weightLog,
      scansToday,
      account,
      updateProfile,
      addEntry,
      updateEntry,
      removeEntries,
      duplicateEntry,
      addExercise,
      removeExercise,
      saveFood,
      removeSavedFood,
      addWaterCup,
      setApiKeyPresent,
      logWeight,
      recordScan,
      createAccount,
      deleteAllData,
    ],
  );

  return <AppStateReactContext.Provider value={value}>{children}</AppStateReactContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateReactContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
