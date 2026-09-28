// Helpers shared by CalCount's Edge Functions (Deno only — the app never imports this file).
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.117.2";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

/** A client with full database access. Only ever used after the caller's login is verified. */
export function adminClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
