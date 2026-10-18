import type { FoodEntry, HealthProfile } from "./types";

/**
 * Checks on data read back from the phone's storage. Saved data can be damaged (an interrupted
 * write, a backup restored from an older app version), and one bad record must never crash the
 * app or stop it from starting: anything unusable is dropped or replaced with a safe default.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A list of plain objects; anything else in the list (or a non-list) is dropped. */
export function objectList<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw.filter(isObject) as T[]) : [];
}

/** Food log entries with the fields every screen relies on; missing health flags become none. */
export function foodEntries(raw: unknown): FoodEntry[] {
  return objectList<Record<string, unknown>>(raw)
    .filter(
      (e) =>
        typeof e.id === "string" &&
        typeof e.createdAt === "string" &&
        !Number.isNaN(Date.parse(e.createdAt)) &&
        isObject(e.analysis) &&
        isObject(e.analysis.nutrients),
    )
    .map((e) => ({
      ...e,
      servings: typeof e.servings === "number" && e.servings > 0 ? e.servings : 1,
      safety: Array.isArray(e.safety) ? e.safety.filter(isObject) : [],
    })) as unknown as FoodEntry[];
}

/** The saved profile's fields over the defaults, with list fields always being lists. */
export function healthProfile(raw: unknown, defaults: HealthProfile): HealthProfile {
  const saved = isObject(raw) ? raw : {};
  const profile = { ...defaults, ...saved } as HealthProfile;
  return {
    ...profile,
    conditions: Array.isArray(profile.conditions) ? profile.conditions.filter((c) => typeof c === "string") : [],
    allergies: Array.isArray(profile.allergies) ? profile.allergies.filter((a) => typeof a === "string") : [],
  };
}
