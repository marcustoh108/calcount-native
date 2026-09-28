/**
 * Company and contact details used throughout the Privacy Policy, Terms of Use, and Help.
 * Have a Singapore lawyer review both documents before release.
 */
export const LEGAL = {
  appName: "CalCount",
  owner: "Avencia Private Limited",
  contactEmail: "admin@avencia-solutions.com",
  governingLaw: "Singapore",
  effectiveDate: "27 September 2026",
  yearlyPrice: "US$69.90",
  monthlyPrice: "US$12.90",
  trialDays: 3,
  dailyScanLimit: 5,
} as const;

export interface LegalSection {
  heading: string;
  body: string;
}
