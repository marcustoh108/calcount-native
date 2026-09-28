import { LEGAL, LegalSection } from "./config";

const { appName, owner, contactEmail } = LEGAL;

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: "Summary",
    body: `${appName} is built to keep your information on your own phone. We do not run servers that store your food log, health details, or photos, we do not sell your data, and we do not show ads or use tracking for advertising. The only times information leaves your device are described in "Who we share information with" below.`,
  },
  {
    heading: "1. Who we are",
    body: `This policy explains how ${owner} ("we", "us") handles information when you use the ${appName} mobile app (the "App"). Contact us at ${contactEmail} with any privacy question or request.`,
  },
  {
    heading: "2. Information the App collects",
    body: [
      "• Account details: your email address and a salted, one-way hash of your password (never the password itself).",
      "• Profile details: weight, height, age, gender, country, preferred language, units, and your weight, calorie, protein and carbohydrate goals.",
      "• Health information: the health conditions and allergies/intolerances you choose to enter. This is sensitive (\"special category\") data, and you provide it voluntarily so the App can personalise its safety checks.",
      "• Activity you log: food entries, meal photos, nutrition estimates, exercise, water, weight history, and saved foods.",
      "• Settings: reminder preferences and, if you add one, your own Anthropic API key (kept in your device's secure keychain).",
      "• Usage counters kept on your device, such as how many scans you've made today.",
      "We do not collect your precise location, contacts, or advertising identifiers.",
    ].join("\n"),
  },
  {
    heading: "3. Where your information is stored",
    body: `Everything listed above is stored locally on your device, in the App's private storage and your operating system's secure keychain. ${appName} does not currently operate a cloud account or backup service, so we cannot see, recover, or restore your data. If you delete the App or lose your device, your data may be lost. Your device's own backups (for example iCloud or Google backups) may include App data according to your device settings.`,
  },
  {
    heading: "4. Who we share information with",
    body: [
      "• Anthropic (AI food recognition): when you scan a meal with your own Anthropic API key added, the photo and any note you type are sent directly from your device to Anthropic's API to estimate its contents. Anthropic processes this under its own terms and privacy policy. In demo mode (no key), no photo leaves your device.",
      "• Open Food Facts (barcode lookups): when you scan a barcode or search for a food, the barcode number or search text is sent to the Open Food Facts public database.",
      "• Apple App Store / Google Play (subscriptions): purchases and free trials are processed by Apple or Google. We never receive your payment card details.",
      "• YouTube and other links: opening a workout video or external link takes you to that service, which has its own privacy policy.",
      "We do not sell or rent your personal information, and we do not share it for cross-context behavioural advertising. We may disclose information if required by law or to protect rights and safety.",
    ].join("\n"),
  },
  {
    heading: "5. How we use information",
    body: "To calculate your BMI, calorie and macro goals, and exercise suggestions; to estimate nutrition from photos; to check foods against the conditions and allergies you've entered; to show your history and trends; to send the local reminders you turn on; and to enforce daily scan limits and manage subscriptions.",
  },
  {
    heading: "6. Legal bases (EEA/UK users)",
    body: "We process health information only with your explicit consent, which you give by entering it and can withdraw at any time by removing it or deleting your data. Other processing is necessary to provide the App you asked for (performance of a contract) or is based on our legitimate interest in keeping the App working and secure.",
  },
  {
    heading: "7. Your choices and rights",
    body: `You can view and edit your information in the App at any time. You can permanently delete your account and all App data from Settings → "Delete account & all data". Depending on where you live (for example under the GDPR, UK GDPR, the California Consumer Privacy Act, or Singapore's PDPA), you may have rights to access, correct, delete, restrict or object to processing, port your data, and withdraw consent. Because your data is held on your device, most of these rights can be exercised directly in the App; for anything else, email ${contactEmail}. You may also complain to your local data protection authority.`,
  },
  {
    heading: "8. Retention",
    body: "Your information stays on your device until you delete it, delete your account in the App, or uninstall the App. Scan photos sent to Anthropic are handled under Anthropic's retention policy.",
  },
  {
    heading: "9. Security",
    body: "Your API key and account credentials are kept in the operating system's encrypted keychain, and passwords are stored only as salted hashes. Data sent to Anthropic and Open Food Facts travels over encrypted HTTPS. No method of storage or transmission is completely secure, and you are responsible for keeping your device locked and protected.",
  },
  {
    heading: "10. Children",
    body: `The App is not directed to children under 13 (or under 16 in the EEA/UK), and we do not knowingly collect their information. If you believe a child has provided information, contact ${contactEmail} and delete the data from the App.`,
  },
  {
    heading: "11. Not a medical service",
    body: `${appName} is a general wellness app. It is not a healthcare provider, and information you enter is not covered by health-privacy laws that apply to doctors and hospitals (such as HIPAA in the United States).`,
  },
  {
    heading: "12. International transfers",
    body: "Services such as Anthropic and Open Food Facts may process data in countries other than yours, including the United States and the European Union, which may have different data protection laws.",
  },
  {
    heading: "13. Changes to this policy",
    body: "We may update this policy. We'll change the effective date above and, for material changes, notify you in the App. Continuing to use the App after a change means you accept the updated policy.",
  },
  {
    heading: "14. Contact and Data Protection Officer",
    body: `${owner}, Singapore. For privacy questions, requests, or to reach our Data Protection Officer (as required under Singapore's Personal Data Protection Act), email ${contactEmail}.`,
  },
];
