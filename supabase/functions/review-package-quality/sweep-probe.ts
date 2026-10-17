// Pure, dependency-free core of the whole-package "sweeper" pass (ADR-0168, shadow mode). No Deno or network APIs: tested with plain node
// (sweep-probe.test.mjs).
//
// Why: the per-item reviewer reads one sheet at a time against a digest, and its recall against the daily hand sweep is about 52 percent over 16
// sweeps (sweep_exit_metrics, 2026-10-17); the misses are cross-sheet facts. The hand sweep works because it reads the WHOLE cast in one context
// and cross-checks every field. This pass does that: one model call per half of the cast, each with the full package in view, reporting only on
// its own half (so two calls do not report the same sheet twice) while reading the other half as evidence.
import * as C from "./review-core.ts";

type Row = Record<string, unknown>;

export const SWEEP_ITEM_NAME_DOCS = C.DOC_ITEM_NAME;
/** Above this many characters of package text a single call is not attempted (about 190k tokens). The probe logs "too large" instead. */
export const SWEEP_MAX_CHARS = 650_000;
/** A cast of this many sheets or fewer is read in one call; a larger one is split in two halves. */
export const SWEEP_SINGLE_CALL_MAX_SHEETS = 6;
export const SWEEP_CUSTOMER_WORDS_MAX_CHARS = 20_000;

const FINDING_PROPS = {
  item: { type: "string" },
  field: { type: "string" },
  exact_quote: { type: "string" },
  category: { type: "string", enum: [...C.CATEGORIES] },
  severity: { type: "string", enum: [...C.SEVERITIES] },
  explanation: { type: "string" },
  suggested_replacement: { type: "string" },
};
export const SWEEP_SCHEMA = {
  type: "object", additionalProperties: false, required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: Object.keys(FINDING_PROPS), properties: FINDING_PROPS },
    },
  },
};

const INTRO = `You are the final whole-package sweeper for a paid murder-mystery party package. A host prints each character's sheet and reads aloud with friends, so any slip or contradiction a guest notices breaks the illusion.
Unlike the per-item reviewer you can see EVERYTHING at once: the customer's own words, the canonical facts (master_context), the shared documents and every character sheet. Do what a careful human editor does the night a package is delivered: read the whole cast and cross-check it. The owner never wants to make creative decisions, so you make them (rule 9).`;

const CHECKLIST = `WHAT TO CHECK (read every field of every sheet, then report only genuine defects):
1. FACTS ACROSS SHEETS: a name, amount, year, item, who owns or found what, where something was kept, what a document says, as stated in one sheet or document and contradicted by master_context, another sheet, a shared document or an evidence card. Evidence card text against the detective script and against master_context (what it is, whose it is, where found).
2. POSITIONS AND ALIBIS: every statement about where ANOTHER character was or what they did (rumors, questions to others, relationships, scripts, final statements) against that character's own account of the same moment. A character who says they stayed in one place while two other sheets put them elsewhere is a defect. In detective style, a Round 1 or Round 2 field that places the murderer or accomplice at the scene of the crime is a spoiler (high).
3. HIDDEN VERSUS KNOWN: a fact one character's secret treats as hidden ("nobody knows", "you have told no one") that another character announces as established fact in Round 1 text (introduction, rumors). Round 2 is where each owner announces their own motive, and rumors may hint, so do not report later rounds, hints or gossip phrased as "I heard". Also a secret that claims nobody knows something the same character's own scripts and several other sheets treat as common knowledge: change the secret.
4. OWN-SHEET CONSISTENCY: the innocent, guilty and accomplice versions of one character tell the same facts (they differ only in what they admit); a culprit's lie must be the same lie in every field of the same version; a secret contradicted by the same character's scripts; a field that gives up what another field of the same version denies.
5. PRONOUNS AND GENDER: the victim follows the convention below. A character's own sheet must not switch between they and she or he for the same person, and must agree with how other sheets refer to that person. Follow the customer's own wording: if the customer wrote "her designs" or "they", that is the convention for that character. Do not impose a gender the customer did not use.
6. SLIPS AND LEAKS: a leaked template or variable name ("hasAccomplice", "insert here", "[choose", a bracketed instruction, a self-correction), a garbled or doubled word, a sentence that contradicts itself, an unbalanced quote mark inside a rumor or question item, a sheet narrating its owner in the third person where sibling fields say "I", a secret or relationships field addressed to "he" or "she" instead of "you".
7. SHARED DOCUMENTS: the detective script, game overview and evidence cards against the cast. The overview must not reveal a hidden secret or motive. In detective style no printed card or pre-reveal narration names the murderer or accomplice; in slip style the reveal and closing name no cast member as guilty (the culprit is drawn at the table).
8. THE CUSTOMER'S BRIEF: a requirement the customer wrote (names kept, a clue, the weapon, the hint, the climax) that the package contradicts or leaves out.
9. HOW TO DECIDE (creative calls are yours, never the owner's): when two places disagree, keep the reading the customer's own words and the larger number of sheets support, and edit the side with fewer statements so it matches. A conflict that starts in the customer's concept (a debt one sheet calls hidden and another announces) is decided the same way. Never invent a fact about another character: if the only fix would need one, leave suggested_replacement empty and say so in the explanation.`;

const OUTPUT_RULES = `HOW TO REPORT:
- item = the character name exactly as in its "### CHARACTER:" heading, or "${C.DOC_ITEM_NAME}" for the shared documents. You report only on the FOCUS items named at the end of the package text; read all the others as evidence. A conflict is reported on the item that should be edited (rule 9); if that item is not one of your FOCUS items, leave it to the call that has it.
- field = the exact field name shown in brackets before the text. exact_quote = copied character-for-character from that field, the smallest span that shows the defect (a few words to one sentence, at most 200 characters), and it must occur exactly once in that field.
- suggested_replacement = the corrected version of exact_quote only: minimal edit, same language and voice, true against the rest of the package. If the same wrong fact sits in several fields (for example round4_innocent and round4_guilty), report each field separately.
- category: single_generation_slip, wrong_fact, cross_field_contradiction (also use it for position, alibi, hidden-versus-known and own-sheet conflicts), pronoun_drift, secret_leak, language_slip, other.
- severity: high = a guest would stop and ask what it means, or it spoils the solution; medium = a careful reader would notice; report only medium or high.
- explanation: at most 40 words, naming the other sheet or field the quote conflicts with.
- Precision matters as much as coverage: report only what you are confident is wrong. Never report a finding whose explanation would conclude that the text is acceptable, plausible, minor or by design; omit it. An empty findings list is a correct answer for a clean item.`;

/** The full system text for one style. The by-design rules and the ignore list are the reviewer's own (review-core), so the two stay in step. */
export function sweepInstructions(style: C.Style): string {
  const rules = style === "detective" ? C.DETECTIVE_RULES : C.SLIP_RULES;
  return [INTRO, rules, CHECKLIST, C.PRONOUNS_AND_IGNORE, OUTPUT_RULES].join("\n\n") + "\n";
}

const asText = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));

/** The customer's own words (their briefs and replies), clipped: a long chat keeps its start (the brief) and its end (the approved concept and last replies). */
export function customerWords(pkg: Row): string {
  const t = asText(pkg.user_conversation).trim();
  const max = SWEEP_CUSTOMER_WORDS_MAX_CHARS;
  return t.length <= max ? t : t.slice(0, Math.floor(max * 0.3)) + "\n[... middle of the conversation omitted ...]\n" + t.slice(t.length - Math.floor(max * 0.7));
}

/** Everything the sweeper reads, shared by all calls for the package (the cacheable part). */
export function sweepContext(pkg: Row, chars: Row[], style: C.Style): string {
  const objs = C.parseMasterContext(pkg.master_context);
  for (const o of objs) delete (o as Row).accomplicePairings; // slip pairing is by design and confused the reviewer in the pilot
  const mc = objs.length ? objs.map((o) => JSON.stringify(o, null, 1)).join("\n") : String(pkg.master_context ?? "");
  const victim = ((objs[0]?.victimProfile as Row | undefined)?.name as string | undefined) ?? "(see master_context)";
  const roles = (r: string) => chars.filter((c) => c.character_role === r).map((c) => String(c.character_name));
  const solution = style === "detective"
    ? `SOLUTION (hidden from guests): murderer = ${roles("murderer").join(", ") || "?"}; accomplice = ${roles("accomplice").join(", ") || "none"}; red herrings = ${roles("redHerring").join(", ") || "none"}.\n`
    : "";
  const gameStyle = style === "detective" ? "detective style" : "slip style (murderer and accomplice drawn at the table)";
  const words = customerWords(pkg);
  const docs = C.packageDocsBlock(pkg).replace("ITEM UNDER REVIEW: ", "");
  const sheets = chars.map((c) => C.characterBlock(c, style).replace("CHARACTER UNDER REVIEW: ", "### CHARACTER: ")).join("\n\n");
  return `PACKAGE: ${pkg.title ?? ""}\nVICTIM: ${victim}\n${C.victimGenderNote(pkg, victim)}GAME STYLE: ${gameStyle}\n${solution}\n` +
    `=== THE CUSTOMER'S OWN WORDS (briefs and replies, the authority on names, pronouns and requirements) ===\n${words || "(none stored)"}\n\n` +
    `=== master_context (canonical facts for this package) ===\n${mc}\n\n` +
    `=== ${C.DOC_ITEM_NAME} ===\n${docs}\n\n=== ALL CHARACTER SHEETS ===\n${sheets}`;
}

/** Split the cast into the focus groups of the calls: one group for a small cast, two near-equal halves otherwise. Documents ride with the first group. */
export function focusGroups(names: string[]): string[][] {
  if (names.length <= SWEEP_SINGLE_CALL_MAX_SHEETS) return [[...names, C.DOC_ITEM_NAME]];
  const half = Math.ceil(names.length / 2);
  return [[...names.slice(0, half), C.DOC_ITEM_NAME], names.slice(half)];
}

export const focusText = (group: string[]): string =>
  `=== YOUR FOCUS ===\nReport only on these items (read everything else as evidence): ${group.join("; ")}.\nNow report every genuine defect you find in the focus items.`;

export type SweepFinding = C.RawFinding & { item: string };

/** Map a raw finding to the row it edits and keep it only when its quote appears exactly once in that field. Findings outside the focus are dropped. */
export function resolveSweepFinding(f: SweepFinding, chars: Row[], pkg: Row, focus: string[]): { row: Row; item: string; finding: C.RawFinding } | null {
  if (!f || typeof f.item !== "string" || !focus.includes(f.item)) return null;
  const row = f.item === C.DOC_ITEM_NAME ? pkg : chars.find((c) => String(c.character_name) === f.item);
  if (!row) return null;
  if (f.item === C.DOC_ITEM_NAME ? !C.DOC_FIELDS.includes(f.field) : !C.CHARACTER_FIELDS.includes(f.field)) return null;
  const finding: C.RawFinding = { field: f.field, exact_quote: f.exact_quote, category: f.category, severity: f.severity, explanation: f.explanation, suggested_replacement: f.suggested_replacement };
  if (!C.validateFinding(row, finding).ok) return null;
  return { row, item: f.item, finding };
}

/** Drop a finding reported twice (same item, field and quote) across the calls. */
export function dedupe<T extends { item_name: string; field: string; exact_quote: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => { const k = `${r.item_name}|${r.field}|${r.exact_quote}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Rough input size for the dry-run estimate and the size guard. */
export function sweepSize(pkg: Row, chars: Row[], style: C.Style): { chars: number; approx_input_tokens: number } {
  const n = sweepInstructions(style).length + sweepContext(pkg, chars, style).length;
  return { chars: n, approx_input_tokens: Math.round(n / 3.4) };
}

/** pipeline_settings.review_sweep_probe: a count of packages still allowed to run (the approved shadow window). Anything else means off. */
export function remainingBudget(value: string | null | undefined): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
