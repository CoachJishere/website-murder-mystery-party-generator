export interface EvidenceCard {
  round: string;
  title: string;
  description: string;
  imageUrl: string;
}

// Host-only / non-player sections to drop from the printed card. Older "blueprint"
// evidence formats use ### (3-hash) headings for Implications / Visual Description,
// while newer ones use #### (4-hash) for Significance — so match 2–4 hashes, not just 4.
// (Without this, ### IMPLICATIONS and the AI-image prompt leak onto the player's card,
// and several of those sections name the culprit outright.)
// ADR-0161: the Significance heading is localized in non-English packages ("SIGNIFICADO (solo anfitrión)", "BEDEUTUNG (nur für den
// Gastgeber)", ...). The words are the ones in docs/language-pack/scaffold-labels.json; packageScaffold.test.mjs checks they stay in step.
export const SIGNIFICANCE_WORDS = "Significance|Significado|Signification|Bedeutung|Significato|Betekenis|Betydning|Betydelse|Merkitys|의미|意味|意义";
const PRINT_STRIP = new RegExp(`^#{2,4}\\s+(?:Visual Description|Who It Implicates|What This Reveals|Implications|Discovered|${SIGNIFICANCE_WORDS})(?![\\p{L}])`, "iu");

export function stripSectionsForPrint(lines: string[]): string[] {
  const out: string[] = [];
  let skip = false;
  for (const line of lines) {
    if (/^#+\s/.test(line)) {
      skip = PRINT_STRIP.test(line);
      if (!skip) out.push(line);
    } else if (!skip) {
      out.push(line);
    }
  }
  return out;
}

/**
 * Whole evidence-card markdown as the guests see it: the host-only sections (Significance,
 * Implications, ...) are removed with the same rule the printed card uses, so a host who is
 * also playing (ADR-0158) sees exactly what the table sees.
 */
export function playerFacingEvidence(markdown: string | null | undefined): string {
  const normalized = (markdown ?? "").replace(/\\n/g, "\n");
  return stripSectionsForPrint(dropHostOnlyBlocks(normalized.split("\n"))).join("\n");
}

// A line that labels a section "(Host Only)", at any heading level, bold, or as a bare line
// (one delivered package has bare labels with no "#"), in any language of the label word.
// The section runs to the next heading or "---" separator. Runs before the heading-based strip.
// ADR-0161: the label word is localized too ("(solo anfitrión)", "（ホスト専用）"); the English form stays for every older package.
export const HOST_ONLY_WORDS = "host only|solo anfitrión|réservé à l'hôte|nur für den gastgeber|solo per l'ospite|apenas para o anfitrião|alleen voor de gastheer|kun til værten|endast för värden|vain isännälle|진행자 전용|ホスト専用|仅限主持人";
const HOST_ONLY_LABEL = new RegExp(`^\\s*(?:#{1,6}\\s*|\\*{1,2})?[^\\n]{0,60}[(（]\\s*(?:${HOST_ONLY_WORDS})\\s*[)）]\\W*$`, "iu");

function dropHostOnlyBlocks(lines: string[]): string[] {
  const out: string[] = [];
  let skip = false;
  for (const line of lines) {
    if (HOST_ONLY_LABEL.test(line)) {
      skip = true;
      continue;
    }
    if (skip) {
      if (/^\s*#{1,6}\s/.test(line) || /^\s*-{3,}\s*$/.test(line)) skip = false;
      else continue;
    }
    out.push(line);
  }
  return out;
}

function extractParagraphs(lines: string[]): string {
  return lines
    .filter(l => !/^#+\s/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ADR-0161: a round heading in any language of the scaffold table ("EVIDENCE: ROUND 2", "BEWEIS: RUNDE 2", "INDICE : MANCHE 2", "証拠: ラウンド2",
// "证据：第2轮"). Same words as ROUND_WORDS in supabase/functions/_shared/packageScaffold.ts.
export const ROUND_WORDS = "ROUND|RONDA|MANCHE|RUNDE|TURNO|RODADA|RONDE|RUNDA|KIERROS|라운드|ラウンド";
const ANY_ROUND = new RegExp(`(?:\\b(?:ROUND|RONDA|MANCHE|RUNDE|TURNO|RODADA|RONDE|RUNDA|KIERROS)|라운드|ラウンド)\\s*\\d|第\\s*\\d\\s*轮`, "iu");
function roundPattern(n: number): RegExp {
  return new RegExp(`(?:\\b(?:ROUND|RONDA|MANCHE|RUNDE|TURNO|RODADA|RONDE|RUNDA|KIERROS)|라운드|ラウンド)\\s*${n}(?!\\d)|第\\s*${n}\\s*轮`, "iu");
}

export function parseEvidenceCards(
  evidenceCardsMarkdown: string,
  images: { round2?: string; round3?: string; round4?: string },
  /** Label shown above a printed card ("Evidence — Round 2"); pass a translated one (ADR-0161). */
  labelFor?: (round: number) => string
): EvidenceCard[] {
  const cards: EvidenceCard[] = [];
  const normalized = evidenceCardsMarkdown.replace(/\\n/g, "\n");
  const lines = normalized.split("\n");
  const imageList = [images.round2, images.round3, images.round4];
  const labels = [2, 3, 4].map((n) => (labelFor ? labelFor(n) : `Evidence — Round ${n}`));
  const roundPatterns = [2, 3, 4].map((n) => roundPattern(n));

  // A round boundary is an h2/h3 that mentions ROUND N (in any language of ROUND_WORDS). Any other h3 (e.g. Blueprint 11's
  // `### [Evidence Name]` sub-heading) is WITHIN the round, not a boundary.
  // Another language's round word only counts on an h2: a card title (h3) such as "### La ronde 2" must not split the round.
  const isRoundBoundary = (l: string) =>
    (/^#{2,3}(?!#)\s/.test(l) && /\bROUND\s*\d/i.test(l)) || (/^##(?!#)\s/.test(l) && ANY_ROUND.test(l));

  for (let r = 0; r < 3; r++) {
    const imageUrl = imageList[r];
    if (!imageUrl) continue;

    const startIdx = lines.findIndex(l => isRoundBoundary(l) && roundPatterns[r].test(l));
    if (startIdx === -1) continue;

    let endIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (isRoundBoundary(lines[i])) { endIdx = i; break; }
    }

    const heading = lines[startIdx];
    const titleMatch = heading.match(new RegExp(`(?:${ROUND_WORDS})\\s*\\d+\\s*[:：\\s—–-]+\\s*(.+)`, "iu")) ?? heading.match(/第\s*\d+\s*轮\s*[:：\s—–-]+\s*(.+)/u);
    const title = titleMatch ? titleMatch[1].replace(/^[:\s—–-]+/, '').trim() : labels[r];

    const sectionLines = lines.slice(startIdx + 1, endIdx);
    const printLines = stripSectionsForPrint(sectionLines);
    const description = extractParagraphs(printLines);

    if (description) {
      cards.push({ round: labels[r], title, description, imageUrl });
    }
  }

  return cards;
}
