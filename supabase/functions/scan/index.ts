// POST /functions/v1/scan — the only way the app can analyse food once a server is configured.
//
// Every request: verify the login → check and consume one of today's scans (per account and per
// device, Singapore days) → do the work → refund the scan if we couldn't deliver a result.
//
// Body (JSON), always with `deviceId`:
//   { kind: "status" }                                           → { used, limit }
//   { kind: "photo", imageBase64, mimeType, contextNote? }       → { analysis, used, limit }
//   { kind: "barcode", barcode }                                 → { analysis, used, limit }
// Errors: { error: "unauthorized" | "bad_request" | "limit_reached" | "not_found" | "failed", message, used?, limit? }

import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";

import {
  coerceAnalysis,
  DAILY_SCAN_LIMIT,
  type FoodAnalysis,
  FOOD_MAX_TOKENS,
  FOOD_MODEL,
  mapProductToAnalysis,
  OFF_BASE_URL,
  OFF_PRODUCT_FIELDS,
  type OffProduct,
  photoPromptText,
  stripCodeFences,
  SYSTEM_PROMPT,
} from "../_shared/foodAnalysis.ts";
import { adminClient, authenticatedUser, handle, json, requireEnv, validDeviceId } from "../_shared/server.ts";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Anthropic's per-image limit

class ScanFailure extends Error {
  constructor(message: string, readonly status = 502, readonly code = "failed") {
    super(message);
  }
}

let anthropic: Anthropic | null = null;

/** Created on first use, so a missing secret gives a clear error instead of crashing every request. */
function anthropicClient(): Anthropic {
  if (!anthropic) {
    try {
      anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      throw new ScanFailure("Scanning is temporarily unavailable. Please try again later.", 503);
    }
  }
  return anthropic;
}

async function analyzePhoto(imageBase64: string, mimeType: ImageType, contextNote: string | null): Promise<FoodAnalysis> {
  const client = anthropicClient();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: FOOD_MODEL,
      max_tokens: FOOD_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: photoPromptText(contextNote) },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error("Anthropic rejected the server's API key", error.status);
      throw new ScanFailure("Scanning is temporarily unavailable. Please try again later.", 503);
    }
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
      throw new ScanFailure("Scanning is busy right now. Please try again in a moment.", 503);
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Anthropic bad request", error.message);
      if (/credit balance/i.test(error.message)) {
        // Out of Anthropic credits: an account problem, not the user's photo.
        throw new ScanFailure("Scanning is temporarily unavailable. Please try again later.", 503);
      }
      throw new ScanFailure("That photo couldn't be read. Try another photo.", 400);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      throw new ScanFailure("Couldn't analyse that photo. Please try again.");
    }
    console.error("Anthropic request failed", error);
    throw new ScanFailure("Couldn't reach the analysis service. Please try again.");
  }

  if (response.stop_reason === "refusal") {
    throw new ScanFailure("That photo couldn't be analysed. Try a photo of just the food.", 422);
  }
  const text = response.content.find((block): block is Anthropic.TextBlock => block.type === "text")?.text;
  if (!text || response.stop_reason === "max_tokens") {
    throw new ScanFailure("Couldn't read the nutrition estimate. Try retaking the photo.");
  }
  try {
    return coerceAnalysis(JSON.parse(stripCodeFences(text)));
  } catch {
    throw new ScanFailure("Couldn't read the nutrition estimate. Try retaking the photo.");
  }
}

async function lookupBarcode(barcode: string): Promise<FoodAnalysis | null> {
  let response: Response;
  try {
    response = await fetch(
      `${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_PRODUCT_FIELDS}`,
      { headers: { "User-Agent": "CalCount/1.0 (admin@avencia-solutions.com)" } },
    );
  } catch {
    throw new ScanFailure("Couldn't reach the food database. Please try again.");
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new ScanFailure(`Food database request failed (${response.status}).`);
  const data = await response.json();
  if (data?.status !== 1 || !data.product) return null;
  return mapProductToAnalysis(data.product as OffProduct);
}

Deno.serve(handle(async (req) => {
  if (req.method !== "POST") return json({ error: "bad_request", message: "Use POST." }, 405);

  const admin = adminClient();
  const user = await authenticatedUser(req, admin);
  if (!user) return json({ error: "unauthorized", message: "Please sign in to scan." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request", message: "Invalid request." }, 400);
  }
  const { kind, deviceId } = body;
  if (!validDeviceId(deviceId)) return json({ error: "bad_request", message: "Invalid device." }, 400);

  if (kind === "status") {
    const { data, error } = await admin.rpc("scan_status", { p_user_id: user.id, p_device_id: deviceId });
    if (error) {
      console.error("scan_status failed", error.message);
      return json({ error: "failed", message: "Couldn't load today's scans." }, 500);
    }
    return json({ used: data ?? 0, limit: DAILY_SCAN_LIMIT });
  }

  // Validate the request fully before consuming a scan.
  let run: () => Promise<FoodAnalysis | null>;
  if (kind === "photo") {
    const { imageBase64, mimeType, contextNote } = body;
    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      return json({ error: "bad_request", message: "No photo received." }, 400);
    }
    if (typeof mimeType !== "string" || !IMAGE_TYPES.includes(mimeType as ImageType)) {
      return json({ error: "bad_request", message: "Unsupported photo format." }, 400);
    }
    // Anthropic's 5 MB limit applies to the base64 data as sent, so check its encoded length.
    if (imageBase64.length > MAX_IMAGE_BYTES) {
      return json({ error: "bad_request", message: "That photo is too large. Try again with a smaller photo." }, 413);
    }
    const note = typeof contextNote === "string" ? contextNote.slice(0, 500) : null;
    run = () => analyzePhoto(imageBase64, mimeType as ImageType, note);
  } else if (kind === "barcode") {
    const { barcode } = body;
    if (typeof barcode !== "string" || !/^[0-9A-Za-z]{4,32}$/.test(barcode)) {
      return json({ error: "bad_request", message: "That barcode couldn't be read." }, 400);
    }
    run = () => lookupBarcode(barcode);
  } else {
    return json({ error: "bad_request", message: "Unknown scan type." }, 400);
  }

  const { data: claimRows, error: claimError } = await admin.rpc("claim_scan", {
    p_user_id: user.id,
    p_device_id: deviceId,
    p_limit: DAILY_SCAN_LIMIT,
  });
  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  if (claimError || !claim) {
    console.error("claim_scan failed", claimError?.message);
    return json({ error: "failed", message: "Couldn't start the scan. Please try again." }, 500);
  }
  if (!claim.allowed) {
    return json(
      {
        error: "limit_reached",
        message: `You've used all ${DAILY_SCAN_LIMIT} scans for today. Scans reset at midnight (Singapore time).`,
        used: claim.used,
        limit: DAILY_SCAN_LIMIT,
      },
      429,
    );
  }

  const refund = async (): Promise<number> => {
    const { data, error } = await admin.rpc("release_scan", { p_user_id: user.id, p_device_id: deviceId });
    if (error) console.error("release_scan failed", error.message);
    return typeof data === "number" ? data : Math.max(0, claim.used - 1);
  };

  try {
    const analysis = await run();
    if (!analysis) {
      const used = await refund();
      return json(
        { error: "not_found", message: "That barcode isn't in the food database. Try Search or a photo instead.", used, limit: DAILY_SCAN_LIMIT },
        404,
      );
    }
    return json({ analysis, used: claim.used, limit: DAILY_SCAN_LIMIT });
  } catch (error) {
    const used = await refund();
    const failure = error instanceof ScanFailure ? error : new ScanFailure("Something went wrong. Please try again.");
    if (!(error instanceof ScanFailure)) console.error("scan failed", error);
    return json({ error: failure.code, message: failure.message, used, limit: DAILY_SCAN_LIMIT }, failure.status);
  }
}));
