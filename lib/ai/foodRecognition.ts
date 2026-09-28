import {
  coerceAnalysis,
  FOOD_MAX_TOKENS,
  FOOD_MODEL,
  photoPromptText,
  stripCodeFences,
  SYSTEM_PROMPT,
} from "../../supabase/functions/_shared/foodAnalysis";
import { FoodAnalysis } from "../types";

/**
 * Local "bring your own key" mode only — used when no CalCount server is configured.
 * With a server (lib/backend), photos go through the `scan` Edge Function instead.
 */
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export class FoodRecognitionError extends Error {}

export interface AnalyzePhotoParams {
  apiKey: string;
  base64: string;
  mimeType: "image/jpeg" | "image/png";
  /** User hint, e.g. "this is a shared restaurant plate, I ate about half" */
  contextNote?: string;
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
      text: photoPromptText(contextNote),
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
        model: FOOD_MODEL,
        max_tokens: FOOD_MAX_TOKENS,
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
