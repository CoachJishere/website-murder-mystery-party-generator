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
