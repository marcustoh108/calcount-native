// GET /functions/v1/health — a status check for uptime monitors (e.g. UptimeRobot every 5 minutes).
//
// Returns 200 { ok: true, checks } when scanning can work, or 503 naming what's broken, so you
// hear about a problem before your users do. Checks:
//   database — the service key works and the latest scan-limit migration is installed
//   ai       — the Anthropic key is valid and can use the scan model (a free API call, no tokens)
// Public on purpose (deploy with --no-verify-jwt): it reveals only "ok"/"failed" per check, never
// keys or error details. The details go to the function's logs in the Supabase dashboard.

import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";

import { FOOD_MODEL } from "../_shared/foodAnalysis.ts";
import { adminClient, handle, json } from "../_shared/server.ts";

type Status = "ok" | "failed";

async function checkDatabase(): Promise<Status> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await adminClient().rpc("check_scan_day", { p_day: today });
    if (error) throw new Error(error.message);
    return "ok";
  } catch (error) {
    console.error("health: database check failed:", error instanceof Error ? error.message : error);
    return "failed";
  }
}

async function checkAi(): Promise<Status> {
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret is not set");
    const client = new Anthropic({ apiKey, timeout: 10_000, maxRetries: 1 });
    await client.models.retrieve(FOOD_MODEL);
    return "ok";
  } catch (error) {
    console.error("health: AI check failed:", error instanceof Error ? error.message : error);
    return "failed";
  }
}

Deno.serve(handle(async () => {
  const [database, ai] = await Promise.all([checkDatabase(), checkAi()]);
  const ok = database === "ok" && ai === "ok";
  return json({ ok, checks: { database, ai }, time: new Date().toISOString() }, ok ? 200 : 503);
}));
