// Run: node --experimental-strip-types supabase/functions/auto-remediate-packages/glitch-strip.test.mjs
import assert from "node:assert/strict";
import { DANGLING_QUOTE_RX, stripStrayGlitches } from "./glitch-strip.ts";

const t = (name, fn) => { fn(); console.log("ok  ", name); };

// Dangling quotes (all four glyphs the detector knows) - real shapes from "Boogie Nights, Bloody Nights"
t("single straight quote", () => assert.equal("tonight.'".replace(DANGLING_QUOTE_RX, "$1$3"), "tonight."));
t("curly double quote", () => assert.equal("finally.”".replace(DANGLING_QUOTE_RX, "$1$3"), "finally."));
t("straight double quote + trailing ws", () => assert.equal('over." \n'.replace(DANGLING_QUOTE_RX, "$1$3"), "over. \n"));
t("curly single quote", () => assert.equal("it?’".replace(DANGLING_QUOTE_RX, "$1$3"), "it?"));
t("no stray quote untouched", () => assert.equal("It ends fine.".replace(DANGLING_QUOTE_RX, "$1$3"), "It ends fine."));

// Glitch strip - real shapes
t("</br> becomes a paragraph break", () => {
  const r = stripStrayGlitches("stop covering it.</br>I'm done lying.");
  assert.equal(r.text, "stop covering it.\n\nI'm done lying.");
  assert.equal(r.changes.length, 1);
});
t("trailing backtick", () => assert.equal(stripStrayGlitches("my conscience.`").text, "my conscience."));
t("closing tag", () => assert.equal(stripStrayGlitches("I did it.</final>").text, "I did it."));
t("self-correction line dropped", () => {
  const r = stripStrayGlitches("calm as anything, counting on us.\n\nLet me correct that formatting issue.");
  assert.equal(r.text, "calm as anything, counting on us.");
});
t("code fence", () => assert.equal(stripStrayGlitches("end.\n```").text, "end."));

// Negatives: legitimate text is never changed
t("dialogue 'let me correct myself' kept", () => {
  const s = "Let me correct myself, I was at the bar at nine.";
  assert.deepEqual(stripStrayGlitches(s), { text: s, changes: [] });
});
t("long sentence containing 'formatting issue' is not dropped as a line", () => {
  const s = "x".repeat(170) + " a formatting issue " + "y".repeat(20);
  assert.equal(stripStrayGlitches(s).text, s);
});
t("br with other tags/clean text", () => {
  const s = "Plain text with <3 and 2 < 3 > 1.";
  assert.deepEqual(stripStrayGlitches(s), { text: s, changes: [] });
});
t("empty", () => assert.deepEqual(stripStrayGlitches(""), { text: "", changes: [] }));
console.log("all passed");

// ---- header derivation ----
import { deriveBranchHeader, extractHeader, prependHeader } from "./glitch-strip.ts";
const H = "## ROUND 2: MOTIVES\n\n**IF YOU'RE THE ACCOMPLICE**\n\n";
t("derives majority header", () => assert.equal(deriveBranchHeader("round2_accomplice", [H + "a", H + "b", H + "c", "no header here"]), H));
t("copies header in another language unchanged", () => {
  const es = "## RONDA 2: MOTIVOS\n\n**SI ERES EL CÓMPLICE**\n\n";
  assert.equal(deriveBranchHeader("round2_accomplice", [es + "a", es + "b"]), es);
});
t("introduction ignores extra bold instruction line", () => {
  const intro = "## ROUND 1: YOUR INTRODUCTION\n\n**Read this aloud when introducing yourself:**\n\nHi";
  assert.equal(extractHeader(intro, "introduction"), "## ROUND 1: YOUR INTRODUCTION\n\n");
});
t("refuses to guess when siblings disagree", () => {
  assert.equal(deriveBranchHeader("round2_guilty", ["## A\n\nx", "## B\n\nx", "## C\n\nx", "## D\n\nx"]), null);
});
t("refuses when no sibling has a header", () => assert.equal(deriveBranchHeader("round2_guilty", ["x", "y", "z"]), null));
t("prepend", () => assert.equal(prependHeader("  Body", H), H + "Body"));
t("majority among header-bearing siblings, ignoring headerless ones (the Spanish reveal case)", () => {
  const tu = "## LA REVELACIÓN — TU CONFESIÓN\n\n", mi = "## LA REVELACIÓN — MI CONFESIÓN\n\n";
  const sibs = [mi + "a", tu + "b", tu + "c", tu + "d", "x", "x", "x", "x", "x", "x"];
  assert.equal(deriveBranchHeader("reveal_confession_accomplice", sibs), tu);
});
t("tie is refused", () => assert.equal(deriveBranchHeader("round2_guilty", ["## A\n\nx", "## A\n\nx", "## B\n\nx", "## B\n\nx"]), null));
console.log("header tests passed");
