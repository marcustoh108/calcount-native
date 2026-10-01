/**
 * Shared between the app (Metro) and the Supabase Edge Functions (Deno), so the AI prompt,
 * response parsing, barcode mapping and scan limit can never drift apart. Keep this file free of
 * imports — both runtimes must be able to load it as-is.
 */

/** Maximum AI photo + barcode scans per account (and per device) per day. */
export const DAILY_SCAN_LIMIT = 5;

/** Days are counted in Singapore time on the server. */
export const SCAN_DAY_TIMEZONE = "Asia/Singapore";

export interface NutrientEstimate {
  calories: number;
  proteinG: number;
  carbsG: number;
  sugarG: number;
  addedSugarG: number;
  fiberG: number;
  fatG: number;
  saturatedFatG: number;
  sodiumMg: number;
  potassiumMg: number;
  cholesterolMg: number;
  /** Qualitative purine load, used for gout risk. */
  purineLevel: "low" | "moderate" | "high";
  /** Estimated glycemic index bucket, used for diabetes risk. */
  glycemicLoad: "low" | "medium" | "high";
  containsGluten: boolean | "uncertain";
  containsAlcohol: boolean;
}

export interface IngredientEstimate {
  name: string;
  estimatedGrams: number;
  /** True when the AI flagged this as a likely-hidden contributor (oil, butter, sauce, sugar). */
  likelyHidden: boolean;
}

export type AnalysisConfidence = "low" | "medium" | "high";

export interface FoodAnalysis {
  foodName: string;
  description: string;
  cuisineType: string | null;
  ingredients: IngredientEstimate[];
  portionDescription: string;
  portionGrams: number;
  nutrients: NutrientEstimate;
  confidence: AnalysisConfidence;
  confidenceNotes: string | null;
  isRestaurantOrSharedPlate: boolean;
}

/** The model YumBalance uses to read food photos, and the response budget (thinking + answer). */
export const FOOD_MODEL = "claude-sonnet-5";
export const FOOD_MAX_TOKENS = 16000;
/**
 * How hard the model thinks before answering. Recognising a meal and estimating its nutrition
 * doesn't need deep reasoning, and "low" cuts the thinking tokens that dominate each scan's cost.
 * If estimates get noticeably worse, raise this to "medium".
 */
export const FOOD_EFFORT = "low" as const;

export function photoPromptText(contextNote?: string | null): string {
  const note = contextNote?.trim();
  return note ? `Additional context from the user: ${note}` : "Analyze this food photo.";
}

export const SYSTEM_PROMPT = `You are a nutrition-estimation assistant embedded in a mobile food-logging app.
You will be shown one photo of food. Identify the dish and estimate its nutrition as carefully as
a registered dietitian would, explicitly reasoning about things a camera cannot see directly:
cooking oil/butter, sauces, added sugar, and hidden salt. Prefer to slightly over-estimate calories
and sodium for restaurant-style or fried/sauced food rather than under-estimate, since users rely on
this for health-safety decisions (diabetes, gout, hypertension, kidney disease, high cholesterol,
celiac disease).

Respond with ONLY a single minified JSON object (no markdown fences, no commentary) matching exactly
this shape:
{
  "foodName": string,
  "description": string (1-2 sentences on what you see and how it appears to be prepared),
  "cuisineType": string | null,
  "isRestaurantOrSharedPlate": boolean,
  "ingredients": [ { "name": string, "estimatedGrams": number, "likelyHidden": boolean } ],
  "portionDescription": string (e.g. "1 bowl, about 350g"),
  "portionGrams": number,
  "nutrients": {
    "calories": number, "proteinG": number, "carbsG": number, "sugarG": number,
    "addedSugarG": number, "fiberG": number, "fatG": number, "saturatedFatG": number,
    "sodiumMg": number, "potassiumMg": number, "cholesterolMg": number,
    "purineLevel": "low" | "moderate" | "high",
    "glycemicLoad": "low" | "medium" | "high",
    "containsGluten": true | false | "uncertain",
    "containsAlcohol": boolean
  },
  "confidence": "low" | "medium" | "high",
  "confidenceNotes": string | null (call out specifically what is uncertain, e.g. "can't see how much oil was used to fry this")
}
"likelyHidden" should be true for ingredients like cooking oil, butter, cream, sauce, or added sugar
that a camera can't directly measure. Set "confidence" to "low" whenever the dish is a mixed/composite
dish, a shared plate, or a cuisine you are not highly certain about.`;

export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function coerceNutrients(raw: any): NutrientEstimate {
  const purine = ["low", "moderate", "high"].includes(raw?.purineLevel) ? raw.purineLevel : "moderate";
  const gl = ["low", "medium", "high"].includes(raw?.glycemicLoad) ? raw.glycemicLoad : "medium";
  const gluten = raw?.containsGluten === true || raw?.containsGluten === false ? raw.containsGluten : "uncertain";
  return {
    calories: num(raw?.calories),
    proteinG: num(raw?.proteinG),
    carbsG: num(raw?.carbsG),
    sugarG: num(raw?.sugarG),
    addedSugarG: num(raw?.addedSugarG),
    fiberG: num(raw?.fiberG),
    fatG: num(raw?.fatG),
    saturatedFatG: num(raw?.saturatedFatG),
    sodiumMg: num(raw?.sodiumMg),
    potassiumMg: num(raw?.potassiumMg),
    cholesterolMg: num(raw?.cholesterolMg),
    purineLevel: purine,
    glycemicLoad: gl,
    containsGluten: gluten,
    containsAlcohol: Boolean(raw?.containsAlcohol),
  };
}

export function coerceIngredients(raw: any): IngredientEstimate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => i && typeof i.name === "string")
    .map((i) => ({
      name: i.name,
      estimatedGrams: num(i.estimatedGrams),
      likelyHidden: Boolean(i.likelyHidden),
    }));
}

export function coerceAnalysis(raw: any): FoodAnalysis {
  const confidence: AnalysisConfidence = ["low", "medium", "high"].includes(raw?.confidence)
    ? raw.confidence
    : "medium";
  return {
    foodName: typeof raw?.foodName === "string" && raw.foodName.trim() ? raw.foodName.trim() : "Unknown food",
    description: typeof raw?.description === "string" ? raw.description : "",
    cuisineType: typeof raw?.cuisineType === "string" ? raw.cuisineType : null,
    isRestaurantOrSharedPlate: Boolean(raw?.isRestaurantOrSharedPlate),
    ingredients: coerceIngredients(raw?.ingredients),
    portionDescription: typeof raw?.portionDescription === "string" ? raw.portionDescription : "1 serving",
    portionGrams: num(raw?.portionGrams, 250),
    nutrients: coerceNutrients(raw?.nutrients),
    confidence,
    confidenceNotes: typeof raw?.confidenceNotes === "string" ? raw.confidenceNotes : null,
  };
}

// ---- Open Food Facts (barcode / text search) ----

export const OFF_BASE_URL = "https://world.openfoodfacts.org";
export const OFF_PRODUCT_FIELDS =
  "product_name,generic_name,brands,quantity,serving_size,ingredients_text,nutriments";

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

export interface OffProduct {
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

export function mapProductToAnalysis(product: OffProduct): FoodAnalysis | null {
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
