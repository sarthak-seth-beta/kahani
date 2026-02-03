/**
 * Test thanks_ff matching with params from logs.
 * Run: node scripts/test-thanks-ff-match.js
 *
 * Log params:
 * - trialId: '09e30691-e399-4423-a91e-f09ea679324c'
 * - fromNumber: '919723384957'
 * - responseText from webhook: button.text / button.payload = "Yes, let's talk"
 */

function normalize(responseText) {
  return responseText
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019''`]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

function testThanksFFMatch(responseText) {
  const normalized = normalize(responseText);

  const positivePatterns = ["yes, let's talk", "हाँ, बात करते हैं"];
  const negativePatterns = ["not now, tomorrow", "अभी नहीं, कल"];
  const normalizedPositive = positivePatterns.map((p) => normalize(p));
  const normalizedNegative = negativePatterns.map((p) => normalize(p));

  const isPositive = normalizedPositive.some((p) => normalized === p);
  const isNegative = normalizedNegative.some((p) => normalized === p);

  const charCodes = Array.from(normalized)
    .slice(0, 25)
    .map((c) => `${c}(U+${c.charCodeAt(0).toString(16)})`)
    .join(" ");

  return {
    responseText,
    normalized,
    normalizedLength: normalized.length,
    isPositive,
    isNegative,
    wouldHandle: isPositive || isNegative,
    charCodes,
    expectedPattern: "yes, let's talk",
    normalizedExpected: normalize("yes, let's talk"),
    strictEqual: normalized === normalize("yes, let's talk"),
  };
}

// Exact string from webhook (as in logs). In JSON the apostrophe might be Unicode.
const fromWebhook = "Yes, let's talk";

// Also test with explicit Unicode apostrophe (U+2019) in "let's"
const withUnicodeApostrophe = "Yes, let\u2019s talk";

// ASCII apostrophe only
const withAsciiApostrophe = "Yes, let's talk";

console.log("=== Params from logs ===");
console.log("trialId: 09e30691-e399-4423-a91e-f09ea679324c");
console.log("fromNumber: 919723384957");
console.log("responseText (from button.text):", JSON.stringify(fromWebhook));
console.log("");

console.log(
  "=== Test 1: string as in logs (may be ASCII or Unicode apostrophe) ===",
);
const r1 = testThanksFFMatch(fromWebhook);
console.log(JSON.stringify(r1, null, 2));
console.log("Char codes (first 25):", r1.charCodes);
console.log("");

console.log("=== Test 2: explicit Unicode apostrophe U+2019 in let's ===");
const r2 = testThanksFFMatch(withUnicodeApostrophe);
console.log(JSON.stringify(r2, null, 2));
console.log("Char codes:", r2.charCodes);
console.log("");

console.log("=== Test 3: ASCII apostrophe only ===");
const r3 = testThanksFFMatch(withAsciiApostrophe);
console.log(JSON.stringify(r3, null, 2));
console.log("");

// Hindi variants (from thanks_ff template)
const hindiPositive = "हाँ, बात करते हैं";
const hindiNegative = "अभी नहीं, कल";
const englishNegative = "Not now, tomorrow";

console.log("=== Test 4: Hindi positive (हाँ, बात करते हैं) ===");
const r4 = testThanksFFMatch(hindiPositive);
console.log(JSON.stringify(r4, null, 2));
console.log("Char codes (first 25):", r4.charCodes);
console.log("");

console.log("=== Test 5: Hindi negative (अभी नहीं, कल) ===");
const r5 = testThanksFFMatch(hindiNegative);
console.log(JSON.stringify(r5, null, 2));
console.log("Char codes (first 25):", r5.charCodes);
console.log("");

console.log("=== Test 6: English negative (Not now, tomorrow) ===");
const r6 = testThanksFFMatch(englishNegative);
console.log(JSON.stringify(r6, null, 2));
console.log("");

console.log("=== Summary ===");
console.log("English positive - Would handle (Test 1):", r1.wouldHandle);
console.log("English positive - Would handle (Test 2):", r2.wouldHandle);
console.log("English positive - Would handle (Test 3):", r3.wouldHandle);
console.log(
  "Hindi positive   - Would handle (Test 4):",
  r4.wouldHandle,
  r4.isPositive ? "(isPositive)" : "",
);
console.log(
  "Hindi negative   - Would handle (Test 5):",
  r5.wouldHandle,
  r5.isNegative ? "(isNegative)" : "",
);
console.log(
  "English negative - Would handle (Test 6):",
  r6.wouldHandle,
  r6.isNegative ? "(isNegative)" : "",
);
