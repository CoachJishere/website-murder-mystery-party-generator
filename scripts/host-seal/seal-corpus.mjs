/**
 * Corpus check for the ADR-0158 host seal, on real paid detective packages (read-only).
 * Run: node --experimental-strip-types scripts/host-seal/seal-corpus.mjs         (summary)
 *      SNIPS=1 node --experimental-strip-types scripts/host-seal/seal-corpus.mjs (also the first name hit before the reveal, per package)
 * Reports: reveal heading found vs fail-closed, and the murderer/accomplice name-part hits that a sealed host still
 * sees (open script, player-facing evidence). A name hit is NOT automatically a leak: the victim's surname, roster
 * mentions and first names shared with other characters match too, so read the SNIPS before concluding anything.
 */
import { tsImport, makeGet, loadPaidPackages, culprits, needles, count } from "./lib.mjs";
const { sealDetectiveScript } = await tsImport("src/utils/hostSeal.ts");
const { playerFacingEvidence } = await tsImport("src/utils/evidenceCardUtils.ts");

const rows = (await loadPaidPackages(makeGet())).filter((r) => r.detective_script);
let found = 0, failClosed = 0, rawEvidence = 0;
const leakScript = [], leakEvidence = [];
for (const [i, r] of rows.entries()) {
  const s = sealDetectiveScript(r.detective_script);
  s.found ? found++ : failClosed++;
  const evRaw = typeof r.evidence_cards === "string" ? r.evidence_cards : JSON.stringify(r.evidence_cards ?? "");
  const ev = playerFacingEvidence(evRaw);
  const visible = s.found ? s.open : ""; // fail closed: nothing of the script is shown
  let a = 0, b = 0, raw = 0;
  for (const c of culprits(r)) for (const n of needles(c.full)) { a += count(visible, n); b += count(ev, n); raw += count(evRaw, n); }
  if (raw) rawEvidence++;
  if (a) leakScript.push(r.id.slice(0, 8));
  if (b) leakEvidence.push(r.id.slice(0, 8));
  if (i < 5) console.log("recent", r.id.slice(0, 8), r.conv.created_at.slice(0, 10), "sealFound", s.found, "script hits", a, "player-facing evidence hits", b, "(raw evidence", raw + ")");
  if (process.env.SNIPS && s.found) for (const c of culprits(r)) for (const n of needles(c.full)) {
    const idx = s.open.toLowerCase().indexOf(n.toLowerCase());
    if (idx >= 0) { console.log(r.conv.created_at.slice(0, 10), r.id.slice(0, 8), c.role, JSON.stringify(n), JSON.stringify(s.open.slice(Math.max(0, idx - 70), idx + 90))); break; }
  }
}
console.log({ packages: rows.length, revealHeadingFound: found, failClosed, rawEvidenceNamesCulprit: rawEvidence,
  packagesWhereVisibleScriptHasANameHit: leakScript.length, packagesWherePlayerFacingEvidenceHasANameHit: leakEvidence.length });
