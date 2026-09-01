import { FoodAnalysis, IngredientEstimate } from "../types";

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

const BASE_URL = "https://world.openfoodfacts.org";

export class OpenFoodFactsError extends Error {}

interface OffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fat_100g?: number;
  "saturated-fat_100g"?: number;
  sodium_100g?: number; // grams per 100g
  fiber_100g?: number;
  potassium_100g?: number; // grams per 100g
  cholesterol_100g?: number; // grams per 100g (rarely present)
}

interface OffProduct {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  ingredients_text?: string;
  nutriments?: OffNutriments;
}

function parseServingGrams(product: OffProduct): number {
  const raw = product.serving_size ?? product.quantity ?? "";
  const match = raw.match(/([\d.]+)\s*g/i);
  if (match) {
    const grams = Number(match[1]);
    if (Number.isFinite(grams) && grams > 0) return grams;
  }
  return 100;
}

function splitIngredients(text: string | undefined): IngredientEstimate[] {
  if (!text) return [];
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((name) => ({ name, estimatedGrams: 0, likelyHidden: false }));
}

function mapProductToAnalysis(product: OffProduct): FoodAnalysis | null {
  const n = product.nutriments;
  const caloriesPer100g = n?.["energy-kcal_100g"];
  if (n == null || caloriesPer100g == null || !Number.isFinite(caloriesPer100g)) return null;

  const portionGrams = parseServingGrams(product);
  const scale = portionGrams / 100;
  const name = product.product_name?.trim() || product.generic_name?.trim() || "Packaged food";
  const brand = product.brands?.split(",")[0]?.trim();

  return {
    foodName: brand ? `${name} (${brand})` : name,
    description: product.ingredients_text?.trim() || "Nutrition from the product's label (Open Food Facts).",
    cuisineType: null,
    isRestaurantOrSharedPlate: false,
    ingredients: splitIngredients(product.ingredients_text),
    portionDescription: product.serving_size?.trim() || `${portionGrams}g serving`,
    portionGrams,
    nutrients: {
      calories: caloriesPer100g * scale,
      proteinG: (n.proteins_100g ?? 0) * scale,
      carbsG: (n.carbohydrates_100g ?? 0) * scale,
      sugarG: (n.sugars_100g ?? 0) * scale,
      addedSugarG: (n.sugars_100g ?? 0) * scale,
      fiberG: (n.fiber_100g ?? 0) * scale,
      fatG: (n.fat_100g ?? 0) * scale,
      saturatedFatG: (n["saturated-fat_100g"] ?? 0) * scale,
      sodiumMg: (n.sodium_100g ?? 0) * 1000 * scale,
      potassiumMg: (n.potassium_100g ?? 0) * 1000 * scale,
      cholesterolMg: (n.cholesterol_100g ?? 0) * 1000 * scale,
      purineLevel: "moderate",
      glycemicLoad: "medium",
      containsGluten: "uncertain",
      containsAlcohol: /\balcohol\b|\bwine\b|\bbeer\b/i.test(product.ingredients_text ?? ""),
    },
    confidence: "medium",
    confidenceNotes: "From the product's label on Open Food Facts (community database) — double-check against the package if it matters for a medical decision.",
  };
}

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
    `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,generic_name,brands,quantity,serving_size,ingredients_text,nutriments`,
  );
  if (data?.status !== 1 || !data.product) return null;
  return mapProductToAnalysis(data.product as OffProduct);
}

export async function searchFoodByName(query: string): Promise<FoodAnalysis[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const data = await fetchJson(
    `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(trimmed)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,generic_name,brands,quantity,serving_size,ingredients_text,nutriments`,
  );
  const products: OffProduct[] = Array.isArray(data?.products) ? data.products : [];
  return products
    .map(mapProductToAnalysis)
    .filter((a): a is FoodAnalysis => a !== null)
    .slice(0, 15);
}
