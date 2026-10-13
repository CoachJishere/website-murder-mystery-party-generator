// "I'm also playing" seal for detective-style games (ADR-0158).
//
// In detective style the murderer is predetermined, so the places that spell the answer
// out must be hidden from a host who also plays a suspect: the reveal section of the
// detective script and the "Host Only" notes on the evidence cards. Pure functions, no
// React, so they can be tested against real packages with node.

// A heading (levels 2 to 4) that opens the reveal. Reveal headings are localized by the
// Parent, so this list is the words seen in delivered packages (es, it, fr, nl, sv) plus
// the likely forms in the other locales. A word missing here fails CLOSED (see below).
// Do NOT add "closing": older packages put the resolution inside "ACCUSATIONS AND RESOLUTION" and a
// CLOSING heading after it would then count as the reveal and leave the answer open (corpus check
// 2026-10-13: one delivered package). A closing section above the reveal is a latent, unseen case.
// "Resolution" is deliberately not a trigger in English: older packages have no reveal
// section at all and the sealing then fails closed for them.
const REVEAL_WORDS =
  /reveal|revela|révélation|rivelazione|enthüllung|aufloesung|auflösung|onthulling|afslør|avslöj|paljast|真相|揭晓|揭曉|公开|公開|種明かし|結末|밝혀|공개|결말/i;

export interface SealedScript {
  /** True when a reveal heading was found and the script could be split. */
  found: boolean;
  /** Everything before the reveal heading, without Key Points sections (the whole script when not found). */
  open: string;
  /** From the reveal heading to the end of the script, including any closing sections. */
  sealed: string;
}

/**
 * Splits a detective script at its first reveal heading. Everything from there to the end
 * (reveal, closing statement, accomplice confession) is sealed. When no reveal heading is
 * found (older packages put the resolution inside "Accusations and Resolution"), `found`
 * is false and callers must show NOTHING of the script: fail closed.
 */
// Some packages follow each script block with a host-facing "#### Key Points" bullet list. One
// delivered package's bullets name the culprit ("Do NOT name Max directly yet"), which is not
// read aloud, so the open part drops every Key Points section (to the next heading).
const KEY_POINTS_WORDS =
  "key points?|puntos clave|points cl[ée]s|kernpunkte|punti chiave|kernpunten|viktiga punkter|nøglepunkter|keskeiset kohdat|ポイント|要点|핵심 포인트";
const KEY_POINTS_HEADING = new RegExp(`^\\s*#{1,6}[ \\t]+(?:${KEY_POINTS_WORDS})(?![\\p{L}])`, "iu");
const KEY_POINTS_LABEL_LINE = new RegExp(`^\\s*[*_]*(?:${KEY_POINTS_WORDS})[*_:\\s]*$`, "iu");
// "Key Points" as a heading of any level (also "Key Points (Host Only)"), or as a bold or bare label line
// ("**Key Points:**", "Key Points:"). Only the "#### Key Points" shape occurs in delivered packages; the
// others and the localized words are cheap insurance against the Parent writing it differently.
function isKeyPointsLine(line: string): boolean {
  return KEY_POINTS_HEADING.test(line) || KEY_POINTS_LABEL_LINE.test(line);
}

function dropKeyPoints(text: string): string {
  const out: string[] = [];
  let skip = false;
  for (const line of text.split("\n")) {
    if (isKeyPointsLine(line)) skip = true;
    else if (/^\s*#{1,6}[ \t]+/.test(line)) skip = false;
    if (!skip) out.push(line);
  }
  return out.join("\n");
}

export function sealDetectiveScript(script: string | null | undefined): SealedScript {
  const text = script ?? "";
  const headingRe = /^(#{2,4})[ \t]+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(text)) !== null) {
    if (REVEAL_WORDS.test(m[2])) {
      return { found: true, open: dropKeyPoints(text.slice(0, m.index)).trimEnd(), sealed: text.slice(m.index) };
    }
  }
  return { found: false, open: text, sealed: "" };
}

const STORAGE_PREFIX = "mm_host_also_playing_";

export function readHostPlaying(key: string | null | undefined): boolean {
  if (!key) return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

export function writeHostPlaying(key: string | null | undefined, on: boolean): void {
  if (!key) return;
  try {
    if (on) window.localStorage.setItem(STORAGE_PREFIX + key, "1");
    else window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* storage can be blocked; the switch then works for this visit only */
  }
}
