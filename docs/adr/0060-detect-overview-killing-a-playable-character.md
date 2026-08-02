# ADR-0060: Detect an overview that kills off a playable character

- **Status:** Accepted
- **Date:** 2026-08-02
- **Related:** ADR-0042 (content detectors), ADR-0053 (the gate), ADR-0055

## Context

The 2026-08-02 sweep found "The Cognitive Dissonance Incident" (paid) shipped with a `game_overview` opening:

> "On the morning of October 14th, **Dr. Morgan Cho**, a prominent but ruthless cognitive neuroscientist, was found dead at their desk…"

The real victim is Dr. Morgan Hartwell. **Morgan/Merritt Cho is a playable suspect** — one of the guests is holding that character's script. Every character bio and the roster are built correctly from Hartwell; only the overview blurb has the swap. A host reading it would brief the table on the wrong dead person.

The existing `victim_mismatch` check did not fire, for two independent reasons.

**1. Its test is the wrong direction.** It asks whether the overview's victim surname is *absent* from `master_context` and every character background. "Cho" is present — as a suspect — so the absence test passes. It is built to catch a *foreign* victim bled in from another mystery; it structurally cannot catch a victim who is one of the cast.

**2. Its extractor is inert on most of the corpus.** The regex

```
Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)
```

requires a bare two-word capitalised name immediately after the header. A title (`Dr.`) or any preamble (`On the morning of October 14th,`) defeats it. Measured across all 101 packages with an overview: **it returns NULL on 79 of them — 78%**. For those packages `victim_mismatch` is not weak, it does not run at all.

## Decision

Add a check that needs no victim extraction. Instead of "who is the victim, and are they real?", ask directly:

> Does the overview describe any **playable character** as dead?

Character names are first expanded through the `A/B Last` gender-variant convention (`Morgan/Merritt Cho` → `Morgan Cho`, `Merritt Cho`), because that is the form the overview prose actually uses. Each variant is then tested against a death-phrase pattern within an 80-character, sentence-bounded window.

Shipped as `public.package_victim_is_playable_character(mystery_packages)`, wired into the shared `package_completion_blocking_defects()` gate, plus a read-only `list_packages_with_victim_as_character()` RPC for the health check (status filter includes `needs_review` per ADR-0055).

Validation across all 101 packages with an overview: **exactly one hit — the known case. Zero false positives.** Post-wiring regression check: 23 packages carry some defect, of which 22 were already flagged by pre-existing checks and 1 is the new one. Nothing else moved.

## Rationale

- **Sidestepping extraction is what makes it reliable.** The defect is expressible without ever identifying "the victim", and every attempt to identify one proved brittle. Asking a question you can answer precisely beats asking the question you first thought of.
- **Full-name matching, not surname.** These mysteries are frequently family affairs (`Adelaide Crane` as victim with `Camille Crane` in the cast), so surname matching would false-positive constantly. Variant expansion plus a ≥6-character floor keeps it tight.
- **Zero false positives justifies gating**, per the bar ADR-0053 set: a gate's false positives block real revenue, so the bar for "block on this" is higher than for "alert on this". One hit in 101 clears it.

## Alternatives Considered

- **Fix the `victim_mismatch` extractor instead.** Attempted and rejected *for now*. A looser pattern (optional title, 1–3 capitalised words, ≤90 chars before a death phrase) raised extraction from 22/101 to 63/101 — but inspection showed the extra hits were garbage: `" But"`, `" When"`, `" Instead"`, `" Game Overview\n\nMaster"`. The wide gap lets it seize any capitalised word near the phrase. Shipping it would have manufactured false positives on a *gating* predicate. The 78%-inert extractor is recorded below as an open problem rather than papered over.
- **Match on surname only.** Rejected: family-mystery false positives, as above.
- **Advisory-only, no gate.** Rejected given zero observed false positives, though it remains the fallback if real-world FPs appear.
- **Compare the overview victim against `master_context.victimProfile.name`.** Attractive because that field is structured and reliable (the ADR-0047 worker already reads it), but it still requires extracting a name from the overview to compare *against*, which is the part that does not work.

## Consequences

- A package whose overview kills off a playable character is now held at `needs_review` instead of shipping.
- **Scope is ~60% of packages, by design, and this should NOT be "fixed" by adding non-death phrases.** The check fires only where the overview contains a death phrase: 59 of 98 packages with an overview. The other 39 (40%) are intrigue/theft scenarios with no death — the Golden Flamingo (a stolen ornament) is the canonical example — and the check is silent on them.

  That silence is correct rather than a gap. The check is sound *because* "dead ⇒ not playable" is a hard invariant: a corpse cannot hold a character script, so an overview describing a playable character as dead is always wrong. **No equivalent invariant exists for theft.** The wronged party in a heist is frequently a playable character — the Flamingo's Kaimana Lei is the aggrieved host and could legitimately be at the table. Extending this predicate with "was robbed" / "discovered the theft" style phrases would therefore not widen coverage; it would flag correct packages.

  A genuine equivalent for non-death mysteries would need a different invariant, not more phrases, and none is currently known. Recorded as a deliberate scope boundary.
- **No auto-repair exists for this class**, so such a package holds until a human intervenes — the interim trade ADR-0053 named. A repair path does exist and is not yet wired: `regenerate-parent-content` rebuilds `game_overview` from `master_context`, which holds the correct victim. Wiring that is the natural follow-up.
- The already-delivered MSU package is **not** retroactively flipped — the gate fires only on the `generation_completed_at` NULL→NOT NULL transition. It is now visible to the health check, which is the intended route for a human decision.
- **Open, not fixed: `victim_mismatch` is inert on 78% of packages.** That is a separate and arguably larger hole — the detector has been reporting clean on most of the corpus because it never extracted anything to check. It needs a genuinely robust extractor, validated against the full corpus for false positives before it goes anywhere near the gate.

## Key files

- `supabase/migrations/20260802_detect_victim_is_playable_character.sql`
- `public.package_victim_is_playable_character()` — the check
- `public.list_packages_with_victim_as_character()` — read-only detector
- `public.package_completion_blocking_defects()` — the shared gate it splices into
- `docs/adr/0053-extend-completion-gate-to-content-detectors.md` — the validation bar applied here

## Discussion

The first instinct was to fix the broken extractor, and the first attempt looked like a success: coverage jumped from 22/101 to 63/101. Reading the actual extracted values is what killed it — three quarters of the new "victims" were function words. A coverage metric said the change was a large improvement while the outputs said it was noise, which is a reminder that for a detector the only meaningful validation is inspecting hits, not counting them.

Abandoning extraction entirely turned out to be the better move, and in hindsight the obvious one: the defect worth catching was never "the overview's victim is wrong in some general sense", it was specifically "the overview says a player's character is dead". That is directly checkable against data already in the table.

The uncomfortable residue is the 78% figure. `victim_mismatch` has been part of the gate since ADR-0053 and part of the health check since ADR-0042, and it has been quietly inert on most packages the whole time. Nothing surfaced that, because a detector returning no hits is indistinguishable from a detector finding nothing wrong — the same property that made the paired-predicate bugs (ADR-0055/0056/0057) invisible. A detector's own coverage deserves monitoring as much as its findings do.
