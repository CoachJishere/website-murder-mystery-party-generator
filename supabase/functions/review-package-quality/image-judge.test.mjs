// Run: node --experimental-strip-types supabase/functions/review-package-quality/image-judge.test.mjs
import assert from "node:assert/strict";
import * as J from "./image-judge.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };
const base = { transcription: "NONE", readable_text: "none", watermark_or_logo: false, subject_matches_card: "yes", problems: "", retry_prompt: "" };
const card = { title: "The Leverage List", description: "A crumpled page torn from a notebook under the heading LEVERAGE LIST." };

t("parseJudge accepts a full report and rejects unusable ones", () => {
  const ok = J.parseJudge({ ...base, retry_prompt: "  a prompt  " });
  assert.equal(ok.retry_prompt, "a prompt");
  assert.equal(J.parseJudge(null), null);
  assert.equal(J.parseJudge("x"), null);
  assert.equal(J.parseJudge({ ...base, readable_text: "weird" }), null);
  assert.equal(J.parseJudge({ ...base, subject_matches_card: "maybe" }), null);
  assert.equal(J.parseJudge({ ...base, watermark_or_logo: "no" }), null);
  assert.equal(J.parseJudge({ ...base, transcription: undefined }).transcription, "");
});

t("judgePasses: gibberish, watermark and a wrong subject fail; partly matching passes", () => {
  assert.equal(J.judgePasses(base), true);
  assert.equal(J.judgePasses({ ...base, readable_text: "real_words_only" }), true);
  assert.equal(J.judgePasses({ ...base, readable_text: "some_gibberish" }), false);
  assert.equal(J.judgePasses({ ...base, readable_text: "mostly_gibberish" }), false);
  assert.equal(J.judgePasses({ ...base, watermark_or_logo: true }), false);
  assert.equal(J.judgePasses({ ...base, subject_matches_card: "partly" }), true);
  assert.equal(J.judgePasses({ ...base, subject_matches_card: "no" }), false);
});

t("judgeScore orders clean above partly above gibberish above wrong subject with watermark", () => {
  const s = (o) => J.judgeScore({ ...base, ...o });
  assert.equal(s({}), 10);
  assert.ok(s({ subject_matches_card: "partly" }) < s({}));
  assert.ok(s({ readable_text: "some_gibberish" }) < s({ subject_matches_card: "partly" }));
  assert.ok(s({ readable_text: "mostly_gibberish" }) < s({ readable_text: "some_gibberish" }));
  assert.ok(s({ readable_text: "mostly_gibberish", watermark_or_logo: true, subject_matches_card: "no" }) < 0 + 1);
});

t("pickBest keeps the earliest on a tie and picks a later better candidate", () => {
  const c = (score, label) => ({ judge: base, pass: score >= 9, score, label });
  assert.equal(J.pickBest([c(5, "original"), c(5, "reroll1")]), 0);
  assert.equal(J.pickBest([c(5, "original"), c(4, "reroll1"), c(9, "reroll2")]), 2);
  assert.equal(J.pickBest([c(9, "original"), c(4, "reroll1")]), 0);
});

t("rerollPrompt keeps the judge's description, drops every sentence that mentions writing, swaps 'lipstick', and falls back to the title", () => {
  const long = "A crumpled, aged piece of notebook paper with torn edges lying on dark wood in low forensic lighting. The paper has a coffee ring and a red lipstick smudge in one corner. The reverse side is blank and unmarked. Include a pen nearby. No text visible. Show a handwritten heading in capitals.";
  for (const attempt of [1, 2]) {
    const p = J.rerollPrompt({ ...base, retry_prompt: long }, card, attempt);
    assert.ok(p.startsWith("A crumpled") && p.includes("coffee ring") && p.includes("red ink smudge") && p.includes("blank and unmarked") && p.endsWith("plain, unmarked and blank."), String(attempt));
    assert.ok(!/lipstick|text|handwritten|heading|capitals/i.test(p), p);
  }
  const fb = J.rerollPrompt({ ...base, retry_prompt: "No text visible." }, card, 1);
  assert.ok(fb.includes("The Leverage List") && fb.includes("blank reverse side") && fb.endsWith("plain, unmarked and blank."));
  assert.ok(!/writing|words|letters/i.test(fb));
  assert.ok(J.rerollPrompt({ ...base, retry_prompt: "x ".repeat(2000) }, card, 2).length <= 1200);
  assert.ok(J.JUDGE_SYSTEM.includes("BLANK reverse side") && J.JUDGE_SYSTEM.includes("lipstick") && J.JUDGE_SYSTEM.includes("NEVER mention writing"));
});

t("prompts and tool: transcription comes first and is required; the schema lists every field", () => {
  assert.ok(J.JUDGE_SYSTEM.includes("transcription comes FIRST"));
  assert.equal(J.JUDGE_TOOL.input_schema.required[0], "transcription");
  for (const k of ["transcription", "readable_text", "watermark_or_logo", "subject_matches_card", "problems", "retry_prompt"]) assert.ok(k in J.JUDGE_TOOL.input_schema.properties, k);
  assert.ok(J.judgeUserText(card).includes("The Leverage List"));
});

t("judgeCostUsd matches the price table and the caps stay as decided in ADR-0165", () => {
  assert.equal(J.judgeCostUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000 }), 6);
  assert.ok(Math.abs(J.judgeCostUsd({ input_tokens: 2000, output_tokens: 400 }) - 0.004) < 1e-9);
  assert.equal(J.MAX_REROLLS_PER_ROUND, 2);
  assert.equal(J.JUDGE_BUDGET_MS, 120000);
});
console.log("image-judge tests passed");

// ADR-0103 Addendum 106: the judge passed a Jack of Diamonds court card where the card text says the Joker belongs to no court card.
{
  const J = await import("./image-judge.ts");
  assert.ok(J.JUDGE_SYSTEM.includes("specific identity detail") && J.JUDGE_SYSTEM.includes("A Joker is a jester figure"), "subject rule names identity details and the Joker");
  assert.ok(J.JUDGE_SYSTEM.includes("full-bleed illustration") && J.JUDGE_SYSTEM.includes("never mention indices"), "retry prompt guidance for playing cards");
  console.log("ok   judge prompt checks identity details and steers playing-card re-rolls");
}
