// Pure, dependency-free core of the cross-sheet secret check (ADR-0152). No Deno or network APIs: tested with plain node (leak-probe.test.mjs).
//
// Why a separate pass: the per-character review reads one sheet and asks "does this text leak a secret". A line in sheet B that states the
// secret of sheet A reads as ordinary content there (Champagnens Skygge: Jazz-Jo's accomplice branch said "Ingrid, whose debt her mother
// quietly pays", which is Ingrid's and Dagny's hidden secret). Scorecard recall for secret_leak: 62 percent detective, 0 percent slip.
//
// How it stays cheap: for each character's secret, retrieve DETERMINISTICALLY the few sentences in OTHER sheets that mention the owner and
// share rare words with the secret, then ask the model one small question per owner about those sentences only.

export type LeakSheet = { name: string; secret: string; texts: { field: string; text: string }[] };
export type LeakHit = { sheet: string; field: string; sentence: string; overlap: string[]; mentionsOwner: boolean };
export type LeakCandidates = { owner: string; secret: string; hits: LeakHit[] };

const TITLES = new Set(["dr", "fru", "hr", "herr", "greve", "kaptajn", "baronesse", "officer", "konsul", "lady", "lord", "sir", "mr", "mrs", "miss", "ms", "captain", "count", "baron", "countess", "doctor", "professor", "madame", "monsieur", "señor", "señora", "signor", "signora", "herr", "frau", "kapitän", "graf", "gräfin", "baron", "mevrouw", "meneer", "kapten", "greve"]);
const STOP = new Set<string>(); // language neutral: rarity (document frequency) does the work, not a stop list

const wordsOf = (s: string): string[] => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 25 && s.length <= 420 && !/^[#*\-\d]+\s*$/.test(s));
}

/** Distinctive words of a name: the words only this sheet's name has (so "Castenskiold", shared by mother and daughter, is not one). */
function distinctiveNameWords(name: string, all: string[]): string[] {
  const others = new Set(all.filter((n) => n !== name).flatMap((n) => wordsOf(n)));
  return wordsOf(name).filter((w) => w.length >= 3 && !TITLES.has(w) && !others.has(w));
}

export function leakCandidates(sheets: LeakSheet[], opts: { maxPerOwner?: number; maxTotal?: number; minOverlapWithName?: number; minOverlapWithoutName?: number } = {}): LeakCandidates[] {
  const maxPer = opts.maxPerOwner ?? 14, maxTotal = opts.maxTotal ?? 120;
  const minWith = opts.minOverlapWithName ?? 1, minWithout = opts.minOverlapWithoutName ?? 4;
  const names = sheets.map((s) => s.name);
  const stemsBySheet = sheets.map((s) => new Set([s.secret, ...s.texts.map((t) => t.text)].flatMap((t) => wordsOf(t || "").filter((w) => w.length >= 4).map(stem))));
  const out: LeakCandidates[] = [];
  let total = 0;
  for (let oi = 0; oi < sheets.length; oi++) {
    const owner = sheets[oi];
    if (!owner.secret || owner.secret.length < 40) continue;
    const secretStems = [...new Set(wordsOf(owner.secret).filter((w) => w.length >= 4 && !STOP.has(w)).map(stem))];
    // Document frequency among the OTHER sheets: 0 cannot match, very many is generic filler. Two bands: broad (used when the sentence
    // names the owner, which is already a strong signal) and rare (needed when it does not).
    const df = (st: string) => { let n = 0; for (let j = 0; j < sheets.length; j++) if (j !== oi && stemsBySheet[j].has(st)) n++; return n; };
    const broadMax = Math.max(4, Math.floor(0.7 * (sheets.length - 1)));
    const rareMax = Math.max(4, Math.ceil(0.3 * (sheets.length - 1)));
    const dfs = new Map(secretStems.map((st) => [st, df(st)]));
    const broad = new Set(secretStems.filter((st) => (dfs.get(st) ?? 0) >= 1 && (dfs.get(st) ?? 0) <= broadMax));
    const rare = new Set(secretStems.filter((st) => (dfs.get(st) ?? 0) >= 1 && (dfs.get(st) ?? 0) <= rareMax));
    if (broad.size === 0) continue;
    const ownerWords = distinctiveNameWords(owner.name, names);
    const secretWords = new Set(wordsOf(owner.secret));
    const hits: LeakHit[] = [];
    for (let j = 0; j < sheets.length; j++) {
      if (j === oi) continue;
      const other = sheets[j];
      // A character the secret itself names may legitimately know it.
      if (distinctiveNameWords(other.name, names).some((w) => secretWords.has(w))) continue;
      for (const tx of other.texts) {
        for (const sentence of splitSentences(tx.text || "")) {
          const sw = wordsOf(sentence);
          const sentenceStems = [...new Set(sw.filter((w) => w.length >= 4).map(stem))];
          const mentions = ownerWords.some((w) => sw.includes(w));
          const overlap = sentenceStems.filter((st) => (mentions ? broad : rare).has(st));
          if (mentions ? overlap.length < minWith : overlap.length < minWithout) continue;
          hits.push({ sheet: other.name, field: tx.field, sentence, overlap, mentionsOwner: mentions });
        }
      }
    }
    hits.sort((a, b) => Number(b.mentionsOwner) - Number(a.mentionsOwner) || b.overlap.length - a.overlap.length);
    const kept = hits.slice(0, Math.min(maxPer, Math.max(0, maxTotal - total)));
    if (kept.length) { out.push({ owner: owner.name, secret: owner.secret, hits: kept }); total += kept.length; }
  }
  return out;
}

export const LEAK_INSTRUCTIONS = [
  "You check a murder mystery party game for SECRET LEAKS across character sheets. Each guest reads only their own sheet, so a secret that one character holds must not be stated in another character's sheet.",
  "You get ONE character's hidden secret and a numbered list of sentences taken from OTHER characters' sheets. For each sentence decide whether it STATES the secret, or a specific hidden part of it, as fact or as a specific rumour that a guest reading it would then know.",
  "It is a leak when the sentence reveals the hidden fact (who did what, owes what, hides what, is secretly paying, is secretly a journalist and so on) even in other words.",
  "It is NOT a leak when: the sentence only expresses vague suspicion or asks a question without the fact; it repeats something the owner says openly in their own public introduction or rumours; it is about a different fact that merely shares words; or the speaker is the owner.",
  "Report only clear leaks. For each one give: field = the sheet and field written exactly as 'SHEET NAME | field' from the list; exact_quote = the sentence copied exactly, as it appears; category = secret_leak; severity high if it reveals the core of the secret, otherwise medium; explanation = one sentence saying which hidden fact is stated; suggested_replacement = the same sentence rewritten so it keeps its role (a suspicion or a pointer to the person) without stating the hidden fact, in the same language and voice. If nothing is a clear leak return an empty list.",
].join("\n");

export function leakPromptText(c: LeakCandidates): string {
  const lines = c.hits.map((h, i) => `${i + 1}. [${h.sheet} | ${h.field}] ${h.sentence}`);
  return `OWNER OF THE SECRET: ${c.owner}\nTHE SECRET (hidden from everyone else):\n${c.secret.trim()}\n\nSENTENCES FROM OTHER SHEETS:\n${lines.join("\n")}`;
}

/** Map a model finding back to the sheet and field it points at, using the sentence it quoted. null when it quotes nothing we sent. */
export function resolveFinding(c: LeakCandidates, f: { field: string; exact_quote: string }): { sheet: string; field: string } | null {
  const q = f.exact_quote.trim();
  if (!q) return null;
  const hit = c.hits.find((h) => h.sentence === q) ?? c.hits.find((h) => h.sentence.includes(q) || q.includes(h.sentence));
  return hit ? { sheet: hit.sheet, field: hit.field } : null;
}
