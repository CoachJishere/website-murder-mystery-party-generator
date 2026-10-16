// Run: node --experimental-strip-types supabase/functions/review-package-quality/req-insert.test.mjs
import assert from "node:assert/strict";
import * as R from "./req-insert.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };
const REQ1 = "Gino's last words begin 'I have a little surprise for the newlyweds, and trust me, nobody here is going to...'";
const REQ2 = "he hinted tonight would be 'the night everything comes out'";
const OPEN = "Gino Gherkin, celebrated wedding planner and master of ceremonies, raised his engraved flute to toast the happy couple. He took one theatrical sip in front of every one of you, choked, and fell. The lights never dimmed.";
const SCRIPT = `## DETECTIVE SCRIPT\n\n## OPENING STATEMENT\n\n*[Read this when guests are gathered.]*\n\nLadies and gentlemen, please remain exactly where you are.\n\n${OPEN}\n\n*[Proceed immediately into Round 1.]*\n\n---\n\n## ROUND 1: INTRODUCTIONS\n\nLet us begin.`;

t("quotedSpans takes the quoted words, ignores apostrophes in words and short quotes", () => {
  assert.deepEqual(R.quotedSpans(REQ1), ["I have a little surprise for the newlyweds, and trust me, nobody here is going to..."]);
  assert.deepEqual(R.quotedSpans(REQ2), ["the night everything comes out"]);
  assert.deepEqual(R.quotedSpans("Gino's cake and the groom's mother"), []);
  assert.deepEqual(R.quotedSpans("a pun on 'oh no'"), []);
  assert.deepEqual(R.quotedSpans('he said "this is the last time" twice'), ["this is the last time"]);
  assert.deepEqual(R.quotedSpans("‘the night everything comes out’ was the hint"), ["the night everything comes out"]);
});

t("openingStatement returns the section body only, and null when absent or tiny", () => {
  const o = R.openingStatement(SCRIPT);
  assert.ok(o.includes("remain exactly where you are") && o.includes(OPEN) && !o.includes("INTRODUCTIONS") && !o.includes("Let us begin"));
  assert.equal(R.openingStatement("## DETECTIVE SCRIPT\n\nno opening here"), null);
  assert.equal(R.openingStatement("## OPENING STATEMENT\n\nshort\n\n## ROUND 1\nx"), null);
});

t("validateInsert: carries the quote verbatim, old sentence unique, size bounded, no empty or no-op", () => {
  const spans = R.quotedSpans(REQ1);
  const oldS = "He took one theatrical sip in front of every one of you, choked, and fell.";
  const good = "He began, 'I have a little surprise for the newlyweds, and trust me, nobody here is going to...' and never finished: he took one theatrical sip in front of every one of you, choked, and fell.";
  assert.deepEqual(R.validateInsert(SCRIPT, oldS, good, spans), { ok: true });
  assert.equal(R.validateInsert(SCRIPT, oldS, "He took a sip.", spans).ok, false);
  assert.match(R.validateInsert(SCRIPT, "Not in the script at all.", good, spans).reason, /0 times/);
  assert.match(R.validateInsert(SCRIPT + "\n" + oldS, oldS, good, spans).reason, /2 times/);
  assert.equal(R.validateInsert(SCRIPT, "", good, spans).ok, false);
  assert.equal(R.validateInsert(SCRIPT, oldS, oldS, spans).ok, false);
  assert.match(R.validateInsert(SCRIPT, oldS, good + " " + "blah ".repeat(80), spans).reason, /longer/);
  assert.match(R.validateInsert(SCRIPT, oldS, good.replace("and never", "[and never"), spans).reason, /markup/);
  const curly = good.replace(/'/g, "’");
  assert.equal(R.validateInsert(SCRIPT, oldS, curly, spans).ok, true);
});

t("prompt text carries the opening, the requirement and every span; the schema needs both sentences", () => {
  const p = R.insertPromptText("OPEN", REQ2, ["the night everything comes out"]);
  assert.ok(p.includes("OPEN") && p.includes(REQ2) && p.includes("- the night everything comes out"));
  assert.deepEqual(R.INSERT_SCHEMA.required, ["old_sentence", "new_sentence"]);
  assert.ok(R.INSERT_SYSTEM.includes("EXACTLY") && R.INSERT_SYSTEM.includes("verbatim"));
});
console.log("req-insert tests passed");
