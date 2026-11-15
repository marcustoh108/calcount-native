// Premium rules shared by the `scan` and `revenuecat-webhook` Edge Functions. Plain TypeScript with
// no Deno or network code, so the app's unit tests can check it too.

/** The RevenueCat entitlement that YumBalance Premium unlocks (must match the app). */
export const PREMIUM_ENTITLEMENT = "premium";

/** How long a stored "has Premium" answer is trusted before RevenueCat is asked again. */
export const ACTIVE_CACHE_MS = 6 * 60 * 60 * 1000;

export interface PremiumStatus {
  active: boolean;
  /** When Premium ends; null while active means it has no end date. */
  expiresAt: Date | null;
}

export interface StoredStatus extends PremiumStatus {
  checkedAt: Date;
}

/**
 * Reads Premium from a RevenueCat `GET /v1/subscribers/{id}` response. Active when the
 * entitlement exists and hasn't expired (or never expires, as with a granted lifetime entitlement).
 */
export function premiumFromSubscriber(body: unknown, now: Date): PremiumStatus {
  const entitlements = (body as { subscriber?: { entitlements?: Record<string, unknown> } })?.subscriber?.entitlements;
  const premium = entitlements?.[PREMIUM_ENTITLEMENT] as { expires_date?: unknown } | undefined;
  if (!premium || typeof premium !== "object") return { active: false, expiresAt: null };
  if (premium.expires_date == null) return { active: true, expiresAt: null };
  const expiresAt = new Date(String(premium.expires_date));
  if (Number.isNaN(expiresAt.getTime())) return { active: false, expiresAt: null };
  return { active: expiresAt.getTime() > now.getTime(), expiresAt };
}

/**
 * True when a stored answer can be used without asking RevenueCat: it says active, hasn't passed
 * its end date, and was checked recently. A stored "no" is never trusted, so someone who has just
 * subscribed isn't kept waiting for the webhook.
 */
export function storedPremiumStillValid(stored: StoredStatus | null, now: Date): boolean {
  if (!stored || !stored.active) return false;
  if (stored.expiresAt && stored.expiresAt.getTime() <= now.getTime()) return false;
  return now.getTime() - stored.checkedAt.getTime() < ACTIVE_CACHE_MS;
}

/** Only YumBalance account IDs (Supabase user UUIDs) are stored; anonymous RevenueCat IDs are skipped. */
export function isAccountId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** The YumBalance accounts a RevenueCat webhook event is about, including both sides of a transfer. */
export function accountsInEvent(body: unknown): string[] {
  const event = (body as { event?: Record<string, unknown> })?.event;
  if (!event || typeof event !== "object") return [];
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
    ...(Array.isArray(event.transferred_from) ? event.transferred_from : []),
    ...(Array.isArray(event.transferred_to) ? event.transferred_to : []),
  ];
  return [...new Set(ids.filter(isAccountId).map((id) => id.toLowerCase()))];
}
