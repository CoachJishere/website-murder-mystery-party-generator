# ADR-0077: Frontend hard quality guarantee — gate `needs_review` content until the self-heal window passes

- **Status:** Accepted
- **Date:** 2026-08-12
- **Builds on:** ADR-0053 (completion gate holds structurally/content-defective packages as `needs_review`), ADR-0058 (fixed `needs_review_at` trigger ordering so it's reliably stamped on hold), ADR-0061 (post-hold self-heal worker, ~5 min worst-case repair latency, 10-minute silent recovery window assumption), ADR-0065 (`notify-generation-issue`'s own self-heal grace gate, same window)
- **Related, not resolved by this ADR:** vault note `00_INBOX/gate-repair-in-loop-integration-2026-08-02-mystery-maker.md` (deferred follow-up from ADR-0061) — the synchronous repair-in-loop-at-completion-time integration is still un-built; this ADR only changes what the *frontend* shows during the existing post-hold window, not how fast a hold gets repaired

## Context

When the ADR-0053 completion gate holds a package as `needs_review`, the frontend today (`MysteryView.tsx`) reveals the mystery's tab content immediately — the reveal condition treats `completed` and `needs_review` identically, gated only on `characters.length > 0 && evidenceCards && detectiveScript`. A separate, narrower check (~10 minutes, `NEEDS_REVIEW_SILENT_WINDOW_MS`) controls only whether an amber warning banner shows above that already-revealed content. In other words: **the customer sees the package right away, warning or not** — the "silent window" only suppressed the warning, not the content itself.

That was a reasonable design when `needs_review` holds were rare and the self-heal worker's only guarantee was "repaired within 4 hours." ADR-0061 tightened that to a 5-minute-worst-case poll for three delegatable defect classes (`identity_contamination`, `slip_culprit_leak`, `template_artifact`/embedded `meta_text_leak`), comfortably inside the existing 10-minute window — but the frontend was never updated to actually rely on that guarantee. A customer opening their mystery in the first few minutes after a hold can currently see the exact defect the gate held it for (identity contamination bleeding into another character's script, a slipped culprit reveal, a raw template artifact) — the self-heal loop existing doesn't help if the content is shown before it runs.

Two things make this a natural time to close that gap:
1. **The repair latency the frontend would need to trust already exists and is bounded** (ADR-0061's 5-minute worst case, well inside the 10-minute window this ADR reuses).
2. **`needs_review_at` is now reliable.** ADR-0055 originally recorded it as `NULL` on the gate path due to a trigger-ordering bug; ADR-0058 fixed the ordering the same day. The frontend's existing `ts ? ... : Infinity` fallback already defensively treated a null timestamp as "past the window" rather than trusting it blindly — this ADR keeps that same defensive posture rather than assuming the ADR-0058 fix holds forever.

The task: make the frontend never show a customer defective content during the self-heal window, without touching any backend/edge-function/Supabase code, and without spending on any paid API (pure client-side gating logic + i18n copy).

## Decision

**Gate all holds, reveal after window — Option A.** Define, once, in `MysteryView.tsx`:

```ts
needsReviewWithinWindow =
  status === 'needs_review' &&
  needs_review_at != null &&
  (Date.now() - Date.parse(needs_review_at)) < NEEDS_REVIEW_SILENT_WINDOW_MS  // 10 min, unchanged
```

1. **Content gate.** While `needsReviewWithinWindow` is true, `MysteryPackageTabView` is not rendered — regardless of whether the underlying content fields are already present. Content reveals when: `completed` (trusted-clean per the ADR-0049/0053 gate guarantee — revealed immediately, no change), OR `needs_review` **past** the window (today's existing behavior: reveal + the existing amber warning banner), OR the pre-existing non-generation fallback branch (unchanged).
2. **Building screen.** `renderGenerationProgress()` now renders when `status === 'in_progress'` OR `needsReviewWithinWindow` (previously only the former, plus a `completed`-but-incomplete-content race-condition case that is unchanged).
3. **New 5th phase in `GenerationProgress.tsx` — "Final quality checks."** A new `finalizing?: boolean` prop, fed `needsReviewWithinWindow` from `MysteryView`. When phases 1–4 (setup/world/characters/evidence) are done and `finalizing` is true, phase 5 shows `active` and displayed progress is held in a narrow 95→98 band (eased over time, same simulated-creep mechanism the other phases already use) — never claiming 100 while a hold is still being worked. When phase 4 is done and `finalizing` is false, phase 5 resolves to `done` in the same render (no separate transition, no artificial delay) and progress shows 100.

**Edge cases, decided explicitly:**
- **`needs_review` with `needs_review_at == null`** (trigger didn't stamp it — shouldn't happen post-ADR-0058, but the frontend doesn't get to assume a backend invariant holds forever): `needsReviewWithinWindow` evaluates `false` for a null timestamp, so this reveals immediately with the existing warning banner rather than hiding the package forever. A customer is never trapped by a bookkeeping gap — the failure mode of a stricter "hide if `needs_review` regardless of timestamp" design would be exactly that: permanent, silent lockout with no operator visibility.
- **The 15–50 minute generation timeout** (`GENERATION_TIMEOUT_MS`, scaled by cast size per ADR-0043's follow-up — not a flat 15 minutes as an earlier note assumed) and its `generationTimedOut` UI state are untouched. That timer only starts for `in_progress` generation and is orthogonal to `needs_review` handling.
- **Missing-images-only holds** are `needs_review` too, and under this decision legitimately show the building screen (with phase 5 active) for up to the full 10-minute window even though a missing evidence image is a much lower-stakes defect than identity contamination. Accepted as the cost of one uniform, simple rule rather than a defect-class-aware gate the frontend has no reliable way to introspect (the client only sees `generation_status.status`, not which detector class triggered the hold).
- **A `needs_review` package whose content is fully clean and complete already** (all four phase-1–4 signals present) still gates for the full window if repaired early, rather than revealing the moment content looks complete. This is the actual meaning of "hard" in "hard quality guarantee": the frontend does not attempt to infer repair completion from field presence — the completion gate already tried to do exactly that and got it wrong (that's *why* the package is `needs_review`). Trusting field-presence as a second, weaker gate would reintroduce the same class of bug this ADR exists to close.

## Rationale

- **Reuses the existing 10-minute window and its already-defensive null-handling** rather than inventing a new timing primitive — the self-heal latency guarantee (ADR-0061) and the frontend's grace period (this ADR, ADR-0065) now actually agree with each other instead of the frontend silently ignoring the guarantee it was built to support.
- **Auto-bypass is structural, not a special case.** Phase 5 only ever activates when `finalizing` is true, and `finalizing` is only ever true for packages that actually pass through `needs_review` inside the window. A package that goes straight to `completed` never sets it — so the ordinary happy path needs zero extra branching to skip phase 5 correctly; it falls out of the same `phase4Done && !finalizing` check that already governs every other phase transition.
- **`completed` remains fully trusted, unconditionally.** This ADR only tightens the `needs_review` path; it does not add any new gate on `completed`, consistent with ADR-0049/0053's design that `completed` is the one status the frontend (and everything else) can take at face value.
- **Pure frontend, zero backend coupling.** No new Supabase/edge-function work, no new spend — the guarantee rides entirely on state the client already fetches (`generation_status.status`, `needs_review_at`).

## Alternatives Considered

1. **Gate by defect severity** (e.g., reveal immediately for `missing_images`-only holds, gate only for content-integrity classes like `identity_contamination`). Rejected: the frontend has no reliable signal for *which* detector class caused a given hold — `generation_status` doesn't carry that, and adding a new field/query to expose it would be a backend change, out of scope for a pure-frontend task. A uniform gate is simpler and the cost (missing-images holds gate needlessly) is small and time-bounded.
2. **Reveal as soon as content-completeness fields look present, even inside the window** (trust field presence as an early-exit signal). Rejected — see the last edge case above: this is exactly the inference the ADR-0053 completion gate already performs and got wrong for this package, so re-deriving "looks done" client-side from the same fields doesn't add real confidence, just a second, weaker copy of the same check the backend already failed.
3. **Hide `needs_review` packages indefinitely until `needs_review_at` is non-null and past-window** (no defensive out for the null case). Rejected: would convert a backend bookkeeping gap into a customer-facing permanent lockout with no path to recovery short of a manual DB fix — strictly worse than occasionally under-gating a package whose timestamp never got stamped.
4. **Shorten or lengthen the window specifically for the frontend gate**, decoupling it from `NEEDS_REVIEW_SILENT_WINDOW_MS`. Rejected: the whole point of this ADR is that the window already has a backend meaning (ADR-0061's repair-latency budget) — a second, frontend-only window would drift from that meaning over time and require remembering to keep two constants in sync.

## Consequences

- **Positive:** a customer can no longer open their mystery in the first ~10 minutes after a hold and see the literal defect (contaminated identity, slipped culprit, raw template artifact) the gate flagged — this was previously possible and is the core bug this ADR closes.
- **Positive:** the building screen now communicates something true and specific ("Final quality checks") instead of the customer either seeing broken content or an unexplained blank/generate-button state during a hold.
- **Neutral:** a package whose repair actually finishes in, say, 90 seconds still waits out the full ~10-minute window before revealing (see Decision's last edge case) — accepted tradeoff of "gate all holds" over "gate until repaired," since the frontend has no cheap way to observe "repair confirmed clean" separately from "window elapsed."
- **Neutral:** missing-images-only holds (lower severity) are gated identically to content-integrity holds for up to 10 minutes — accepted, see Decision.
- **Not addressed here:** the repair-in-loop-at-completion-time integration named in the deferred vault note (calling the regenerator synchronously *before* a package is ever set to `needs_review`) would shrink or eliminate the window a customer ever has to wait — orthogonal, backend-side, and explicitly out of scope for this frontend-only change.
- **Not addressed here:** no change to how the completion gate decides what to hold, how the self-heal worker repairs it, or the 10-minute constant's value — this ADR only changes what the frontend does with state it already has.

## Key files

- `src/pages/MysteryView.tsx` — `needsReviewWithinWindow` (computed once via `useMemo`, reused by the banner, the content-reveal gate, and the building-screen condition), reveal-gate change (~content-reveal JSX), building-screen condition, `finalizing` prop passed to `GenerationProgress`.
- `src/components/GenerationProgress.tsx` — new `finalChecks` phase (`phase5Done = phase4Done && !finalizing`), `FINALIZING_FLOOR`/`FINALIZING_SPAN` progress cap, monotonic-guard interaction (unchanged mechanism, extended to the new band).
- `src/i18n/locales/*.json` (all 13) — `generationProgress.phases.finalChecks.label` / `.description`.

## Discussion

The one judgment call worth naming: whether "gate all holds" (Option A, chosen) or "gate until confirmed repaired" was the right shape. The task brief decided Option A up front, but it's worth recording *why* that holds up: this codebase does not currently have a cheap, trustworthy "this specific package's hold was actually repaired" signal available to the client. `regenerate-child-content` does not flip `generation_status` back to `completed` after a successful repair (confirmed by reading `remediation_write_field` — it deliberately never touches `generation_status`, only remediable content fields) — a healed `needs_review` package stays `needs_review` forever, healed or not, until a human or a future backend change promotes it. So "gate until repaired" isn't actually available as a client-side check today; the only two real options were "gate for the full window, then trust the backend's own 10-minute assumption" or "don't gate at all" (today's bug). Given that, Option A is really the only implementable version of the hard guarantee without also shipping a backend change — consistent with this task's explicit pure-frontend scope.
