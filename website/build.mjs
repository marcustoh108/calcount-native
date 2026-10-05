// Builds the static Avencia website into website/public/.
//
//   node website/build.mjs
//
// • Pages in website/src/pages/*.html are wrapped in the shared layout (head, header, footer).
//   The first line of each is an HTML comment holding the page's settings as JSON.
// • The YumBalance Privacy Policy and Terms of Use are generated from the app's own legal text in
//   lib/legal/, so the website and the app can never disagree.
// • Also writes sitemap.xml. Run it after editing anything in src/ or lib/legal/, and commit public/.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "public");
const SITE = "https://avencia.io";
const YEAR = 2026;
const COMPANY = "Avencia Private Limited";
const UEN = "202507507K";
const EMAIL = "connect@avencia.io";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- logos ----------
// Avencia's mark: a fine-line "A" in the text colour with a gold point, so it sits quietly on both
// the Avencia pages and the YumBalance pages' footer.
const avenciaLogo = (size = 30) => `<svg width="${size}" height="${size}" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M6 25 15 5l9 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="15" cy="18.2" r="2.4" fill="var(--gold, #B08D4F)"/>
      </svg>`;
const yumLogo = (size = 30) => `<svg width="${size}" height="${size}" viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="12" fill="none" stroke="var(--line)" stroke-width="4"/>
        <circle cx="15" cy="15" r="12" fill="none" stroke="var(--protein)" stroke-width="4" stroke-dasharray="20 100" stroke-linecap="round" transform="rotate(-90 15 15)"/>
        <circle cx="15" cy="15" r="12" fill="none" stroke="var(--carbs)" stroke-width="4" stroke-dasharray="18 100" stroke-dashoffset="-25" stroke-linecap="round" transform="rotate(-90 15 15)"/>
        <circle cx="15" cy="15" r="12" fill="none" stroke="var(--fat)" stroke-width="4" stroke-dasharray="14 100" stroke-dashoffset="-48" stroke-linecap="round" transform="rotate(-90 15 15)"/>
      </svg>`;

// ---------- header ----------
const NAV = {
  avencia: {
    brand: `<a class="brand" href="/" aria-label="Avencia home">
      ${avenciaLogo(30)}
      Avencia
    </a>`,
    links: [["About", "/#about"], ["Products", "/#products"], ["Newsletter", "/#newsletter"], ["Contact", "/#contact"]],
    cta: ["Explore YumBalance", "/yumbalance/"],
    extra: [],
  },
  yumbalance: {
    brand: `<a class="brand" href="/yumbalance/" aria-label="YumBalance home">
      ${yumLogo(30)}
      YumBalance
    </a>`,
    links: [["How it works", "/yumbalance/#how"], ["Health checks", "/yumbalance/#health"], ["Pricing", "/yumbalance/#pricing"], ["FAQ", "/yumbalance/#faq"], ["Support", "/yumbalance/support/"]],
    cta: ["Start free trial", "/yumbalance/#pricing"],
    extra: [["Avencia home", "/"]],
  },
};

function header(brand, pagePath) {
  const n = NAV[brand];
  const link = ([label, href]) => `<a href="${href}"${href === pagePath ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="nav">
  <div class="wrap">
    ${n.brand}
    <nav class="nav-links" aria-label="Main">
      ${n.links.map(link).join("\n      ")}
    </nav>
    <a class="btn btn-ink nav-cta" href="${n.cta[1]}">${n.cta[0]}</a>
    <details class="menu">
      <summary aria-label="Menu"><span class="burger" aria-hidden="true"></span></summary>
      <nav class="menu-panel" aria-label="Menu">
        ${[...n.links, ...n.extra].map(link).join("\n        ")}
        <a class="btn btn-ink" href="${n.cta[1]}">${n.cta[0]}</a>
      </nav>
    </details>
  </div>
</header>`;
}

// ---------- footer ----------
function footer(brand) {
  const disclaimer = brand === "yumbalance"
    ? `\n      <p class="disclaimer">YumBalance provides general wellness information based on estimates. It is not a medical device and does not provide medical advice, diagnosis or treatment.</p>`
    : "";
  return `<footer>
  <div class="wrap">
    <div>
      <a class="brand" href="/" style="font-size:18px">
        ${avenciaLogo(24)}
        Avencia
      </a>
      <p class="disclaimer">An AI-first technology company building intelligent products that solve real-world problems.</p>${disclaimer}
    </div>
    <div>
      <h2>Company</h2>
      <ul>
        <li><a href="/#about">About us</a></li>
        <li><a href="/#products">Products</a></li>
        <li><a href="/#newsletter">Newsletter</a></li>
        <li><a href="/#contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <h2>YumBalance</h2>
      <ul>
        <li><a href="/yumbalance/">Overview</a></li>
        <li><a href="/yumbalance/support/">Support</a></li>
        <li><a href="/yumbalance/privacy/">Privacy Policy</a></li>
        <li><a href="/yumbalance/terms/">Terms of Use</a></li>
        <li><a href="/yumbalance/delete-account/">Delete account</a></li>
      </ul>
    </div>
    <div>
      <h2>Legal</h2>
      <ul>
        <li><a href="/privacy/">Website Privacy Policy</a></li>
        <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
      </ul>
    </div>
    <div class="legal">
      <span>© ${YEAR} ${COMPANY}. UEN ${UEN}. All rights reserved.</span>
      <span>YumBalance is a product of ${COMPANY}.</span>
    </div>
  </div>
</footer>`;
}

// ---------- page shell ----------
// Each brand has its own look: YumBalance keeps its bright, playful product style; Avencia pages add
// avencia.css (serif headlines, navy/ivory/gold) on top of the shared base styles.
const THEME = {
  avencia: {
    fonts: "family=Instrument+Serif:ital@0;1&amp;family=Inter:wght@400;500;600;700",
    css: ["avencia.css"],
    themeColor: { light: "#F6F4EF", dark: "#0A111D" },
  },
  yumbalance: {
    fonts: "family=Syne:wght@600;700;800&amp;family=Instrument+Sans:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@500;700",
    css: [],
    themeColor: { light: "#FAF9FF", dark: "#0B0C1A" },
  },
};

function layout(meta, body) {
  const theme = THEME[meta.brand];
  if (!theme) throw new Error(`${meta.path}: unknown brand "${meta.brand}"`);
  const icon = meta.brand === "yumbalance" ? "/assets/yumbalance-icon.svg" : "/assets/avencia-icon.svg";
  const url = SITE + (meta.path === "/404.html" ? "/" : meta.path);
  const css = [...theme.css, ...(meta.css || [])].map((f) => `\n<link rel="stylesheet" href="/assets/${f}">`).join("");
  const scripts = ["config.js", ...(meta.js || []), "site.js"]
    .filter((f, i, all) => all.indexOf(f) === i)
    .filter((f) => f !== "config.js" || (meta.js || []).some((j) => j === "newsletter.js" || j === "delete-account.js"))
    .map((f) => `\n<script src="/assets/${f}" defer></script>`).join("");
  return `<!doctype html>
<html lang="en" data-brand="${meta.brand}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
${meta.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${meta.brand === "yumbalance" ? "YumBalance by Avencia" : "Avencia"}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${url}">
<meta name="theme-color" content="${theme.themeColor.light}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${theme.themeColor.dark}" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="${icon}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${icon}">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${theme.fonts}&amp;display=swap">
<link rel="stylesheet" href="/assets/site.css">${css}${scripts}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(meta.brand, meta.path)}
<main id="main">
${body.trim()}
</main>
${footer(meta.brand)}
</body>
</html>
`;
}

function outFile(meta) {
  if (meta.out) return path.join(out, meta.out);
  return path.join(out, meta.path.replace(/^\//, ""), "index.html");
}

function write(meta, body) {
  const file = outFile(meta);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, layout(meta, body));
  return meta;
}

// ---------- legal text → HTML ----------
function linkify(html) {
  return html
    .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1">$1</a>')
    .replace(/(^|[\s(])((?:apps\.apple\.com|play\.google\.com)[^\s)]*)/g, '$1<a href="https://$2" rel="noopener">$2</a>');
}

function renderBody(text) {
  const lines = text.split("\n");
  const html = [];
  let list = null;
  for (const line of lines) {
    if (line.startsWith("• ")) {
      if (!list) { list = []; }
      list.push(`<li>${linkify(esc(line.slice(2)))}</li>`);
      continue;
    }
    if (list) { html.push(`<ul>\n${list.join("\n")}\n</ul>`); list = null; }
    if (line.trim()) html.push(`<p>${linkify(esc(line))}</p>`);
  }
  if (list) html.push(`<ul>\n${list.join("\n")}\n</ul>`);
  return html.join("\n");
}

const slug = (s) => s.toLowerCase().replace(/^\d+\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function legalPage({ eyebrow, title, effective, intro, sections }) {
  const toc = sections.filter((s) => /^\d+\./.test(s.heading));
  return `<section class="page-hero">
  <div class="aurora soft" aria-hidden="true"><span class="a1"></span><span class="a2"></span></div>
  <div class="wrap">
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1 style="margin-top:14px">${esc(title)}</h1>
    <p class="doc-meta">Effective ${esc(effective)}</p>
  </div>
</section>
<section style="padding-bottom:88px">
  <div class="wrap doc">
${intro || ""}
    <nav class="toc" aria-label="Contents">
      <p class="eyebrow">Contents</p>
      <ol>
${toc.map((s) => `        <li><a href="#${slug(s.heading)}">${esc(s.heading.replace(/^\d+\.\s*/, ""))}</a></li>`).join("\n")}
      </ol>
    </nav>
${sections.map((s) => `    <h2 id="${slug(s.heading)}">${esc(s.heading)}</h2>\n${renderBody(s.body)}`).join("\n")}
  </div>
</section>`;
}

// Load lib/legal/*.ts by transpiling it with the repo's TypeScript compiler.
async function loadLegal() {
  const require = createRequire(path.join(root, "package.json"));
  const ts = require("typescript");
  const tmp = fs.mkdtempSync(path.join(root, "node_modules", ".website-legal-"));
  const files = {
    foodAnalysis: path.join(root, "supabase/functions/_shared/foodAnalysis.ts"),
    config: path.join(root, "lib/legal/config.ts"),
    privacyPolicy: path.join(root, "lib/legal/privacyPolicy.ts"),
    termsOfUse: path.join(root, "lib/legal/termsOfUse.ts"),
  };
  try {
    for (const [name, file] of Object.entries(files)) {
      let src = fs.readFileSync(file, "utf8");
      let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
      js = js.replace(/from\s+["'](\.{1,2}\/[^"']+)["']/g, (_, spec) => `from "./${path.basename(spec).replace(/\.ts$/, "")}.mjs"`);
      fs.writeFileSync(path.join(tmp, `${name}.mjs`), js);
    }
    const load = (n) => import(pathToFileURL(path.join(tmp, `${n}.mjs`)).href);
    const [{ LEGAL }, { PRIVACY_POLICY }, { TERMS_OF_USE }] = await Promise.all([load("config"), load("privacyPolicy"), load("termsOfUse")]);
    return { LEGAL, PRIVACY_POLICY, TERMS_OF_USE };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------- Avencia website privacy policy ----------
const WEBSITE_PRIVACY = [
  { heading: "1. Who we are", body: `This policy explains how ${COMPANY} (UEN ${UEN}) ("Avencia", "we", "us") handles personal data when you visit avencia.io (the "Website"). Each of our products has its own privacy policy; for our YumBalance app, see avencia.io/yumbalance/privacy.` },
  { heading: "2. What we collect", body: [
    "• Newsletter sign-ups: the email address you enter, when you signed up, and which form you used.",
    "• Messages you send us: if you email us, we receive your email address and whatever you include in your message.",
    "• Technical data: like any website, our hosting provider automatically processes your IP address, browser type and the pages you request, to deliver the Website and protect it from abuse.",
    "• Account deletion page: if you use it, the email and password or code you enter are sent securely to our sign-in service to confirm it's you. The page doesn't store them.",
    "We do not use cookies, analytics, advertising trackers or social media pixels on the Website.",
  ].join("\n") },
  { heading: "3. How we use it", body: "To send you the newsletter you asked for (news about our products and company), to reply to your messages, to process account deletion requests, and to operate and secure the Website." },
  { heading: "4. Who we share it with", body: [
    "We use trusted service providers who process data on our behalf:",
    "• Netlify: hosts the Website.",
    "• Supabase: stores newsletter sign-ups and runs our sign-in service, on servers in Singapore.",
    "• Google Fonts: serves the Website's fonts, and receives your IP address when your browser loads them.",
    "• Our email providers: deliver and store emails we send and receive.",
    "We do not sell or rent your personal data, and we do not share it for advertising. We may disclose it if required by law or to protect rights and safety.",
  ].join("\n") },
  { heading: "5. Retention", body: "We keep your newsletter email address until you unsubscribe, then delete it within 30 days. We keep emails you send us for as long as needed to deal with your request and meet our legal obligations. Hosting logs are kept only for a short period by our hosting provider." },
  { heading: "6. Your choices and rights", body: `You can unsubscribe from the newsletter at any time using the link in any newsletter email, or by emailing ${EMAIL} with the subject "Unsubscribe". Depending on where you live (for example under Singapore's Personal Data Protection Act, the GDPR or UK GDPR), you may have rights to access, correct or delete your personal data, to object to or restrict its use, and to withdraw consent. To make a request, email ${EMAIL}. You may also complain to your local data protection authority.` },
  { heading: "7. Security", body: "The Website is served only over encrypted HTTPS with modern security headers, and our systems are configured so that newsletter sign-ups can be added from the Website but never read back from it. No method of transmission or storage is completely secure, but we work hard to protect your data." },
  { heading: "8. Children", body: `The Website is not directed to children under 13, and we do not knowingly collect their personal data. If you believe a child has given us personal data, contact ${EMAIL} and we will delete it.` },
  { heading: "9. International transfers", body: "Our service providers may process data in countries other than your own, which may have different data protection laws. Where required, we rely on appropriate safeguards for these transfers." },
  { heading: "10. Changes", body: "We may update this policy. We will change the effective date above, and for material changes we will highlight the update on the Website." },
  { heading: "11. Contact and Data Protection Officer", body: `For any privacy question or request, or to reach our Data Protection Officer, email ${EMAIL}.` },
];

// ---------- build ----------
const pages = [];

for (const file of fs.readdirSync(path.join(here, "src/pages")).filter((f) => f.endsWith(".html")).sort()) {
  const raw = fs.readFileSync(path.join(here, "src/pages", file), "utf8");
  const m = raw.match(/^<!--(\{.*?\})-->\n/);
  if (!m) throw new Error(`${file}: first line must be <!--{...page settings...}-->`);
  pages.push(write(JSON.parse(m[1]), raw.slice(m[0].length)));
}

const { LEGAL, PRIVACY_POLICY, TERMS_OF_USE } = await loadLegal();

pages.push(write(
  { path: "/yumbalance/privacy/", brand: "yumbalance", title: "YumBalance Privacy Policy", description: "How YumBalance, by Avencia Private Limited, collects, uses and protects your information." },
  legalPage({
    eyebrow: "YumBalance · Privacy Policy",
    title: "Privacy Policy",
    effective: LEGAL.effectiveDate,
    intro: `    <div class="callout">
      <p><strong>Want to delete your account?</strong> Use Settings → Delete account &amp; all data in the app, or <a href="/yumbalance/delete-account/">delete your account on the web</a>.</p>
      <p>Questions about your data? Email <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
    </div>`,
    sections: PRIVACY_POLICY,
  }),
));

pages.push(write(
  { path: "/yumbalance/terms/", brand: "yumbalance", title: "YumBalance Terms of Use", description: "The terms that apply when you use the YumBalance app, by Avencia Private Limited." },
  legalPage({ eyebrow: "YumBalance · Terms of Use", title: "Terms of Use", effective: LEGAL.effectiveDate, sections: TERMS_OF_USE }),
));

pages.push(write(
  { path: "/privacy/", brand: "avencia", title: "Privacy Policy · Avencia", description: "How Avencia Private Limited handles personal data on avencia.io, including newsletter sign-ups." },
  legalPage({ eyebrow: "Avencia · Website privacy", title: "Website Privacy Policy", effective: "30 September 2026", sections: WEBSITE_PRIVACY }),
));

const indexed = pages.filter((p) => !p.noindex).map((p) => p.path).sort();
fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`);

console.log(`Built ${pages.length} pages into ${path.relative(root, out)}/`);
