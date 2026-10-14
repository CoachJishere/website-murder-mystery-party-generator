// Pure, dependency-free core of the LLM quality reviewer (ADR-0136). No Deno or network APIs in this file so it can be unit-tested
// with plain node (see review-core.test.mjs). The prompts are the ones calibrated in the pilot (docs/adr/0136-pilot/, Addenda 2-4)
// plus the two fixes the pilot called for: the dual-name rule in the detective prompt, and `accomplicePairings` kept out of the context.

export const PROMPT_VERSION = "v4-2026-10-03"; // the propagation pass below adds no field to the main prompt, so the version is unchanged
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
export const REQUIREMENTS_ITEM_NAME = "REQUIREMENTS";
export const REQUIREMENTS_FIELD = "userRequirements"; // pseudo field: the customer's list inside master_context, never written back
export const KNOWN_FIELDS = new Set([...CHARACTER_FIELDS, ...DOC_FIELDS, REQUIREMENTS_FIELD]);

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

// ---- Culprit named on a printed evidence card (ADR-0151) ----
// ADR-0035: the printed DESCRIPTION of an evidence card must never name the murderer or accomplice. The older SQL detector matches the SURNAME
// only, so it fires on family and company names (3 of its 4 hits since August were a victim's family or business) and stayed advisory. This
// check matches the character's FULL name (every spelling of a "Pat/Patricia Lee" dual name) in the printed text only, so a family name does
// not trip it, and it feeds the daily open-findings email as a high finding instead of gating a customer.
// ADR-0161: the Significance heading is localized in non-English packages; the words are the ones in docs/language-pack/scaffold-labels.json
// (packageScaffold.test.mjs checks they stay in step).
const HOST_ONLY_HEADING = /^#{2,4}[ \t]*(Significance|Significado|Signification|Bedeutung|Significato|Betekenis|Betydning|Betydelse|Merkitys|의미|意味|意义|Implications|What This Reveals|Who It Implicates|Visual Description|Discovered)[^\n]*\n[\s\S]*?(?=^#{2,4}[ \t]|(?![\s\S]))/gimu;

/** The printed (guest-facing) part of the evidence cards: host-only sections removed. */
export function printedEvidenceText(evidence: unknown): string {
  const t = typeof evidence === "string" ? evidence : JSON.stringify(evidence ?? "");
  return t.replace(HOST_ONLY_HEADING, "");
}

/** Every spelling of a cast name: "Pat/Patricia Lee" gives "Pat Lee" and "Patricia Lee"; a single name stays as it is. Names under 4 letters are skipped. */
export function nameVariants(name: string): string[] {
  const parts = name.trim().split(/\s+/);
  const first = (parts[0] ?? "").split("/").filter(Boolean);
  const rest = parts.slice(1).join(" ");
  const out = first.map((f) => (rest ? `${f} ${rest}` : f));
  // a dual name can also sit in the last part ("Ann Lee/Leigh"): expand it too
  return [...new Set(out.flatMap((o) => (o.includes("/") ? o.split("/") .map((x) => x.trim()) : [o])))].filter((v) => v.length >= 4);
}

/** Snippets of the printed evidence text that contain a culprit's full name (empty when none). */
export function culpritNameHits(evidence: unknown, culpritNames: string[]): { name: string; snippet: string }[] {
  const text = printedEvidenceText(evidence).replace(/\\n/g, "\n");
  const hits: { name: string; snippet: string }[] = [];
  for (const full of culpritNames) {
    for (const v of nameVariants(full)) {
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, "u").exec(text);
      if (m) { const a = Math.max(0, m.index - 50); hits.push({ name: full, snippet: text.slice(a, m.index + v.length + 50).replace(/\s+/g, " ").trim() }); break; }
    }
  }
  return hits;
}

// ---- Requirements coverage (ADR-0150) ----
// The per-character calls cannot see an ABSENT requirement: "Daan is called Daanus all game, Kevin shouts X, Dina remembers Y" was in the
// customer's approved concept (master_context.conversationDetailsExtraction.userRequirements) and in no character sheet, and nothing
// noticed. One extra call per package gets the customer's list plus every character's text and reports what no guest-facing text carries.
export type CustomerRequirements = { text: string; count: number };

function findKey(o: unknown, key: string, depth = 0): unknown {
  if (!o || typeof o !== "object" || depth > 4) return undefined;
  if (Array.isArray(o)) return undefined;
  const r = o as Row;
  if (key in r) return r[key];
  for (const v of Object.values(r)) { const f = findKey(v, key, depth + 1); if (f !== undefined) return f; }
  return undefined;
}

/** The customer's own requirements and character quirks from master_context, one per line, or null when there are none. */
export function customerRequirements(pkg: Row): CustomerRequirements | null {
  const objs = parseMasterContext(pkg.master_context);
  const lines: string[] = [];
  for (const key of ["userRequirements", "characterDetails"]) {
    for (const o of objs) {
      const v = findKey(o, key);
      if (Array.isArray(v)) { for (const x of v) if (typeof x === "string" && x.trim().length > 8) lines.push(x.trim().replace(/\s+/g, " ")); break; }
    }
  }
  return requirementsFromLines(lines);
}

function requirementsFromLines(lines: string[]): CustomerRequirements | null {
  const uniq = [...new Set(lines)];
  if (uniq.length === 0) return null;
  return { text: uniq.map((l) => `- ${l}`).join("\n"), count: uniq.length };
}

// ---- Requirements from the conversation (ADR-0155) ----
// `customerRequirements()` above needs the Master Doc to have emitted a list; it does so on only about 3 of 26 paid orders, so the coverage
// check was skipped on the rest. This builds the list from the customer's own words (`mystery_packages.user_conversation`: their brief plus
// the approved concept, where the approved concept wins) with one extra call. The coverage call that follows is unchanged.
export const REQUIREMENTS_EXTRACT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["requirements"],
  properties: { requirements: { type: "array", items: { type: "string" } } },
};
export const MAX_EXTRACTED_REQUIREMENTS = 40;
export const EXTRACT_CONVERSATION_MAX_CHARS = 150_000;

export function requirementsExtractionInstructions(): string {
  return `You read the conversation in which a customer designed a murder-mystery party package, and list what they explicitly asked the finished package to contain.\n\n` +
    `The text has two parts: the customer's own brief (source material) and the concept the customer approved. Where the two conflict, the APPROVED CONCEPT wins: list the approved version only (for example, a brief that says a guest "may not attend, keep the role optional" is superseded by an approved concept that promises that guest a substantial, fully developed role).\n\n` +
    `LIST (one line each, self-contained, naming the character or element, 15 to 60 words at most):\n` +
    `- a named character or role and what they must do or be given (a co-investigator with her own briefing, a character who must be present, a character with a trait or catchphrase);\n` +
    `- specific lines, catchphrases, running gags, inside jokes and quirks, and which character has them;\n` +
    `- the climax, the solution reveal and the clue chain the customer specified (who does what, in which round, what is found);\n` +
    `- relationships, backstory facts and settings the customer fixed that a character's sheet must reflect.\n\n` +
    `DO NOT LIST: requests about printable materials, formats or delivery (name cards, ballots, props or decoration lists, a host guide layout, file formats); timing or length of the evening; headcount and style choices the package structure already settles; anything the customer left open or optional in the approved concept; generic advice or tone words ("immersive", "fun"). Do not invent requirements and do not paraphrase a name or a quoted line: copy names and quoted lines exactly.\n\n` +
    `Return at most ${MAX_EXTRACTED_REQUIREMENTS} lines, the most important first (climax and solution, then named roles, then running clues, then quirks). Write in the language of the conversation. If the customer asked for nothing specific, return an empty list.\n`;
}

/** The user message for the extraction call, or null when the package has no stored conversation. A very long chat keeps its start and its end (the brief and the approved concept). */
export function requirementsExtractionText(userConversation: unknown): string | null {
  const t = typeof userConversation === "string" ? userConversation.trim() : "";
  if (t.length < 40) return null;
  const max = EXTRACT_CONVERSATION_MAX_CHARS;
  const body = t.length <= max ? t : t.slice(0, Math.floor(max * 0.4)) + "\n[... middle of the conversation omitted ...]\n" + t.slice(t.length - Math.floor(max * 0.6));
  return `=== CONVERSATION ===\n${body}\n\n=== END ===\nList the customer's requirements as instructed.`;
}

/** Parse the extraction answer into the same shape `customerRequirements()` returns. Null on bad JSON or an empty list. */
export function parseExtractedRequirements(answerText: string): CustomerRequirements | null {
  let arr: unknown;
  try { arr = JSON.parse(answerText)?.requirements; } catch { return null; }
  if (!Array.isArray(arr)) return null;
  const lines = arr.filter((x): x is string => typeof x === "string").map((x) => x.trim().replace(/^[-*•\s]+/, "").replace(/\s+/g, " ")).filter((x) => x.length > 8);
  return requirementsFromLines(lines.slice(0, MAX_EXTRACTED_REQUIREMENTS));
}

const COVERAGE_BUDGET_CHARS = 380_000;

/** The user message for the coverage call: the task, the customer's list, then every character sheet and the shared documents. */
export function coverageBlock(req: CustomerRequirements, chars: Row[], style: Style, pkg: Row, budget = COVERAGE_BUDGET_CHARS): string {
  const per = Math.max(4000, Math.floor(budget / Math.max(1, chars.length)));
  const sheets = chars.map((c) => { const b = characterBlock(c, style); return b.length > per ? b.slice(0, per) + "\n[trimmed]" : b; }).join("\n\n=====\n\n");
  return `TASK: REQUIREMENTS COVERAGE CHECK (this overrides the usual per-item review). Ignore everything else.\n\n` +
    `Below is the list of things the CUSTOMER explicitly asked for (requirements and character quirks), followed by every guest-facing text of the package: all character sheets, then the shared documents.\n\n` +
    `For each line of the customer's list decide whether the package carries it. Report ONLY a line that is NOT carried, or is carried in a way that contradicts it. Rules:\n` +
    `- Running gags, catchphrases and quirks are carried if the right character's text uses them at least once. A quirk for a character whose sheet shows it is fine.\n` +
    `- A scene, line or action the PLAYERS must perform (a climax line, a confession cue, a recollection, a shout when someone is accused) is carried only if the sheet of the character who performs it tells that player to do it or gives the words. The SHARED DOCUMENTS (detective script, reveal, evidence cards) are narration read by the host: a document describing that someone said or remembered something NEVER carries a line the customer wants a PLAYER to say. Example: if the list says Kevin shouts a line when Daan is accused, and no part of Kevin's own sheet contains that line or tells him to shout it, report it even if the reveal text mentions the line.\n` +
    `- A clue the customer wants present "all game" must appear in more than one place or round to count.\n` +
    `- Structural lines (a character must play, a headcount, a style) are carried if the package obeys them; do not report those without a concrete miss.\n` +
    `- If a sheet ends with [trimmed], the cut part may carry a line; do not report a line that could be in a trimmed sheet.\n` +
    `- Check the climax and solution-reveal lines FIRST and most carefully: they matter most to the customer. Then the running clues, then the quirks.\n` +
    `- Be conservative: report only what you are confident is missing. Zero findings is fine; do not pad.\n\n` +
    `OUTPUT: use the usual JSON. field must be exactly "${REQUIREMENTS_FIELD}". exact_quote must be the customer's line copied exactly from the list (without the leading "- ") or its most distinctive 40 to 160 characters. category: "other". severity: "high" when the missing line defines the climax, the solution reveal or a central clue, otherwise "medium". explanation: at most 30 words saying what is missing and which character's sheet should carry it. suggested_replacement: empty.\n\n` +
    `=== CUSTOMER'S LIST ===\n${req.text}\n\n=== CHARACTER SHEETS ===\n${sheets}\n\n=== SHARED DOCUMENTS ===\n${packageDocsBlock(pkg)}`;
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

// ---- Daily open-findings check (ADR-0149) ----
// Findings the reviewer could not apply before release (or that were never in an auto-apply class) sit in package_review_findings with
// status 'open'. By the alerting rule (North Star) only what needs Jonathan and could not be handled by the system is an email, so this
// lists the packages released in the last day that still carry unverified open findings at or above a severity threshold (default high).
export type OpenFindingRow = { package_id: string; title: string; item_name: string; field: string; category: string; severity: string; exact_quote: string; explanation: string };
const SEVERITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };

export function openDigestEmail(rows: OpenFindingRow[], minSeverity: string): { subject: string; html: string; packages: number; findings: number } | null {
  const min = SEVERITY_RANK[minSeverity.toLowerCase()];
  if (!min) return null; // "off" or anything unknown sends nothing
  const kept = rows.filter((r) => (SEVERITY_RANK[r.severity] ?? 0) >= min);
  if (kept.length === 0) return null;
  const byPkg = new Map<string, OpenFindingRow[]>();
  for (const r of kept) byPkg.set(r.package_id, [...(byPkg.get(r.package_id) ?? []), r]);
  const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  const blocks = [...byPkg.entries()].map(([id, list]) => {
    const items = list.slice(0, 8).map((f) =>
      `<li><b>${escapeHtml(f.severity.toUpperCase())}</b> ${escapeHtml(f.item_name)} / ${escapeHtml(f.field)} (${escapeHtml(f.category.replace(/_/g, " "))}): &ldquo;${escapeHtml(clip(f.exact_quote, 140))}&rdquo; ${escapeHtml(clip(f.explanation, 200))}</li>`).join("");
    const more = list.length > 8 ? `<li>…and ${list.length - 8} more</li>` : "";
    return `<h4 style="margin:16px 0 4px">${escapeHtml(list[0].title || id)} <span style="color:#6b7280;font-weight:normal">(${id})</span></h4><ul>${items}${more}</ul>`;
  }).join("");
  const n = byPkg.size;
  const subject = `${n} package${n === 1 ? "" : "s"} released with unresolved quality findings (${minSeverity}+)`;
  const html = `<div style="font-family:sans-serif;max-width:760px"><h3>${escapeHtml(subject)}</h3>` +
    `<p>The reviewer found these before release but could not apply them itself, and nobody has recorded a verdict yet. Read them with the full list in <code>package_review_findings</code> (status open, human_verdict null) and sweep the package.</p>${blocks}` +
    `<p style="color:#6b7280">Threshold: pipeline_settings.review_open_digest_min_severity (high, medium, or off). At most one of these emails per day.</p></div>`;
  return { subject, html, packages: n, findings: kept.length };
}

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

// ---------------------------------------------------------------------------------------------------------------------------------
// ADR-0140: fact propagation. The per-item review sometimes fixes a wrong fact in one field and misses the same wrong fact in other
// fields (Murder By Copy: the reviewer fixed "Joe transferred in from Flin Flon" in one background and missed two more statements of the
// same fact). After the main pass, every wrong_fact / cross_field_contradiction finding is turned into distinctive anchors (multi-word
// proper nouns, amounts); every OTHER field that mentions an anchor is re-checked in one small follow-up call per item.
// ---------------------------------------------------------------------------------------------------------------------------------

export const PROPAGATION_CATEGORIES = ["wrong_fact", "cross_field_contradiction"];
const MAX_ANCHOR_FIELDS = 25; // an anchor that appears in more fields than this is background noise (a main location, a cast name)

/** Distinctive strings of a finding: multi-word proper nouns and amounts/years. Single capitalised words are too common to anchor on. */
export function anchorsFrom(...texts: string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    for (const m of (t ?? "").matchAll(/\b\p{Lu}[\p{L}'\u2019-]+(?:\s+\p{Lu}[\p{L}'\u2019-]+)+\b/gu)) out.add(m[0]);
    for (const m of (t ?? "").matchAll(/\$\s?\d[\d,]*(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+\b|\b\d{4,}\b/g)) out.add(m[0].trim());
  }
  return [...out].filter((a) => a.length >= 4);
}

export type PropItem = { name: string; row: Row; fields: string[] };
export type PropCandidate = { item: string; field: string; text: string };

/**
 * Fields (other than those already carrying a finding) that mention at least one anchor. Anchors that are a cast member's name, or that
 * appear in more than MAX_ANCHOR_FIELDS fields, are dropped first.
 */
export function propagationCandidates(
  items: PropItem[], anchors: string[], skip: Set<string>, castNames: string[],
): PropCandidate[] {
  const names = castNames.map((n) => n.toLowerCase());
  const usable = anchors.filter((a) => !names.some((n) => n.includes(a.toLowerCase()) || a.toLowerCase().includes(n)));
  const all: PropCandidate[] = [];
  for (const it of items) for (const f of it.fields) {
    const text = asText(it.row[f]).trim();
    if (text) all.push({ item: it.name, field: f, text });
  }
  const kept = usable.filter((a) => all.filter((c) => c.text.includes(a)).length <= MAX_ANCHOR_FIELDS);
  return all.filter((c) => !skip.has(`${c.item}\u0000${c.field}`) && kept.some((a) => c.text.includes(a)));
}

export type Correction = { quote: string; explanation: string; replacement: string };

export function propagationText(item: string, corrections: Correction[], fields: { field: string; text: string }[]): string {
  const known = corrections.map((c, i) =>
    `${i + 1}. WRONG: "${c.quote}"\n   WHY: ${c.explanation}${c.replacement ? `\n   CORRECTED: "${c.replacement}"` : ""}`).join("\n");
  const body = fields.map((f) => `[${f.field}]\n${f.text}\n`).join("\n");
  return `FOLLOW-UP CHECK for ${item}.\n\nThe reviewer already established that the following statements in this package are WRONG and has fixed them:\n${known}\n\n` +
    `Check ONLY the fields below. Report a finding only where a field states the SAME wrong fact (same entity, same fact; the wording may differ). ` +
    `Do not report any other defect, even a real one: this is a narrow follow-up. Quote exactly as the rules require. If a statement already matches the corrected version, it is fine. If nothing states the wrong fact, return an empty findings list.\n\n${body}`;
}

// Language detection lives in _shared/languageDetect.ts (ADR-0143, shared with the ready email by ADR-0152); re-exported so callers are unchanged.
export { detectLanguage, languageSample } from "../_shared/languageDetect.ts";


// ---- Customer-wording guard (2026-10-06, ADR-0103 Addendum 84) ----
// The reviewer cannot know that a phrase was asked for. On Roslyn's Clay it rewrote the customer's requested family joke ("riding about
// town like mad hamsters") as a "garbled, anachronistic simile" and auto-apply wrote that into the package, text and pointform.
// A finding whose quote contains a run of CUSTOMER_WORDING_MIN_WORDS or more consecutive words that the customer themselves typed
// in the chat is never auto-applied; it stays open for a human.
export const CUSTOMER_WORDING_MIN_WORDS = 5;

const wordsOf = (s: string): string[] =>
  s.toLowerCase().replace(/[’‘`´]/g, "'").split(/[^\p{L}\p{N}']+/u).map((w) => w.replace(/^'+|'+$/g, "")).filter(Boolean);

/** True when `quote` shares a run of >= minWords consecutive words with any of the customer's own messages. */
export function quoteIsCustomerWording(quote: string, customerTexts: string[], minWords = CUSTOMER_WORDING_MIN_WORDS): boolean {
  const q = wordsOf(quote);
  if (q.length < minWords || customerTexts.length === 0) return false;
  const grams = new Set<string>();
  for (let i = 0; i + minWords <= q.length; i++) grams.add(q.slice(i, i + minWords).join(" "));
  for (const text of customerTexts) {
    const w = wordsOf(text);
    for (let i = 0; i + minWords <= w.length; i++) if (grams.has(w.slice(i, i + minWords).join(" "))) return true;
  }
  return false;
}
