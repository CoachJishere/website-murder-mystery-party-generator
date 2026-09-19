/**
 * ADR-0125: the single implementation of "parse a character roster out of
 * freeform AI concept-chat text," shared between `mystery-webhook-trigger`
 * (actual package generation) and `extract-concept-roster` (the pre-purchase
 * preview page's roster count). Originally lived only in
 * `mystery-webhook-trigger/index.ts`; a second, independently-maintained copy
 * in `src/pages/MysteryPurchase.tsx` drifted from this one three times
 * (ADR-0044 addendum, ADR-0110 + Addenda 1-2), each time producing a wrong
 * preview count while generation itself stayed correct. Consolidating here
 * means the preview can no longer show a different roster than generation
 * will actually produce - see ADR-0125 for the full incident history and
 * the case against re-duplicating this.
 */

// All locale translations of "Character List" section header + common variants
export const CHARACTER_LIST_HEADERS = [
  "Character List", "Characters", "Cast of Characters",
  "Complete Character List", "COMPLETE CHARACTER LIST", "Full Character List",
  "Lista de Personajes", "Personajes",
  "Liste des personnages", "Personnages",
  "Charakterliste", "Charaktere",
  "Elenco Personaggi", "Personaggi",
  "Lista de Personagens", "Personagens",
  "Personagelijst", "Personages",
  "Karaktärslista", "Karakterliste",
  "Hahmoluettelo", "Hahmot",
  "캐릭터 목록", "등장인물",
  "キャラクターリスト", "登場人物",
  "角色列表", "角色名单",
];

export interface ExtractedCharacter {
  name: string;
  description: string;
}

// Build regex to match any locale's character list header
// Pattern: ## <Header> (N PLAYERS) or ## <Header>
const headerAlternatives = CHARACTER_LIST_HEADERS.map(h =>
  h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
).join('|');
export const sectionHeaderRegex = new RegExp(
  `^#{2,3}\\s+(?:${headerAlternatives})(?:\\s*\\(\\d+\\s+.+?\\))?[:\\s]*$`, 'im'
);

// Same header, but capturing the stated count (e.g. "Character List (28
// players)" -> 28) instead of just matching its presence. Used only by
// `extractStatedRosterCount` below — kept separate from `sectionHeaderRegex`
// so that regex stays exactly what it was (ADR-0057: don't grow the one
// "does this look like a roster header" predicate extra responsibilities).
export const sectionHeaderCountRegex = new RegExp(
  `^#{2,3}\\s+(?:${headerAlternatives})\\s*\\((\\d+)\\s+.+?\\)`, 'im'
);

// Pattern for numbered character lines (multiple formats):
// 1. **Name** - Description  (bold with dash)
// 1. **Name**: Description   (bold with colon)
// 1. Name - Description      (plain with dash)
export const characterLineRegex = /^\d+\.\s+(?:\*\*(.+?)\*\*|([A-Z\u00C0-\u024F\u0400-\u04FF\u3000-\u9FFF\uAC00-\uD7AF].+?))(?:\s*\*?\([^)]*\)\*?)?\s*[-–—:]\s*(.+)/;

// Header-agnostic: 4+ consecutive "**Name** - Description" lines.
export const boldCharRegex = /^\*\*(.+?)\*\*(?:\s*\*?\([^)]*\)\*?)?\s*[-–—:]\s*(.+)/;

/** A message proposing fewer names than this isn't a cast. */
export const MIN_ROSTER_SIZE = 4;

/**
 * A message proposing more names than this isn't a cast either — it's the
 * technical backend safety ceiling (ADR-0126), separate from the 35-player
 * cap shown in the setup form and chat copy. Customers who negotiate a
 * roster past 35 during concept chat (a real case went 32 -> 38) still need
 * that larger roster to be recognized as plausible here, or extraction
 * falls through to a fragile legacy scan / wasteful Claude fallback.
 */
export const MAX_ROSTER_SIZE = 50;

// A bare bold sub-group label with no trailing dash/description (e.g.
// "**Amsler-Familie:**", "**Personal der Hütte:**") is not itself a character
// line, but the batch path below treats ANY non-matching line as a batch
// break - so a roster grouped into named family/staff sub-sections with fewer
// than 4 members each (a 2-person family, then a 1-person family) would
// silently lose those members if this weren't tolerated. See ADR-0110
// Addendum 2 — this is the server-side mirror of the client-side fix that
// incident produced, applied here so the batch-path fallback carries the
// same tolerance the header path already had for free.
export const isGroupHeaderLine = (line: string): boolean => /^\*\*[^*]+\*\*:?\s*$/.test(line);

// A numbered/bold line can match characterLineRegex/boldCharRegex structurally
// while not naming a real character at all — e.g. a truncated draft's leftover
// placeholder slot: "21. **[RESERVE CHARACTER - Brian's Alternate]** - If Brian
// cannot attend, his character's secrets and motives will be redistributed..."
// Real character names are never wrapped in brackets, so this is a safe,
// structural (not literal-wording) filter, same principle as ADR-0063/ADR-0068.
export const isPlaceholderCharacterName = (name: string): boolean => name.trim().startsWith('[');

/**
 * What cast does THIS ONE message propose? Tries the explicit header section
 * first, then falls back to the header-agnostic batch pattern (4+ consecutive
 * numbered/bold "Name - description" lines).
 *
 * ADR-0057: this is the SINGLE definition of "a message that proposes a cast",
 * used both to CHOOSE `approved_concept_message_id` and to EXTRACT from it. They
 * used to be two different predicates - the chooser tested a header allow-list
 * (`Character List|Characters|Cast of Characters|...`) while the extractor parsed
 * lines. When a customer asked for players-as-investigators and the AI renamed its
 * section `## Suspect List`, the allow-list stopped matching, "latest match" silently
 * fell back to her FIRST draft, and she received a completely different mystery from
 * the one she approved. One function means the snapshot can never point at a message
 * the extractor cannot read.
 *
 * Do NOT reintroduce a header test as the gate. Header wording is model output and
 * will keep drifting; the parse either finds a cast or it doesn't.
 */
export function extractRosterFromMessage(content: string): ExtractedCharacter[] {
  if (!content) return [];

  // Header path: start after an explicit list header and read numbered lines.
  const headerMatch = content.match(sectionHeaderRegex);
  if (headerMatch) {
    const viaHeader = new Map<string, ExtractedCharacter>();
    const afterHeader = content.substring(headerMatch.index! + headerMatch[0].length);
    const lines = afterHeader.split('\n');
    let started = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      const charMatch = trimmed.match(characterLineRegex);
      if (charMatch) {
        const name = (charMatch[1] || charMatch[2]).trim().replace(/"/g, "'");
        const description = charMatch[3].trim().replace(/"/g, "'");
        if (!isPlaceholderCharacterName(name)) viaHeader.set(name.toLowerCase(), { name, description });
        started = true;
      } else if (started) {
        // Tolerate subheadings/dividers between entries; stop only at a new
        // section header that isn't itself another character-list header AND
        // doesn't lead back into more roster lines (e.g. "### Optional
        // Characters (for 16-18 players)" is a roster continuation, not a new
        // section - the model's wording for "more characters" will keep
        // drifting, so check structure instead: does a character line follow?).
        if (/^#{2,3}\s+/.test(trimmed) && !sectionHeaderRegex.test(trimmed)) {
          let nextContentLine = '';
          for (let j = i + 1; j < lines.length; j++) {
            const t = lines[j].trim();
            if (t) { nextContentLine = t; break; }
          }
          if (!characterLineRegex.test(nextContentLine)) break;
        }
      }
    }
    if (viaHeader.size >= MIN_ROSTER_SIZE) return Array.from(viaHeader.values());
  }

  // Batch path: the roster is present but the header is worded in a way we do not
  // recognise (or absent entirely). This is what makes the function header-agnostic.
  const found = new Map<string, ExtractedCharacter>();
  let batch: ExtractedCharacter[] = [];
  const flush = () => {
    if (batch.length >= MIN_ROSTER_SIZE) for (const c of batch) found.set(c.name.toLowerCase(), c);
    batch = [];
  };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const numbered = trimmed.match(characterLineRegex);
    const bold = trimmed.match(boldCharRegex);

    if (numbered) {
      const name = (numbered[1] || numbered[2]).trim().replace(/"/g, "'");
      if (!isPlaceholderCharacterName(name)) {
        batch.push({ name, description: numbered[3].trim().replace(/"/g, "'") });
      }
    } else if (bold) {
      const name = bold[1].trim().replace(/"/g, "'");
      if (!isPlaceholderCharacterName(name)) {
        batch.push({ name, description: bold[2].trim().replace(/"/g, "'") });
      }
    } else if (batch.length > 0 && trimmed !== '' && !isGroupHeaderLine(trimmed)) {
      flush();
    }
  }
  flush();

  return found.size >= MIN_ROSTER_SIZE ? Array.from(found.values()) : [];
}

/**
 * ADR-0103 Addendum 37 (2026-09-10): what count does this message's OWN header
 * claim (e.g. "## Character List (28 players)" -> 28)? Independent of what
 * `extractRosterFromMessage` can actually parse out of the body below that
 * header - the two can disagree when the reply got cut off mid-list (hits
 * `stop_reason: 'max_tokens'` in mystery-ai, now mitigated at the source with
 * one bounded continuation call, see that function's comment) and the header
 * line itself (written first, before the model started listing names) still
 * states the original, larger, intended total. Returns null when the message
 * has no such header or the header carries no explicit count - this is a
 * corroborating signal for `scripts/detect-truncated-concept-messages.mjs`,
 * not a replacement for the roster parse itself.
 */
export function extractStatedRosterCount(content: string): number | null {
  const match = content.match(sectionHeaderCountRegex);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Is this parsed count plausible as an actual character roster for this mystery?
 * `extractRosterFromMessage`'s structural pattern (4+ consecutive "N. **Bold** -
 * text" lines) has no concept of "character" at all - it matches ANY numbered,
 * bolded, dash-separated list, including things like a reply offering 4 "murder
 * method direction options" in exactly that format. player_count is an
 * independent signal (set from the customer's own chat/form, unrelated to this
 * regex) that a coincidental false-positive match is very unlikely to satisfy,
 * so it's used here as a corroborating check rather than a wording-based gate -
 * consistent with this file's existing principle of structural, not textual,
 * validation. Falls open (treats any count as plausible) when playerCount is
 * unknown, since there's no basis to judge against.
 *
 * Tolerance mirrors the existing `playerCount - 2` floor used elsewhere in this
 * file (allows for e.g. an inspector role trimmed from the played cast) with a
 * small ceiling for a modest few extra background characters.
 */
export function isPlausibleRosterCount(count: number, playerCount?: number | null): boolean {
  if (!playerCount || playerCount <= 0) return true;
  return count >= playerCount - 2 && count <= playerCount + 3;
}

/**
 * ADR-0069 Addendum 1 (2026-09-05): is this candidate roster trustworthy, either by
 * player_count plausibility OR by being a clear revision of a known-good reference
 * roster (e.g. the current approved snapshot)?
 *
 * `player_count` alone regressed same-day: it's a form-captured value that chat-only
 * edits never update, so a customer who legitimately trims their roster by more than
 * `isPlausibleRosterCount`'s tolerance (e.g. removing one of 24 characters across
 * several chat turns, form never touched) gets their real final roster rejected as
 * "implausible" and the stale snapshot wins by default - reopening the exact gap
 * ADR-0069 fixed, via a different mechanism (Golden Feather Awards, 2026-09-05).
 *
 * A high name-overlap with a reference roster (the customer's own prior approved
 * cast) is a second, independent signal that survives a stale player_count: a real
 * revision keeps most of the same names, while ADR-0118's original false-positive
 * ("Holloway's Compound", "Ashgrave's Old Craft" - a murder-method options list, not
 * a cast) shares essentially none, exact-match, with the real roster it was
 * momentarily confused for. `referenceRoster` is optional and only supplied where a
 * trustworthy prior roster actually exists (the re-capture check) - first-capture,
 * where there is no prior roster to compare against, is unaffected and keeps relying
 * on player_count alone, exactly as before this addendum.
 */
export function isPlausibleRosterCandidate(
  candidateRoster: ExtractedCharacter[],
  playerCount?: number | null,
  referenceRoster?: ExtractedCharacter[],
): boolean {
  if (isPlausibleRosterCount(candidateRoster.length, playerCount)) return true;
  if (referenceRoster && referenceRoster.length > 0) {
    return rosterOverlapFraction(candidateRoster, referenceRoster) >= 0.5;
  }
  return false;
}

/**
 * Latest assistant message that actually proposes a cast - the concept the user is
 * approving when they pay. Chronological, last wins, so a post-revision draft beats
 * an earlier one. Returns null when no message parses into a roster.
 *
 * When `playerCount` (and/or `referenceRoster`) is provided, prefers the latest
 * message whose parsed roster is plausible per `isPlausibleRosterCandidate` over a
 * more recent structural match that isn't - this is what stops a later reply that
 * merely LOOKS like a roster (e.g. a numbered list of narrative options) from
 * displacing the real one. Falls back to the plain "latest structural match"
 * behavior if no plausible candidate exists, so a real roster is still returned
 * when player_count itself is stale or wrong and no reference roster is available,
 * rather than nothing.
 */
export function findLatestConceptMessage(
  messages: any[],
  playerCount?: number | null,
  referenceRoster?: ExtractedCharacter[],
): any | null {
  const assistant = (messages ?? [])
    .filter((m: any) => m.role === 'assistant' || m.is_ai)
    .sort((a: any, b: any) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  let latest: any = null;
  let latestPlausible: any = null;
  for (const m of assistant) {
    const roster = extractRosterFromMessage(m.content || '');
    if (roster.length >= MIN_ROSTER_SIZE) {
      latest = m;
      if (isPlausibleRosterCandidate(roster, playerCount, referenceRoster)) latestPlausible = m;
    }
  }
  return latestPlausible ?? latest;
}

/**
 * ADR-0110: a message whose roster starts numbering above 1 (e.g. "17. **Name** -
 * ...") is a CONTINUATION the customer explicitly asked for after an earlier reply
 * got cut off mid-list (LLM output limit), not a standalone or replacement cast.
 * Untreated, `findLatestConceptMessage` picks it as "the" approved message on its
 * own and every downstream extractor only ever sees its tail (e.g. 6 of 22).
 *
 * Splice the continuation's content onto the end of the immediately preceding
 * assistant message so every extraction path below sees one complete roster.
 * Real rosters we generate always start at "1." - a message starting higher is
 * never a legitimate from-scratch cast, so this is a safe structural signal, same
 * principle as `isPlaceholderCharacterName` and ADR-0057's "structure not wording."
 */
export function firstCharacterNumber(content: string): number | null {
  for (const line of (content || '').split('\n')) {
    const m = line.trim().match(/^(\d+)\.\s+(?:\*\*.+?\*\*|[A-Za-z])/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function mergeRosterContinuations(messages: any[]): any[] {
  const sorted = [...(messages ?? [])].sort((a, b) =>
    new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  // Anchor to the nearest PRIOR roster-bearing message, not merely the nearest
  // prior assistant message - an intervening non-roster reply (e.g. "continuing
  // below:") between a truncated list and its continuation must not break the
  // chain. A merged message becomes the new anchor for any further continuation,
  // so a roster split across 3+ messages chains correctly.
  let prevRosterIndex = -1;
  const merged = sorted.map((m) => ({ ...m }));

  for (let i = 0; i < merged.length; i++) {
    const m = merged[i];
    if (!(m.role === 'assistant' || m.is_ai)) continue;

    const firstNum = firstCharacterNumber(m.content || '');
    if (firstNum !== null && firstNum > 1 && prevRosterIndex !== -1) {
      merged[i].content = `${merged[prevRosterIndex].content || ''}\n\n${m.content || ''}`;
    }
    if (extractRosterFromMessage(merged[i].content || '').length >= MIN_ROSTER_SIZE) {
      prevRosterIndex = i;
    }
  }

  return merged;
}

/**
 * What fraction of these two rosters' names match, by normalized exact name (not
 * substring/fuzzy) - shared by `rosterDiffersMeaningfully` and
 * `isPlausibleRosterCandidate` above so both use one definition of "the same cast."
 * Exact-match is deliberate: ADR-0118's fake "roster" ("Holloway's Compound",
 * "Ashgrave's Old Craft") embeds real character surnames inside unrelated phrases,
 * which would substring-match and defeat the whole point of this check. Normalized
 * exact equality only credits an actual restated character name.
 */
export function rosterOverlapFraction(a: ExtractedCharacter[], b: ExtractedCharacter[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aNames = new Set(a.map((c) => normalize(c.name)));
  const bNames = new Set(b.map((c) => normalize(c.name)));
  let shared = 0;
  for (const n of aNames) if (bNames.has(n)) shared++;
  return shared / Math.max(aNames.size, bNames.size, 1);
}
