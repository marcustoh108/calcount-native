import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";

import { DeviceIdStorage } from "../storage";
import { FoodAnalysis } from "../types";
import { supabase } from "./supabase";

export type ServerScanErrorCode = "unauthorized" | "bad_request" | "limit_reached" | "not_found" | "failed" | "offline";

export class ServerScanError extends Error {
  constructor(
    message: string,
    readonly code: ServerScanErrorCode,
    /** Today's scans used, when the server reported it. */
    readonly used: number | null = null,
    /** The server's technical reason (e.g. Anthropic's error), shown only in development builds. */
    readonly detail: string | null = null,
  ) {
    super(message);
  }
}

export interface ScanUsageResult {
  used: number;
  limit: number;
}

export interface ScanResult extends ScanUsageResult {
  analysis: FoodAnalysis;
}

/** How long to wait for the server before giving up: short for a status check, longer for AI. */
const STATUS_TIMEOUT_MS = 20_000;
const SCAN_TIMEOUT_MS = 100_000;

/**
 * The phone's time zone, so the server can reset the daily scan limit at the user's own
 * midnight. The server uses its own clock; only the zone comes from the phone.
 */
function timeZoneInfo(): { timeZone: string | null; utcOffsetMinutes: number } {
  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    // Older JS engines without Intl time zones: the offset below is enough.
  }
  return { timeZone, utcOffsetMinutes: -new Date().getTimezoneOffset() };
}

function isTimeout(error: unknown): boolean {
  const cause = error instanceof FunctionsFetchError ? (error.context as { name?: string } | undefined) : undefined;
  return cause?.name === "AbortError" || cause?.name === "TimeoutError";
}

async function callFunction<T>(name: string, body: Record<string, unknown>, timeout: number = STATUS_TIMEOUT_MS): Promise<T> {
  if (!supabase) throw new ServerScanError("No YumBalance server is configured.", "failed");
  const { data, error } = await supabase.functions.invoke(name, { body, timeout });
  if (!error) return data as T;

  if (error instanceof FunctionsHttpError) {
    let payload: { error?: ServerScanErrorCode; message?: string; used?: number; detail?: string | null } = {};
    try {
      payload = await error.context.json();
    } catch {
      // Non-JSON error body; fall through to a generic message.
    }
    throw new ServerScanError(
      payload.message ?? "Something went wrong. Please try again.",
      payload.error ?? "failed",
      typeof payload.used === "number" ? payload.used : null,
      typeof payload.detail === "string" ? payload.detail : null,
    );
  }
  if (isTimeout(error)) {
    throw new ServerScanError("YumBalance is taking too long to respond. Check your connection and try again.", "offline");
  }
  throw new ServerScanError("Couldn't reach YumBalance. Check your internet connection and try again.", "offline");
}

async function scanRequest<T>(body: Record<string, unknown>, timeout = SCAN_TIMEOUT_MS): Promise<T> {
  return callFunction<T>("scan", { ...body, ...timeZoneInfo(), deviceId: await DeviceIdStorage.get() }, timeout);
}

export function fetchScanUsage(): Promise<ScanUsageResult> {
  return scanRequest<ScanUsageResult>({ kind: "status" }, STATUS_TIMEOUT_MS);
}

export function scanPhotoOnServer(params: {
  base64: string;
  mimeType: "image/jpeg" | "image/png";
  contextNote?: string;
}): Promise<ScanResult> {
  return scanRequest<ScanResult>({
    kind: "photo",
    imageBase64: params.base64,
    mimeType: params.mimeType,
    contextNote: params.contextNote ?? null,
  });
}

export function scanBarcodeOnServer(barcode: string): Promise<ScanResult> {
  return scanRequest<ScanResult>({ kind: "barcode", barcode });
}

export function deleteServerAccount(): Promise<{ deleted: boolean }> {
  return callFunction<{ deleted: boolean }>("delete-account", {});
}
