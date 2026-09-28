// POST /functions/v1/delete-account — permanently deletes the signed-in user's CalCount account
// (required by Apple for apps that let people create accounts). The app wipes on-device data
// itself. Device scan counters are kept so deleting and re-registering can't reset the daily limit.

import { adminClient, authenticatedUser, json } from "../_shared/server.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "bad_request", message: "Use POST." }, 405);

  const admin = adminClient();
  const user = await authenticatedUser(req, admin);
  if (!user) return json({ error: "unauthorized", message: "Please sign in again, then retry." }, 401);

  const { error: scansError } = await admin.rpc("forget_user_scans", { p_user_id: user.id });
  if (scansError) console.error("forget_user_scans failed", scansError.message);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteUser failed", error.message);
    return json({ error: "failed", message: "Couldn't delete your account. Please try again." }, 500);
  }
  return json({ deleted: true });
});
