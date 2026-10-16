// Pure, dependency-free core of the shared-documents-against-the-cast check (ADR-0166 cheap row 1, shadow mode). No Deno or network APIs:
// tested with plain node (doc-probe.test.mjs).
//
// Why: every other probe reads character sheets. The detective script, the game overview and the evidence cards are read aloud or printed for
// everyone, and a sentence there can claim something no sheet supports ("Own what you have already admitted" when Willy had admitted nothing, Till
// Death Do Us Part-y, 2026-10-16). The per-item reviewer reads the documents on their own; nothing reads them AGAINST the cast. One model call
// per package gets the documents plus a compact digest of every sheet and reports the sentences the cast contradicts or does not back.

export const DOC_PROBE_FIELDS = ["detective_script", "game_overview", "evidence_cards"] as const;
export type DocField = (typeof DOC_PROBE_FIELDS)[number];
export type Digest = { name: string; role: string; canon: string; secret: string; round4: string; final: string; confession: string };

const clip = (s: unknown, n: number): string => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** Compact view of one sheet: what the documents may be checked against. The innocent branches and the guilty confession, each cut short. */
export function digestSheet(c: Record<string, unknown>, canon: string): Digest {
  return {
    name: String(c.character_name ?? ""),
    role: String(c.character_role ?? ""),
    canon: clip(canon, 600),
    secret: clip(c.secret, 600),
    round4: clip(c.round4_script ?? c.round4_innocent, 700),
    final: clip(c.final_statement ?? c.final_innocent, 700),
    confession: clip(c.reveal_confession_guilty ?? c.final_guilty, 500),
  };
}

export const DOC_INSTRUCTIONS = [
  "You check the SHARED DOCUMENTS of a murder mystery party game against its cast. The detective script is read aloud to every guest, the game overview and the evidence cards are shown to everyone. Each guest has a private character sheet. The documents are written separately from the sheets, so a sentence in a document sometimes claims something no sheet supports.",
  "You get the documents (numbered by field) and, for every character, a digest: role, canonical facts from the design, secret, Round 4 script, final statement and (for the guilty) confession.",
  "Report a sentence in a DOCUMENT only when it states or presupposes something about a character or the evidence that the digests or canonical facts contradict, or that no digest backs and the sentence needs: what a character said, admitted, did, owns or earns, where they stood, who vouches for whom, who was beside whom, who the detective says did what, how many people or items, a name, an amount, a time. Example: the detective tells Willy to \"own what you have already admitted\" but nothing Willy says before the reveal admits anything.",
  "NOT a problem: stage directions, dramatic flourish, rhetorical questions, generic statements about the game, the detective naming the murderer and accomplice in the reveal (that is by design), host-only notes, instructions to the host, and anything a digest backs even loosely. The reveal may describe what the murderer did in the words of their confession. Be conservative: when in doubt, do not report.",
  "For each finding give: field = the document field exactly as listed (detective_script, game_overview or evidence_cards); exact_quote = the sentence copied exactly from that document (one sentence, as it appears, it must occur exactly once); category = cross_field_contradiction when a digest contradicts it, wrong_fact when the canonical facts do; severity = high when it changes who looks guilty or tells guests something false about a named person, otherwise medium or low; explanation = one sentence naming the character or fact and what the sheets say instead; suggested_replacement = the same sentence rewritten minimally so it is true, or an empty string when you are unsure how.",
].join("\n");

/** The user text: the documents first (numbered), then one digest block per character. */
export function docPromptText(docs: Partial<Record<DocField, string>>, digests: Digest[]): string {
  const docBlocks = DOC_PROBE_FIELDS.filter((f) => (docs[f] ?? "").trim()).map((f) => `=== DOCUMENT: ${f} ===\n${String(docs[f]).trim()}`);
  const people = digests.map((d) =>
    `--- ${d.name} (${d.role || "role unknown"}) ---\nCANON: ${d.canon || "(none)"}\nSECRET: ${d.secret || "(none)"}\nROUND 4: ${d.round4 || "(none)"}\nFINAL: ${d.final || "(none)"}${d.confession ? `\nCONFESSION: ${d.confession}` : ""}`);
  return `${docBlocks.join("\n\n")}\n\n=== THE CAST (digests) ===\n${people.join("\n\n")}`;
}

export const isDocField = (f: string): f is DocField => (DOC_PROBE_FIELDS as readonly string[]).includes(f);

/** Rough input size for the dry-run estimate. */
export const estimateTokens = (docs: Partial<Record<DocField, string>>, digests: Digest[]): number =>
  Math.round((DOC_INSTRUCTIONS.length + docPromptText(docs, digests).length) / 3.2);
