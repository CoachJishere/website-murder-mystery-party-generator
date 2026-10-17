// Run: node --experimental-strip-types supabase/functions/review-package-quality/image-judge.test.mjs
import assert from "node:assert/strict";
import * as J from "./image-judge.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };
const base = { transcription: "NONE", readable_text: "none", watermark_or_logo: false, subject_matches_card: "yes", contradicts_card_detail: false, problems: "", retry_prompt: "" };
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
  assert.equal(J.parseJudge({ ...base, contradicts_card_detail: undefined }).contradicts_card_detail, false);
  assert.equal(J.parseJudge({ ...base, contradicts_card_detail: true }).contradicts_card_detail, true);
});

t("judgePasses: gibberish, watermark and a wrong subject fail; partly matching passes", () => {
  assert.equal(J.judgePasses(base), true);
  assert.equal(J.judgePasses({ ...base, readable_text: "real_words_only" }), true);
  assert.equal(J.judgePasses({ ...base, readable_text: "some_gibberish" }), false);
  assert.equal(J.judgePasses({ ...base, readable_text: "mostly_gibberish" }), false);
  assert.equal(J.judgePasses({ ...base, watermark_or_logo: true }), false);
  assert.equal(J.judgePasses({ ...base, subject_matches_card: "partly" }), true);
  assert.equal(J.judgePasses({ ...base, subject_matches_card: "no" }), false);
  assert.equal(J.judgePasses({ ...base, subject_matches_card: "partly", contradicts_card_detail: true }), false);
});

t("judgeScore orders clean above partly above gibberish above wrong subject with watermark", () => {
  const s = (o) => J.judgeScore({ ...base, ...o });
  assert.equal(s({}), 10);
  assert.ok(s({ subject_matches_card: "partly" }) < s({}));
  assert.ok(s({ contradicts_card_detail: true }) < s({ subject_matches_card: "partly" }));
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
  for (const k of ["transcription", "readable_text", "watermark_or_logo", "subject_matches_card", "contradicts_card_detail", "problems", "retry_prompt"]) assert.ok(k in J.JUDGE_TOOL.input_schema.properties, k);
  assert.ok(J.judgeUserText(card).includes("The Leverage List"));
});

t("judgeCostUsd matches the price table and the caps stay as decided in ADR-0165", () => {
  assert.equal(J.judgeCostUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000 }), 12); // default model: Sonnet 5.5
  assert.equal(J.judgeCostUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000 }, "claude-haiku-4-5-20251001"), 6);
  assert.ok(Math.abs(J.judgeCostUsd({ input_tokens: 2800, output_tokens: 350 }) - 0.0091) < 1e-9);
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

// 2026-10-17 (Dead Men's Cove): the judge passed a full vial for a card with a cracked stopper and a crusted inside, and a rum label reading "Rugm's RUM".
{
  const J = await import("./image-judge.ts");
  assert.ok(J.JUDGE_SYSTEM.includes("contradicts_card_detail") && J.JUDGE_SYSTEM.includes("NOT a contradiction") && J.JUDGE_SYSTEM.includes("invented brand"), "contradiction and brand-name rules");
  assert.ok(J.JUDGE_SYSTEM.includes("state the card's version of that detail"), "retry prompt must restate the card's detail");
  console.log("ok   judge prompt fails a stated detail that the image contradicts");
}

// 2026-10-17: model-shaped requests and responses (Sonnet 5.x rejects a forced tool_choice).
{
  const J = await import("./image-judge.ts");
  assert.equal(J.DEFAULT_JUDGE_MODEL, "claude-sonnet-5-5");
  const son = J.judgeRequestBody("claude-sonnet-5-5", "AAAA", "u");
  assert.ok(son.output_config && !son.tools && !son.tool_choice && son.output_config.format.type === "json_schema" && son.max_tokens === 4000);
  const hai = J.judgeRequestBody("claude-haiku-4-5-20251001", "AAAA", "u");
  assert.ok(hai.tools && hai.tool_choice.name === "report" && !hai.output_config);
  const rep = { transcription: "NONE", readable_text: "none", watermark_or_logo: false, subject_matches_card: "yes", contradicts_card_detail: true, problems: "x", retry_prompt: "y" };
  assert.equal(J.judgeFromResponse([{ type: "text", text: JSON.stringify(rep) }]).contradicts_card_detail, true);
  assert.equal(J.judgeFromResponse([{ type: "thinking" }, { type: "text", text: JSON.stringify(rep) }]).readable_text, "none");
  assert.equal(J.judgeFromResponse([{ type: "tool_use", input: rep }]).subject_matches_card, "yes");
  assert.equal(J.judgeFromResponse([{ type: "text", text: "not json" }]), null);
  assert.equal(J.judgeFromResponse(undefined), null);
  console.log("ok   judge request and response shapes for Sonnet 5.x and Haiku");
}
