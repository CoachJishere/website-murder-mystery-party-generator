#!/usr/bin/env node
/**
 * ADR-0056 — assert the self-directed-question DETECTOR and RETARGETER agree.
 *
 * The recurring bug in this codebase is two predicates that must describe the same
 * concept drifting apart because only one was updated. This has now happened three
 * times: concept-snapshot vs extractor (2026-08-02), completion gate vs detector RPC
 * (ADR-0055), and detector vs retargeter (ADR-0056, this script).
 *
 * The failure is silent and expensive: the detector flags a defect the retargeter
 * cannot parse, so the worker "fixes" nothing, fails its own re-detect gate, reverts
 * a VALID fix it made for another character in the same package (revert is
 * all-or-nothing), and escalates. Observed live on package 33671764-... 2026-08-02.
 *
 * This script reads the retargeter's annotation pattern out of the live source rather
 * than restating it, so the assertion fails if the source drifts.
 *
 *   node scripts/__tests__/retargetQuestions.test.mjs
 *
 * Exit 0 = detector and retargeter agree on every fixture. Exit 1 = they disagree.
 */
import { readFileSync } from "node:fs";

const SRC = new URL("../../supabase/functions/auto-remediate-packages/index.ts", import.meta.url);
const src = readFileSync(SRC, "utf8");

// --- pull the annotation pattern out of the live source -------------------------
const m = /const TARGET_ANNOTATION_RX = String\.raw`([^`]*)`/.exec(src);
if (!m) {
  console.error(`FAIL: could not find TARGET_ANNOTATION_RX in ${SRC}.`);
  console.error("If it was renamed or inlined, update this script — do not delete the check.");
  process.exit(1);
}
const ANNOTATION = m[1];

// Retargeter's matcher, reassembled exactly as retargetQuestions() builds it.
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const retargeterMatches = (text, name) =>
  new RegExp(`(\\*\\*\\s*To\\s+)${escapeRx(name)}${ANNOTATION}(?=\\s*:?\\s*\\*\\*)`, "i").test(text);

// Detector's matcher: Postgres `questions ~* ('\*\*to ' || name || '\M')`.
// `\M` is a word END boundary; JS `\b` after a word char is equivalent here.
const detectorMatches = (text, name) =>
  new RegExp(`\\*\\*to ${escapeRx(name)}\\b`, "i").test(text);

// The invariant is one-directional, NOT equality:
//
//   detector flags it  =>  retargeter can repair it
//
// A retargeter that matches MORE than the detector is harmless — the extra shapes
// simply never reach the worker. A retargeter that matches LESS is the deadlock:
// flagged, unrepairable, valid sibling fixes reverted, package escalated.
const violates = (det, ret) => det && !ret;

// --- fixtures: shapes the model actually produces --------------------------------
const fixtures = [
  { label: "plain colon form", name: "Captain Kei", text: "3. **To Captain Kei:** 'Where were you?'", detects: true },
  { label: "(self) annotation — the ADR-0056 regression", name: "Polly Paradise", text: "2. **To Polly Paradise (self):** 'Walk us through your evening.'", detects: true },
  { label: "annotation without colon", name: "Tiki Tina", text: "1. **To Tiki Tina (yourself)** 'Explain the carving.'", detects: true },
  { label: "no colon at all", name: "Hula Duke", text: "1. **To Hula Duke** 'Where were you?'", detects: true },
  { label: "different character — neither should match", name: "Coconut Chris", text: "1. **To Sunny Kahale:** 'Why ask about insurance?'", detects: false },
  { label: "name only in prose — neither should match", name: "Captain Kei", text: "1. **To Tiki Tina:** 'Did Captain Kei mention the harbor?'", detects: false },
];

let failures = 0;
console.log(`annotation pattern read from source: ${ANNOTATION}\n`);
for (const f of fixtures) {
  const det = detectorMatches(f.text, f.name);
  const ret = retargeterMatches(f.text, f.name);
  const bad = violates(det, ret) || det !== f.detects;
  if (bad) failures++;
  console.log(
    `${bad ? "FAIL" : "PASS"}  ${f.label}\n` +
      `        detector=${det} retargeter=${ret} (detector expected ${f.detects})` +
      (violates(det, ret) ? "  <-- FLAGGED BUT UNREPAIRABLE" : ""),
  );
}

// --- known gaps: real, reproducible, deliberately NOT failing this check ----------
// These are detector-side issues whose fix is a detection-vs-false-positive trade-off
// (see ADR-0056 "Open question"). Neither is reachable in production today. They print
// so they are not forgotten, but they do not block a deploy of the retargeter fix.
const knownGaps = [
  {
    label: "prefix name: character 'Polly' vs question '**To Polly Paradise:**'",
    name: "Polly",
    text: "1. **To Polly Paradise:** 'Where were you?'",
    note: "detector's \\M is a word-END boundary only, so a short name matches inside a longer one -> false positive AND unrepairable. Verified 2026-08-02: zero production packages have a prefix-name pair.",
  },
  {
    label: "multi-space: '**To   Marina Splash  :  **'",
    name: "Marina Splash",
    text: "1. **To   Marina Splash  :  ** 'Explain the livestream.'",
    note: "detector hardcodes a single space after '**to', so this is never detected at all. Undetected = no deadlock, but also no repair.",
  },
];

console.log("\nKnown gaps (reported, not blocking):");
for (const g of knownGaps) {
  const det = detectorMatches(g.text, g.name);
  const ret = retargeterMatches(g.text, g.name);
  console.log(`  - ${g.label}\n      detector=${det} retargeter=${ret}\n      ${g.note}`);
}

console.log();
if (failures) {
  console.error(`${failures} fixture(s) failed — detector and retargeter disagree.`);
  console.error("Do NOT deploy: this is the exact condition that reverts valid fixes and escalates.");
  process.exit(1);
}
console.log(`All ${fixtures.length} fixtures hold the invariant. Detector and retargeter are in sync.`);
