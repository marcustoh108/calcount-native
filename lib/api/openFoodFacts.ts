import {
  mapProductToAnalysis,
  OFF_BASE_URL as BASE_URL,
  OFF_PRODUCT_FIELDS,
  OffProduct,
} from "../../supabase/functions/_shared/foodAnalysis";
import { FoodAnalysis } from "../types";

/**
 * Open Food Facts (openfoodfacts.org) is a free, contributor-run product
 * database — no API key required. Used for barcode lookups and text search
 * so CalCount can log packaged foods without a photo, the way MyFitnessPal's
 * and Lose It!'s manual/barcode search does.
 *
 * Nutrition here comes from the product's own label data (community-entered),
 * not an AI photo estimate — confidence is capped at "medium" and every result
 * says so, since label transcription errors do happen in the database.
 */

export class OpenFoodFactsError extends Error {}

const REQUEST_TIMEOUT_MS = 10000;
/** The newer Open Food Facts search service; the legacy search.pl endpoint is often overloaded (503). */
const SEARCH_URL = "https://search.openfoodfacts.org/search";

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "CalCount/1.0 (admin@avencia-solutions.com)" },
    });
  } catch {
    throw new OpenFoodFactsError("Couldn't reach the food database. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new OpenFoodFactsError(
      response.status >= 500 || response.status === 429
        ? "The food database is busy right now. Please try again in a minute."
        : `Food database request failed (${response.status}).`,
    );
  }
  return response.json();
}

export async function lookupBarcode(barcode: string): Promise<FoodAnalysis | null> {
  const data = await fetchJson(
    `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_PRODUCT_FIELDS}`,
  );
  if (data?.status !== 1 || !data.product) return null;
  return mapProductToAnalysis(data.product as OffProduct);
}

function toAnalyses(products: unknown): FoodAnalysis[] {
  const list: OffProduct[] = Array.isArray(products) ? (products as OffProduct[]) : [];
  return list
    .map((p: OffProduct & { product_name_en?: string }) =>
      mapProductToAnalysis({ ...p, product_name: p.product_name || p.product_name_en }),
    )
    .filter((a): a is FoodAnalysis => a !== null)
    .slice(0, 15);
}

export async function searchFoodByName(query: string): Promise<FoodAnalysis[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const q = encodeURIComponent(trimmed);
  try {
    const data = await fetchJson(`${SEARCH_URL}?q=${q}&page_size=20&fields=${OFF_PRODUCT_FIELDS},product_name_en`);
    return toAnalyses(data?.hits);
  } catch (primaryError) {
    // Fall back to the legacy search endpoint before giving up.
    try {
      const data = await fetchJson(
        `${BASE_URL}/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20&fields=${OFF_PRODUCT_FIELDS}`,
      );
      return toAnalyses(data?.products);
    } catch {
      throw primaryError;
    }
  }
}
