// Pure, dependency-free core of the cross-sheet FACT check (ADR-0152, lever 3b). No Deno or network APIs: tested with plain node (fact-check.test.mjs).
//
// What it targets: statements ABOUT a character in other characters' sheets that cannot be true together with what the character's own sheet and
// the master context say (where they were, who stood beside whom, who vouches for whom, an occupation, an amount, whether an announcement
// already happened). Scorecard recall for cross_field_contradiction is 33 to 43 percent because the per-character review reads one sheet at a
// time. Real misses this is built from: "Seraphina sat beside Perry" in four places vs Perry "nobody beside me"; Clara names Edmund as her
// alibi witness while five sheets put Edmund beside Agatha.
//
// Same architecture as the secret check (leak-probe.ts): deterministic retrieval of the few sentences that name the subject, then one small
// model question per subject. Pure retrieval + prompt building lives here; the model call lives in index.ts.
import { distinctiveNameWords, splitSentences, wordsOf } from "./leak-probe.ts";

export type FactSheet = { name: string; texts: { field: string; text: string }[]; own: string; canon: string };
export type FactHit = { sheet: string; field: string; sentence: string };
export type FactCandidates = { subject: string; canon: string; own: string; hits: FactHit[] };

/** Compact canonical facts about one character taken from the parsed master_context objects (alibi, location, motive, relationships). */
export function canonFor(name: string, objs: Record<string, unknown>[], maxChars = 1600): string {
  const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
  const nk = key(name);
  const first = nk.split(" ")[0];
  const parts: string[] = [];
  const same = (v: unknown) => typeof v === "string" && (key(v) === nk || (first.length >= 4 && key(v).split(" ")[0] === first && key(v).split(" ").slice(-1)[0] === nk.split(" ").slice(-1)[0]));
  const walk = (o: unknown, path: string) => {
    if (Array.isArray(o)) { o.forEach((x) => walk(x, path)); return; }
    if (!o || typeof o !== "object") return;
    const r = o as Record<string, unknown>;
    if (same(r.characterName) || same(r.character)) {
      const { characterName: _a, character: _b, ...rest } = r as Record<string, unknown>;
      parts.push(`${path}: ${JSON.stringify(rest)}`);
    } else if ((same(r.character1) || same(r.character2)) && path.includes("relationshipMatrix")) {
      const other = same(r.character1) ? r.character2 : r.character1;
      parts.push(`relationship with ${other}: ${String(r.relationship ?? "").slice(0, 200)}`);
    }
    for (const [k, v] of Object.entries(r)) if (typeof v === "object") walk(v, k);
  };
  for (const o of objs) walk(o, "context");
  return parts.join("\n").slice(0, maxChars);
}

export function factCandidates(sheets: FactSheet[], opts: { maxPerSubject?: number; maxTotal?: number } = {}): FactCandidates[] {
  const maxPer = opts.maxPerSubject ?? 18, maxTotal = opts.maxTotal ?? 220;
  const names = sheets.map((s) => s.name);
  const out: FactCandidates[] = [];
  let total = 0;
  for (let si = 0; si < sheets.length; si++) {
    const subj = sheets[si];
    const words = distinctiveNameWords(subj.name, names);
    if (words.length === 0) continue;
    const hits: FactHit[] = [];
    for (let j = 0; j < sheets.length; j++) {
      if (j === si) continue;
      for (const tx of sheets[j].texts) {
        for (const sentence of splitSentences(tx.text || "")) {
          if (!wordsOf(sentence).some((w) => words.includes(w))) continue;
          // a sentence that only addresses the subject with a question ("To Perry: where were you?") carries no claim
          if (/^\**\s*(to|til|a|an|aan|à)\s/i.test(sentence) && /\?["'’”*\s]*$/.test(sentence)) continue;
          hits.push({ sheet: sheets[j].name, field: tx.field, sentence });
        }
      }
    }
    // prefer sentences that carry a fact cue (a number, a place word via capital letter run, or a verb of position) over bare mentions
    const score = (h: FactHit) => (/\d/.test(h.sentence) ? 2 : 0) + (/(beside|next to|with|alone|sat|stood|saw|were|was|told|said|næst|ved siden|sammen|var|sad|stod|så|zijn|naast|waren|estaba|junto|était|près)/i.test(h.sentence) ? 1 : 0);
    hits.sort((a, b) => score(b) - score(a));
    const kept = hits.slice(0, Math.min(maxPer, Math.max(0, maxTotal - total)));
    if (kept.length >= 2) { out.push({ subject: subj.name, canon: subj.canon, own: subj.own.slice(0, 4200), hits: kept }); total += kept.length; }
  }
  return out;
}

export const FACT_INSTRUCTIONS = [
  "You check a murder mystery party game for FACTUAL CONTRADICTIONS between character sheets. Every sheet is written separately, so two sheets sometimes state incompatible facts about the same person or event.",
  "You get ONE character (the SUBJECT), canonical facts about them from the master context, what the subject says in their own sheet, and numbered sentences from OTHER sheets that name the subject.",
  "A contradiction is a sentence that states a fact about the subject (where they were, who was beside them or vouches for them, what they did, own, earn or are, when something happened, an amount, a relationship) that cannot be true together with the canonical facts or with the subject's own statements. The subject's own statements and the master context win; the other sheet is the one to correct.",
  "NOT a contradiction: opinions, suspicion, guesses, questions, exaggeration, or a different level of detail. A fact only one sheet mentions is not a contradiction. A statement that the subject themself makes about their own whereabouts may be a lie in a guilty or accomplice branch, so never use those branches as the truth.",
  "Be conservative: when in doubt, report nothing. For each clear contradiction give: field = 'SHEET NAME | field' written exactly as in the list; exact_quote = the sentence copied exactly; category = cross_field_contradiction; severity = high when it changes who could have done it or who vouches for whom, otherwise medium; explanation = one sentence naming the two conflicting facts; suggested_replacement = the same sentence rewritten to agree with the canonical facts, in the same language and voice. If there is no clear contradiction return an empty list.",
].join("\n");

export function factPromptText(c: FactCandidates): string {
  const lines = c.hits.map((h, i) => `${i + 1}. [${h.sheet} | ${h.field}] ${h.sentence}`);
  return `SUBJECT: ${c.subject}\nCANONICAL FACTS ABOUT THE SUBJECT (master context):\n${c.canon.trim() || "(none)"}\n\nWHAT THE SUBJECT SAYS IN THEIR OWN SHEET (honest branch):\n${c.own.trim() || "(nothing supplied)"}\n\nSENTENCES FROM OTHER SHEETS THAT NAME THE SUBJECT:\n${lines.join("\n")}`;
}

export function resolveFact(c: FactCandidates, f: { exact_quote: string }): { sheet: string; field: string } | null {
  const q = f.exact_quote.trim();
  if (!q) return null;
  const hit = c.hits.find((h) => h.sentence === q) ?? c.hits.find((h) => h.sentence.includes(q) || q.includes(h.sentence));
  return hit ? { sheet: hit.sheet, field: hit.field } : null;
}
