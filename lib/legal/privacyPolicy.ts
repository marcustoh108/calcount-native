import { LEGAL, LegalSection } from "./config";

const { appName, owner, contactEmail, dailyScanLimit } = LEGAL;

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: "Summary",
    body: `${appName} keeps your health profile and food log on your own phone. Our servers, hosted in Singapore, hold only what they need to run your account and the daily scan limit: your email address, a securely hashed password, and scan counters. Meal photos pass through our server to our AI provider for analysis and are not stored by us. We do not sell your data, show ads, or use tracking for advertising.`,
  },
  {
    heading: "1. Who we are",
    body: `This policy explains how ${owner} ("we", "us") handles information when you use the ${appName} mobile app (the "App"). Contact us at ${contactEmail} with any privacy question or request.`,
  },
  {
    heading: "2. Information we collect",
    body: [
      "On our servers:",
      "• Account details: your email address and a securely hashed password (never the password itself), plus the dates your account was created and last signed in.",
      `• Scan counters: how many scans your account, and the phone you scan from, have made each day (identified by a random ID the App creates, not a hardware ID), so we can apply the limit of ${dailyScanLimit} scans a day.`,
      "Only on your phone:",
      "• Profile details: weight, height, age, gender, country, preferred language, units, and your weight, calorie, protein and carbohydrate goals.",
      "• Health information: the health conditions and allergies/intolerances you choose to enter. This is sensitive (\"special category\") data, and you provide it voluntarily so the App can personalise its safety checks.",
      "• Activity you log: food entries, meal photos, nutrition estimates, exercise, water, weight history, and saved foods.",
      "• Settings such as reminder preferences.",
      "Passing through our server without being stored:",
      "• Meal photos and any note you add, and barcode numbers you scan, which are sent for analysis and returned to your phone.",
      "We do not collect your precise location, contacts, or advertising identifiers.",
    ].join("\n"),
  },
  {
    heading: "3. Where your information is stored",
    body: `Our servers are provided by Supabase and located in Singapore. Everything else stays in the App's private storage and your phone's secure keychain. We cannot see your food log or health profile, and we cannot restore them if you delete the App or lose your phone. Your phone's own backups (for example iCloud or Google backups) may include App data according to your device settings.`,
  },
  {
    heading: "4. Who we share information with",
    body: [
      "• Supabase (hosting): stores your account and scan counters on our behalf, in Singapore.",
      "• Anthropic (AI food recognition): when you scan a meal, our server sends the photo and any note you typed to Anthropic's API to estimate its contents. We do not include your email or health profile. Anthropic processes this under its commercial terms and privacy policy.",
      "• Open Food Facts (food database): barcode numbers you scan are looked up by our server, and text you type into Search is sent from your phone, to the Open Food Facts public database.",
      "• Apple App Store / Google Play (subscriptions): purchases and free trials are processed by Apple or Google. We never receive your payment card details.",
      "• YouTube and other links: opening a workout video or external link takes you to that service, which has its own privacy policy.",
      "We do not sell or rent your personal information, and we do not share it for cross-context behavioural advertising. We may disclose information if required by law or to protect rights and safety.",
    ].join("\n"),
  },
  {
    heading: "5. How we use information",
    body: "To run your account and sign you in; to estimate nutrition from photos and barcodes; to calculate your BMI, calorie and macro goals, and exercise suggestions; to check foods against the conditions and allergies you've entered (on your phone); to show your history and trends; to send the local reminders you turn on; to apply the daily scan limit; to manage subscriptions; and to keep the service secure.",
  },
  {
    heading: "6. Legal bases (EEA/UK users)",
    body: "We process health information only with your explicit consent, which you give by entering it and can withdraw at any time by removing it or deleting your data. Account and scan-limit processing is necessary to provide the App you asked for (performance of a contract) or is based on our legitimate interest in keeping the App working, fair and secure.",
  },
  {
    heading: "7. Your choices and rights",
    body: `You can view and edit your profile in the App at any time. Settings → "Delete account & all data" permanently deletes your account from our servers and erases the App's data from your phone. Depending on where you live (for example under Singapore's PDPA, the GDPR, UK GDPR, or the California Consumer Privacy Act), you may have rights to access, correct, delete, restrict or object to processing, port your data, and withdraw consent. Email ${contactEmail} for any request we can't handle in the App. You may also complain to your local data protection authority.`,
  },
  {
    heading: "8. Retention",
    body: "Your account is kept until you delete it. When you do, we delete your account and its scan counters straight away. Per-phone scan counters (which contain no name or email) are kept for up to 30 days so the daily limit can't be reset by deleting and recreating an account, then deleted. Photos are not stored by us; Anthropic handles them under its retention policy. Data on your phone stays until you delete it or uninstall the App.",
  },
  {
    heading: "9. Security",
    body: "Passwords are stored only as secure hashes. Data travels between the App, our server, Anthropic and Open Food Facts over encrypted HTTPS. Access to our database is restricted so the App can only reach it through our checked server functions. No method of storage or transmission is completely secure, and you are responsible for keeping your password private and your phone locked.",
  },
  {
    heading: "10. Children",
    body: `The App is not directed to children under 13 (or under 16 in the EEA/UK), and we do not knowingly collect their information. If you believe a child has provided information, contact ${contactEmail} and we will delete it.`,
  },
  {
    heading: "11. Not a medical service",
    body: `${appName} is a general wellness app. It is not a healthcare provider, and information you enter is not covered by health-privacy laws that apply to doctors and hospitals (such as HIPAA in the United States).`,
  },
  {
    heading: "12. International transfers",
    body: "Our servers are in Singapore. Anthropic and Open Food Facts may process the photos, barcodes and search terms sent to them in other countries, including the United States and the European Union, which may have different data protection laws. Where required, we rely on appropriate safeguards for these transfers.",
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
