// Pure, dependency-free core of the cross-sheet secret check (ADR-0152). No Deno or network APIs: tested with plain node (leak-probe.test.mjs).
//
// Why a separate pass: the per-character review reads one sheet and asks "does this text leak a secret". A line in sheet B that states the
// secret of sheet A reads as ordinary content there (Champagnens Skygge: Jazz-Jo's accomplice branch said "Ingrid, whose debt her mother
// quietly pays", which is Ingrid's and Dagny's hidden secret). Scorecard recall for secret_leak: 62 percent detective, 0 percent slip.
//
// How it stays cheap: for each character's secret, retrieve DETERMINISTICALLY the few sentences in OTHER sheets that mention the owner and
// share rare words with the secret, then ask the model one small question per owner about those sentences only.

export type LeakSheet = { name: string; secret: string; texts: { field: string; text: string }[]; open?: string; role?: string };
export type LeakHit = { sheet: string; field: string; sentence: string; overlap: string[]; mentionsOwner: boolean };
export type EvidenceCard = { round: number; title: string; description: string };
export type LeakCandidates = { owner: string; secret: string; open: string; hits: LeakHit[]; evidence?: EvidenceCard[]; role?: CulpritRole };
export type CulpritRole = "murderer" | "accomplice";

/** ADR-0165: only the culprit and the accomplice have a position that must stay out of Round 1 and 2 sheet text. */
export const culpritRole = (role: unknown): CulpritRole | undefined => (role === "murderer" || role === "accomplice" ? role : undefined);

/**
 * The evidence cards every guest is shown, one per round (ADR-0163 Addendum 6): a question about "the forged note" in Round 4 restates a card
 * that is public by then, and the pass wrongly reported it as a leak of Pam's secret. Parses the stored `evidence_cards` text in any language:
 * a "## ..." heading ending in the round number starts a card, "### " is its title, and only the FIRST "#### " section (the description) is
 * kept, never the host-only significance that follows. Anything that is not a string, or does not parse, gives no cards (old behaviour).
 */
export function parseEvidenceCards(raw: unknown): EvidenceCard[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const out: EvidenceCard[] = [];
  const blocks = raw.split(/^##\s+(?=[^#\n]*\b[2-9]\s*$)/m).slice(1);
  for (const b of blocks) {
    const head = b.split("\n", 1)[0];
    const round = Number(head.match(/([2-9])\s*$/)?.[1]);
    const title = (b.match(/^###\s+(.+)$/m)?.[1] ?? "").trim();
    const parts = b.split(/^####\s+.*$/m);
    const description = (parts[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 700);
    if (round && title && description) out.push({ round, title, description });
  }
  return out;
}

/** The round a sheet field belongs to (round2_* to 4, final_* and the confessions after every round), or null for a field with no round. */
export function fieldRound(field: string): number | null {
  const m = field.match(/^round([2-4])_/);
  if (m) return Number(m[1]);
  return /^(final_|reveal_confession_)/.test(field) ? 4 : null;
}

const TITLES = new Set(["dr", "fru", "hr", "herr", "greve", "kaptajn", "baronesse", "officer", "konsul", "lady", "lord", "sir", "mr", "mrs", "miss", "ms", "captain", "count", "baron", "countess", "doctor", "professor", "madame", "monsieur", "señor", "señora", "signor", "signora", "herr", "frau", "kapitän", "graf", "gräfin", "baron", "mevrouw", "meneer", "kapten", "greve"]);
const STOP = new Set<string>(); // language neutral: rarity (document frequency) does the work, not a stop list

export const wordsOf = (s: string): string[] => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 25 && s.length <= 420 && !/^[#*\-\d]+\s*$/.test(s));
}

/** Distinctive words of a name: the words only this sheet's name has (so "Castenskiold", shared by mother and daughter, is not one). */
export function distinctiveNameWords(name: string, all: string[]): string[] {
  const others = new Set(all.filter((n) => n !== name).flatMap((n) => wordsOf(n)));
  return wordsOf(name).filter((w) => w.length >= 3 && !TITLES.has(w) && !others.has(w));
}

export function leakCandidates(sheets: LeakSheet[], opts: { maxPerOwner?: number; maxTotal?: number; minOverlapWithName?: number; minOverlapWithoutName?: number; evidence?: EvidenceCard[] } = {}): LeakCandidates[] {
  const maxPer = opts.maxPerOwner ?? 14, maxTotal = opts.maxTotal ?? 120;
  const minWith = opts.minOverlapWithName ?? 1, minWithout = opts.minOverlapWithoutName ?? 4;
  const names = sheets.map((s) => s.name);
  const stemsBySheet = sheets.map((s) => new Set([s.secret, ...s.texts.map((t) => t.text)].flatMap((t) => wordsOf(t || "").filter((w) => w.length >= 4).map(stem))));
  const out: LeakCandidates[] = [];
  let total = 0;
  // ADR-0165: the culprit and the accomplice are served first, so the total cap cannot starve them (sheets arrive alphabetically and a murderer named Zoya came last).
  const order = sheets.map((_, i) => i).sort((a, b) => Number(!!culpritRole(sheets[b].role)) - Number(!!culpritRole(sheets[a].role)));
  for (const oi of order) {
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
    if (kept.length) { out.push({ owner: owner.name, secret: owner.secret, open: (owner.open ?? "").slice(0, 3600), hits: kept, ...(opts.evidence?.length ? { evidence: opts.evidence } : {}), ...(culpritRole(owner.role) ? { role: culpritRole(owner.role) } : {}) }); total += kept.length; }
  }
  return out;
}

export const LEAK_INSTRUCTIONS = [
  "You check a murder mystery party game for SECRET LEAKS across character sheets. Each guest reads only their own sheet, so the DEEPEST hidden fact of one character's secret must not be stated in another character's sheet.",
  "EXCEPTION THAT COMES FIRST AND OVERRIDES THE TWO RULES BELOW (\"ONLY when it states the core hidden fact\" and \"when in doubt\"), applied only when the prompt says OWNER ROLE is murderer or accomplice: CULPRIT POSITION. Where the owner stood, that they were away from their stated alibi, or that they were at or near the crime scene or the murder weapon stays hidden until Round 3. Any sentence from a field named introduction, rumors or round2_* (rounds 1 and 2) that places the owner at or near the crime scene or the weapon, or away from their stated alibi, IS a leak, even as a plain eyewitness observation, even when the speaker could really have seen it, and even though the owner or other sheets repeat it in Round 4. The same observation in a round3_*, round4_*, final_*, reveal or accusations field is allowed (the witnesses give it in Round 4). Report it with severity high, category secret_leak; explanation says it belongs in Round 4 only; suggested_replacement = the sentence with that observation removed, keeping the rest and the speaker's voice.",
  "You get ONE character's hidden secret, the text that character says OPENLY (their introduction and honest scripts, which every guest hears), and a numbered list of sentences from OTHER characters' sheets.",
  "Think first about what the secret's core is: the one fact the owner most wants hidden and that would ruin them if known (usually what the 'why this matters' part says is at stake). Surface facts, rumours the owner spreads or admits themselves, and anything the OPEN text already says are public and NEVER a leak.",
  "A sentence is a leak ONLY when it states the core hidden fact (or a specific hidden detail of it that is not in the open text) as established fact, and the speaker has no stated way of knowing it. Rumour sections are meant to carry gossip, so a rumour is a leak only if it states the core fact as certain, not a hint, question or suspicion. Relationship descriptions may state what the two characters witnessed together or were told; that is not a leak. A character the secret itself involves may know it.",
  "You may also get PUBLIC EVIDENCE: the cards shown to every guest, one per round. What a card shows or says is public and NEVER a leak. A sentence from a round-N field (the field name says the round; final statements and confessions count as round 4) may restate any card of round N or earlier; a field with no round may restate any card. A sentence that goes beyond the card, or relies on a card of a LATER round, is judged as usual.",
  "Be conservative: when in doubt, it is not a leak. Report at most the clear cases. For each give: field = 'SHEET NAME | field' written exactly as in the list; exact_quote = the sentence copied exactly; category = secret_leak; severity = high only if it states the core fact, otherwise medium; explanation = one sentence naming the hidden core fact and why the open text does not already say it; suggested_replacement = the same sentence rewritten to keep its role (a pointer, suspicion or question about the person) without stating the hidden fact, in the same language and voice. If nothing is a clear leak return an empty list.",
].join("\n");

export function leakPromptText(c: LeakCandidates): string {
  const lines = c.hits.map((h, i) => `${i + 1}. [${h.sheet} | ${h.field}] ${h.sentence}`);
  const cards = c.evidence?.length
    ? `\n\nPUBLIC EVIDENCE (shown to every guest; round in brackets):\n${c.evidence.map((e) => `[round ${e.round}] ${e.title}: ${e.description}`).join("\n")}`
    : "";
  return `OWNER OF THE SECRET: ${c.owner}${c.role ? `\nOWNER ROLE: ${c.role} (the culprit side of the game)` : ""}\nTHE SECRET (hidden from everyone else):\n${c.secret.trim()}\n\nWHAT THE OWNER SAYS OPENLY (public, not secret):\n${c.open.trim() || "(nothing supplied)"}${cards}\n\nSENTENCES FROM OTHER SHEETS:\n${lines.join("\n")}`;
}

/** Map a model finding back to the sheet and field it points at, using the sentence it quoted. null when it quotes nothing we sent. */
export function resolveFinding(c: LeakCandidates, f: { field: string; exact_quote: string }): { sheet: string; field: string } | null {
  const q = f.exact_quote.trim();
  if (!q) return null;
  const hit = c.hits.find((h) => h.sentence === q) ?? c.hits.find((h) => h.sentence.includes(q) || q.includes(h.sentence));
  return hit ? { sheet: hit.sheet, field: hit.field } : null;
}
