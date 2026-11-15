// POST /functions/v1/revenuecat-webhook — RevenueCat calls this whenever a subscription changes
// (trial started, renewed, cancelled, expired, refunded, transferred). It re-reads each affected
// account from RevenueCat's API and stores the result, so the `scan` function knows who has
// Premium without waiting for the app.
//
// RevenueCat sends the Authorization header value set in its dashboard (Integrations → Webhooks);
// the same value is stored as the REVENUECAT_WEBHOOK_AUTH secret. Anything else is refused.

import { accountsInEvent } from "../_shared/premium.ts";
import { refreshPremium } from "../_shared/premiumCheck.ts";
import { adminClient, handle, json, requireEnv } from "../_shared/server.ts";

const MAX_BODY_BYTES = 64 * 1024;

/** Compares two strings in constant time, so the secret can't be guessed by timing responses. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(handle(async (req) => {
  if (req.method !== "POST") return json({ error: "bad_request", message: "Use POST." }, 405);

  const expected = requireEnv("REVENUECAT_WEBHOOK_AUTH");
  const given = (req.headers.get("Authorization") ?? "").trim();
  if (!sameSecret(given, expected) && !sameSecret(given, `Bearer ${expected}`)) {
    return json({ error: "unauthorized", message: "Not allowed." }, 401);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "bad_request", message: "Too large." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad_request", message: "Invalid JSON." }, 400);
  }

  const accounts = accountsInEvent(body);
  const admin = adminClient();
  const failures: string[] = [];
  for (const userId of accounts) {
    try {
      await refreshPremium(admin, userId);
    } catch (error) {
      failures.push(userId);
      console.error("premium refresh failed", error instanceof Error ? error.message : error);
    }
  }
  // A failure makes RevenueCat retry the event later; the next scan also re-checks on its own.
  if (failures.length > 0) return json({ error: "failed", message: "Retry later." }, 503);
  return json({ ok: true, accounts: accounts.length });
}));
