# ADR-0051: Shift-left generation integrity — guarantee clean delivery, not perfect generation

- **Status:** Accepted (strategy; execution sequenced below)
- **Date:** 2026-08-01

## Context

Over ~two weeks (late Jul – 1 Aug 2026) essentially every generated mystery was found to carry ≥1 defect: 502 error-bodies stored as `character_role` (Velvet Viper, Coronation), duplicated/gender-cross-wired casts, wrong victim in the overview (Adelaide), fixed-culprit-in-slip, identity contamination, meta-text/CoT + accomplice-beat leaks (Crimson Tide, Black Swan, Wedding Vows), self-directed questions (Ghosts, Thornfield, …), missing evidence images (Cognitive Dissonance, Birthday Bash, Vineyard), and `generation_status` double-encoding that silently blinded every detector.

Three facts explain the "every mystery has something wrong" feeling:

1. **Visibility, not (only) a quality drop.** Most detectors were built in this window; the double-encoding blinded them until 2026-08-01. We largely turned the lights on in a dusty room. Correcting for that matters before concluding generation "got worse."
2. **The math guarantees per-package defects at scale.** A 20–35-player package is ~300 independently-generated fields. Even at 99.5% clean/field, P(package fully clean) ≈ 22%; at 99% ≈ 5%. You cannot prompt your way to a clean large package — with hundreds of stochastic draws, "at least one defect" is the default.
3. **A long fragile chain persists transient failures as data.** Make → child scenarios → Claude → parse → Supabase → Replicate: a 5xx at any hop is either dropped (missing image) or baked in as content (a 502 body stored as a role).

Two defect classes, with different cures:
- **Structural / transient-infra** (502-as-field, invalid role, missing field, duplicated cast, missing image, double-encoding): deterministic — *eliminable*.
- **LLM output-quality slips** (self-q, meta-leak, spoiler, victim consistency, contamination, fixed-culprit-in-slip): stochastic — reducible in frequency, and drivable to ~zero *delivered* only with a repair loop.

**Critically, every class we have actually hit is mechanically detectable** — which is why the ADR-0042/0048 detectors caught them all. Detection + auto-remediation (ADR-0042/0047/0048) were the right *first* move (safe, reversible, don't touch the fragile 2–4 MB Make core), but they are inherently after-the-fact whack-a-mole. Two 2026-08-01 changes already prove the durable pattern: the pre-completion structural gate (ADR-0049, incl. fixing the healers that bypassed it) and the double-encoding normalize-on-write trigger (ADR-0050).

## Decision

Adopt **shift-left generation integrity**: stop targeting perfect generation; **guarantee that no mechanically-detectable defect is ever delivered.** Concretely, four layers, from cheapest/most-permanent to most-involved:

1. **Structural DB constraints — make the worst classes impossible to persist.** `character_role` as an enum/CHECK (a 502 body can't be stored as a role — the write rejects and the pipeline retries); the ADR-0050 double-encoding trigger is the template. Cheap, permanent, no detector needed.
2. **A pre-completion validation GATE over ALL detector classes.** Generation's final step runs the existing detector suite; a package with any hit is **never marked `completed`** — it repairs-in-loop or holds as `needs_review`. Extends ADR-0049 (structural only) to the content classes. The detector logic already exists — reuse it as the gate.
3. **A child-content regenerator — the keystone.** A tool that regenerates a single character field/script. It turns the gate's "hold" into "self-heal," and unlocks the classes the ADR-0047 worker currently escalates (identity contamination, slip-culprit-leak). Without it the gate only holds; with it, generation self-heals.
4. **Reliability at each hop** (root-cause of the transient class): Make error-handlers/retries on the parse/child modules (scenario 9061052) and fixing the connector-text-field write pattern (scenario 9106101, ADR-0050). Deferred as risky Make-UI work — now backstopped by layers 1–2, so lower urgency.

The ADR-0042/0047/0048 detectors + auto-remediation worker remain as the **post-delivery backstop** for the residual the gate can't repair — but they move from front line to safety net.

## Rationale

- Reframes the goal to an **achievable** one: "zero detectable defects delivered" covers every class we've actually hit; "zero errors ever" is impossible (the exponent) and is the wrong target.
- **De-risked:** the detectors are the gate's logic (free reuse), and the gate + DB-guard pattern is already shipped and verified twice (ADR-0049, ADR-0050).
- Constraints (layer 1) beat detectors — preventive, permanent, free forever — for the classes expressible as a constraint.
- Puts the check where it belongs: at generation time as a *gate*, not 6 hours later as an *alert*.

## Alternatives Considered

1. **Accept perpetual errors; keep detection + auto-fix as the front line.** Rejected: it's permanent whack-a-mole, leaks to customers between cron runs, and can't repair the judgment classes.
2. **Only harden prompts (more G-rules).** Rejected: raises per-field quality but can't beat the 0.99^N exponent at scale.
3. **Only fix the Make pipeline reliability.** Necessary but insufficient (doesn't touch LLM slips) and highest-risk (2–4 MB live blueprints); sequenced last, backstopped by the gate.

## Consequences

- Generation gains a gate + (eventually) a self-repair loop; `completed` becomes a *quality assertion*, not just "the pipeline finished."
- Some packages will spend longer in generation (repair loops) or land in `needs_review` — a deliberate trade of latency for never shipping a detectable defect.
- **Honest ceiling:** subtle quality no detector expresses (weak clue, flat character) still slips — the goal is "no *detectable* defect delivered," not "perfect." That still eliminates every class seen this session.
- New surfaces (gate, regenerator, constraints) to maintain; the auto-fix worker's role shrinks to backstop.

## Sequencing (execute in fresh, eval-gated passes — touches the generation core)

1. **`character_role` DB constraint** — ~1 day, permanent kill of the 502-as-role class. Start here.
2. **Extend the pre-completion gate to the content detector classes** (reuse ADR-0042 detectors; ensure no healer/promoter bypass, per ADR-0049's lesson).
3. **Child-content regenerator** — the keystone; then wire it into (a) the gate for repair-in-loop and (b) the ADR-0047 worker for the escalate classes.
4. **Make error-handlers / connector-write fix** — root-cause reliability, once 1–3 backstop it.

## Key Files

- `docs/adr/0049-prevent-structural-defects-at-completion.md`, `docs/adr/0050-normalize-generation-status-on-write.md` — the two shipped proofs of the pattern
- `docs/adr/0042-…`, `0047-…`, `0048-…` — the detection + auto-remediation layers that become the backstop and supply the gate's logic
- `supabase/migrations/*_prevent_structural_defects_at_completion.sql`, `*_normalize_generation_status_on_write.sql` — the gate + DB-guard templates
- generation pipeline: `mystery-webhook-trigger`, `saveStructuredPackageData`, Make scenarios 9061052 (child) / 9106101 (parent)
