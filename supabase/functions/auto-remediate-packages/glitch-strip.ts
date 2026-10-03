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
