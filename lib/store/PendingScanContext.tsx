import React, { createContext, useContext, useMemo, useState } from "react";

import { FoodAnalysis, MealType } from "../types";

export interface PendingScan {
  photoUri: string | null;
  analysis: FoodAnalysis;
  mealType: MealType;
}

interface PendingScanState {
  pending: PendingScan | null;
  setPending: (scan: PendingScan | null) => void;
}

const Ctx = createContext<PendingScanState | null>(null);

export function PendingScanProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingScan | null>(null);
  const value = useMemo(() => ({ pending, setPending }), [pending]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePendingScan(): PendingScanState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePendingScan must be used within PendingScanProvider");
  return ctx;
}
