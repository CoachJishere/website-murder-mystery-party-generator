// Pure, dependency-free core of "propose an insertion for a missing customer quote" (ADR-0166 cheap row 3, shadow mode). No Deno or network APIs:
// tested with plain node (req-insert.test.mjs).
//
// Why: the requirements extract (ADR-0155) already finds a customer line that no shared document carries ("Gino's last words begin 'I have a little
// surprise for the newlyweds...'"), but it only reports it; a human then writes the fix. This asks one small model call for ONE rewritten sentence of
// the detective script's opening statement that carries the quote verbatim, validates it, and stores it as an open shadow finding.

/** The quoted spans of a requirement line (3 or more words), without the quote marks. Apostrophes inside words are not quotes. */
export function quotedSpans(requirement: string): string[] {
  const out: string[] = [];
  const re = /(?:^|[\s(\[])(['"‘“])([^'"’”]{10,}?)(['"’”])(?=[\s.,;:!?)\]]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(requirement)) !== null) {
    const span = m[2].trim();
    if (span.split(/\s+/).length >= 3) out.push(span);
  }
  return [...new Set(out)];
}

/** The opening statement section of a detective script (heading to the next "## " heading), or null. */
export function openingStatement(script: string): string | null {
  const m = script.match(/^##\s+OPENING STATEMENT[^\n]*\n([\s\S]*?)(?=^##\s|\n---\s*\n##\s|$(?![\s\S]))/m);
  const body = m?.[1]?.replace(/\n---\s*$/m, "").trim();
  return body && body.length > 40 ? body : null;
}

export const INSERT_SYSTEM = [
  "You edit ONE sentence of a read-aloud detective script so that it carries a line the customer asked for, word for word.",
  "You get the opening statement of the script and the customer's requirement with the exact words they want in quotation marks.",
  "Choose the one sentence of the opening statement where the quoted words fit most naturally (usually the sentence about the victim's last moments, toast or promise). Return old_sentence = that sentence copied EXACTLY from the opening statement, and new_sentence = the same sentence rewritten minimally so that it contains the quoted words verbatim (keep the quote marks the script already uses; a trailing ellipsis in the customer's words stays). Keep the detective's voice and tense. Add no new facts, names or events; do not remove facts the sentence already states; at most two short sentences result.",
  "If the opening statement already carries the quoted words, return an empty old_sentence and an empty new_sentence.",
].join("\n");

export const INSERT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["old_sentence", "new_sentence"],
  properties: { old_sentence: { type: "string" }, new_sentence: { type: "string" } },
} as const;

export function insertPromptText(opening: string, requirement: string, spans: string[]): string {
  return `OPENING STATEMENT:\n${opening}\n\nCUSTOMER REQUIREMENT:\n${requirement}\n\nWORDS THAT MUST APPEAR VERBATIM:\n${spans.map((s) => `- ${s}`).join("\n")}`;
}

const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

export type InsertCheck = { ok: boolean; reason?: string };

/** The proposal is usable only if the old sentence occurs exactly once in the whole script, the new one carries every quoted span verbatim, and it is not wildly longer. */
export function validateInsert(script: string, oldS: string, newS: string, spans: string[]): InsertCheck {
  if (!oldS.trim() || !newS.trim()) return { ok: false, reason: "empty (already carried or no proposal)" };
  const count = script.split(oldS).length - 1;
  if (count !== 1) return { ok: false, reason: `old sentence occurs ${count} times` };
  const n = norm(newS);
  for (const s of spans) if (!n.includes(norm(s).replace(/\.{3}$/, "").replace(/…$/, "").trim())) return { ok: false, reason: `quote not carried verbatim: ${s.slice(0, 40)}` };
  if (newS.length > oldS.length + spans.reduce((t, s) => t + s.length, 0) + 260) return { ok: false, reason: "new sentence much longer than needed" };
  if (/[\[\]{}<>]/.test(newS) && !/[\[\]{}<>]/.test(oldS)) return { ok: false, reason: "stray markup in proposal" };
  if (norm(oldS) === n) return { ok: false, reason: "no change" };
  return { ok: true };
}
