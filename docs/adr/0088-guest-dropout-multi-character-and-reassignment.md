# ADR-0088: "Recast" — Multi-Character Batching + Murderer/Accomplice Reassignment (staging only)

- **Status:** Proposed — staging-only, feature-flagged off, not deployed to prod. Full backend (migration, three edge functions rewritten/added) and frontend (mock preview + real components) built, typechecked, AND verified end-to-end against the local scratch Supabase stack, including a full Playwright walkthrough of the real (non-mock) UI (see Consequences).
- **Date:** 2026-08-15
- **Related:** `docs/adr/0036-guest-dropout-adaptation-feature.md`, `docs/adr/0082-guest-dropout-phase-b-implementation.md` (Phase B, which this supersedes for eligibility/UI — the underlying deterministic transform engine is unchanged and reused)

## Context

Phase B (ADR-0082) shipped a single-character removal flow restricted to non-essential characters (red herring, or suspect in a detective-style package) — murderer/accomplice were categorically blocked. Owner review, working from a real anecdote (a guest cancelling 30 minutes before a party started, with no spare guest to hand their character to), reshaped this substantially:

1. **Multi-select is the actual point, not an add-on.** A host may need to remove several characters in one sitting.
2. **Any character can be the one that's missing, including the murderer or accomplice.** The existing "reassign the link to a different attending guest" workaround (character access tokens are bearer credentials with no identity binding — `docs/adr/0031-short-code-guest-links.md`) only helps when there's a spare guest. When there isn't, removal needs to work for any role.
3. **The tab needed better framing.** With one feature filling the whole "Extras" tab body, it read as sparse. Renamed the feature itself to **"Recast"** (a real product name, covering both removal and reassignment) and restructured the tab as a small, growing catalog.
4. **Pricing simplified to flat-per-submission.** Originally per-character; owner corrected this — it's $5 per submission regardless of how many characters are included.
5. **Processing time was understated.** A batch, especially one with a reassignment, can take several minutes, not seconds — the UI needed to become explicitly non-blocking, with an email fallback for hosts who close the tab.

## Decision

### Character-style eligibility loosened — any character, no role restriction

Confirmed via `docs/generation-guardrails.md` G8: *"the culprit is drawn at the table, so NO character is guilty in advance... every suspect must be equally plausible."* No character's stored content is guilt-specific in `mystery_style='character'` packages — Phase B's restriction to explicit `redHerring` there was protecting against a risk (an untagged row secretly being guilt-branch material) that doesn't exist for this style. The remaining owner concern — other characters' `rumors`/`secret` content mentioning the missing character — is already handled by the existing deterministic scrub, which doesn't differentiate by `mystery_style`.

**Owner judgment, kept separate from eligibility:** for character-style packages, this paid service is usually unnecessary — a spoken line ("X is also a suspect, but we're interviewing them separately") makes leftover rumors moot for free. Not a hard block — the explainer step surfaces this as a nudge before the picker, but hosts can still pay if they'd rather have it handled for them.

### Detective-style murderer/accomplice: now eligible, via reassignment

No canonical "solution" field exists anywhere in the schema (confirmed by exhaustive grep) — guilt is expressed only via `character_role='murderer'` on one row plus prose generated around that fact at generation time: role-conditioned `round2_script`/`round3_script`/`round4_script`, a `final_statement` that's structurally a confession, `detective_script`'s "## THE REVEAL" section, and evidence cards' host-only significance notes. Removing the murderer/accomplice without addressing this leaves a mystery with no resolution.

**Scope, deliberately bounded** (confirmed explicitly with the owner before building): on the promoted character — `character_role`, `round2_script`/`round3_script`/`round4_script`, `final_statement`, `secret`/`background` (adjusted, not replaced). On the package — `detective_script`'s reveal section and evidence cards' host-only significance, both renamed. Nothing else changes. This is a real content-generation task, not mechanical substitution, but it's scoped closer to a targeted rewrite than a regeneration.

**Selection:** host picks the replacement in the picker (inline dropdown appears when a murderer/accomplice checkbox is checked), or leaves it to "let us choose" — the same LLM call that writes the new content also picks the best-fit candidate in that case, since it already needs full-cast context to write coherently. No separate scoring/ranking step exists or was built.

**Honesty commitment:** unlike a plain removal (mechanically verifiable — zero leftover name references, deterministic), there's no equivalent mechanical check for "this reads as a convincing confession." Every reassignment row sets `host_review_recommended: true` in `transform_result` regardless of whether its mechanical checks pass, surfaced explicitly on the success page and in the completion email — never given the same silent full-confidence treatment a plain removal gets.

### Multi-character batching: `batch_id`/`batch_sequence` + chain-dispatch + package claim

A purchase now creates N `mystery_adaptations` rows sharing one `batch_id` (even N=1 — no special-cased solo path), covered by one Stripe Checkout Session.

Tracing what happens if N rows for the same package were dispatched concurrently found a real lost-update race: `conversations.player_count` is a blind read-modify-write, and two removed characters both mentioned in a third character's `rumors` field would silently clobber each other's edit while both legitimately report `'verified'` — a race-condition sibling of the `evidence_cards` shape bug Phase B already caught and fixed once. Two mechanisms prevent this:

1. **Chain-dispatch.** `adapt-mystery-apply` fires only `batch_sequence=0` from the webhook; each invocation, on completion (verified, rolled_back, *or* failed — an ordinary thrown error is far more likely in practice than a hard crash, given ~15 existing `if (err) throw` guards feeding one catch block), dispatches the next `batch_sequence` itself. Strictly sequential by construction. Implemented via a single `finally` block wrapping the whole handler — not scattered per-branch calls — so no future exit path can silently forget to chain forward.
2. **Package-scoped claim.** Chain-dispatch alone only serializes *within* one `batch_id`, not across two different batches racing the same `package_id`. `claim_package_for_adaptation`/`release_package_adaptation_claim` (new migration `20260814_mystery_adaptations_batching.sql`) mirror `claim_package_for_remediation`/`release_package_remediation_claim` (`20260802_wire_child_content_regenerator.sql`) exactly, including that migration's own reasoning for why a bare `pg_advisory_lock` doesn't work here (PostgREST calls are one-shot per statement, no persistent session to hold a session-scoped lock across the several calls one invocation makes). If the claim can't be acquired, the row reverts to `'paid'` (not `'failed'`, staying retryable) and does *not* chain forward — dispatching the next character would skip this one.

The row-level claim was also broadened to reclaim a dead `'processing'` row past a TTL (a prior invocation crashed after claiming but before finishing) — no schema change needed, `processing_started_at` already existed.

**Sibling-batch exclusion:** a character still targeted by a non-terminal sibling row in the same batch is excluded from the substitute-name pool and the "other characters to scan" set — not a correctness requirement (that sibling's own later pass would re-scrub whatever this pass writes into their fields), just avoids a wasted polish call and a confusing X→Y→Y's-own-replacement substitution chain.

### Pricing: flat $5 per submission, not per character

Originally designed as $5 × N characters. Corrected after walking through the actual scope of a reassignment with the owner — it turned out to be bounded (roughly 7 fields on one character plus 2 package-level sections, not a regeneration), and the owner's judgment was that this doesn't warrant per-character or per-role pricing. One Stripe Checkout Session, one line item, flat `$5` regardless of how many characters or whether a reassignment is included.

### Non-blocking processing + completion email

A batch can now realistically take several minutes — longer with a reassignment (a much bigger generation than the existing polish pass) — chained sequentially per character for safety, not run in parallel. Freezing the UI for that long, during a moment that's already stressful (day-of, guest just cancelled), is the wrong call.

**Design:** in the real flow, confirming in `GuestDropoutPanel`'s dialog creates the adaptation batch and redirects to Stripe — processing genuinely happens after a hard page navigation, not inside that dialog. `AdaptationSuccess.tsx` (the real post-payment landing page) is where the wait happens: honest timing copy, a live per-character checklist while polling, and an explicit "go to your mystery now" path rather than a trapped spinner. Hosts who stay in-app and navigate to `/mystery/:id` see the change land via the realtime `mystery_characters` subscription already wired there (no new code needed). Hosts who close the tab get **a new completion email** (`send-adaptation-complete-email`, modeled on `send-host-email`'s branding/Resend pattern but **English-only for this slice**, matching this feature's existing i18n-deferred scope) — fired exactly once per batch, from the same `finally` block that handles chain-dispatch, at the moment it observes zero non-terminal rows remaining for that `batch_id` (chain-dispatch's strict sequencing guarantees only one invocation ever observes that first).

**Stuck-row client nudge** (staging-scope safety net, not the correctness mechanism): `AdaptationSuccess.tsx`'s polling loop re-POSTs `adapt-mystery-apply` for a row stuck in `'paid'` whose *predecessor* is already terminal — gated on the predecessor's real status, not a wall-clock timer, since a timer risks nudging a row whose predecessor is simply still legitimately mid-flight (real reassignment-call latency is unmeasured), which would dispatch two invocations concurrently and reintroduce the exact race this whole design exists to prevent. Safe to call redundantly — the row-level claim is an idempotent atomic conditional UPDATE.

### Naming and tab framing

Renamed from the bare scenario description "a guest can't make it" to **"Recast"** — a real product name (casting/theater vocabulary, fits a murder-mystery game, covers both removal and reassignment) with the scenario kept as supporting hook text, not the headline. The "Extras" tab now shows a section intro line ("More ways to shape your mystery — this grows over time") and a muted "Coming soon" placeholder card for the ADR-0078 hosting-tips video (already designed, not yet built) — not a fabricated promise, a real planned second citizen — so the tab reads as a small, growing catalog rather than one lonely utility.

## Data model

`supabase/migrations/20260814_mystery_adaptations_batching.sql`: `mystery_adaptations` gains `batch_id uuid NOT NULL`, `batch_sequence int NOT NULL`, `requested_replacement_character_id uuid` (nullable — the host's chosen replacement, captured at create-time since `adapt-mystery-apply` is only ever invoked with an `adaptation_id`, never re-passed the original request). `mystery_packages` gains `adaptation_claimed_at timestamptz` plus the claim/release RPC pair. Reassignment *outcome* detail (who was promoted, host-selected vs. auto) lives in the existing `transform_result jsonb` column, not a new one — consistent with this table's "no separate log table, the row is its own audit trail" design.

## Consequences

**Verified end-to-end against the local scratch Supabase stack (reused from Phase B, migration applied, edge functions synced and re-served):**
- **Regression**: a plain single-character removal still works via the new batch-of-1 code path — zero leftover references, `player_count` -1, package claim cleanly released.
- **Multi-character batching**: a 2-character batch, only `batch_sequence=0` triggered manually — chain-dispatch automatically fired `batch_sequence=1` with no further intervention; `processing_started_at` timestamps confirmed strictly sequential (not concurrent) execution; `player_count` decremented by exactly 2; zero leftover references to either removed character; the completion-email dispatch fired automatically the moment the batch reached all-terminal, and skipped cleanly (logged, no crash) with `RESEND_API_KEY` unset.
- **Package-claim contention**: manually held `adaptation_claimed_at`, confirmed a concurrent `adapt-mystery-apply` call reverts cleanly to `'paid'` (outcome `'deferred'`) without chaining forward; confirmed a retry succeeds normally once the claim is released.
- **Mid-chain failure**: forced `batch_sequence=0` to fail (deleted its target character out from under it) — confirmed it ends `'failed'` with a clear message, AND `batch_sequence=1` still chain-dispatched and completed to `'verified'` — the batch does not get orphaned by one character's failure.
- **Reassignment fail-closed**: requested murderer reassignment with no `ANTHROPIC_API_KEY` configured (matching this session's real environment) — confirmed it fails cleanly (`'failed'` status, clear error message, zero DB writes — the throw happens before the deferred write step) rather than silently succeeding with missing content.
- **Verify-failure rollback**: engineered a post-write verify failure independent of the new create-time guard — confirmed byte-for-byte restoration (diffed before/after) and correct `'rolled_back'` status.
- **Full live UI walkthrough** (Playwright, screenshots, signed in as a local test user — not the production-touching sign-up flow that caused Phase B's incident): real Extras tab renders the Recast card + "Coming soon" hosting-tips placeholder exactly as designed; opening Recast shows the real character roster from the database; selecting the murderer correctly reveals the replacement dropdown; the headcount cap correctly disables further selection at the floor; submitting correctly creates the adaptation row (confirmed via direct DB query) and shows the staging no-checkout toast.

**One real bug found and fixed during this verification pass:** the "always expect exactly 1 murderer post-removal" invariant (added for reassignment) initially ran unconditionally and incorrectly rolled back a perfectly valid character-style removal — character-style packages legitimately have `character_role=NULL` on every row (no predetermined culprit), so `murdererCount` is always 0 there, before and after any removal. The check now only applies when `mystery_style !== 'character'`. Caught because a real character-style removal was actually exercised against a live stack rather than only reasoned about — exactly the kind of gap this verification step exists to catch (the same category of finding as the `evidence_cards` shape bug caught during Phase B).

**Not yet exercised — no live keys used anywhere in this session, per standing constraint:** the reassignment call's actual output quality (structurally verified to fail closed correctly; never actually generated content, since no Anthropic key exists in this environment), real Stripe checkout, and the completion email actually sending (confirmed it *attempts* to send and skips gracefully without a key — never confirmed a real Resend delivery).

**What Phase B already established and still holds:** the deterministic scrub engine, the accept-or-revert invariant, the two hardcoded-Supabase-client local-testing gotcha (see `hardcoded-supabase-client-blocks-local-testing-2026-08-13-mystery-maker` vault note), and the broader `supabase/migrations/` drift — none of that changed here.

**New, not yet measured:** real token cost and latency for the reassignment call (`REASSIGN_CALL_COST_USD_ESTIMATE = 0.35` is a rough guess, not measured against a real key, same caveat Phase B's polish-pass estimate carried) — no Anthropic key has been used anywhere in this feature yet.

**Resolved during this session's review:** `EdgeRuntime.waitUntil()` was flagged as worth verifying — confirmed real and necessary (Supabase docs: without it, a fire-and-forget call after a response is returned has no guarantee the isolate survives long enough to complete). All three fire-and-forget dispatch points (stripe-webhook → adapt-mystery-apply, adapt-mystery-apply's chain-dispatch to itself, adapt-mystery-apply → send-adaptation-complete-email) now route through a small `fireAndForget()` helper that uses it when available. Checked defensively at runtime rather than declared as a TS ambient type, since this project's pinned local edge-runtime (v1.74.3) predates it — falls back to the previous plain-fetch behavior when absent, verified via a live regression test against the local stack (identical outcome with/without the wrapper).

**Explicitly deferred / accepted gaps** (see the design conversation for full reasoning):
- A `pg_cron`-based stuck-batch sweep (mirroring `sweep_stuck_needs_review_packages`) — not built; this repo requires explicit owner sign-off before enabling any cron touching paid packages or unattended spend (`20260729_schedule_auto_remediate_packages.sql`). TTL-reclaim + the client nudge cover the staging-scope need.
- Cross-feature coordination between `adapt-mystery-apply` and `auto-remediate-packages`/`regenerate-child-content` racing the same package — real, pre-existing (at N=1 too), not introduced or fixed here.
- Partial-write recovery when an ordinary exception fires after writes but before verify — pre-existing gap in the function inherited from Phase B, not fixed here.
- Candidate-scoring for auto-select reassignment beyond what the single rewrite call itself judges — worth revisiting once there's real usage to learn from.

**To promote past staging:** everything Phase B's own "to promote" list already required, plus: run the full verification pass below against a real key for both the polish and reassignment calls, and get a second read on reassignment output quality (there is no automated check for narrative coherence — a human needs to look at a handful of real outputs before this ships).

**Two tangential findings from this session's research, not fixed here:** `regenerate-child-content`'s `final_statement` schema predates ADR-0070's accomplice-confession fix; one research subagent encountered and correctly resisted a prompt-injection attempt embedded in a tool result. Both recorded in `00_INBOX/adaptation-rework-tangential-findings-2026-08-15-mystery-maker.md`.

## Key files

- `supabase/migrations/20260814_mystery_adaptations_batching.sql`
- `supabase/functions/adapt-mystery-create/index.ts`, `adapt-mystery-apply/index.ts` (both substantially rewritten), `send-adaptation-complete-email/index.ts` (new)
- `supabase/functions/stripe-webhook/index.ts` (adaptation branch, prefix changed to `adaptation-batch:`)
- `src/components/GuestDropoutPanel.tsx`, `src/services/adaptationService.ts`, `src/pages/AdaptationSuccess.tsx`
- `src/pages/GuestDropoutPreview.tsx` (mock preview, iterated through owner review before the real build)
- `src/i18n/locales/en.json` (`adaptation.*`, fully restructured)
- Reference/reuse: `supabase/migrations/20260802_wire_child_content_regenerator.sql` (claim/release pattern), `docs/adr/0031-short-code-guest-links.md` (bearer-credential citation), `docs/generation-guardrails.md` G8, `supabase/functions/send-host-email/index.ts` (email template pattern)
