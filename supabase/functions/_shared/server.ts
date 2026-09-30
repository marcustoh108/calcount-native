// Helpers shared by YumBalance's Edge Functions (Deno only — the app never imports this file).
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.117.2";

/**
 * Lets the account-deletion page on avencia.io call these functions from a browser.
 * Any origin is fine: every request is authorised by the user's own access token, never a cookie.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

/**
 * A client with full database access. Only ever used after the caller's login is verified.
 * Uses the project's built-in service-role key, or — on projects that only have the newer
 * `sb_secret_…` keys — a secret key you store yourself as CALCOUNT_SERVICE_KEY.
 */
export function adminClient(): SupabaseClient {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("CALCOUNT_SERVICE_KEY");
  if (!key) {
    throw new Error(
      "No service key available: run `npx supabase secrets set CALCOUNT_SERVICE_KEY=<your sb_secret_ key>` (see docs/SERVER_SETUP.md).",
    );
  }
  return createClient(requireEnv("SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Wraps a handler so a configuration problem returns a clear JSON error (and a log line) instead of a crash. */
export function handle(handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    try {
      return await handler(req);
    } catch (error) {
      console.error("Unhandled error:", error instanceof Error ? error.message : error);
      return json({ error: "failed", message: "YumBalance is temporarily unavailable. Please try again later." }, 503);
    }
  };
}

/** Resolves the signed-in user from the request's `Authorization: Bearer <access token>`. */
export async function authenticatedUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** The random per-install ID the app sends; also validated again in SQL. */
export function validDeviceId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,100}$/.test(value);
}
