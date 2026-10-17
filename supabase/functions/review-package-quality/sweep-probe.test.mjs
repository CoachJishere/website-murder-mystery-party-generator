// Run: node --experimental-strip-types supabase/functions/review-package-quality/sweep-probe.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as S from "./sweep-probe.ts";
import * as C from "./review-core.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };
const mk = (name, extra = {}) => ({ character_name: name, character_role: "suspect", description: `${name} is a suspect.`, secret: `You hid something, ${name}.`, introduction: `I am ${name}.`, round4_innocent: "I stayed in the foyer.", ...extra });
const pkg = { title: "Test", mystery_style: "character", master_context: '{"victimProfile":{"name":"Lee Asher"},"accomplicePairings":[{"a":1}]}', game_overview: "Overview text.", detective_script: "Script text.", evidence_cards: "Card text.", user_conversation: "USER: I want a mystery for twelve players. Keep the original names. Steve Bowling stays a background name." };

t("schema asks for item plus the usual finding fields, all required", () => {
  const props = S.SWEEP_SCHEMA.properties.findings.items;
  for (const k of ["item", "field", "exact_quote", "category", "severity", "explanation", "suggested_replacement"]) assert.ok(props.required.includes(k), k);
  assert.deepEqual(props.properties.category.enum, [...C.CATEGORIES]);
});

t("instructions carry the checklist, rule 9, the by-design rules and the ignore list for both styles", () => {
  for (const style of ["character", "detective"]) {
    const x = S.sweepInstructions(style);
    for (const k of ["POSITIONS AND ALIBIS", "HIDDEN VERSUS KNOWN", "hasAccomplice", "HOW TO DECIDE", "never the owner's", "IGNORE THESE", "VICTIM PRONOUN CONVENTION", "exactly once", "FOCUS"]) assert.ok(x.includes(k), `${style}: ${k}`);
  }
  assert.ok(S.sweepInstructions("detective").includes("Detective style: the solution is fixed"));
  assert.ok(S.sweepInstructions("character").includes("Slip-style game"));
});

t("context holds the customer's words, master_context without accomplicePairings, the documents and every sheet", () => {
  const chars = [mk("Cardi Mundi"), mk("Imma Fanning")];
  const x = S.sweepContext(pkg, chars, "character");
  assert.ok(x.includes("Keep the original names."));
  assert.ok(x.includes("Lee Asher") && !x.includes("accomplicePairings"));
  assert.ok(x.includes("[game_overview]") && x.includes("[detective_script]"));
  assert.ok(x.includes("### CHARACTER: Cardi Mundi") && x.includes("### CHARACTER: Imma Fanning"));
  assert.ok(!x.includes("CHARACTER UNDER REVIEW"));
  assert.ok(!x.includes("SOLUTION"), "slip style has no solution line");
  assert.ok(S.sweepContext({ ...pkg, mystery_style: "detective" }, [mk("A", { character_role: "murderer" }), mk("B")], "detective").includes("murderer = A"));
});

t("a cast of six or fewer is one call with the documents, a larger cast splits in two halves and the documents ride with the first", () => {
  const small = S.focusGroups(["A", "B", "C"]);
  assert.equal(small.length, 1); assert.deepEqual(small[0], ["A", "B", "C", C.DOC_ITEM_NAME]);
  const big = S.focusGroups(["A", "B", "C", "D", "E", "F", "G"]);
  assert.equal(big.length, 2);
  assert.deepEqual(big[0], ["A", "B", "C", "D", C.DOC_ITEM_NAME]); assert.deepEqual(big[1], ["E", "F", "G"]);
  assert.deepEqual(big.flat().filter((x) => x !== C.DOC_ITEM_NAME).sort(), ["A", "B", "C", "D", "E", "F", "G"]);
  assert.ok(S.focusText(["A", C.DOC_ITEM_NAME]).includes("A; PACKAGE DOCUMENTS"));
});

t("resolveSweepFinding keeps a unique quote in a focus item and drops everything else", () => {
  const chars = [mk("Riley", { round4_innocent: "I stayed in the Crown Jewel Foyer for a good while." }), mk("Sage")];
  const f = { item: "Riley", field: "round4_innocent", exact_quote: "stayed in the Crown Jewel Foyer", category: "cross_field_contradiction", severity: "high", explanation: "x", suggested_replacement: "mostly stayed in the foyer" };
  const ok = S.resolveSweepFinding(f, chars, pkg, ["Riley", C.DOC_ITEM_NAME]);
  assert.ok(ok && ok.item === "Riley" && ok.finding.field === "round4_innocent" && !("item" in ok.finding));
  assert.equal(S.resolveSweepFinding(f, chars, pkg, ["Sage"]), null, "outside the focus");
  assert.equal(S.resolveSweepFinding({ ...f, item: "Nobody" }, chars, pkg, ["Nobody"]), null, "unknown item");
  assert.equal(S.resolveSweepFinding({ ...f, exact_quote: "not in the text" }, chars, pkg, ["Riley"]), null, "quote not found");
  assert.equal(S.resolveSweepFinding({ ...f, field: "game_overview" }, chars, pkg, ["Riley"]), null, "document field on a character");
  assert.equal(S.resolveSweepFinding({ ...f, severity: "low" }, chars, pkg, ["Riley"]), null, "low severity");
  const doc = S.resolveSweepFinding({ item: C.DOC_ITEM_NAME, field: "detective_script", exact_quote: "Script text", category: "other", severity: "medium", explanation: "x", suggested_replacement: "Script" }, chars, pkg, [C.DOC_ITEM_NAME]);
  assert.ok(doc && doc.item === C.DOC_ITEM_NAME);
  assert.equal(S.resolveSweepFinding({ item: C.DOC_ITEM_NAME, field: "secret", exact_quote: "x", category: "other", severity: "high", explanation: "", suggested_replacement: "" }, chars, pkg, [C.DOC_ITEM_NAME]), null, "character field on documents");
});

t("dedupe, size guard and the budget parser", () => {
  const rows = [{ item_name: "A", field: "f", exact_quote: "q" }, { item_name: "A", field: "f", exact_quote: "q" }, { item_name: "A", field: "g", exact_quote: "q" }];
  assert.equal(S.dedupe(rows).length, 2);
  const sz = S.sweepSize(pkg, [mk("A"), mk("B"), mk("C")], "character");
  assert.ok(sz.chars > 1000 && sz.approx_input_tokens > 200 && sz.chars < S.SWEEP_MAX_CHARS);
  assert.equal(S.remainingBudget("5"), 5); assert.equal(S.remainingBudget("0"), 0); assert.equal(S.remainingBudget("off"), 0);
  assert.equal(S.remainingBudget(null), 0); assert.equal(S.remainingBudget("-2"), 0); assert.equal(S.remainingBudget(" 3 "), 3);
});

t("+sweep is a shadow review: never auto-applied", () => {
  const v = C.PROMPT_VERSION + "+sweep";
  assert.equal(C.isShadowReview(v), true); assert.equal(C.isAutoApplyReview(v, true), false);
});

t("wiring: the cron entry is budget-gated, decrements before the paid call, and the paid mode needs paid:true", () => {
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const next = src.slice(src.indexOf("async function sweepNext"), src.indexOf("async function setting("));
  assert.ok(/remainingBudget\(await setting\("review_sweep_probe", "0"\)\)/.test(next), "default is off");
  assert.ok(next.indexOf('update({ value: String(budget - 1) })') < next.indexOf("await sweepProbe("), "decrement first");
  const handler = src.slice(src.indexOf('mode === "sweep_probe"'));
  assert.ok(/dryRun: body\.paid !== true/.test(handler));
  const probe = src.slice(src.indexOf("async function sweepProbe"), src.indexOf("async function sweepNext"));
  assert.ok(/attempts: 1/.test(probe), "no retry of a long paid call");
});
console.log("sweep-probe tests passed");
