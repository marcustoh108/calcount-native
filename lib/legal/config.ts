import { DAILY_SCAN_LIMIT } from "../../supabase/functions/_shared/foodAnalysis";

/**
 * Company and contact details used throughout the Privacy Policy, Terms of Use, and Help.
 * Have a Singapore lawyer review both documents before release.
 */
export const LEGAL = {
  appName: "YumBalance",
  owner: "Avencia Private Limited",
  contactEmail: "admin@avencia-solutions.com",
  governingLaw: "Singapore",
  effectiveDate: "4 October 2026",
  yearlyPrice: "US$79.99",
  monthlyPrice: "US$12.99",
  trialDays: 3,
  dailyScanLimit: DAILY_SCAN_LIMIT,
} as const;

export interface LegalSection {
  heading: string;
  body: string;
}
