import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  ApiKeyStorage,
  FoodLogStorage,
  HealthProfileStorage,
  SavedFoodsStorage,
  WaterLogStorage,
} from "../storage";
import { DEFAULT_HEALTH_PROFILE, FoodEntry, HealthProfile, SavedFood } from "../types";
import { todayKey } from "../utils/date";

interface AppState {
  ready: boolean;
  profile: HealthProfile;
  entries: FoodEntry[];
  savedFoods: SavedFood[];
  waterCupsToday: number;
  streakDays: number;
  hasApiKey: boolean;
  updateProfile: (updater: (prev: HealthProfile) => HealthProfile) => Promise<void>;
  addEntry: (entry: FoodEntry) => Promise<void>;
  updateEntry: (id: string, updater: (prev: FoodEntry) => FoodEntry) => Promise<void>;
  removeEntries: (ids: string[]) => Promise<void>;
  duplicateEntry: (id: string) => Promise<void>;
  saveFood: (food: SavedFood) => Promise<void>;
  removeSavedFood: (id: string) => Promise<void>;
  addWaterCup: () => Promise<void>;
  setApiKeyPresent: (present: boolean) => void;
}

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
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [waterCupsToday, setWaterCupsToday] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    (async () => {
      const [loadedProfile, loadedEntries, loadedSaved, loadedWater, key] = await Promise.all([
        HealthProfileStorage.load(),
        FoodLogStorage.load(),
        SavedFoodsStorage.load(),
        WaterLogStorage.load(),
        ApiKeyStorage.load(),
      ]);
      setProfile(loadedProfile);
      setEntries(loadedEntries);
      setSavedFoods(loadedSaved);
      const today = todayKey();
      setWaterCupsToday(loadedWater.find((w) => w.date === today)?.cupsLogged ?? 0);
      setHasApiKey(Boolean(key));
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

  const streakDays = useMemo(() => computeStreak(entries), [entries]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      profile,
      entries,
      savedFoods,
      waterCupsToday,
      streakDays,
      hasApiKey,
      updateProfile,
      addEntry,
      updateEntry,
      removeEntries,
      duplicateEntry,
      saveFood,
      removeSavedFood,
      addWaterCup,
      setApiKeyPresent,
    }),
    [
      ready,
      profile,
      entries,
      savedFoods,
      waterCupsToday,
      streakDays,
      hasApiKey,
      updateProfile,
      addEntry,
      updateEntry,
      removeEntries,
      duplicateEntry,
      saveFood,
      removeSavedFood,
      addWaterCup,
      setApiKeyPresent,
    ],
  );

  return <AppStateReactContext.Provider value={value}>{children}</AppStateReactContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateReactContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
