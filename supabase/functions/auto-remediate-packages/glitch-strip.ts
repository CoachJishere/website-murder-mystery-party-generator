// Pure, dependency-free helpers for the deterministic (free) strips in auto-remediate-packages.
// Kept in their own file so they can be unit-tested with plain node (see glitch-strip.test.mjs).
//
// Every transform here mirrors a pattern the SQL detectors already flag, and ONLY removes characters or whole
// standalone lines that can never be legitimate guest-facing text. Keep in sync BY HAND with:
//   - package_dangling_quote_mark()  (supabase/migrations/20261003100100_*.sql)
//   - package_meta_text_leak() rx / stray_rx  (supabase/migrations/20261003120000_*.sql)
// ADR-0103 Addendum 80: the detector was widened to trailing double quotes on 2026-10-03 while the worker's strip
// still only knew single quotes, so on "Boogie Nights, Bloody Nights" the worker fixed the two single-quote fields,
// re-detected the double-quote one, reverted everything, twice, and gave up (attempt cap). That drift is why this
// file exists as one place to widen.

/** A sentence-terminal punctuation mark followed by a single stray closing quote at the very end of a field. */
export const DANGLING_QUOTE_RX = /([.!?])(['’"”])(\s*)$/;

const BR_TAG_RX = /<\/?br\s*\/?>/gi;
const CLOSING_TAG_RX = /<\/[a-z]{2,20}>/g;
const BACKTICK_RX = /`+/g;
// A whole line that is a leaked formatting self-correction ("Let me correct that formatting issue.").
// Length-capped so a real sentence that happens to contain the words is never dropped.
const SELF_CORRECTION_LINE_RX =
  /^(let me (correct|fix|clean up|reformat|redo) (that|this|the|my)? ?(formatting|format)\b.*|.*\bformatting (issue|error|problem|mistake)\b.*)$/i;
const SELF_CORRECTION_MAX_LEN = 160;

export function stripStrayGlitches(text: string): { text: string; changes: string[] } {
  if (!text) return { text, changes: [] };
  const changes: string[] = [];
  let out = text;

  if (BR_TAG_RX.test(out)) {
    BR_TAG_RX.lastIndex = 0;
    out = out.replace(BR_TAG_RX, "\n\n");
    changes.push("br tag -> paragraph break");
  }
  BR_TAG_RX.lastIndex = 0;

  if (CLOSING_TAG_RX.test(out)) {
    CLOSING_TAG_RX.lastIndex = 0;
    out = out.replace(CLOSING_TAG_RX, "");
    changes.push("stray closing tag removed");
  }
  CLOSING_TAG_RX.lastIndex = 0;

  if (BACKTICK_RX.test(out)) {
    BACKTICK_RX.lastIndex = 0;
    out = out.replace(BACKTICK_RX, "");
    changes.push("backtick removed");
  }
  BACKTICK_RX.lastIndex = 0;

  const lines = out.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t && t.length <= SELF_CORRECTION_MAX_LEN && SELF_CORRECTION_LINE_RX.test(t)) {
      changes.push(`self-correction line dropped: ${t}`);
      continue;
    }
    kept.push(line);
  }
  if (kept.length !== lines.length) out = kept.join("\n");

  if (changes.length === 0) return { text, changes };
  // Tidy what the removals leave behind: trailing whitespace and runs of blank lines.
  out = out.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "");
  return { text: out, changes };
}

// ---------------------------------------------------------------------------
// Missing baked-in branch headers (ADR-0103 Addendum 80)
// ---------------------------------------------------------------------------
// A slip-style branch field normally starts "## ROUND 2: MOTIVES\n\n**IF YOU'RE THE ACCOMPLICE**\n\n". When the model omits it, the
// host's compiled guide (which concatenates raw fields) shows the branch unlabeled. The right header is not guessable in 13
// languages, but it is always present on the SAME field of the other characters in the SAME package, so we copy the majority one.
// Mirrors package_missing_branch_header() (slip style only; a field "has a header" when it starts with '#').

const HEADER_RX = /^(#{1,3}[ \t]+[^\n]+)\n+(\*\*[^\n*][^\n]*\*\*[ \t]*\n+)?/;

/** The leading "## ..." line (plus, for per-role fields, the following bold-only role line), normalised to end in a blank line. */
export function extractHeader(text: string, field: string): string | null {
  const m = HEADER_RX.exec((text ?? "").replace(/^\s+/, ""));
  if (!m) return null;
  let h = m[1].trimEnd() + "\n\n";
  // The introduction sometimes has an extra bold instruction line ("**Read this aloud ...**"); that is not part of the header.
  if (field !== "introduction" && m[2]) h += m[2].trimEnd() + "\n\n";
  return h;
}

/**
 * Majority header for `field` among sibling characters' texts. Returns null (escalate, do not guess) unless the winning header
 * is a strict majority of the siblings that have a header, and is shared by at least 2 siblings (or is the only header-bearing
 * sibling when there are at most 2 siblings with text).
 */
export function deriveBranchHeader(field: string, siblingTexts: string[]): string | null {
  const nonEmpty = siblingTexts.filter((t) => (t ?? "").trim() !== "");
  const counts = new Map<string, number>();
  for (const t of nonEmpty) {
    const h = extractHeader(t, field);
    if (h) counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [h, n] of counts) if (n > bestN) { best = h; bestN = n; }
  if (!best) return null;
  // Majority is judged among siblings that HAVE a header (headerless siblings are the defect we are fixing, not votes).
  // A tie is ambiguous, so refuse.
  let bearing = 0;
  for (const n of counts.values()) bearing += n;
  if (bestN * 2 <= bearing && bearing > 1) return null;
  if (bestN < 2 && nonEmpty.length > 2) return null;
  return best;
}

export function prependHeader(text: string, header: string): string {
  return header + (text ?? "").replace(/^\s+/, "");
}
