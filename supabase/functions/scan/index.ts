// POST /functions/v1/scan — the only way the app can analyse food once a server is configured.
//
// Every request: verify the login → check and consume one of today's scans (per account and per
// device, on the user's own calendar day, plus a service-wide daily cap) → do the work → refund
// the scan if we couldn't deliver a result.
//
// Body (JSON), always with `deviceId`, and `timeZone` (IANA, e.g. "Europe/London") plus
// `utcOffsetMinutes` so the daily limit resets at the user's local midnight:
//   { kind: "status" }                                           → { used, limit }
//   { kind: "photo", imageBase64, mimeType, contextNote? }       → { analysis, used, limit }
//   { kind: "barcode", barcode }                                 → { analysis, used, limit }
// Errors: { error: "unauthorized" | "bad_request" | "limit_reached" | "not_found" | "failed", message, used?, limit? }

import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";

import {
  coerceAnalysis,
  DAILY_SCAN_LIMIT,
  type FoodAnalysis,
  FOOD_EFFORT,
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
import { scanDayFor } from "../_shared/scanDay.ts";
import { adminClient, authenticatedUser, handle, json, requireEnv, validDeviceId } from "../_shared/server.ts";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Anthropic's per-image limit

class ScanFailure extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code = "failed",
    /** The upstream reason, for troubleshooting. Never contains secrets. */
    readonly detail: string | null = null,
  ) {
    super(message);
  }
}

const UNAVAILABLE = "Scanning is temporarily unavailable. Please try again later.";

/**
 * Most scans the whole service will run per UTC day, so a flood of new accounts can't run up the
 * AI bill. Override with `npx supabase secrets set SCAN_GLOBAL_DAILY_CAP=<n>`; 0 turns it off.
 */
const DEFAULT_GLOBAL_DAILY_CAP = 2000;
function globalDailyCap(): number {
  const raw = Deno.env.get("SCAN_GLOBAL_DAILY_CAP");
  const value = raw == null || raw.trim() === "" ? DEFAULT_GLOBAL_DAILY_CAP : Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_GLOBAL_DAILY_CAP;
}

/**
 * Keeps a slow AI response from hanging the request: one retry on overload or network errors
 * (the SDK backs off between tries), and at most ~90 seconds in total, well inside both the Edge
 * Function's time limit and the app's own timeout.
 */
const ANTHROPIC_TIMEOUT_MS = 45_000;
const ANTHROPIC_MAX_RETRIES = 1;

/** Anthropic's own explanation from an API error, trimmed for logs and the app's debug view. */
function anthropicReason(error: InstanceType<typeof Anthropic.APIError>): string {
  const body = error.error as { error?: { message?: unknown } } | undefined;
  const message = typeof body?.error?.message === "string" ? body.error.message : error.message;
  return `Anthropic ${error.status ?? "error"}: ${message}`.slice(0, 300);
}

/**
 * Accepts plain base64 or a data: URL, strips whitespace, and works out the real image type from
 * the file's first bytes, so a mislabeled photo can't make the analysis request fail.
 */
function normalizeImage(raw: string): { data: string; mediaType: ImageType } | { problem: string } {
  const data = raw.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { problem: "That photo couldn't be read. Try again." };
  let head: Uint8Array;
  try {
    head = Uint8Array.from(atob(data.slice(0, 32)), (c) => c.charCodeAt(0));
  } catch {
    return { problem: "That photo couldn't be read. Try again." };
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { data, mediaType: "image/jpeg" };
  if (head[0] === 0x89 && ascii(1, 4) === "PNG") return { data, mediaType: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { data, mediaType: "image/webp" };
  if (ascii(0, 3) === "GIF") return { data, mediaType: "image/gif" };
  if (ascii(4, 8) === "ftyp") {
    return { problem: "That photo is in HEIC format, which can't be analysed. Please update the app and try again." };
  }
  return { problem: "That photo format isn't supported. Try a JPEG or PNG photo." };
}

let anthropic: Anthropic | null = null;

/** Created on first use, so a missing secret gives a clear error instead of crashing every request. */
function anthropicClient(): Anthropic {
  if (!anthropic) {
    try {
      anthropic = new Anthropic({
        apiKey: requireEnv("ANTHROPIC_API_KEY"),
        timeout: ANTHROPIC_TIMEOUT_MS,
        maxRetries: ANTHROPIC_MAX_RETRIES,
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      throw new ScanFailure(UNAVAILABLE, 503, "failed", "ANTHROPIC_API_KEY secret is not set");
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
      output_config: { effort: FOOD_EFFORT },
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
    if (!(error instanceof Anthropic.APIError)) {
      console.error("Anthropic request failed", error);
      throw new ScanFailure("Couldn't reach the analysis service. Please try again.");
    }
    const reason = anthropicReason(error);
    console.error(reason);
    if (
      error instanceof Anthropic.RateLimitError ||
      error instanceof Anthropic.InternalServerError ||
      error instanceof Anthropic.APIConnectionError
    ) {
      throw new ScanFailure("Scanning is busy right now. Please try again in a moment.", 503, "failed", reason);
    }
    // Only blame the photo when Anthropic says the image itself was the problem. Everything else
    // (credit balance, spend limits, key, model access) is a server/account issue, not the user's.
    if (error instanceof Anthropic.BadRequestError && /\bimage\b|media.?type|base64/i.test(reason)) {
      throw new ScanFailure("That photo couldn't be read. Try another photo.", 400, "bad_request", reason);
    }
    throw new ScanFailure(UNAVAILABLE, 503, "failed", reason);
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
      {
        headers: { "User-Agent": "YumBalance/1.0 (connect@avencia.io)" },
        signal: AbortSignal.timeout(15_000),
      },
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
  // The user's calendar day right now, by the server's clock and the phone's time zone.
  const day = scanDayFor(body.timeZone, body.utcOffsetMinutes);

  if (kind === "status") {
    const { data, error } = await admin.rpc("scan_status_v2", { p_user_id: user.id, p_device_id: deviceId, p_day: day });
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
    const image = normalizeImage(imageBase64);
    if ("problem" in image) return json({ error: "bad_request", message: image.problem }, 400);
    // Anthropic's 5 MB limit applies to the base64 data as sent, so check its encoded length.
    if (image.data.length > MAX_IMAGE_BYTES) {
      return json({ error: "bad_request", message: "That photo is too large. Try again with a smaller photo." }, 413);
    }
    const note = typeof contextNote === "string" ? contextNote.slice(0, 500) : null;
    run = () => analyzePhoto(image.data, image.mediaType, note);
  } else if (kind === "barcode") {
    const { barcode } = body;
    if (typeof barcode !== "string" || !/^[0-9A-Za-z]{4,32}$/.test(barcode)) {
      return json({ error: "bad_request", message: "That barcode couldn't be read." }, 400);
    }
    run = () => lookupBarcode(barcode);
  } else {
    return json({ error: "bad_request", message: "Unknown scan type." }, 400);
  }

  const { data: claimRows, error: claimError } = await admin.rpc("claim_scan_v2", {
    p_user_id: user.id,
    p_device_id: deviceId,
    p_limit: DAILY_SCAN_LIMIT,
    p_day: day,
    p_global_cap: globalDailyCap(),
  });
  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  if (claimError || !claim) {
    console.error("claim_scan failed", claimError?.message);
    return json({ error: "failed", message: "Couldn't start the scan. Please try again." }, 500);
  }
  if (!claim.allowed && claim.reason === "busy") {
    console.error(`Service-wide daily scan cap reached (SCAN_GLOBAL_DAILY_CAP=${globalDailyCap()})`);
    return json(
      {
        error: "failed",
        message: "Scanning is very busy today. Please try again later, or use Search to log your meal.",
        detail: "SCAN_GLOBAL_DAILY_CAP reached",
        used: claim.used,
        limit: DAILY_SCAN_LIMIT,
      },
      503,
    );
  }
  if (!claim.allowed) {
    return json(
      {
        error: "limit_reached",
        message: `You've used all ${DAILY_SCAN_LIMIT} scans for today. Your scans reset at midnight.`,
        used: claim.used,
        limit: DAILY_SCAN_LIMIT,
      },
      429,
    );
  }

  const refund = async (): Promise<number> => {
    // Refund on the days the scan was claimed, even if midnight passed while it ran.
    const { data, error } = await admin.rpc("release_scan_v2", {
      p_user_id: user.id,
      p_device_id: deviceId,
      p_day: day,
      p_global_day: claim.global_day ?? null,
    });
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
    return json(
      { error: failure.code, message: failure.message, detail: failure.detail, used, limit: DAILY_SCAN_LIMIT },
      failure.status,
    );
  }
}));
