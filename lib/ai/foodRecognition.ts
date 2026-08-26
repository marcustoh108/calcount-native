import { AnalysisConfidence, FoodAnalysis, IngredientEstimate, NutrientEstimate } from "../types";

const ANTHROPIC_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export class FoodRecognitionError extends Error {}

export interface AnalyzePhotoParams {
  apiKey: string;
  base64: string;
  mimeType: "image/jpeg" | "image/png";
  /** User hint, e.g. "this is a shared restaurant plate, I ate about half" */
  contextNote?: string;
}

const SYSTEM_PROMPT = `You are a nutrition-estimation assistant embedded in a mobile food-logging app.
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

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function coerceNutrients(raw: any): NutrientEstimate {
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

function coerceIngredients(raw: any): IngredientEstimate[] {
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

export async function analyzeFoodPhoto(params: AnalyzePhotoParams): Promise<FoodAnalysis> {
  const { apiKey, base64, mimeType, contextNote } = params;

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64 },
    },
    {
      type: "text",
      text: contextNote?.trim()
        ? `Additional context from the user: ${contextNote.trim()}`
        : "Analyze this food photo.",
    },
  ];

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (err) {
    throw new FoodRecognitionError(
      "Couldn't reach Anthropic's API. Check your internet connection and try again.",
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new FoodRecognitionError("Your Anthropic API key was rejected. Double-check it in Settings.");
    }
    if (response.status === 429) {
      throw new FoodRecognitionError("Rate limited by Anthropic. Wait a moment and try again.");
    }
    const bodyText = await response.text().catch(() => "");
    throw new FoodRecognitionError(`Analysis failed (${response.status}). ${bodyText.slice(0, 200)}`);
  }

  const data = await response.json();
  const textBlock = Array.isArray(data?.content)
    ? data.content.find((b: any) => b.type === "text")?.text
    : undefined;
  if (!textBlock) {
    throw new FoodRecognitionError("The model returned an unexpected response. Try again.");
  }

  try {
    const parsed = JSON.parse(stripCodeFences(textBlock));
    return coerceAnalysis(parsed);
  } catch {
    throw new FoodRecognitionError("Couldn't parse the nutrition estimate. Try retaking the photo.");
  }
}
