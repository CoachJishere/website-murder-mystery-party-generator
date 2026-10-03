// Pure, dependency-free core of the LLM quality reviewer (ADR-0136). No Deno or network APIs in this file so it can be unit-tested
// with plain node (see review-core.test.mjs). The prompts are the ones calibrated in the pilot (docs/adr/0136-pilot/, Addenda 2-4)
// plus the two fixes the pilot called for: the dual-name rule in the detective prompt, and `accomplicePairings` kept out of the context.

export const PROMPT_VERSION = "v4-2026-10-03";
export const DEFAULT_MODEL = "claude-sonnet-5-5";
// USD per million tokens for the default model (Anthropic price table, 2026-10). Used for the running cost estimate only.
export const PRICE = { in: 2.0, cacheWrite: 2.5, cacheRead: 0.2, out: 10.0 };

export type Style = "character" | "detective";

export const CHARACTER_FIELDS = [
  "description", "background", "relationships", "secret", "introduction", "rumors",
  "round2_questions", "round2_innocent", "round2_guilty", "round2_accomplice",
  "round3_questions", "round3_innocent", "round3_guilty", "round3_accomplice",
  "round4_questions", "round4_innocent", "round4_guilty", "round4_accomplice",
  "final_innocent", "final_guilty", "final_accomplice", "accusations",
  "reveal_confession_guilty", "reveal_confession_accomplice",
  "round2_script", "round3_script", "round4_script", "final_statement",
];
export const DOC_FIELDS = ["game_overview", "detective_script", "evidence_cards", "materials"];
export const DOC_ITEM_NAME = "PACKAGE DOCUMENTS";
export const KNOWN_FIELDS = new Set([...CHARACTER_FIELDS, ...DOC_FIELDS]);

export const CATEGORIES = [
  "single_generation_slip", "wrong_fact", "cross_field_contradiction", "pronoun_drift", "secret_leak", "language_slip", "other",
] as const;
export const SEVERITIES = ["high", "medium", "low"] as const;

export const FINDINGS_SCHEMA = {
  type: "object", additionalProperties: false, required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["field", "exact_quote", "category", "severity", "explanation", "suggested_replacement"],
        properties: {
          field: { type: "string" },
          exact_quote: { type: "string" },
          category: { type: "string", enum: [...CATEGORIES] },
          severity: { type: "string", enum: [...SEVERITIES] },
          explanation: { type: "string" },
          suggested_replacement: { type: "string" },
        },
      },
    },
  },
};

const COMMON_INTRO = `You are the final quality reviewer for a paid murder-mystery party package. A host prints each character's sheet and reads aloud with friends, so any slip a guest notices breaks the illusion. You review ONE item at a time (either one character's sheet, or the package's shared documents) and report only genuine defects.`;

const SLIP_RULES = `HOW THE GAME WORKS (these are by design, never defects):
- Slip-style game: the murderer and accomplice are drawn at the table. Every character therefore has three versions of rounds 2-4 and of the final statement: innocent, guilty and accomplice. The versions legitimately differ. The guilty and accomplice versions deny or deflect in rounds 2-4 and in the final statement and only confess in the reveal. A guilty or accomplice character lying in rounds 2-4 is not a contradiction.
- Accomplice confessions may name a specific murderer. Do not report that.
- Characters repeat the same motive and background across versions, in their own words.
- Rumors and questions legitimately mention other characters' public motives and secrets. Only report a secret leak when an INNOCENT-branch statement shows knowledge of the murderer's or another character's hidden secret that this speaker could not know.`;

const DETECTIVE_RULES = `HOW THE GAME WORKS (these are by design, never defects):
- Detective style: the solution is fixed. The SOLUTION line below names the murderer (and accomplice, if any); red herrings carry suspicious secrets that have nothing to do with the murder. Guests do not know the solution.
- Each character has ONE script per round (round2_script, round3_script, round4_script) and a final_statement, plus an accusation sheet. The murderer's and accomplice's scripts deny, deflect or mislead in rounds 2-4; their final_statement may confess or deny. That lying is by design, not a contradiction. The accusation sheet of a guilty character may contain private deflection tips.
- Rounds: round 2 is motives, round 3 is method, round 4 is opportunity. One evidence card is revealed per round.
- Questions ("To X") and rumors legitimately mention other characters' public motives and relationships.`;

const WHAT_TO_REPORT_COMMON = `WHAT TO REPORT (category):
- single_generation_slip: a garbled or ungrammatical sentence, a wrong or doubled word, a typo or non-word, a sentence that contradicts itself inside one field, stray text that does not belong (including a leaked self-correction such as "sorry, I mean"), a time reference that is wrong for the game (the whole game is one night).
- wrong_fact: a statement that contradicts master_context or the roster dossier: another character's job or relationship, a location, an amount, a date, who did what to whom, the victim's name, or the speaker's own role. For the shared documents also: evidence described differently from master_context (what it is, who owns it, where it was found), or two shared documents that disagree.
- cross_field_contradiction: two fields of THIS character disagree on a concrete fact (years of service, who did what, an amount), not a difference between versions and not the murderer's deliberate lies.
- pronoun_drift: the victim is referred to with a pronoun or gendered noun that breaks the package convention (below).
- language_slip: English words or another script inside prose written in another language, or formal/informal address (tu/vous, tú/usted, du/Sie, vosotros/ustedes) that changes inside one character's text.
- other: anything else a careful reader would call plainly wrong. Use sparingly.`;

const SLIP_SECRET_LEAK = `- secret_leak: an INNOCENT-branch statement shows knowledge of the murderer's or another character's hidden secret that the speaker could not know.`;
const DETECTIVE_SECRET_LEAK = `- secret_leak: an INNOCENT character's text, or any shared document read before the reveal, shows or hints at the solution (who the murderer is, the murderer's secret or hidden method) or at another character's hidden secret that this speaker could not know. In round 2 a script must not rely on round 3 or 4 evidence.`;

const PRONOUNS_AND_IGNORE = `VICTIM PRONOUN CONVENTION: use the victim's name. Use a pronoun only if master_context refers to the victim with one consistent gender. If master_context uses no pronoun, mixes genders, or never states a gender, the victim is gender-neutral (they/them/their) and any he/she/him/her/his/hers/man/woman/boy/girl/guy/lady for the victim is pronoun_drift. Other characters keep their own pronouns.

IGNORE THESE (handled by other tools or by design, never report them): (a) which character a confession names as the murderer or accomplice; (b) any ally or rival listed in a relationships field compared with the relationship matrix; (c) section headers, missing headers, pointform, markdown, quote marks, tags and other stray characters; (d) a name written like "Osric/Osryth" is the deliberate dual-gender naming convention, so never report it nor the gendered words around it; (e) writing style, tone or length.
READ EVERY FIELD WITH EQUAL CARE: the description, background and relationships fields are short, but a slip there is as visible to a guest as a slip in a script. Check each of them sentence by sentence for garbled wording, wrong facts and stray paragraphs.`;

const RULES = `RULES:
1. Quote exactly: exact_quote must be copied character-for-character from the field and be the smallest span that shows the defect (usually a few words to one sentence, at most 200 characters). It must appear exactly once in that field.
2. suggested_replacement is the corrected version of exact_quote only (same meaning, minimal edit, same language). Leave it empty if the fix needs a judgment call.
3. Report each distinct defect once; list repeated wrong pronouns separately.
4. Precision matters more than coverage: report only what you are confident is wrong. Never list a finding whose explanation would conclude that the text is acceptable, plausible, minor, weak, a matter of taste, in character, or by design: omit it instead. Report nothing when the item is clean (empty findings list). An idiom such as "it's just a Tuesday" is not a time claim.
5. Severity: high = a guest would stop and ask what it means; medium = a careful reader would notice and a host would want it fixed; low = barely noticeable. Report only medium or high.
6. field must be the exact field name shown in brackets before the text.
7. Write explanations in English, at most 30 words.`;

export function instructionsFor(style: Style): string {
  const rules = style === "detective" ? DETECTIVE_RULES : SLIP_RULES;
  const leak = style === "detective" ? DETECTIVE_SECRET_LEAK : SLIP_SECRET_LEAK;
  return [COMMON_INTRO, rules, WHAT_TO_REPORT_COMMON + "\n" + leak, PRONOUNS_AND_IGNORE, RULES].join("\n\n") + "\n";
}

type Row = Record<string, unknown>;

/** master_context is stored as one or two concatenated JSON objects. Returns the parsed objects (best effort). */
export function parseMasterContext(mc: unknown): Row[] {
  const s = typeof mc === "string" ? mc : JSON.stringify(mc ?? {});
  const out: Row[] = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    // find the end of one balanced JSON value
    let depth = 0, inStr = false, esc = false, j = i;
    for (; j < s.length; j++) {
      const ch = s[j];
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") { depth--; if (depth === 0) { j++; break; } }
    }
    try { out.push(JSON.parse(s.slice(i, j))); } catch { break; }
    i = j;
  }
  return out;
}

export function contextText(pkg: Row, chars: Row[], style: Style): string {
  const objs = parseMasterContext(pkg.master_context);
  for (const o of objs) delete (o as Row).accomplicePairings; // slip pairing is by design and confused the reviewer in the pilot
  const mc = objs.length ? objs.map((o) => JSON.stringify(o, null, 1)).join("\n") : String(pkg.master_context ?? "");
  const victim = ((objs[0]?.victimProfile as Row | undefined)?.name as string | undefined) ?? "(see master_context)";
  const roles = (r: string) => chars.filter((c) => c.character_role === r).map((c) => String(c.character_name));
  const solution = style === "detective"
    ? `SOLUTION (hidden from guests): murderer = ${roles("murderer").join(", ") || "?"}; accomplice = ${roles("accomplice").join(", ") || "none"}; red herrings = ${roles("redHerring").join(", ") || "none"}.\n`
    : "";
  const roster = chars.map((c) =>
    `### ${c.character_name}\nrole: ${c.character_role ?? ""}\ndescription: ${String(c.description ?? "").trim()}\nsecret: ${String(c.secret ?? "").trim()}`
  ).join("\n\n");
  const gameStyle = style === "detective" ? "detective style" : "slip style (murderer and accomplice drawn at the table)";
  return `PACKAGE: ${pkg.title ?? ""}\nVICTIM: ${victim}\nGAME STYLE: ${gameStyle}\n${solution}\n=== master_context (canonical facts for this package) ===\n${mc}\n\n=== ROSTER DOSSIER (every character: description and secret) ===\n${roster}`;
}

export type SystemBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

/** Two system blocks: the instructions, then the package context with the cache breakpoint (shared by every call for the package). */
export function buildSystemBlocks(pkg: Row, chars: Row[], style: Style): SystemBlock[] {
  return [
    { type: "text", text: instructionsFor(style) },
    { type: "text", text: contextText(pkg, chars, style), cache_control: { type: "ephemeral" } },
  ];
}

function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return JSON.stringify(v);
}

export function characterBlock(c: Row, style: Style): string {
  const role = style === "detective" ? ` (role: ${c.character_role ?? ""})` : "";
  const parts = [`CHARACTER UNDER REVIEW: ${c.character_name}${role}\n`];
  for (const f of CHARACTER_FIELDS) {
    const v = asText(c[f]).trim();
    if (v) parts.push(`[${f}]\n${v}\n`);
  }
  return parts.join("\n");
}

export function packageDocsBlock(pkg: Row): string {
  const parts = ["ITEM UNDER REVIEW: the package's shared documents (read aloud or shown to everyone)\n"];
  for (const f of DOC_FIELDS) {
    const v = asText(pkg[f]).trim();
    if (v) parts.push(`[${f}]\n${v}\n`);
  }
  return parts.join("\n");
}

export type RawFinding = {
  field: string; exact_quote: string; category: string; severity: string; explanation: string; suggested_replacement: string;
};

/** The text of the field a finding refers to, so its quote can be verified. */
export function fieldText(item: Row, field: string): string {
  return asText(item[field]);
}

export function countOccurrences(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

/** A finding is kept only if its field is known, severity is medium/high, and its quote appears EXACTLY once in that field. */
export function validateFinding(item: Row, f: RawFinding): { ok: boolean; reason?: string } {
  if (!KNOWN_FIELDS.has(f.field)) return { ok: false, reason: "unknown field" };
  if (!(CATEGORIES as readonly string[]).includes(f.category)) return { ok: false, reason: "unknown category" };
  if (f.severity !== "high" && f.severity !== "medium") return { ok: false, reason: "low severity" };
  if (!f.exact_quote || f.exact_quote.length > 400) return { ok: false, reason: "bad quote length" };
  const n = countOccurrences(fieldText(item, f.field), f.exact_quote);
  if (n !== 1) return { ok: false, reason: n === 0 ? "quote not found" : "quote not unique" };
  return { ok: true };
}

/**
 * Whether a finding is safe to apply automatically: only when an exact-quote replacement is present and sane. The class allow-list is
 * decided by the caller (switched off by default); this only checks the mechanics.
 */
export function replacementIsSane(f: RawFinding): boolean {
  const r = f.suggested_replacement;
  if (!r || !r.trim()) return false;
  if (r === f.exact_quote) return false;
  if (r.length > f.exact_quote.length * 2 + 40) return false;
  if (/\n\s*\n/.test(r) && !/\n\s*\n/.test(f.exact_quote)) return false;
  if (/[<`{]/.test(r) && !/[<`{]/.test(f.exact_quote)) return false;
  return true;
}

export function applyReplacement(text: string, f: RawFinding): string | null {
  if (countOccurrences(text, f.exact_quote) !== 1) return null;
  return text.replace(f.exact_quote, () => f.suggested_replacement);
}

export type Usage = { input_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number; output_tokens?: number };

export function costUsd(u: Usage, price = PRICE): number {
  return ((u.input_tokens ?? 0) * price.in + (u.cache_creation_input_tokens ?? 0) * price.cacheWrite +
    (u.cache_read_input_tokens ?? 0) * price.cacheRead + (u.output_tokens ?? 0) * price.out) / 1e6;
}

export type DigestFinding = { item_name: string; field: string; category: string; severity: string; exact_quote: string; explanation: string };

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The email Jonathan receives for each reviewed order. Default "summary": counts and the HIGH findings only, with an explicit "no action
 * needed" (the sweep reads the full list from package_review_findings). "full" lists up to 40 findings; "off" sends nothing (returns null).
 */
export function digestEmail(
  title: string, packageId: string, style: string, model: string, cost: number, findings: DigestFinding[], mode: string,
): { subject: string; html: string } | null {
  if (mode === "off" || findings.length === 0) return null;
  const high = findings.filter((f) => f.severity === "high");
  const byCat = new Map<string, number>();
  for (const f of findings) byCat.set(f.category, (byCat.get(f.category) ?? 0) + 1);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${escapeHtml(c.replace(/_/g, " "))} ${n}`).join(", ");
  const row = (f: DigestFinding) =>
    `<tr><td style="padding:4px 8px;vertical-align:top"><b>${f.severity === "high" ? "HIGH" : "med"}</b></td><td style="padding:4px 8px;vertical-align:top">${escapeHtml(f.item_name)} / ${escapeHtml(f.field)}</td><td style="padding:4px 8px;vertical-align:top"><i>${escapeHtml(f.exact_quote.slice(0, 160))}</i><br>${escapeHtml(f.explanation)}</td></tr>`;
  const shown = mode === "full" ? findings.slice(0, 40) : high.slice(0, 5);
  const table = shown.length ? `<table style="border-collapse:collapse;font-size:13px">${shown.map(row).join("")}</table>` : "";
  const more = mode === "full"
    ? (findings.length > 40 ? `<p>${findings.length - 40} more in the database.</p>` : "")
    : `<p style="color:#6b7280">${findings.length - shown.length} more are in the database (package_review_findings).</p>`;
  const html = `<div style="font-family:sans-serif;max-width:800px"><h3>Reviewed: ${escapeHtml(title)}</h3>` +
    `<p><b>No action needed.</b> This is an automatic quality check of a finished order (${escapeHtml(style)} style). It changed nothing. Claude reads the full list during the next sweep, checks each item against the text, and fixes the real ones. ` +
    `A handful of small slips per package is normal; the number matters because we are tracking it going down.</p>` +
    `<p>${findings.length} findings (${high.length} high): ${cats}. About $${cost.toFixed(2)}. Package ${packageId}, model ${escapeHtml(model)}.</p>` +
    (high.length && mode !== "full" ? `<p><b>High severity:</b></p>` : "") + table + more + `</div>`;
  const subject = `Reviewed: ${title} - ${findings.length} findings${high.length ? ` (${high.length} high)` : ""}, no action needed`;
  return { subject, html };
}
