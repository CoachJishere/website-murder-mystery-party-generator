export interface EvidenceCard {
  round: string;
  title: string;
  description: string;
  imageUrl: string;
}

const PRINT_STRIP = /^####\s+(Visual Description|Who It Implicates|What This Reveals|Implications|Discovered|Significance)\b/i;

function stripSectionsForPrint(lines: string[]): string[] {
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

function extractParagraphs(lines: string[]): string {
  return lines
    .filter(l => !/^#+\s/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseEvidenceCards(
  evidenceCardsMarkdown: string,
  images: { round2?: string; round3?: string; round4?: string }
): EvidenceCard[] {
  const cards: EvidenceCard[] = [];
  const normalized = evidenceCardsMarkdown.replace(/\\n/g, "\n");
  const lines = normalized.split("\n");
  const imageList = [images.round2, images.round3, images.round4];
  const labels = ["Evidence — Round 2", "Evidence — Round 3", "Evidence — Round 4"];
  const roundPatterns = [/ROUND\s*2/i, /ROUND\s*3/i, /ROUND\s*4/i];

  // A round boundary is an h2/h3 that mentions ROUND N. Any other h3 (e.g. Blueprint 11's
  // `### [Evidence Name]` sub-heading) is WITHIN the round, not a boundary.
  const isRoundBoundary = (l: string) =>
    /^#{2,3}(?!#)\s/.test(l) && /\bROUND\s*\d/i.test(l);

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
    const titleMatch = heading.match(/ROUND\s*\d+\s*[:\s—–-]+\s*(.+)/i);
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
