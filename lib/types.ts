// Core domain types shared across the app.

export type HealthCondition =
  | "diabetes"
  | "gout"
  | "hypertension"
  | "kidney_disease"
  | "high_cholesterol"
  | "celiac";

export const HEALTH_CONDITION_LABELS: Record<HealthCondition, string> = {
  diabetes: "Diabetes",
  gout: "Gout",
  hypertension: "Hypertension",
  kidney_disease: "Kidney disease",
  high_cholesterol: "High cholesterol / heart disease",
  celiac: "Celiac / gluten sensitivity",
};

export const HEALTH_CONDITION_ORDER: HealthCondition[] = [
  "diabetes",
  "gout",
  "hypertension",
  "kidney_disease",
  "high_cholesterol",
  "celiac",
];

export type UnitSystem = "metric" | "imperial";

export interface HealthProfile {
  conditions: HealthCondition[];
  allergies: string[];
  dailyCalorieGoal: number | null;
  units: UnitSystem;
  onboardingComplete: boolean;
}

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  conditions: [],
  allergies: [],
  dailyCalorieGoal: null,
  units: "metric",
  onboardingComplete: false,
};

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

export type EntrySource = "camera" | "gallery" | "manual" | "saved_food";

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

export type SafetyLevel = "safe" | "caution" | "avoid";

export interface SafetyAssessment {
  condition: HealthCondition | "allergy";
  level: SafetyLevel;
  reason: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export interface FoodEntry {
  id: string;
  createdAt: string; // ISO timestamp
  mealType: MealType;
  photoUri: string | null;
  analysis: FoodAnalysis;
  safety: SafetyAssessment[];
  servings: number;
  source: EntrySource;
  notes: string | null;
}

export interface SavedFood {
  id: string;
  name: string;
  analysis: FoodAnalysis;
  createdAt: string;
}

export interface DailyWaterLog {
  date: string; // yyyy-mm-dd
  cupsLogged: number;
}
