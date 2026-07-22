# 0041. Detect and prevent cross-character identity contamination in generated packages

**Status:** Accepted

**Date:** 2026-07-22

## Context

A 1-star guest feedback arrived 2026-07-22 for "Blood, Blackmail & Bollinger: A Media Mogul Murder" (generated 2026-07-02, host sarahjanewebb@me.com): *"The characters doubled up on their 'scripts' and had errors with one character wrongly saying that they were the brother of the murdered person when that was a different character's story."*

Investigation confirmed the complaint and found it worse than reported. The murderer Hugo 'Hux' Blackstone is the victim Rex's brother — correctly, in his own materials. But his storyline bled into three other characters' round scripts and final statements:

- **Tiggy Fortescue-Willoughby** — "he was my brother… We built something together in the business"; "I did not kill my brother"; Hugo's guilty knowledge ("I knew where the spare shoes were kept")
- **Tarka Pemberton-Ffoulkes** — "Rex was my brother"; "Yes, Rex discovered my embezzlement" (Hugo's secret, not Tarka's); also claims Dilly as "my niece" (Hugo's relationship)
- **Dax Sterling** — "we were brothers"; "bludgeoning my own brother" — while his own accusations section correctly names Hugo as "Rex's brother" (self-contradiction within one packet)

Four of ten characters claimed to be the victim's brother. Backgrounds, intros, and relationships were per-character correct — contamination was confined to the child-scenario round scripts and final statements, indicating the murderer's narrative in `master_context` bled into other characters' defensive scripts. Beyond confusing guests, three innocents recited the murderer's actual evidence trail, partially spoiling the mystery.

Two gaps allowed this to reach a customer unnoticed for 20 days:

1. **No prompt-level guard.** The ADR-0037 `<content_coherence_rules>` (Child v16) cover timing, self-directed questions, accomplice coherence, blackmail logic, and secret stakes — but nothing forbids a character adopting another character's identity, kinship, or guilty knowledge.
2. **No semantic detection.** All monitoring (NULL sweeps, `needs_review`, the ADR-0016 evidence-image detector) checks for *missing* content. A package with every field populated but semantically contaminated is invisible; `generation_status=completed` looked healthy.

## Decision

Two layers, mirroring the ADR-0016/0037 pattern of prevention-plus-backstop:

1. **Prevention (prompt layer):** Child v17 blueprint (`temp-files/MM Live - Child (Unified)17-IdentityRule.blueprint.json`, built from the v16 head) adds a `CHARACTER IDENTITY` rule as the first rule in all 8 per-character `<content_coherence_rules>` blocks: write strictly as this character; never claim another character's kinship or relationship to the victim; never recite another character's secret, alibi, or guilty knowledge — the murderer's storyline especially must not bleed into other characters' scripts. **Importing into Make.com is a manual step.**

2. **Detection (backstop layer):** Postgres function `list_packages_with_identity_conflicts(_since)` (migration `20260722_detect_character_identity_conflicts.sql`, deployed to production) — a read-only backlog flagging completed packages where **≥2 characters' scripts claim the same kinship term** ("my brother") that their own background/relationships/description never establish. Wired into `health-check.yml` as check 5 (30-day rolling window; the known Bollinger package is jq-excluded until the window ages it out).

## Rationale

- The heuristic was validated against all packages since 2026-05-01 before deployment: the ≥2-same-term threshold isolated exactly the contaminated package (3 false "brother" claimants) with zero false positives. Per-character singles ("my mother", "my husband") were all benign references to the character's own family.
- Cross-field self-consistency (scripts vs. the character's own background) needs no knowledge of who the victim's real relatives are, so it works generically across mysteries in pure SQL — no LLM call, no API spend, runs free every 6 hours.
- Prevention alone isn't enough: prompt rules are probabilistic. Detection alone isn't enough: the detector's threshold deliberately misses single-character contamination (see Consequences). Together they cover the failure class from both sides.

## Alternatives Considered

- **LLM-based consistency audit per package** — would catch subtler contradictions (timelines, motives) but costs per-generation API spend and needs explicit approval per the no-metered-APIs rule; deferred. The SQL detector is the free 80%.
- **≥1 claimant threshold** — flags benign own-family references in most packages; alert fatigue would kill trust in the health check.
- **Victim-referent parsing** (only flag "my X" where X refers to the victim) — requires knowing the victim's name per package (unstructured, lives in prose) and NLP-ish matching in SQL; fragile. The self-consistency framing sidesteps it.
- **Fixing only the prompt (no detector)** — the Bollinger package sat invisible for 20 days; without detection we'd learn about the next regression the same way, from a 1-star review.

## Consequences

- New generations get the identity rule **once Child v17 is imported into Make.com** (manual, pending — as is the Parent47/Child16 import from ADR-0037, if not yet done).
- Health check now surfaces semantic contamination within 6 hours of generation, with character names and the conflicting kin term in the alert.
- **Known limitation:** a single contaminated character whose false kin claim is established only in the murderer's background stays below the ≥2 threshold. Accepted to avoid false-positive fatigue; the prompt rule is the primary defense for that case.
- The kin-term list is English-only; packages generated in other languages are not covered by the detector (generation is currently English-dominant; revisit if that changes).
- The Bollinger package itself is not repaired by this ADR (party already happened; customer remediation handled separately as a refund decision).

## Key files

- `supabase/migrations/20260722_detect_character_identity_conflicts.sql` — detector function (deployed)
- `.github/workflows/health-check.yml` — check 5 wiring
- `temp-files/MM Live - Child (Unified)17-IdentityRule.blueprint.json` — prompt-layer prevention (awaiting manual Make.com import)
- `docs/adr/0037-whispers-playtest-clarity-and-content-coherence.md` — the coherence-rules block this extends
- `docs/adr/0016-detect-missing-evidence-images-decoupled-from-needs-review.md` — the detector pattern this follows

## Discussion

The main trade-off debated was detector sensitivity. A ≥1 threshold catches the single-contaminated-character case but produced multiple benign hits in validation (characters mentioning their own mother/husband in scripts without those relatives appearing in their background). Since the health check opens GitHub issues that email Jonathan, precision was weighted over recall: the ≥2 threshold had zero false positives on two months of real data, and the missed case is exactly what the prompt rule targets. The second question was whether to regenerate the contaminated Bollinger scripts; declined — the party already happened, regeneration spends LLM budget on a package that will likely never be replayed, and the customer outcome is a refund decision, not a data fix.
