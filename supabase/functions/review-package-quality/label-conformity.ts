// Pure, dependency-free label conformity check AND heal in one module (ADR-0152; the ADR-0103 Addendum 80 lesson: a detector and its
// heal share one place so they cannot drift). No Deno or network APIs so it can be tested with plain node (label-conformity.test.mjs).
//
// What it fixes in a non-English package: section headers and bold labels in the character sheets that are in the WRONG language (English,
// or another language's pack wording such as German "Zur Person" in a Danish sheet) and close typos or wrong-gender slips of the canonical
// label ("DIT HEMMELIGE", "AFSLÆRINGEN", "SÅ DU ER USKYLDIG"). What it never touches: prose; lines carrying a [Cast Name] placeholder; a
// language without a table; and any label that is a valid but different wording (a synonym, French spacing before a colon, capitalisation,
// a masculine/feminine article). A corpus scan of 80 delivered packages showed those variants are common and not defects.
import { LABELS_BY_CODE } from "./label-tables.ts";

export const CONFORM_FIELDS = [
  "description", "background", "relationships", "secret", "introduction", "rumors",
  "round2_questions", "round2_innocent", "round2_guilty", "round2_accomplice",
  "round3_questions", "round3_innocent", "round3_guilty", "round3_accomplice",
  "round4_questions", "round4_innocent", "round4_guilty", "round4_accomplice",
  "final_innocent", "final_guilty", "final_accomplice", "accusations",
  "reveal_confession_guilty", "reveal_confession_accomplice",
];

const norm = (s: string) => s.replace(/[#*:]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// The first header line of a field is fixed by the template; the role line (bold) of a branch field is fixed by the field name.
const FIRST_HEADER: Record<string, string> = {
  description: "## CHARACTER DESCRIPTION", background: "## CHARACTER BACKGROUND", relationships: "## YOUR RELATIONSHIPS", secret: "## YOUR SECRET",
  introduction: "## ROUND 1: YOUR INTRODUCTION", rumors: "## RUMORS TO SPREAD", accusations: "## ACCUSATIONS",
  round2_questions: "## ROUND 2: MOTIVES", round2_innocent: "## ROUND 2: MOTIVES", round2_guilty: "## ROUND 2: MOTIVES", round2_accomplice: "## ROUND 2: MOTIVES",
  round3_questions: "## ROUND 3: METHOD", round3_innocent: "## ROUND 3: METHOD", round3_guilty: "## ROUND 3: METHOD", round3_accomplice: "## ROUND 3: METHOD",
  round4_questions: "## ROUND 4: OPPORTUNITY", round4_innocent: "## ROUND 4: OPPORTUNITY", round4_guilty: "## ROUND 4: OPPORTUNITY", round4_accomplice: "## ROUND 4: OPPORTUNITY",
  final_innocent: "## FINAL STATEMENT", final_guilty: "## FINAL STATEMENT", final_accomplice: "## FINAL STATEMENT",
  reveal_confession_guilty: "## THE REVEAL — YOUR CONFESSION", reveal_confession_accomplice: "## THE REVEAL — YOUR CONFESSION",
};
const ROLE_LINE: Record<string, string> = {
  innocent: "**IF YOU'RE INNOCENT**", guilty: "**IF YOU'RE GUILTY**", accomplice: "**IF YOU'RE THE ACCOMPLICE**",
};
const roleKeyFor = (field: string): string | null => {
  if (/^reveal_confession_/.test(field) || /_questions$/.test(field)) return null;
  const m = field.match(/_(innocent|guilty|accomplice)$/);
  return m ? ROLE_LINE[m[1]] : null;
};

type Candidate = { key: string; n: string; own: boolean };

function candidatesFor(code: string): Candidate[] {
  const out: Candidate[] = [];
  const table = LABELS_BY_CODE[code];
  const keys = Object.keys(table).filter((k) => !k.includes("["));
  for (const k of keys) out.push({ key: k, n: norm(k), own: false }); // the English template label itself counts as foreign
  for (const [c, t] of Object.entries(LABELS_BY_CODE)) for (const k of keys) out.push({ key: k, n: norm(t[k] ?? ""), own: c === code });
  return out.filter((c) => c.n);
}

export type LabelClass = { key: string; kind: "own" | "foreign" | "near" };

/** Which template key a label text is, and whether it is already this language's wording ("own"), another language's or English ("foreign"), or a near miss ("near"). */
export function classifyLabel(text: string, code: string): LabelClass | null {
  const n = norm(text);
  if (n.length < 4) return null;
  const cands = candidatesFor(code);
  const ownExact = new Set(cands.filter((c) => c.own && c.n === n).map((c) => c.key));
  if (ownExact.size === 1) return { key: [...ownExact][0], kind: "own" };
  const exact = new Set(cands.filter((c) => c.n === n).map((c) => c.key));
  if (exact.size === 1) return { key: [...exact][0], kind: "foreign" };
  if (exact.size > 1 || n.length < 8) return null;
  const limit = Math.min(5, Math.floor(0.3 * n.length));
  const bestOwn = new Map<string, number>(), bestForeign = new Map<string, number>();
  for (const c of cands) {
    // Another language is only "closer" on a near-exact match: Danish "sluterklæring" is 3 edits from Dutch "slotverklaring" but is Danish.
    const lim = c.own ? limit : Math.min(2, Math.floor(0.1 * n.length));
    if (Math.abs(c.n.length - n.length) > lim) continue;
    const d = levenshtein(n, c.n);
    if (d > lim) continue;
    const m = c.own ? bestOwn : bestForeign;
    if (d < (m.get(c.key) ?? 1e9)) m.set(c.key, d);
  }
  const keys = new Set([...bestOwn.keys(), ...bestForeign.keys()]);
  const ranked = [...keys].map((k) => ({ k, d: Math.min(bestOwn.get(k) ?? 1e9, bestForeign.get(k) ?? 1e9), foreign: (bestForeign.get(k) ?? 1e9) < (bestOwn.get(k) ?? 1e9) }))
    .sort((a, b) => a.d - b.d);
  if (!ranked.length || ranked[0].d > limit) return null;
  if (ranked.length > 1 && ranked[1].d - ranked[0].d < 2) return null;
  return { key: ranked[0].k, kind: ranked[0].foreign ? "foreign" : "near" };
}

const GENDER_PAIRS = new Set(["el|la", "la|el", "il|la", "la|il", "lo|la", "la|lo", "o|a", "a|o", "un|una", "una|un", "le|la", "la|le", "der|die", "die|der", "den|de"]);
/** True when two labels differ only by a masculine/feminine article: a valid variant, not a defect. */
export function genderOnlyDiff(a: string, b: string): boolean {
  const x = norm(a).split(" "), y = norm(b).split(" ");
  if (x.length !== y.length) return false;
  let diffs = 0;
  for (let i = 0; i < x.length; i++) {
    if (x[i] === y[i]) continue;
    if (!GENDER_PAIRS.has(`${x[i]}|${y[i]}`)) return false;
    diffs++;
  }
  return diffs > 0;
}

/** A near miss that is close enough to the canonical wording to be a typo or a wrong-gender slip rather than a different valid wording. */
export function closeVariant(line: string, canonical: string): boolean {
  const a = norm(line), b = norm(canonical);
  if (a === b || genderOnlyDiff(a, b)) return false;
  if (levenshtein(a, b) > Math.min(5, Math.floor(0.3 * Math.max(a.length, b.length)))) return false;
  // A typo changes a word by a few letters. A word that is 4+ edits away is a different word (a synonym or loanword such as ROUND for TURNO).
  const x = a.split(" "), y = b.split(" ");
  if (x.length !== y.length) return false;
  return x.every((w, i) => levenshtein(w, y[i]) <= (Math.max(w.length, y[i].length) <= 4 ? 4 : 3)); // short function words: "så" for "hvis"
}

/** True when a slot line contains a distinctive word of another language's label for the same key and none of this language's wording (German GEHEIMNIS in a Danish header). */
export function foreignTokenHit(line: string, key: string, code: string): boolean {
  const toks = (t: string) => norm(t).split(/[^\p{L}]+/u).filter((w) => w.length >= 3);
  const own = new Set(Object.values(LABELS_BY_CODE[code] ?? {}).flatMap(toks));
  const foreign = new Set<string>(toks(key));
  for (const [c, t] of Object.entries(LABELS_BY_CODE)) if (c !== code && t[key]) toks(t[key]).forEach((w) => foreign.add(w));
  const words = toks(line);
  const near = (w: string) => foreign.has(w) || (w.length >= 9 && [...foreign].some((f) => f.length >= 9 && levenshtein(w, f) <= 2));
  return words.some((w) => w.length >= 6 && !own.has(w) && near(w));
}

export type LabelEdit = { field: string; line: number; from: string; to: string; reason: string };

/** A line that can be a label: a whole-line header or bold line, or a leading bold segment that ends with a colon. */
function parseLabelLine(line: string): { label: string; rest: string; boldOnly: boolean } | null {
  const s = line.trimEnd();
  if (!s) return null;
  const lead = s.match(/^(\*\*[^*\n]{1,80}:\*\*)\s+(\S.*)$/);
  if (lead && !/\[[^\]]+\]/.test(lead[1])) return { label: lead[1], rest: lead[2], boldOnly: false };
  if (s.length > 140 || /\[[^\]]+\]/.test(s)) return null;
  if (/^#{1,3} \S/.test(s)) return { label: s, rest: "", boldOnly: false };
  if (/^\*\*[^*\n]+\*\*:?$/.test(s)) return { label: s, rest: "", boldOnly: true };
  return null;
}

/** Fix one field's text for a language. Returns the new text and the edits made (empty when nothing needed changing). */
export function conformField(field: string, text: string, code: string): { text: string; edits: LabelEdit[] } {
  const table = LABELS_BY_CODE[code];
  if (!table || typeof text !== "string" || !text) return { text, edits: [] };
  const lines = text.split("\n");
  const edits: LabelEdit[] = [];
  const firstKey = FIRST_HEADER[field];
  const roleKey = roleKeyFor(field);
  let firstDone = false, roleDone = false;
  let seenNonEmpty = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    seenNonEmpty++;
    const p = parseLabelLine(raw);
    if (!p) { if (seenNonEmpty === 1) firstDone = true; continue; }
    const cls = classifyLabel(p.label, code);
    let key = cls?.key ?? null;
    let kind: string = cls?.kind ?? "";
    let reason = cls ? `${cls.kind} match to "${cls.key}"` : "";

    // Slot knowledge: the first non-empty line of a field is its template header; a bold line near the top of a branch field is the role line.
    const isFirstLine = seenNonEmpty === 1 && !firstDone;
    if (isFirstLine && firstKey && /^#{1,3} /.test(p.label) && (key === null || key === firstKey)) {
      if (key === null) { kind = foreignTokenHit(p.label, firstKey, code) ? "foreign" : "slot"; reason = "first header of the field"; }
      key = firstKey;
    } else if (!roleDone && roleKey && p.boldOnly && seenNonEmpty <= 6 && (key === null || key === roleKey)) {
      if (key === null) { kind = "slot"; reason = "role line of the branch"; }
      key = roleKey;
    }
    if (seenNonEmpty === 1) firstDone = true;
    if (key === roleKey && roleKey) roleDone = true;
    if (!key) continue;
    const canonical = table[key];
    if (!canonical || canonical.includes("[")) continue;
    if (kind === "own") continue; // already this language's wording (case, spacing and punctuation differences are valid)
    const labelText = p.label;
    if ((kind === "near" || kind === "slot") && !closeVariant(labelText, canonical)) continue; // a different but valid wording: leave it
    if (p.rest) {
      if (labelText !== canonical) { lines[i] = `${canonical} ${p.rest}`; edits.push({ field, line: i, from: labelText, to: canonical, reason }); }
    } else if (raw.trimEnd() !== canonical) {
      lines[i] = canonical; edits.push({ field, line: i, from: raw.trimEnd(), to: canonical, reason });
    }
  }
  return { text: lines.join("\n"), edits };
}

/** Fix every character sheet of a package. `rows` are mystery_characters rows; returns only the fields that changed. */
export function conformPackage(rows: Record<string, unknown>[], code: string): { changes: { id: string; name: string; fields: Record<string, string>; edits: LabelEdit[] }[]; total: number } {
  const changes: { id: string; name: string; fields: Record<string, string>; edits: LabelEdit[] }[] = [];
  let total = 0;
  if (!LABELS_BY_CODE[code]) return { changes, total };
  for (const r of rows) {
    const fields: Record<string, string> = {};
    const edits: LabelEdit[] = [];
    for (const f of CONFORM_FIELDS) {
      const v = r[f];
      if (typeof v !== "string" || !v) continue;
      const res = conformField(f, v, code);
      if (res.edits.length) { fields[f] = res.text; edits.push(...res.edits); }
    }
    if (edits.length) { changes.push({ id: String(r.id ?? ""), name: String(r.character_name ?? ""), fields, edits }); total += edits.length; }
  }
  return { changes, total };
}
