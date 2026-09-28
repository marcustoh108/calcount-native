/**
 * Fill these in before publishing — they appear throughout the Privacy Policy and Terms of Use.
 * Have a lawyer in your jurisdiction review both documents before release.
 */
export const LEGAL = {
  appName: "CalCount",
  /** The person or company that publishes the app, e.g. "Jane Doe" or "Acme Health Pte. Ltd.". */
  owner: "[OWNER NAME / COMPANY]",
  contactEmail: "[CONTACT EMAIL]",
  /** e.g. "Singapore" or "the State of California, USA". */
  governingLaw: "[GOVERNING LAW JURISDICTION]",
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
