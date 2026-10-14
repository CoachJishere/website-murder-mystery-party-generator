# ADR-0160: Alert-only sweep check for detective narration that names the culprit before the reveal

## Status
Accepted

## Date
2026-10-14

## Context
While building ADR-0158 (detective-style host who also plays), a read of the name hits before the reveal heading in the paid detective packages found "about 6" where the Round 3/4 narration, read aloud to every guest, points at the culprit. This ADR re-measured it, decided whether a detector is worth building, and built the cheapest one that fits the ADR-0103 Addendum 38 test.

It is a script-quality problem, not a seal problem: guests hear the same pointer the sealed host would. It matters more for ADR-0158 because a playing host who reads the narration aloud learns the answer from it.

**Correction recorded first.** ADR-0158 Follow-up 2 and the ADR-0158 eval note said the Key Points leak "needs a Make import". It does not: `Key Points` appears only in blueprints Parent26 and older (grep over `temp-files/*.blueprint.json`: 0 hits in Parent85 and Parent86, the live ones, none in any Child), and the one affected package (546eec7e, 2026-04-22) came from a retired Parent. Corrected in ADR-0158 and the vault copy (commit 431909f).

## Measurement (2026-10-13, read-only, no paid call)
125 paid non-test detective packages with a script. Method: split the script by heading; whole-word, case-sensitive match of the murderer's and accomplice's name parts (title words dropped, parts shared with the victim or another character excluded, hyphenated victim surnames split); counted per section (Round 2, 3, 4, Accusations, Final Statements). 24 packages have any culprit-name hit there. **Every one was read in full context.**

| Verdict | Packages (id, date, what the narration does) |
|---|---|
| Real, severe | 4c1410a6 (07-01, R3+R4 dwell on Victor Sterling), 33671764 (08-01, R4 dwells on the culprit, the accomplice's vehicle), f8b1b41a (07-07, "one person whose timeline doesn't add up"), 9ec948f7 (05-07, witnesses place Ryan behind the victim), 733b02dd (07-20, R4 evidence line names both culprits), adf9a355 (05-20, R4 states the solution), 546eec7e (04-22, legacy Script/Key Points format) |
| Real, moderate | c3a54b47 (07-02, culprit's appointment book, whereabouts vague), a0a985a9 (07-27, culprit's alibi "collapses"), 949b49ac (04-26, call sheet: accomplice alibied, culprit none), b1141ac2 (06-16, evidence logs name the culprit), a45a4d58 (05-17, "explain those thirty-two minutes"), 08f28486 (04-01, journal of the culprit's family name), 422db657 (03-02, vial with "the Maester's seal"), c95100da (08-25, badge swipe contradicts the culprit), c28e31f6 (08-22, shawl from the culprit's fashion house), 85df37d2 (2025-12, culprit's alibi contradicted, one of three addressed) |
| Debatable | 9464a4c7 (08-04, Round 2 spends a paragraph on the culprit's motive; Round 3/4 name nobody), 204db42d (2026-02, keycard roster, culprit has "no exit recorded") |
| Roster / noise | e71da9da, b1bf76ba (hyphenated victim surname), e9a25d0a, 8b0729ac, af09daa6, e81423da: the culprit is named inside a Round 2 list of every suspect's motive |
| Not reproduced | e7cc3117 ("Caleb" accusation): zero culprit-name hits before the reveal heading. "Caleb" first appears in THE REVEAL and CLOSING STATEMENT, which the seal already hides. Rounds 2-4 there name nobody (the target style). |

**17 real pointers, not "about 6" (13.6 percent of 125).** By date: 17 real of the 66 packages before 2026-08-26 (26 percent); **0 real of 59 packages since**. The cause of the change was not identified (the evidence-card funnel rule is in Parent47, far older). No customer has mentioned an obvious culprit: 5 feedback rows and 31 contact messages contain no such words.

### Candidate rules on the labelled table
Recall is of the 17 real.

| Rule | Flags | Precision | Recall |
|---|---|---|---|
| (a) R3+R4: culprit 3+ times and more than any other suspect | 6 | 6 of 6 | 35% |
| (a) same with 2+ | 11 | 11 of 11 | 65% |
| (b) culprit named in Accusations | 0 | n/a | 0% (current Accusations and Final Statements name nobody) |
| (c) culprit-specific object or company | not built | n/a | its two cases (a fashion house, "the Maester's seal") contain the culprit's name or title, so (d) catches them |
| **(d) culprit named at all in a Round 3 or Round 4 section** | 17 | 16 real + 1 debatable | 16 of 17 (the miss, 546eec7e, parses with the SQL heading logic) |
| (e) culprit named in any section | 24 | 16 real, 2 debatable, 6 noise | 94% |

(d) is clean because roster-style naming of every suspect happens in Round 2, not in Rounds 3/4.

## Decision
Build rule (d) as an **alert-only sweep check, not a gate**: `package_pre_reveal_culprit_named(mystery_packages)` and `list_packages_with_pre_reveal_culprit_name(_since)` (service_role only), run in step 3 of the "New Purchase" sweep. Jonathan chose this (recommended option 1) over gating it or declining.

### ADR-0103 Addendum 38 test, stated honestly
- **Cheap and deterministic:** yes. A heading split and a whole-word match, no LLM call; 270 packages scan in about 244 ms.
- **Severe and obvious:** **moderate, and currently rare.** The game still works; the deduction is spoiled. 17 cases before 2026-08-26, none in 7 weeks, no customer signal. It is more serious for a playing host (ADR-0158).
- **What a hold would do:** nothing useful. There is no free heal (a fix is a paid regeneration of the detective script), so a gate would hold a moderate, currently non-occurring problem for a human. Hence detection only, like `list_packages_with_unresolved_victim_name`.

## Rationale
It is nearly free (one migration, no cost per run), it is a tripwire if the Round 3/4 prompt regresses, and it protects the ADR-0158 promise to a playing host. The full-cast manual read in the sweep would also catch it, so this is a data point, not a replacement.

## Alternatives Considered
- **Gate (hold on a hit):** rejected, see above.
- **Decline and document only:** reasonable, since the rate is 0 in 59; rejected because the check is cheap and the regression would otherwise be silent.
- **LLM-judge:** not considered, per ADR-0103 Addendum 56.
- **Rule (a):** precise but misses a third to two thirds of the real cases (single-mention pointers).
- **Rule (b):** dead on the current format.

## Consequences
- Validation on the whole detective corpus (270 packages): **19 flags = all 17 real + the 1 debatable (204db42d) + 1 false positive; 0 of the 6 roster packages.** Synthetic tests (23 cases, run through `jsonb_populate_record` on real characters, no writes): word boundary (Victoria vs Victor), case, possessive, accented names, dual-gender alternatives, title words, nickname, victim surname (including hyphenated), Round 2 not checked, sub-heading kept inside its round, next same-level heading ends it, es/de/zh/ja round headings, empty script. All passed.
- **Known false positive (1, 2026-10-13):** "Dead Serious: The Br31 Unveiling" (6eb76783): an ice-cream cast whose murderer is "French Vanilla" and a Round 3 jar labelled "Pure Vanilla Base". No character is named; the cast name is an ordinary word. This is the only flag in the 59 packages since 2026-08-26. Themed casts whose names are common nouns will produce this; a dictionary is not worth it for an alert-only check. (The jar is arguably a legitimate breadcrumb pun, but note it for the customer-facing sweep if they report it.)
- Coverage gaps: Round 3/4 headings are matched by the words round/ronda/ronde/runde (also da)/runda, rundan (sv)/manche/tour/kierros (fi)/turno/rodada and the CJK patterns; only es, de, zh and ja were exercised, and only synthetically; a pointer that names nobody (a role, "the boyfriend") is invisible to a name check; Round 2 dwelling (9464a4c7) is not detected by design.
- If a package after 2026-08-26 ever shows a real hit, revisit the Round 3/4 prompt (that would mean the unidentified improvement regressed).

## Key files
- `supabase/migrations/20261014090000_pre_reveal_culprit_named_detector.sql` (applied via the Supabase MCP; new functions only)
- `CLAUDE.md` (sweep step 3, one sentence)
- `scripts/host-seal/` (the corpus tooling used for the measurement; the labelled table lives in this ADR)

## Discussion
The kickoff expected a decision between a gate, an alert-only check and declining, with the warning that the name check is mostly noise. The noise turned out to be confined to Round 2 and to a few shared-surname cases; limiting the check to Rounds 3/4 removed it. The surprise was the size (17, not 6) and the date split: all the real cases are older than 2026-08-26. That made a gate hard to justify (no free heal, nothing occurring) while leaving a cheap tripwire worth having. e7cc3117, listed in ADR-0158 as an "accusation by name", was a boundary artefact: the name sits after the reveal heading, which the seal hides.
