// Moved out of index.ts so it can be tested with plain node (ADR-0161). Behaviour unchanged for English packages.

/**
 * Pull one round's evidence card out of the evidence_cards markdown.
 *
 * CRITICAL: we take only the player-facing description body and stop at the
 * next `####`. The `#### SIGNIFICANCE (Host Only)` / `#### IMPLICATIONS`
 * block routinely names the murderer (that is its job), and must never reach
 * an image prompt.
 *
 * Matches the description heading by POSITION (the first `####` subsection
 * under the round's `###` title) rather than the English word "DESCRIPTION".
 * The heading itself gets translated per the package's language_instruction
 * (e.g. Italian "DESCRIZIONE") and the section label that follows it varies
 * by template version too (SIGNIFICANCE vs IMPLICATIONS), so a hardcoded
 * English keyword silently matches nothing on many packages. Confirmed live
 * 2026-09-27 ("L'eredità Del Silenzio"): the old `#### DESCRIPTION` regex
 * never matched `#### DESCRIZIONE`, `extractCard` returned null, and
 * `handleMissingImages` escalated instead of regenerating the missing round
 * — every non-English package with a dropped evidence image silently skips
 * mechanical remediation this way, not just this one case.
 */
export function extractCard(
  ecText: string,
  roundNum: number,
): { title: string; description: string } | null {
  // ADR-0161: the round heading is localized in non-English packages ("## BEWEIS: RUNDE 2", "## INDICE : MANCHE 2", "## 证据：第2轮"), so the
  // heading is any h2 that names this round in a round word of the scaffold table. The English form stays valid for every older package.
  const rw = "(?:ROUND|RONDA|MANCHE|RUNDE|TURNO|RODADA|RONDE|RUNDA|KIERROS|라운드|ラウンド)";
  const sectionRx = new RegExp(
    `(?:^|\\n)[ \\t]*##(?!#)[^\\n]*?(?:${rw}\\s*${roundNum}(?!\\d)|第\\s*${roundNum}\\s*轮)([\\s\\S]*?)(?=\\n[ \\t]*##(?!#)[^\\n]*?(?:${rw}\\s*\\d|第\\s*\\d\\s*轮)|$)`,
    "iu",
  );
  const section = sectionRx.exec(ecText);
  if (!section) return null;
  const body = section[1];

  const title = (/^[ \t]*###[ \t]+(.+)$/m.exec(body)?.[1] ?? `Round ${roundNum} evidence`).trim();

  // First `####`-level heading in the section, whatever word it uses.
  const firstHeading = /^[ \t]*####[ \t]*[^\r\n]*\r?\n/m.exec(body);
  if (!firstHeading) return null;
  const afterHeading = body.slice(firstHeading.index + firstHeading[0].length);
  // Stop at the next heading in ANY form — `#{2,6}` (with or without a trailing
  // space, so `####SIGNIFICANCE` and `##### SIGNIFICANCE` both terminate).
  let description = /^([\s\S]*?)(?=\r?\n[ \t]*#{2,6}|$)/.exec(afterHeading)?.[1]?.trim();

  if (!description) return null;
  // Belt-and-suspenders: an English-labeled SIGNIFICANCE/IMPLICATIONS
  // ("Host Only") block must NEVER reach an image prompt — it routinely
  // names the murderer. The structural stop above already excludes it in the
  // normal case (any heading, any language, ends the description); this only
  // catches the case where that stop somehow doesn't fire.
  description = description.replace(/\r?\n[ \t]*[#*>\s]*(significance|significado|signification|bedeutung|significato|betekenis|betydning|betydelse|merkitys|의미|意味|意义|implications)(?![\p{L}])[\s\S]*$/iu, "").trim();
  if (!description) return null;
  return { title, description };
}
