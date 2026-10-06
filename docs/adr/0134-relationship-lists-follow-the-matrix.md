# ADR-0134: Ally and rival lists must follow the relationship matrix (stop padding to a quota)

- **Status:** Accepted (direction); Child52 is part of Child55, **imported into Make.com 2026-10-03 (Jonathan reported "v55 imported"), re-fire tested on `is_test` packages but not yet exercised by a real purchase**. The health-check row for ally/rival contradictions should fall for packages generated after the import; check it after the first order.
- **Date:** 2026-10-03
- **Related:** [ADR-0103](0103-new-purchase-coherence-sweep-ritual.md) Addendum 78 (where it surfaced), [ADR-0133](0133-parent-child-prompt-audit-part1-single-injection.md) (the Child prompts)

## Context

Every package's `master_context` carries a `relationshipMatrix` (Friendly / Neutral / Hostile for every pair), and each character's `relationships` field has an ALLIES and a RIVALS & ENEMIES list. The Child prompt says allies must be Friendly and rivals Hostile "per master_context.relationshipMatrix". Jonathan assumed the lists therefore follow the matrix; during the Addendum 78 sweep (a Spanish package where 3 of 10 characters named a Hostile guest as an ally or a Friendly one as a rival) it turned out they often do not, and nothing checks.

Measured 2026-10-03 over the 103 packages completed since 2026-08-01 (1,238 characters):

- **Hard contradictions** (a Hostile person listed as an ally, or a Friendly person as a rival): **44 packages (43%), 100 characters (8%), 110 entries**, by the new detector (name-matching precision on the 110 entries checked by script: 106 clean, 3 correct dual-name matches, 1 wrong match from two characters sharing a surname). An earlier throw-away script that skipped characters it could not name-match saw 29 packages and 43 characters; the detector is the better number.
- **Neutral listed as an ally or rival:** about a third of characters (script measurement over 879 matched characters: 298, 34%).
- **Why:** the prompt demands "2-3 ally entries ... must be Friendly" and "2-3 rival entries ... must be Hostile", but across 1,033 matrix rows **43% of characters have fewer than 2 Friendly cells (9% have none) and 70% have fewer than 2 Hostile cells (26% have none)**. The quota and the data conflict for most characters, so the model pads with Neutral and, when a row has no Friendly cell at all, sometimes with Hostile. The matrix is symmetric (0 of 12,868 pairs differ), so a character's own row is the whole truth.
- The relationships text is read by guests during play, so a character who says "Edu is my ally" while Edu's own sheet says Ramón is a rival is a visible inconsistency, and a Hostile "ally" misleads the table about who to trust.

## Decision

1. **Child52** (`MM Live - Child (Unified)52-RelationshipsFollowMatrix`, built by `temp-files/build-child-v52.py` from Child51; exactly two node texts differ): in node 401 (detective-style) and node 501 (slip-style), the only places `relationships` is generated, the ally and rival placeholders now say *how* to choose (find this character's own row, list only names whose cell reads exactly Friendly / Hostile), make the number a ceiling ("up to 3") instead of a quota, forbid padding with the wrong polarity, and say what to write when the row has none (one plain sentence, no names: "no close allies among these guests tonight" / "no declared enemies tonight"). **Jonathan imports it** (no Make MCP).
2. **Detector, information only:** migration `20261003110000` adds `package_relationship_matrix_contradiction()` and `list_packages_with_relationship_matrix_contradiction()`. Hard contradictions only (Neutral is deliberately not flagged: it is the common, milder pattern and is a legitimate fallback). Header-language-agnostic parsing; names matched by token overlap and only when unambiguous (so two cast members sharing a surname are never confused). Service-role only. It is a **row in the health-check status table, not an alert** (`.github/workflows/health-check.yml` check 16), because the cause is the prompt and 44 packages would otherwise raise a permanent red flag. It is the measuring stick: after Child52 is imported, new packages should show 0.
3. **No backfill of existing packages.** Jonathan's call: going forward. Past packages stay as delivered unless a sweep finds one worth fixing by hand.

## Rationale

- The fix targets the cause (a prompt that cannot be satisfied), not the symptom, and it is the smallest prompt change that removes the conflict: only the two placeholder lines change.
- "No names" for an empty list matches what many characters already write ("no tengo más enemigos declarados"), so the sheets stay natural.
- An information-only metric avoids a month of red health checks for a bug whose fix has not shipped yet, while still giving a before/after.

## Alternatives Considered

- **Neutral as a fallback for allies when fewer than 2 Friendly** (keeps every sheet with 2-3 names): rejected as the default because it is exactly the "ally who is not Friendly" pattern the matrix is meant to prevent, and it is easy to relax later if sparse lists read badly. This is the one judgement call in Child52; if allies/rivals sections look too empty on real packages, loosen *only* allies to allow one Neutral, never a Hostile.
- **Deterministic post-generation repair** (delete or rewrite the offending paragraph in SQL/edge function): rejected for now; prose edits are not safely automatable and the prompt fix may make it unnecessary.
- **Wire the detector as a blocking defect:** rejected; 43% of packages would be held for a by-hand edit.
- **Backfill all affected past packages:** rejected by Jonathan (going forward only).

## Consequences

- New packages (after import) should list fewer names, never a wrong-polarity one. Some characters will show "no close allies" or "no declared enemies": expected, it reflects their matrix row.
- Until Child52 is imported nothing changes for new purchases; the health-check row stays high.
- If the matrix itself is poor (for example few Friendly pairs overall), that is now visible rather than papered over; a Parent change could favour more Friendly pairs, not done here.

## Discussion

Jonathan's question ("is the whole point of the matrix to have the texts follow it?") was right and the answer was "it is the intent but nothing enforces it". My first measurement of how bad it was (160 of 434 characters, 53 hostile allies) was wrong, caused by mis-split non-English section headers and skipped name matches, and was corrected the same day (Addendum 78); the detector, which covers every character, is the number to trust. A transient mistake worth recording: the first version of the new SQL functions was executable by `anon`/`authenticated` (the list function is SECURITY DEFINER and returns package titles); caught within minutes by comparing ACLs against the sibling detectors and revoked in the same migration, before any use.

## Key files
- `supabase/migrations/20261003110000_add_relationship_matrix_contradiction_detector.sql`
- `.github/workflows/health-check.yml` (check 16, information only)
- `temp-files/build-child-v52.py`, `temp-files/MM Live - Child (Unified)52-RelationshipsFollowMatrix.blueprint.json` (gitignored; import into Make)

## Addendum 1 (2026-10-06): the detector's baseline was wrong for labeled matrix headers
The detector assumed an empty top-left cell in the matrix header; 27 of 100 recent matrices have `| Character |`, so those were read one column off (false hits and misses). Fixed by migration `20261006160000_fix_relationship_matrix_detector_labeled_header.sql` (ADR-0103 Addendum 86). Corrected figures since 2026-08-01: 33 packages / 59 hits (previously 44 / 110); 0 since Child52 was imported. Child52 itself held on its first detective purchase after the fix (all 11 lists match the matrix by hand).
