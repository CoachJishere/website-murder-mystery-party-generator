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
t("digestEmail: summary shows counts and high findings only, says no action needed", () => {
  const f = [
    { item_name: "A", field: "round2_script", category: "wrong_fact", severity: "high", exact_quote: "x <b>", explanation: "bad" },
    { item_name: "B", field: "secret", category: "secret_leak", severity: "medium", exact_quote: "y", explanation: "meh" },
  ];
  const m = C.digestEmail("Title", "pid", "detective", "model", 0.63, f, "summary");
  assert.ok(m.subject.includes("2 findings (1 high), no action needed")); assert.ok(m.html.includes("No action needed")); assert.ok(m.html.includes("x &lt;b&gt;"));
  assert.ok(!m.html.includes(">B / secret<")); assert.ok(m.html.includes("1 more are in the database"));
  assert.ok(C.digestEmail("T", "p", "s", "m", 0, f, "full").html.includes("B / secret"));
  assert.equal(C.digestEmail("T", "p", "s", "m", 0, f, "off"), null); assert.equal(C.digestEmail("T", "p", "s", "m", 0, [], "summary"), null);
});
console.log("all passed");

// ---- ADR-0140 fact propagation ----
t("anchorsFrom keeps multi-word proper nouns and amounts, drops single words", () => {
  const a = C.anchorsFrom('Joe transferred in from the Flin Flon office', "He owed $180,000 and 2,500 dollars in 2026", "Marcus did it");
  assert.ok(a.includes("Flin Flon")); assert.ok(a.includes("$180,000")); assert.ok(a.includes("2,500")); assert.ok(a.includes("2026"));
  assert.ok(!a.includes("Joe") && !a.includes("Marcus"));
});
t("propagationCandidates finds other fields with the anchor, skips flagged fields, cast names and ubiquitous anchors", () => {
  const items = [
    { name: "Amber", row: { background: "Joe joined from the Flin Flon office.", intro: "Hi.", secret: "Marcus Moreno knows" }, fields: ["background", "intro", "secret"] },
    { name: "Darion", row: { background: "Joe works out of the Flin Flon office." }, fields: ["background"] },
    { name: "DOCS", row: { detective_script: "formerly of the Flin Flon office" }, fields: ["detective_script"] },
  ];
  const got = C.propagationCandidates(items, ["Flin Flon", "Marcus Moreno"], new Set(["Darion\u0000background"]), ["Marcus Moreno"]);
  assert.deepEqual(got.map((c) => `${c.item}/${c.field}`).sort(), ["Amber/background", "DOCS/detective_script"]);
  const many = Array.from({ length: 30 }, (_, i) => ({ name: "C" + i, row: { f: "Flin Flon again" }, fields: ["f"] }));
  assert.equal(C.propagationCandidates(many, ["Flin Flon"], new Set(), []).length, 0);
});
t("propagationText names the wrong fact, the correction and the narrow scope", () => {
  const x = C.propagationText("Amber", [{ quote: "joined from Flin Flon", explanation: "He works there", replacement: "works out of Flin Flon" }], [{ field: "background", text: "abc" }]);
  assert.ok(x.includes("WRONG:") && x.includes("CORRECTED:") && x.includes("Check ONLY") && x.includes("[background]"));
});
console.log("propagation tests done");

// ---- ADR-0143 language detection ----
t("detectLanguage recognises the seven languages and refuses unclear text", () => {
  const rep = (s, n) => Array(n).fill(s).join(" ");
  assert.equal(C.detectLanguage(rep("I think that you have the best idea and they are with us but not for this", 6)), "en");
  assert.equal(C.detectLanguage(rep("Ich bin nicht sicher, aber wir haben eine Idee und das ist auch für euch noch wichtig", 5)), "de");
  assert.equal(C.detectLanguage(rep("Je suis très sûr que vous avez une idée mais nous ne sommes pas dans la salle avec elle", 5)), "fr");
  assert.equal(C.detectLanguage(rep("Non sono molto sicuro che hai una idea ma anche per questo gli altri sono nella sala", 5)), "it");
  assert.equal(C.detectLanguage(rep("Não estou muito certo que você tem uma ideia mas também para isso eles estão com ele", 5)), "pt");
  assert.equal(C.detectLanguage(rep("Ik heb een idee maar het is niet van ons en jullie zijn ook voor het huis met geen", 5)), "nl");
  assert.equal(C.detectLanguage(rep("Estoy muy seguro de que todos están aquí pero también hay una idea sobre el tema entre los demás", 5)), "es");
  assert.equal(C.detectLanguage("too short to tell"), null);
});
console.log("language tests done");


// ---- customer-wording guard ----
const custMsgs = [
  "Please add into a script the phrase 'riding about town like mad hamsters' - weave this in somewhere because it is a recurrent joke in the family.",
  "ay up, ar, mardy, nesh, owt, nowt, bostin, conna, shunna, wunna, Asthee",
];
t("the live regression: a requested phrase inside a longer reviewer quote is detected", () => {
  assert.ok(C.quoteIsCustomerWording("forever riding about town like mad hamsters with that cart of his", custMsgs));
});
t("curly apostrophes and case do not hide a match", () => {
  assert.ok(C.quoteIsCustomerWording("Riding About Town Like Mad Hamsters", custMsgs));
  assert.ok(C.quoteIsCustomerWording("it's a recurrent joke in the family, ok", ["It’s a recurrent joke in the family"]));
});
t("an ordinary garbled-sentence quote that the customer never typed is not blocked", () => {
  assert.ok(!C.quoteIsCustomerWording("A properly intelligent woman with a secret like that, found dead set against a man now found dead himself, would hang", custMsgs));
});
t("short overlaps (a dialect word, a name) are not blocked", () => {
  assert.ok(!C.quoteIsCustomerWording("owt nowt wunna", custMsgs));
  assert.ok(!C.quoteIsCustomerWording("riding about town", custMsgs));
});
t("exactly the minimum run matches and one word fewer does not", () => {
  assert.ok(C.quoteIsCustomerWording("riding about town like mad", custMsgs));
  assert.ok(!C.quoteIsCustomerWording("riding about town like", custMsgs));
});
t("no customer text means nothing is blocked", () => {
  assert.ok(!C.quoteIsCustomerWording("riding about town like mad hamsters", []));
});

t("detectLanguage tells Danish from Swedish and does not disturb the other seven (ADR-0149)", () => {
  const rep = (x, n) => Array(n).fill(x).join(" ");
  assert.equal(C.detectLanguage(rep("Jeg har ikke selv gjort noget, og hun var der også, men hvad kunne jeg have sagt til hende", 4)), "da");
  assert.equal(C.detectLanguage(rep("Jag har inte själv gjort något, och hon var där också, men vad kunde jag ha sagt till henne", 4)), "sv");
  assert.equal(C.detectLanguage(rep("Ik ben niet zeker, maar wij hebben een idee en het is ook voor jullie nog belangrijk", 4)), "nl");
  assert.equal(C.detectLanguage(rep("I think that you have the best idea and they are with us but not for this", 6)), "en");
  assert.equal(C.detectLanguage("Jeg har ikke gjort noget."), null);
});

t("openDigestEmail lists only unverified findings at or above the threshold, groups by package, escapes html, and sends nothing when off", () => {
  const row = (o = {}) => ({ package_id: "p1", title: "Case <One>", item_name: "Ann", field: "introduction", category: "wrong_fact", severity: "high", exact_quote: "a & b", explanation: "wrong", ...o });
  assert.equal(C.openDigestEmail([], "high"), null);
  assert.equal(C.openDigestEmail([row({ severity: "medium" })], "high"), null);
  assert.equal(C.openDigestEmail([row()], "off"), null);
  const m = C.openDigestEmail([row(), row({ severity: "medium" }), row({ package_id: "p2", title: "Two" })], "high");
  assert.equal(m.packages, 2); assert.equal(m.findings, 2);
  assert.ok(m.subject.startsWith("2 packages released with unresolved quality findings"));
  assert.ok(m.html.includes("Case &lt;One&gt;")); assert.ok(m.html.includes("a &amp; b"));
  const mm = C.openDigestEmail([row({ severity: "medium" })], "medium");
  assert.equal(mm.packages, 1); assert.ok(mm.subject.startsWith("1 package released"));
  const many = C.openDigestEmail(Array.from({ length: 11 }, () => row()), "high");
  assert.ok(many.html.includes("and 3 more"));
});


t("customerRequirements reads userRequirements and characterDetails from the second JSON object, and returns null when absent (ADR-0150)", () => {
  const first = { victimProfile: { name: "Bas" }, conversationDetailsExtraction: { setting: "x", characterDetails: ["Daan: has a dog called Struisje and is sometimes called Daanus"], userRequirements: ["Dina plays as a full character, not optional.", "Kevin shouts: 'Hij is dus écht een gladjanus!' when Daan is accused.", "short"] } };
  const pkgR = { master_context: JSON.stringify(first) + "\n" + JSON.stringify({ evidenceProgression: {} }) };
  const r = C.customerRequirements(pkgR);
  assert.equal(r.count, 3); assert.ok(r.text.includes("- Kevin shouts")); assert.ok(r.text.includes("- Daan: has a dog")); assert.ok(!r.text.includes("short"));
  assert.equal(C.customerRequirements({ master_context: JSON.stringify({ victimProfile: { name: "x" } }) }), null);
  assert.equal(C.customerRequirements({ master_context: "" }), null);
});

t("coverageBlock carries the list, every sheet, the documents and the trimming note; the pseudo field validates against the list", () => {
  const req = { text: "- Kevin shouts the gladjanus line", count: 1 };
  const chs = [{ character_name: "Kevin", introduction: "Hoi allemaal" }, { character_name: "Dina", introduction: "x".repeat(9000) }];
  const b = C.coverageBlock(req, chs, "detective", { detective_script: "The reveal." }, 6000);
  assert.ok(b.includes("REQUIREMENTS COVERAGE CHECK")); assert.ok(b.includes("- Kevin shouts the gladjanus line")); assert.ok(b.includes("CHARACTER UNDER REVIEW: Dina")); assert.ok(b.includes("[trimmed]")); assert.ok(b.includes("The reveal."));
  const row = { [C.REQUIREMENTS_FIELD]: req.text };
  assert.ok(C.validateFinding(row, { field: C.REQUIREMENTS_FIELD, exact_quote: "Kevin shouts the gladjanus line", category: "other", severity: "high", explanation: "", suggested_replacement: "" }).ok);
  assert.ok(!C.validateFinding(row, { field: C.REQUIREMENTS_FIELD, exact_quote: "Kevin whispers", category: "other", severity: "high", explanation: "", suggested_replacement: "" }).ok);
});


t("culpritNameHits matches the full name in printed text only, expands dual names, and ignores family names and host-only sections (ADR-0151)", () => {
  const card = "## EVIDENCE CARDS\n\n## EVIDENCE: ROUND 3\n\n### The Ledger\n\n#### DESCRIPTION\nA page from Whitfield Land & Holdings' ledger, kept in Axel's files.\n\n#### SIGNIFICANCE (Host Only)\nPoints at Axel Whitfield.\n\n## EVIDENCE: ROUND 4\n\n### The Phone\n\n#### DESCRIPTION\nMessages recovered from Jasper Gold's device.\n\n#### SIGNIFICANCE (Host Only)\nJasper did it.";
  assert.deepEqual(C.culpritNameHits(card, ["Axel Whitfield"]), []);
  const h = C.culpritNameHits(card, ["Jasper Gold"]); assert.equal(h.length, 1); assert.ok(h[0].snippet.includes("Jasper Gold's device"));
  assert.deepEqual(C.nameVariants("Percival/Prudence Ashworth"), ["Percival Ashworth", "Prudence Ashworth"]);
  assert.equal(C.culpritNameHits("#### DESCRIPTION\nPrudence Ashworth was seen.", ["Percival/Prudence Ashworth"]).length, 1);
  assert.equal(C.culpritNameHits('"#### DESCRIPTION\\nHe had to ask Daan about it.\\n\\n#### SIGNIFICANCE (Host Only)\\nDaan."', ["Daan"]).length, 1);
  assert.deepEqual(C.culpritNameHits("#### DESCRIPTION\nMo was there.", ["Mo"]), []);
  assert.deepEqual(C.culpritNameHits("#### DESCRIPTION\nDaanus appears.", ["Daan"]), []);
});

t("requirements extraction: text is null without a conversation, long chats keep start and end, answer parsing dedupes and caps (ADR-0155)", () => {
  assert.equal(C.requirementsExtractionText(null), null);
  assert.equal(C.requirementsExtractionText("short"), null);
  const long = "BRIEF-START " + "x".repeat(C.EXTRACT_CONVERSATION_MAX_CHARS + 5000) + " CONCEPT-END";
  const txt = C.requirementsExtractionText(long);
  assert.ok(txt.includes("BRIEF-START") && txt.includes("CONCEPT-END") && txt.includes("middle of the conversation omitted"));
  assert.ok(txt.length < C.EXTRACT_CONVERSATION_MAX_CHARS + 500);
  const r = C.parseExtractedRequirements(JSON.stringify({ requirements: ["- Shannon plays a co-investigator with her own briefing", "Shannon plays a co-investigator with her own briefing", "tiny", 7, "  * Kevin shouts the line when Daan is accused  "] }));
  assert.equal(r.count, 2);
  assert.ok(r.text.startsWith("- Shannon plays") && r.text.includes("- Kevin shouts the line when Daan is accused"));
  assert.equal(C.parseExtractedRequirements(JSON.stringify({ requirements: [] })), null);
  assert.equal(C.parseExtractedRequirements("not json"), null);
  assert.equal(C.parseExtractedRequirements(JSON.stringify({ other: 1 })), null);
  const many = C.parseExtractedRequirements(JSON.stringify({ requirements: Array.from({ length: 80 }, (_, i) => `Requirement number ${i} for a character`) }));
  assert.equal(many.count, C.MAX_EXTRACTED_REQUIREMENTS);
  assert.ok(C.requirementsExtractionInstructions().includes("APPROVED CONCEPT wins"));
  assert.equal(C.REQUIREMENTS_EXTRACT_SCHEMA.properties.requirements.type, "array");
});

console.log("customer-wording tests done");
