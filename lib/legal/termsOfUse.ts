import { LEGAL, LegalSection } from "./config";

const { appName, owner, contactEmail, governingLaw, yearlyPrice, monthlyPrice, trialDays, dailyScanLimit } = LEGAL;

export const TERMS_OF_USE: LegalSection[] = [
  {
    heading: "1. Agreement",
    body: `These Terms of Use ("Terms") are a legal agreement between you and ${owner} ("we", "us") covering your use of the ${appName} mobile app (the "App"). By creating an account or using the App, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the App.`,
  },
  {
    heading: "2. Not medical advice — please read",
    body: `The App provides general wellness and nutrition information only. It is NOT a medical device and does NOT provide medical advice, diagnosis, or treatment. Calorie, nutrient, BMI, ideal-weight, exercise, and "safe / caution / avoid" results are automated estimates based on photos, general heuristics, and AI models, and they can be wrong or incomplete. Using the App does not create a doctor–patient or dietitian–client relationship.\n\nAlways consult a qualified healthcare professional before changing your diet, medication, or exercise, especially if you have diabetes, prediabetes, gout, kidney disease, heart disease, high blood pressure, an eating disorder, or are pregnant or breastfeeding. Never ignore professional advice or delay seeking it because of something in the App. In an emergency, contact your local emergency services immediately.`,
  },
  {
    heading: "3. Allergies and food safety",
    body: "The App cannot reliably detect allergens, gluten, or hidden ingredients from a photo, barcode, or database entry. Do NOT rely on the App to decide whether a food is safe for an allergy, intolerance, or celiac disease. Always check ingredient labels and ask the food preparer.",
  },
  {
    heading: "4. Exercise",
    body: "Exercise suggestions and calorie-burn figures are generic estimates. Physical activity carries a risk of injury. Stop immediately if you feel pain, dizziness, or shortness of breath, and get medical clearance before starting a new exercise programme. You exercise at your own risk.",
  },
  {
    heading: "5. Eligibility",
    body: "You must be at least 18 years old, or the age of majority where you live, to use the App. If you are between 13 and the age of majority, you may use the App only with the consent and supervision of a parent or legal guardian who agrees to these Terms. The App is not intended for children under 13.",
  },
  {
    heading: "6. Your account",
    body: "You are responsible for the accuracy of the information you provide, for keeping your password and device secure, and for all activity under your account. Your account is held on our servers; your food log and health profile are stored only on your phone, and we cannot recover them if they are lost.",
  },
  {
    heading: "7. Subscriptions, free trial, and billing",
    body: [
      `• Plans: ${appName} Premium is offered at ${yearlyPrice} per year or ${monthlyPrice} per month (plus applicable taxes; local prices may vary by country and are shown before you buy).`,
      `• Free trial: eligible new subscribers get a ${trialDays}-day free trial. Unless you cancel at least 24 hours before the trial ends, your subscription automatically begins and you are charged the plan price.`,
      "• Auto-renewal: subscriptions renew automatically for the same period at the then-current price unless auto-renew is turned off at least 24 hours before the end of the current period. Payment is charged to your Apple ID or Google Play account.",
      "• Cancelling: manage or cancel in your device's App Store or Google Play subscription settings. Deleting the App does not cancel a subscription. Cancellation takes effect at the end of the current paid period.",
      "• Refunds: purchases are processed by Apple or Google and refunds are governed by their policies. Except where required by law, we do not provide refunds or credits for partial periods.",
      "• Price changes: we may change prices; you'll be notified in advance as required by the App Store or Google Play and applicable law.",
    ].join("\n"),
  },
  {
    heading: "8. Scan limits and fair use",
    body: `You may make up to ${dailyScanLimit} photo or barcode scans per day, counted per account and per phone, with each day ending at midnight in your phone's time zone (as checked by our servers). Creating extra accounts or otherwise working around the limit is not allowed. We may change limits or features, and may suspend access if we reasonably believe the App is being abused, reverse-engineered, or used in a way that harms the service or others.`,
  },
  {
    heading: "9. Third-party services",
    body: "The App uses third-party services, including Anthropic's API (for AI photo analysis, using an API key you provide), Open Food Facts (a public food database), Apple and Google (for purchases), and links to YouTube and other sites. We do not control and are not responsible for third-party services, their availability, accuracy, or charges; any API usage fees you incur with Anthropic are your responsibility. Your use of them is subject to their own terms.",
  },
  {
    heading: "10. Acceptable use",
    body: "You agree not to: use the App unlawfully; upload content you have no right to use or that is illegal or harmful; attempt to copy, modify, decompile, or reverse-engineer the App except as permitted by law; bypass scan limits, subscriptions, or security features; or use the App to provide medical services to others.",
  },
  {
    heading: "11. Your content",
    body: "You keep ownership of the photos and information you enter. You give us a limited licence to process that content solely to operate the App for you (for example, sending a photo to the AI service you've configured).",
  },
  {
    heading: "12. Our intellectual property",
    body: `The App, its design, text, graphics, and software are owned by ${owner} or its licensors and are protected by law. We grant you a personal, revocable, non-exclusive, non-transferable licence to use the App on devices you own or control, for personal, non-commercial purposes, subject to these Terms.`,
  },
  {
    heading: "13. Disclaimer of warranties",
    body: `TO THE FULLEST EXTENT PERMITTED BY LAW, THE APP AND ALL CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF ACCURACY, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT NUTRITION, HEALTH, OR SAFETY INFORMATION IS ACCURATE, COMPLETE, OR SUITABLE FOR YOU, OR THAT THE APP WILL BE UNINTERRUPTED OR ERROR-FREE.`,
  },
  {
    heading: "14. Limitation of liability",
    body: `TO THE FULLEST EXTENT PERMITTED BY LAW, ${owner.toUpperCase()} AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY PERSONAL INJURY, ILLNESS, ALLERGIC REACTION, LOSS OF DATA, OR LOSS OF PROFITS, ARISING FROM OR RELATED TO YOUR USE OF (OR INABILITY TO USE) THE APP OR RELIANCE ON ANY INFORMATION IN IT, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE APP WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE APP IN THE 12 MONTHS BEFORE THE CLAIM, OR (B) US$50.`,
  },
  {
    heading: "15. Indemnity",
    body: `To the extent permitted by law, you agree to indemnify and hold harmless ${owner} from any claims, losses, and expenses (including reasonable legal fees) arising from your breach of these Terms, your misuse of the App, or your violation of any law or third-party right.`,
  },
  {
    heading: "16. Your statutory rights",
    body: "Nothing in these Terms limits rights you have under consumer protection laws that cannot be excluded by contract (for example, in the EU, UK, or Australia), or excludes liability for death or personal injury caused by negligence, fraud, or anything else that cannot be limited by law. Where such laws apply, the disclaimers and limits above apply only to the extent permitted.",
  },
  {
    heading: "17. Disputes and governing law",
    body: `These Terms are governed by the laws of ${governingLaw}, without regard to conflict-of-law rules. Before bringing any claim, you agree to first contact us at ${contactEmail} and try to resolve the dispute informally for at least 30 days. To the extent permitted by law, disputes will be resolved in the courts of ${governingLaw}, and claims may be brought only on an individual basis, not as a plaintiff or class member in any class or representative action.`,
  },
  {
    heading: "18. Termination",
    body: "You may stop using the App and delete your account at any time in Settings. We may suspend or end your access if you breach these Terms. Sections that by their nature should survive (including 2–4 and 13–17) survive termination.",
  },
  {
    heading: "19. Apple App Store terms",
    body: `If you downloaded the App from Apple's App Store: these Terms are between you and ${owner}, not Apple. Apple has no obligation to provide maintenance or support, and is not responsible for the App, for any warranty claims (other than refunding the purchase price if the App fails to conform to an applicable warranty), or for any product-liability, legal-compliance, or intellectual-property claims. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you. You confirm you are not located in a country subject to a U.S. Government embargo and are not on any U.S. Government list of prohibited or restricted parties.`,
  },
  {
    heading: "20. Changes to these Terms",
    body: "We may update these Terms. We'll update the effective date and, for material changes, notify you in the App. Continuing to use the App after changes take effect means you accept them.",
  },
  {
    heading: "21. General",
    body: "If any part of these Terms is found unenforceable, the rest remains in effect. Our failure to enforce a right is not a waiver. These Terms and the Privacy Policy are the entire agreement between you and us about the App. You may not transfer these Terms; we may transfer them in connection with a merger, acquisition, or sale of assets.",
  },
  {
    heading: "22. Contact",
    body: `${owner}, Singapore — ${contactEmail}`,
  },
];
