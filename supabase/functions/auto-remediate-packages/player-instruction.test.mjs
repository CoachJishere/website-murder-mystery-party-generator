// Run: node --experimental-strip-types supabase/functions/auto-remediate-packages/player-instruction.test.mjs
import assert from "node:assert/strict";
import { hasPlayerInstruction, PLAYER_INSTRUCTION_FIELDS, PLAYER_INSTRUCTION_RX } from "./player-instruction.ts";

const t = (name, fn) => { fn(); console.log("ok  ", name); };

// The real defect (Dead Man's Saddle, Jessica Calloway, field `secret`)
const REAL =
  "He never named a price out loud. Choose for yourself what this secret is, in keeping with your character, so long as it is a private shame or wrong that would cost you the inheritance.";
t("real Jessica secret is flagged", () => assert.equal(hasPlayerInstruction("secret", REAL), true));
t("the fixed Jessica secret is not flagged", () =>
  assert.equal(
    hasPlayerInstruction(
      "secret",
      "The truth is that after a bad breeding season you quietly borrowed against the ranch's bucking-stock contracts without your father's knowledge. Jed saw the papers on your desk.",
    ),
    false,
  ));

// Each phrase on its own, any case
for (const p of ["choose for yourself", "Decide for yourself", "IN KEEPING WITH YOUR CHARACTER", "up to you to decide", "It is up to you to choose"]) {
  t(`flags: ${p}`, () => assert.equal(hasPlayerInstruction("background", `Something ${p} something.`), true));
}

// Only the narrative fields: the same words in spoken lines are ordinary dialogue and must NOT trigger a paid regeneration
t("spoken fields are ignored", () => {
  for (const f of ["introduction", "rumors", "accusations", "round2_script", "final_innocent", "reveal_confession_guilty"]) {
    assert.equal(hasPlayerInstruction(f, "You will have to choose for yourself who to believe, detective."), false, f);
  }
});
t("field list is exactly the SQL detector's", () =>
  assert.deepEqual([...PLAYER_INSTRUCTION_FIELDS].sort(), ["background", "description", "relationships", "secret"]));

// Phrases deliberately NOT matched (too common in legitimate in-character prose; "invent a" matched 10+ real sheets)
for (const ok of ["She had to invent a story about the lake.", "I will make up a reason for the delay.", "your choice of poison", "Pick whichever you like."]) {
  t(`not flagged: ${ok}`, () => assert.equal(PLAYER_INSTRUCTION_RX.test(ok), false));
}
t("empty and null are safe", () => {
  assert.equal(hasPlayerInstruction("secret", ""), false);
  assert.equal(hasPlayerInstruction("secret", null), false);
  assert.equal(hasPlayerInstruction("secret", undefined), false);
});
console.log("player-instruction: all passed");
