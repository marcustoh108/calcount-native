import { FoodAnalysis } from "../types";

/**
 * Deterministic offline sample analyses so the app is fully explorable
 * without an API key (Cal AI / PlateLens both hard-paywall or rate-limit
 * scanning; CalCount never requires payment to try the core flow).
 */
const SAMPLES: FoodAnalysis[] = [
  {
    foodName: "Grilled chicken salad",
    description: "Mixed greens with grilled chicken breast, cherry tomatoes, and a light vinaigrette.",
    cuisineType: "American",
    isRestaurantOrSharedPlate: false,
    ingredients: [
      { name: "Grilled chicken breast", estimatedGrams: 150, likelyHidden: false },
      { name: "Mixed greens", estimatedGrams: 80, likelyHidden: false },
      { name: "Cherry tomatoes", estimatedGrams: 40, likelyHidden: false },
      { name: "Olive oil vinaigrette", estimatedGrams: 15, likelyHidden: true },
    ],
    portionDescription: "1 large bowl, about 300g",
    portionGrams: 300,
    nutrients: {
      calories: 380,
      proteinG: 42,
      carbsG: 10,
      sugarG: 4,
      addedSugarG: 1,
      fiberG: 4,
      fatG: 18,
      saturatedFatG: 3,
      sodiumMg: 320,
      potassiumMg: 520,
      cholesterolMg: 95,
      purineLevel: "moderate",
      glycemicLoad: "low",
      containsGluten: false,
      containsAlcohol: false,
    },
    confidence: "medium",
    confidenceNotes: "Dressing quantity is hard to judge from a photo — actual oil/sodium may be higher.",
  },
  {
    foodName: "Cheeseburger with fries",
    description: "A fast-food style cheeseburger with a sesame bun and a side of fried potatoes.",
    cuisineType: "American",
    isRestaurantOrSharedPlate: true,
    ingredients: [
      { name: "Beef patty", estimatedGrams: 110, likelyHidden: false },
      { name: "Cheese slice", estimatedGrams: 20, likelyHidden: false },
      { name: "Sesame bun", estimatedGrams: 70, likelyHidden: false },
      { name: "Fried potatoes", estimatedGrams: 120, likelyHidden: false },
      { name: "Frying oil", estimatedGrams: 15, likelyHidden: true },
      { name: "Sauce", estimatedGrams: 15, likelyHidden: true },
    ],
    portionDescription: "1 burger + regular fries, about 335g",
    portionGrams: 335,
    nutrients: {
      calories: 890,
      proteinG: 32,
      carbsG: 78,
      sugarG: 9,
      addedSugarG: 6,
      fiberG: 5,
      fatG: 50,
      saturatedFatG: 17,
      sodiumMg: 1180,
      potassiumMg: 780,
      cholesterolMg: 95,
      purineLevel: "moderate",
      glycemicLoad: "high",
      containsGluten: true,
      containsAlcohol: false,
    },
    confidence: "low",
    confidenceNotes: "Fried food from a restaurant — frying oil and sauce quantities are estimated, not measured.",
  },
  {
    foodName: "Steamed shrimp dumplings",
    description: "Har gow style steamed dumplings with a thin translucent wrapper.",
    cuisineType: "Cantonese",
    isRestaurantOrSharedPlate: true,
    ingredients: [
      { name: "Shrimp", estimatedGrams: 90, likelyHidden: false },
      { name: "Wheat starch wrapper", estimatedGrams: 40, likelyHidden: false },
      { name: "Soy dipping sauce", estimatedGrams: 10, likelyHidden: true },
    ],
    portionDescription: "4 pieces, about 140g",
    portionGrams: 140,
    nutrients: {
      calories: 210,
      proteinG: 14,
      carbsG: 24,
      sugarG: 1,
      addedSugarG: 0,
      fiberG: 1,
      fatG: 5,
      saturatedFatG: 1,
      sodiumMg: 560,
      potassiumMg: 190,
      cholesterolMg: 85,
      purineLevel: "high",
      glycemicLoad: "medium",
      containsGluten: "uncertain",
      containsAlcohol: false,
    },
    confidence: "medium",
    confidenceNotes: "Shrimp is a high-purine ingredient; soy sauce may contain gluten (wheat) depending on the brand.",
  },
];

let cursor = 0;

/** Cycles through sample analyses so repeated demo scans show variety. */
export function mockAnalyzeFoodPhoto(): Promise<FoodAnalysis> {
  const sample = SAMPLES[cursor % SAMPLES.length];
  cursor += 1;
  return new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(sample))), 900));
}
