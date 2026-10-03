// Run: node --experimental-strip-types supabase/functions/review-package-quality/review-core.test.mjs
import assert from "node:assert/strict";
import * as C from "./review-core.ts";
const t = (n, fn) => { fn(); console.log("ok  ", n); };

const mc = JSON.stringify({ victimProfile: { name: "Dusty Divine" }, note: 'has "braces" { and } inside' }) + "\n{" +
  JSON.stringify({ accomplicePairings: [{ character: "A", accomplice: "B" }], timelineFramework: { x: 1 } }).slice(1);
const pkg = { title: "T", master_context: mc };
const chars = [
  { character_name: "Ann", character_role: "murderer", description: "d1", secret: "s1", background: "She met the victim." },
  { character_name: "Bob/Bea", character_role: "redHerring", description: "d2", secret: "s2" },
];

t("parseMasterContext handles two concatenated objects with braces in strings", () => {
  const o = C.parseMasterContext(mc);
  assert.equal(o.length, 2); assert.equal(o[0].victimProfile.name, "Dusty Divine"); assert.ok(o[1].accomplicePairings);
});
t("accomplicePairings is removed from the context sent to the model", () => {
  const txt = C.contextText(pkg, chars, "character");
  assert.ok(!txt.includes("accomplicePairings")); assert.ok(txt.includes("timelineFramework")); assert.ok(txt.includes("VICTIM: Dusty Divine"));
});
t("detective context states the solution, slip does not", () => {
  assert.ok(C.contextText(pkg, chars, "detective").includes("murderer = Ann"));
  assert.ok(!C.contextText(pkg, chars, "character").includes("SOLUTION"));
});
t("both prompts carry the dual-name rule and the ignore list", () => {
  for (const s of ["character", "detective"]) {
    const p = C.instructionsFor(s); assert.ok(p.includes("Osric/Osryth")); assert.ok(p.includes("IGNORE THESE")); assert.ok(p.includes("medium or high"));
  }
});
t("slip and detective prompts differ in their rules", () => {
  assert.ok(C.instructionsFor("character").includes("Slip-style")); assert.ok(C.instructionsFor("detective").includes("Detective style"));
});
t("cache breakpoint only on the last system block", () => {
  const b = C.buildSystemBlocks(pkg, chars, "character"); assert.equal(b.length, 2);
  assert.equal(b[0].cache_control, undefined); assert.deepEqual(b[1].cache_control, { type: "ephemeral" });
});
t("characterBlock lists non-empty fields only, with role for detective", () => {
  const s = C.characterBlock(chars[0], "detective"); assert.ok(s.includes("(role: murderer)")); assert.ok(s.includes("[secret]")); assert.ok(!s.includes("[rumors]"));
});

const item = { round2_innocent: "I went to the bar. I went to the bar." , background: "She met the victim in 1999 and a informant said so." };
t("validateFinding accepts a unique quote", () => {
  assert.equal(C.validateFinding(item, { field: "background", exact_quote: "a informant", category: "single_generation_slip", severity: "medium", explanation: "", suggested_replacement: "an informant" }).ok, true);
});
t("validateFinding rejects non-unique, missing, low severity and unknown field", () => {
  const base = { category: "other", severity: "medium", explanation: "", suggested_replacement: "" };
  assert.equal(C.validateFinding(item, { ...base, field: "round2_innocent", exact_quote: "I went to the bar." }).reason, "quote not unique");
  assert.equal(C.validateFinding(item, { ...base, field: "background", exact_quote: "nope" }).reason, "quote not found");
  assert.equal(C.validateFinding(item, { ...base, severity: "low", field: "background", exact_quote: "a informant" }).reason, "low severity");
  assert.equal(C.validateFinding(item, { ...base, field: "pointform", exact_quote: "x" }).reason, "unknown field");
});
t("replacementIsSane and applyReplacement", () => {
  const f = { field: "background", exact_quote: "a informant", category: "single_generation_slip", severity: "medium", explanation: "", suggested_replacement: "an informant" };
  assert.equal(C.replacementIsSane(f), true);
  assert.equal(C.applyReplacement(item.background, f), "She met the victim in 1999 and an informant said so.");
  assert.equal(C.replacementIsSane({ ...f, suggested_replacement: "" }), false);
  assert.equal(C.replacementIsSane({ ...f, suggested_replacement: "x".repeat(200) }), false);
  assert.equal(C.replacementIsSane({ ...f, suggested_replacement: "a <b>informant" }), false);
  assert.equal(C.applyReplacement("a informant a informant", f), null);
  // replacement text containing $& must not be interpreted as a regex backreference
  assert.equal(C.applyReplacement("x a informant y", { ...f, suggested_replacement: "$& cost" }), "x $& cost y");
});
t("costUsd matches the pilot's real run (Boogie v2/high: 123925 in, 32300 cw, 419900 cr, 28080 out = 0.693)", () => {
  const c = C.costUsd({ input_tokens: 123925, cache_creation_input_tokens: 32300, cache_read_input_tokens: 419900, output_tokens: 28080 });
  assert.ok(Math.abs(c - 0.693) < 0.005, String(c));
});
console.log("all passed");
