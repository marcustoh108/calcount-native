// The legal documents describe the app as it works today: the AI scan runs on Avencia's own
// server key, so users never supply an API key or pay Anthropic directly.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(new URL(`../lib/legal/${file}`, import.meta.url), "utf8");

test("the Terms of Use don't ask users for their own API key or to pay API fees", () => {
  const terms = read("termsOfUse.ts");
  assert.doesNotMatch(terms, /API key you provide/i);
  assert.doesNotMatch(terms, /API usage fees/i);
  assert.match(terms, /Anthropic's API \(for AI photo analysis, which we provide as part of the App/);
});

test("the Privacy Policy doesn't mention a user-supplied API key", () => {
  assert.doesNotMatch(read("privacyPolicy.ts"), /your (own )?API key/i);
});
