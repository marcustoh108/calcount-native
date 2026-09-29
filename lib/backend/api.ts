import { FunctionsHttpError } from "@supabase/supabase-js";

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

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new ServerScanError("No CalCount server is configured.", "failed");
  const { data, error } = await supabase.functions.invoke(name, { body });
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
  throw new ServerScanError("Couldn't reach CalCount. Check your internet connection and try again.", "offline");
}

async function scanRequest<T>(body: Record<string, unknown>): Promise<T> {
  return callFunction<T>("scan", { ...body, deviceId: await DeviceIdStorage.get() });
}

export function fetchScanUsage(): Promise<ScanUsageResult> {
  return scanRequest<ScanUsageResult>({ kind: "status" });
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
