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

async function fetchJson(url: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new OpenFoodFactsError("Couldn't reach the food database. Check your internet connection.");
  }
  if (!response.ok) {
    throw new OpenFoodFactsError(`Food database request failed (${response.status}).`);
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

export async function searchFoodByName(query: string): Promise<FoodAnalysis[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const data = await fetchJson(
    `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(trimmed)}&search_simple=1&action=process&json=1&page_size=20&fields=${OFF_PRODUCT_FIELDS}`,
  );
  const products: OffProduct[] = Array.isArray(data?.products) ? data.products : [];
  return products
    .map(mapProductToAnalysis)
    .filter((a): a is FoodAnalysis => a !== null)
    .slice(0, 15);
}
