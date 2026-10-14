// Pure helper for auto-remediate-packages: a slip game's guilty-slip deflection tips that name a fixed partner. ADR-0103 Addendum 96.
//
// The culprit and the accomplice are drawn from the whole cast at game time, so a bullet such as "Lean on your accomplice, Tracy Catman, for quiet
// backup" misleads the guilty player. Keep in sync BY HAND with package_slip_partner_named() (supabase/migrations/20261014120000_*.sql): same alias
// rules, same four shapes, same conditional exclusion. The SQL flags a bullet LINE; this rewrites only the offending SENTENCE(s) of that line, so
// guidance in the other sentences survives. English wording only (the detector is English only, so a non-English package is never flagged).

/** Generic replacement sentences. Under an "...ACCOMPLICE SLIP" heading the partner is the culprit, otherwise it is the accomplice. */
export const GENERIC_FOR_CULPRIT = "Lean on your accomplice, whoever drew that slip, for backup, and never turn on them.";
export const GENERIC_FOR_ACCOMPLICE = "Protect the culprit, whoever drew that slip, and never accuse or hint at them.";

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Other characters' aliases: the name without a "(..." or "/..." tail, the first word before "&", and the part after "&". Length >= 3. */
export function aliasesFor(characterName: string): string[] {
  const full = characterName.replace(/\s*[(/].*$/, "").trim();
  const first = characterName.replace(/\s*&.*$/, "").trim().split(" ")[0] ?? "";
  const amp = characterName.indexOf("&");
  const after = amp >= 0 ? characterName.slice(amp + 1).split("&")[0].trim() : "";
  return [...new Set([full, first, after].filter((a) => a.length >= 3))];
}

const GENDERED_PRONOUN_RX = /\b(?:he|him|his|himself|she|her|hers|herself)\b/i;
const CONDITIONAL_RX = /\b[Ii]f\b[^.;]{0,60}\b(?:accomplice|partner)\b/;

/** The three regexes for one owner (alternation of every OTHER character's aliases). null when there is nobody else. */
function ownerRegexes(owner: string, cast: string[]): RegExp[] | null {
  const names = [...new Set(cast.filter((c) => c !== owner).flatMap(aliasesFor))];
  if (names.length === 0) return null;
  const alt = names.map(escapeRx).join("|");
  return [
    new RegExp(`\\b(?:[Aa]ccomplice|[Pp]artner)\\s*(?:is\\s+|,\\s*|:\\s*)?(?:${alt})\\b`),
    new RegExp(`\\b(?:${alt})\\b[^.]{0,25}\\b(?:is|as|being)\\s+(?:your|our)\\s+(?:accomplice|partner|cover|ally)`),
    new RegExp(
      `\\b(?:[Ll]ean on|[Pp]rotect|[Bb]ack up|[Bb]ack|[Ss]tay loyal to|[Ss]tay close to|[Rr]ely on|[Nn]ever (?:name|accuse|turn on|implicate|point at|look at)|[Dd]o not (?:look at|name|accuse)|[Dd]on't (?:look at|name|accuse))\\s+(?:${alt})\\b`,
    ),
    new RegExp(`\\b[Ll]et\\s+(?:${alt})\\b(?:\\s+\\w+){0,2}?\\s+(?:back|vouch|speak|support|cover|stay|stand|help)`),
  ];
}

/** Does this bullet line (or sentence) name another character as the player's partner? Same rule as the SQL detector. */
export function namesPartner(line: string, owner: string, cast: string[]): boolean {
  if (CONDITIONAL_RX.test(line)) return false;
  const rxs = ownerRegexes(owner, cast);
  return !!rxs && rxs.some((r) => r.test(line));
}

/**
 * Rewrites every flagged bullet of one accusations / accusations_pointform value. A flagged sentence becomes the generic one (the first in a
 * bullet; later flagged sentences of the same bullet are dropped, and so are later sentences that still use a gendered pronoun, which referred to the
 * removed partner). Heading lines mentioning the accomplice switch the generic to the
 * culprit-facing one until the next heading. Lines that are not bullets and clean bullets are returned untouched.
 */
export function healPartnerTips(text: string, owner: string, cast: string[]): { text: string; changed: boolean } {
  let accompliceBlock = false;
  let changed = false;
  const out = text.split("\n").map((line) => {
    if (/^#/.test(line)) { accompliceBlock = /accomplice/i.test(line); return line; }
    if (!line.startsWith("- ") || !namesPartner(line, owner, cast)) return line;
    const generic = accompliceBlock ? GENERIC_FOR_ACCOMPLICE : GENERIC_FOR_CULPRIT;
    const sentences = line.slice(2).split(/(?<=[.!?])\s+/);
    let placed = false;
    const kept: string[] = [];
    for (const s of sentences) {
      if (namesPartner(`- ${s}`, owner, cast)) {
        if (!placed) { kept.push(generic); placed = true; }
      } else if (placed && GENDERED_PRONOUN_RX.test(s)) {
        // a later sentence of the bullet that still says him/her/she/he was about the removed partner ("Let her back you up only if she chooses")
        continue;
      } else kept.push(s);
    }
    if (!placed) return line; // the SQL flagged a shape this sentence split cannot isolate: leave it, the caller escalates
    changed = true;
    return `- ${kept.join(" ")}`;
  });
  return { text: out.join("\n"), changed };
}
