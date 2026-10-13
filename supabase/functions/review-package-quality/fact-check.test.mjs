// Run: node --experimental-strip-types supabase/functions/review-package-quality/fact-check.test.mjs
import assert from "node:assert/strict";
import * as F from "./fact-check.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };

const ctx = [{ timelineFramework: { characterLocations: [{ characterName: "Perry Beaumont", locationDuringWindow: "Standing at the far end of the table, alone" }] },
  relationshipMatrix: [{ character1: "Perry Beaumont", character2: "Seraphina Cole", relationship: "Old rivals who avoid each other" }, { character1: "Anna Berg", character2: "Bo Lund", relationship: "x" }] }];

t("canonFor collects the subject's location entry and relationship lines, not other people's", () => {
  const c = F.canonFor("Perry Beaumont", ctx);
  assert.ok(c.includes("Standing at the far end of the table, alone"));
  assert.ok(c.includes("relationship with Seraphina Cole: Old rivals"));
  assert.ok(!c.includes("Anna Berg"));
});

const sheets = [
  { name: "Perry Beaumont", canon: F.canonFor("Perry Beaumont", ctx), own: "I stood at the far end of the table. Nobody was beside me when the lights went out.", texts: [{ field: "round4_innocent", text: "I stood at the far end of the table. Nobody was beside me." }] },
  { name: "Seraphina Cole", canon: "", own: "I sat by the window.", texts: [
    { field: "round4_script", text: "I sat right beside Perry the whole time and saw everything he did with the decanter." },
    { field: "final_statement", text: "Perry will tell you I was next to him when the lights failed, and I never moved." },
    { field: "introduction", text: "I am Seraphina and I love the autumn light in this old house." } ] },
  { name: "Edmund Rowe", canon: "", own: "I was beside Agatha.", texts: [
    { field: "round2_questions", text: "**To Perry Beaumont:** 'Where were you when the lights went out?'" },
    { field: "rumors", text: "Perry arrived late and went straight to the far end of the table, quite alone, I thought." } ] },
  { name: "Clara Penn", canon: "", own: "I counted trays.", texts: [{ field: "rumors", text: "Perry has owed money to three people since the spring of 1921, everyone knows it." }] },
];

t("sentences that name the subject are retrieved from OTHER sheets, own sheet and bare mentions of nothing are skipped", () => {
  const c = F.factCandidates(sheets);
  const perry = c.find((x) => x.subject === "Perry Beaumont");
  assert.ok(perry);
  assert.ok(perry.hits.some((h) => h.sheet === "Seraphina Cole" && /right beside Perry/.test(h.sentence)));
  assert.ok(perry.hits.some((h) => h.sheet === "Seraphina Cole" && /next to him/.test(h.sentence) === false)); // "him" has no name: not retrieved by name
  assert.ok(!perry.hits.some((h) => h.sheet === "Perry Beaumont"));
  assert.ok(!perry.hits.some((h) => /introduction/.test(h.field)));
});

t("a question addressed to the subject carries no claim and is dropped", () => {
  const perry = F.factCandidates(sheets).find((x) => x.subject === "Perry Beaumont");
  assert.ok(!perry.hits.some((h) => h.field === "round2_questions"));
});

t("a subject with fewer than two retrievable claims yields nothing (nothing to compare)", () => {
  assert.equal(F.factCandidates(sheets).find((x) => x.subject === "Seraphina Cole"), undefined);
});

t("fact-bearing sentences (numbers, position verbs) rank first and caps are honoured", () => {
  const perry = F.factCandidates(sheets, { maxPerSubject: 2 }).find((x) => x.subject === "Perry Beaumont");
  assert.equal(perry.hits.length, 2);
  assert.ok(perry.hits.every((h) => /(beside|1921|far end)/.test(h.sentence)));
});

t("prompt carries canon, own statements and numbered claims; resolveFact maps a quote back", () => {
  const perry = F.factCandidates(sheets).find((x) => x.subject === "Perry Beaumont");
  const txt = F.factPromptText(perry);
  assert.ok(txt.includes("CANONICAL FACTS") && txt.includes("far end of the table, alone") && txt.includes("1. ["));
  const r = F.resolveFact(perry, { exact_quote: "I sat right beside Perry the whole time and saw everything he did with the decanter." });
  assert.deepEqual(r, { sheet: "Seraphina Cole", field: "round4_script" });
  assert.equal(F.resolveFact(perry, { exact_quote: "unrelated" }), null);
});

t("instructions let the master context and the subject win, forbid using guilty branches as truth, and are conservative", () => {
  assert.ok(F.FACT_INSTRUCTIONS.includes("master context and the subject's own statements win") || F.FACT_INSTRUCTIONS.includes("The subject's own statements and the master context win"));
  assert.ok(F.FACT_INSTRUCTIONS.includes("guilty or accomplice") && F.FACT_INSTRUCTIONS.includes("when in doubt, report nothing"));
});

console.log("fact-check tests passed");
