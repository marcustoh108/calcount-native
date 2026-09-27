import { UnitSystem } from "../types";

const LB_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inches: totalIn % 12 };
}

export const ftInToCm = (ft: number, inches: number) => (ft * 12 + inches) * CM_PER_IN;

export const weightUnit = (units: UnitSystem) => (units === "imperial" ? "lb" : "kg");

/** Weight in the user's units, rounded to one decimal, for editable inputs. */
export function weightForInput(kg: number | null, units: UnitSystem): string {
  if (kg == null) return "";
  const v = units === "imperial" ? kgToLb(kg) : kg;
  return String(Math.round(v * 10) / 10);
}

/** Parses a weight typed in the user's units back to kg; null when empty/invalid. */
export function parseWeightInput(text: string, units: UnitSystem): number | null {
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return units === "imperial" ? lbToKg(n) : n;
}

export function formatWeight(kg: number, units: UnitSystem, digits = 1): string {
  const v = units === "imperial" ? kgToLb(kg) : kg;
  const factor = 10 ** digits;
  return `${Math.round(v * factor) / factor} ${weightUnit(units)}`;
}

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === "imperial") {
    const { ft, inches } = cmToFtIn(cm);
    return `${ft}′ ${inches}″`;
  }
  return `${Math.round(cm)} cm`;
}
