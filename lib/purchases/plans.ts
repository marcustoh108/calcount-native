/**
 * Plain helpers for YumBalance Premium (no SDK imports, so they can be unit-tested).
 * Purchases themselves are handled by RevenueCat in `PremiumContext.tsx`.
 */

/** The RevenueCat entitlement that Premium unlocks. Must match the identifier in RevenueCat. */
export const ENTITLEMENT_ID = "premium";

export type PlanId = "yearly" | "monthly";

/** RevenueCat package types for each plan, plus the identifiers it gives packages by default. */
const PLAN_MATCH: Record<PlanId, { type: string; ids: string[] }> = {
  yearly: { type: "ANNUAL", ids: ["$rc_annual", "yearly", "annual"] },
  monthly: { type: "MONTHLY", ids: ["$rc_monthly", "monthly"] },
};

interface PackageLike {
  identifier: string;
  packageType: string;
}

/** Finds the package in the current offering that sells this plan. */
export function packageForPlan<P extends PackageLike>(packages: readonly P[], plan: PlanId): P | undefined {
  const match = PLAN_MATCH[plan];
  return (
    packages.find((p) => p.packageType === match.type) ??
    packages.find((p) => match.ids.includes(p.identifier.toLowerCase()))
  );
}

interface CustomerInfoLike {
  entitlements: { active: Record<string, unknown> };
}

/** True when the customer currently has Premium (including during a free trial). */
export function hasPremium(info: CustomerInfoLike | null | undefined): boolean {
  return Boolean(info?.entitlements?.active?.[ENTITLEMENT_ID]);
}

/** RevenueCat error codes the app explains to people (see PURCHASES_ERROR_CODE). */
const MESSAGES: Record<string, string> = {
  "2": "Google Play or the App Store had a problem. Please try again in a few minutes.",
  "3": "Purchases aren't allowed on this device. Check your store account or parental controls.",
  "5": "This plan isn't available right now. Please try again later.",
  "6": "You already have this subscription. Tap Restore purchases to unlock it.",
  "10": "No internet connection. Check your connection and try again.",
  "20": "Your payment is pending. Premium unlocks as soon as the store confirms it.",
  "23": "Purchases aren't set up correctly yet. Please try again later.",
};

/**
 * A message for a failed purchase or restore, or null when the person simply cancelled
 * (nothing to say in that case).
 */
export function purchaseErrorMessage(err: unknown): string | null {
  const e = (err ?? {}) as { code?: unknown; userCancelled?: unknown };
  if (e.userCancelled === true || String(e.code) === "1") return null;
  return MESSAGES[String(e.code)] ?? "Something went wrong with the purchase. You haven't been charged. Please try again.";
}

/** Rejects with `message` if the promise doesn't settle in time, so a screen never waits forever. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
