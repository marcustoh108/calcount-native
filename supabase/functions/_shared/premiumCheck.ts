// Checks YumBalance Premium on the server (Deno only). RevenueCat is the source of truth; answers
// are stored in `premium_status` so most scans don't need to ask RevenueCat again.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";

import { type PremiumStatus, premiumFromSubscriber, storedPremiumStillValid } from "./premium.ts";
import { requireEnv } from "./server.ts";

const REVENUECAT_API = "https://api.revenuecat.com/v1/subscribers/";
const REVENUECAT_TIMEOUT_MS = 8_000;

/**
 * Whether AI photo scans need Premium. Off until `PREMIUM_REQUIRED=true` is set, so the switch can
 * be turned on once subscriptions are live (and off again instantly if something goes wrong).
 */
export function premiumRequired(): boolean {
  return (Deno.env.get("PREMIUM_REQUIRED") ?? "").trim().toLowerCase() === "true";
}

/** Asks RevenueCat for this account's Premium status and stores the answer. Throws if RevenueCat can't be reached. */
export async function refreshPremium(admin: SupabaseClient, userId: string): Promise<PremiumStatus> {
  const response = await fetch(REVENUECAT_API + encodeURIComponent(userId), {
    headers: { Authorization: `Bearer ${requireEnv("REVENUECAT_SECRET_KEY")}`, Accept: "application/json" },
    signal: AbortSignal.timeout(REVENUECAT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`RevenueCat ${response.status}`);
  const status = premiumFromSubscriber(await response.json(), new Date());
  const { error } = await admin.rpc("premium_status_set", {
    p_user_id: userId,
    p_active: status.active,
    p_expires_at: status.expiresAt?.toISOString() ?? null,
  });
  if (error) console.error("premium_status_set failed", error.message);
  return status;
}

/** True when the account has Premium: a recent stored "yes", otherwise a fresh answer from RevenueCat. */
export async function userHasPremium(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("premium_status_get", { p_user_id: userId });
  if (error) console.error("premium_status_get failed", error.message);
  const row = Array.isArray(data) ? data[0] : data;
  const stored = row
    ? {
      active: Boolean(row.active),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      checkedAt: new Date(row.checked_at),
    }
    : null;
  if (storedPremiumStillValid(stored, new Date())) return true;
  return (await refreshPremium(admin, userId)).active;
}
