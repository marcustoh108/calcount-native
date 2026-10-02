import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState as RNAppState } from "react-native";

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
  DailyWaterLog,
  DEFAULT_HEALTH_PROFILE,
  ExerciseEntry,
  FoodEntry,
  HealthProfile,
  LocalAccount,
  SavedFood,
  WeightEntry,
} from "../types";
import { msUntilNextMidnight, todayKey } from "../utils/date";

interface AppState {
  ready: boolean;
  /** Today's local date (yyyy-mm-dd). Updates at midnight and when the app returns to the foreground. */
  today: string;
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
  /** Counts one scan against today's limit (local mode). */
  recordScan: () => Promise<void>;
  /** Server mode: adopts the server's count of today's scans. */
  syncScanUsage: (used: number) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  /** Deletes the account and every piece of data YumBalance stored on this device. */
  deleteAllData: () => Promise<void>;
}

// One limit for app and server — defined in the shared file.
export { DAILY_SCAN_LIMIT } from "../../supabase/functions/_shared/foodAnalysis";

const AppStateReactContext = createContext<AppState | null>(null);

/**
 * Today's local date, kept current while the app stays open past midnight, after the phone
 * wakes from sleep, and when the user changes time zone (e.g. after a flight).
 */
function useToday(): string {
  const [today, setToday] = useState(todayKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      setToday(todayKey());
      if (timer) clearTimeout(timer);
      // A second past midnight, so the new day has definitely started.
      timer = setTimeout(refresh, msUntilNextMidnight() + 1000);
    };
    refresh();
    const subscription = RNAppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, []);
  return today;
}

function computeStreak(entries: FoodEntry[], today: string): number {
  const days = new Set(entries.map((e) => todayKey(new Date(e.createdAt))));
  let streak = 0;
  const [y, m, d] = today.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
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
  const today = useToday();
  const [waterLog, setWaterLog] = useState<DailyWaterLog[]>([]);
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
      setWaterLog(loadedWater);
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
    setWaterLog(next);
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

  const syncScanUsage = useCallback(async (used: number) => {
    const next = { date: todayKey(), count: Math.max(0, used) };
    setScanUsage(next);
    await ScanUsageStorage.save(next);
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
    setWaterLog([]);
    setHasApiKey(false);
    setWeightLog([]);
    // scanUsage is kept on purpose: deleting data must not reset today's scan limit.
    setAccount(null);
  }, []);

  const streakDays = useMemo(() => computeStreak(entries, today), [entries, today]);
  const scansToday = scanUsage?.date === today ? scanUsage.count : 0;
  const waterCupsToday = waterLog.find((w) => w.date === today)?.cupsLogged ?? 0;

  const value = useMemo<AppState>(
    () => ({
      ready,
      today,
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
      syncScanUsage,
      createAccount,
      deleteAllData,
    }),
    [
      ready,
      today,
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
      syncScanUsage,
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
