import { DAILY_SCAN_LIMIT } from "../../supabase/functions/_shared/foodAnalysis";

/**
 * Company and contact details used throughout the Privacy Policy, Terms of Use, and Help.
 * Have a Singapore lawyer review both documents before release.
 */
export const LEGAL = {
  appName: "YumBalance",
  owner: "Avencia Private Limited",
  contactEmail: "connect@avencia.io",
  governingLaw: "Singapore",
  effectiveDate: "14 October 2026",
  // Singapore dollars, the price set in each store's Singapore storefront. Other countries see
  // the store's local equivalent. Keep in step with website/src/pages/yumbalance.html.
  yearlyPrice: "S$99.99",
  monthlyPrice: "S$13.99",
  yearlyPerMonth: "S$8.33",
  yearlySaving: "Save 40%",
  trialDays: 3,
  dailyScanLimit: DAILY_SCAN_LIMIT,
} as const;

export interface LegalSection {
  heading: string;
  body: string;
}
