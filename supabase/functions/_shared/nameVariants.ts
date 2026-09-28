/**
 * ADR-0131 item 4: consolidates a name-variant-matching helper that used to
 * exist as two independently-maintained copies — supabase/functions/
 * adapt-mystery-apply/index.ts (the "Remove a Character" scrub/verify gate)
 * and supabase/functions/regenerate-child-content/index.ts (its removed-
 * character leak check, ADR-0088 addendum 2026-09-06). Both copies drifted
 * out of sync at least twice: a bare-first-name fallback (found live
 * 2026-09-27) and a title-skipping fix for that fallback (found live
 * 2026-09-28, same day) each had to be discovered in one file and manually
 * ported to the other, with no structural guard against a third drift.
 *
 * regenerate-child-content's own copy carried a comment claiming
 * adapt-mystery-apply's header documents a deliberate "small helpers are
 * duplicated per function, not centralized" convention for exactly this
 * case — checked before consolidating (per this project's own "verify
 * before trusting a claimed rationale" discipline) and that rationale does
 * not actually appear there; the only "not shared" comment in that file is
 * about a different thing entirely (the accept-or-revert safety pattern).
 * Confirmed via an exact diff that both live copies were, at the point of
 * this consolidation, behaviorally identical (only comments and brace
 * style differed) — a pure refactor, not a behavior reconciliation.
 *
 * Follows the same pattern ADR-0125 already proved in this codebase for
 * _shared/rosterExtraction.ts: one file, multiple edge functions import it
 * directly, so a fix here reaches every consumer on that consumer's own
 * next deploy — no third copy to remember to port a fix to.
 *
 * Every code comment below documenting WHY a given variant/guard exists is
 * preserved verbatim from the original — each one records a real, found-
 * live incident and is load-bearing context for anyone touching this file.
 */

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function nameVariants(fullName: string): string[] {
  const variants = new Set<string>();
  const trimmed = fullName.trim();
  variants.add(trimmed);

  const slashMatch = trimmed.match(/^(.*?)\/(\S+)( .*)$/);
  if (slashMatch) {
    const [, before, altToken, rest] = slashMatch;
    variants.add(`${before}${rest}`.trim());
    variants.add(`${altToken}${rest}`.trim());
    // Bare dual-first-name shorthand (e.g. "Jules/Julia" with no surname) —
    // found live 2026-08-28 (ADR-0103 Addendum 4): this generator's own prose
    // constantly refers to a dual-gender-named character by first names alone,
    // dropping the surname entirely ("I was dancing with Jules/Julia...",
    // "Real motives exist elsewhere: ... Dr. Sasha/Sascha losing patent...").
    // Every one of that sweep's residual mentions used exactly this form,
    // which neither of the two variants above (each paired with the surname)
    // nor the bare-surname fallback below ever matches — a removal's own
    // scrub AND its verify step (same regex) both silently missed it.
    variants.add(`${before}/${altToken}`.trim());
  }

  // "Real Name - PlayerNickname" composite (ADR-0088's incident 2026-08-22
  // note, e.g. "Fulgencio Villamar - MauSal") — bare-real-name variant.
  // Found live 2026-08-28 (ADR-0103 Addendum 4, package `c28e31f6...`,
  // non-English): in-game dialogue always addresses the character by their
  // real name alone ("**A Aniceto de Monteverde:**"), never with the
  // internal nickname suffix attached, so without this the full literal
  // string is the ONLY variant that could ever match — and it never appears
  // verbatim anywhere in generated prose. 37 undropped question/rumor blocks
  // across every remaining character in that package resulted.
  const dashMatch = trimmed.match(/^(.+?)\s+-\s+\S+$/);
  if (dashMatch) {
    variants.add(dashMatch[1].trim());
  }

  // Bare-surname fallback (the precedent note refers to "Pemberton" alone in
  // places) — last whitespace token, slash resolved, guarded by a minimum
  // length so it doesn't collide with common short words (mirrors the SQL
  // detector's own `length(btrim(v)) >= 6` guard, relaxed slightly to 4 since
  // this is a removal, not a fuzzy victim-detector, and false positives here
  // just mean an extra harmless substitution).
  const tokens = trimmed.replace("/", " ").split(/\s+/).filter(Boolean);
  const surname = tokens[tokens.length - 1];
  if (surname && surname.length >= 4) variants.add(surname);

  // Bare-first-name fallback (incident 2026-09-27, package 7d8a3015...,
  // "Mike Millingdon"): rumors/relationships/questions prose regularly
  // addresses a character by first name alone ("Point out Mike's ten years
  // driving...", "Heather and Mike are staff", "did you notice Mike
  // anywhere..."). Without this, only the full name and bare surname were
  // matchable, so every bare-first-name mention survived BOTH the scrub pass
  // and verify untouched (same shared regex) — 'verified' shipped a package
  // that still named the removed character by first name in five separate
  // fields across three other characters, including describing his old
  // chauffeur role attached to nobody. Same guard/rationale as the surname
  // fallback above.
  //
  // Skip a leading title when picking that first-name token (incident
  // 2026-09-28, same day, found during a corpus check of the fix above):
  // for a titled dual-gender name like "Dr. Cameron/Camille Reeves", plain
  // tokens[0] is "Dr." — 3 chars, rejected by the length guard below — so
  // every titled name in this corpus got ZERO bare-first-name coverage from
  // the fix above, silently. Confirmed live in package a0a985a9 (9 titled
  // dual-gender removals from 2026-08-20, predating this fallback entirely):
  // 6 of 9 removed characters' bare first names were still leaking across 10
  // character fields, hand-backfilled the same day this was found.
  const titleRegex = /^(?:Dr|Mr|Mrs|Ms|Prof)\.?$/i;
  const firstNameToken = tokens.find((t) => !titleRegex.test(t));
  if (firstNameToken && firstNameToken.length >= 4) variants.add(firstNameToken);

  return [...variants].filter((v) => v.length >= 3);
}

export function buildVariantRegex(variants: string[]): RegExp {
  // Word-boundary guarded (fix, incident 2026-08-20 / ADR-0098): without \b,
  // a short bare-surname fallback (e.g. "Cross") matches as a raw substring
  // inside unrelated words -- confirmed live against real customer content:
  // "across department meetings" and "p-hacking across multiple studies"
  // both matched variant "Cross" for removed character Dr. Finley/Fiona
  // Cross. That's a silent false positive in substituteVariants (garbles an
  // unrelated word) and a false verify failure in dropBlocksTargeting's
  // caller, which rolls back an otherwise-correct removal.
  const sorted = [...variants].sort((a, b) => b.length - a.length);
  return new RegExp(sorted.map((v) => `\\b${escapeRegex(v)}\\b`).join("|"), "gi");
}
