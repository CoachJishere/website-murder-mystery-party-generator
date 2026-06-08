# ADR-0016: Detect Missing Evidence-Card Images via a Read-Only Backlog, Decoupled from `needs_review`

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

Evidence-card forensic images live in `mystery_packages.evidence_card_images` (jsonb `{round2, round3, round4}`) pointing to the public `evidence-images/<package_id>/roundN.png` storage bucket. They are generated inside the Make.com parent scenario, and `store-evidence-images` upserts them in a **single batch after all image generations finish**. A single Imagen HTTP call exceeding the 40s default timeout (`DataError: timeout of 40000ms exceeded`) aborts the route before the upsert runs, so `evidence_card_images` ends up `NULL` even though `generation_status = completed`. This was first root-caused on 2026-06-04 ("Bigby Wolf", CHANGELOG), where a 120s-timeout blueprint was prepared for manual import.

On 2026-06-08 two more paid customers were found with the same gap — "Aloha Means Goodbye: Tiki Torch" (conv `d2344141…`) and "The Curse of Thornwood Manor" (conv `bbe362d7…`) — and both were recovered manually (regenerate via Imagen 4 + upload through `store-evidence-images`). A blast-radius scan of all 83 completed packages showed the failure is **rare**: the evidence-image feature went live ~April 2026; post-launch only those two packages were ever affected (the ~40 older no-image packages predate the feature and are not failures).

The investigation surfaced a **monitoring bug**, not just a Make bug:

- `sweep_incomplete_packages()` (pg_cron, every 2 min) **already** flags `evidence_card_images IS NULL` as `needs_review` and emails support via `notify-generation-issue`.
- But `heal_completed_packages()` (also every 2 min) resets `needs_review → completed` based **only** on character `description` + `character_role`, **ignoring `evidence_card_images`**. So an image-only gap is healed away within one cycle.
- The sweep also only looks back 24h, so anything missed is never re-flagged.

Net effect: an image-only failure surfaces as a **single, easy-to-miss support email** and then reads `completed` forever — exactly why the Tiki Torch case looked fine on inspection (`status = completed`, `needs_review_at = NULL`) despite having no images, and why it had to be found by hand.

## Decision

Add a read-only SQL detector, `public.list_packages_missing_evidence_images(_since timestamptz DEFAULT '2026-04-01')` ([migration](../../supabase/migrations/20260608_detect_missing_evidence_images.sql)), that returns every paid+completed package whose `evidence_cards` text contains round cards but whose `evidence_card_images` is NULL/partial — listing the specific `missing_rounds`. It mutates no state and has no 24h window, so image-only gaps are discoverable **on demand** (or by a GitHub Action writing to a tracked file) instead of by chance. `_since` defaults to the 2026-04-01 feature launch so pre-feature packages (legitimately image-less) are excluded; pass an earlier timestamp to include them.

We deliberately **do not** make `heal_completed_packages()` keep image-only gaps in `needs_review`. Nothing auto-regenerates images (only characters self-heal via the child-webhook retry), so that would pin the customer-facing "We're Finalizing Your Mystery" warning **forever** on an otherwise-complete, fully-usable mystery. The single support email on first detection is retained; the customer is never blocked by a missing illustration.

The durable root-cause fix lives on the Make.com side and is **deferred** to a separate scenario redesign (see Discussion + vault note `00_INBOX/make-image-scenario-redesign-2026-06-08-mystery-maker.md`).

## Rationale

- **Behaviour-preserving for customers.** No status mutation, no new warning, no UX regression. Purely additive observability.
- **Reliable, not chance-based.** Replaces "one email within 24h that heal then buries" with a queryable backlog covering all history.
- **Matches the user's stated monitoring preference** ([feedback: scheduled routines don't ping the user]): durable pull-style state (tracked file / on-demand query) over ephemeral notifications that don't resurface.
- **Forward-compatible with auto-recovery.** Returns `conversation_id` + `missing_rounds`, the exact inputs a future image re-trigger (once images are their own Make scenario) would consume — the same self-healing pattern already used for empty characters.
- **Low risk, fully reversible.** One `CREATE FUNCTION`; drop to revert.

## Alternatives Considered

1. **Make `heal_completed_packages()` respect `evidence_card_images`.** Rejected: with no image auto-recovery, this pins the customer-facing "finalizing" warning indefinitely and re-notifies support every 6h, for a mystery that is otherwise complete and usable. Wrong UX, wrong signal.
2. **Add the check to `sweep`/`notify-generation-issue` only.** Rejected as the sole fix: the sweep already does the NULL check; the real gaps are heal undoing it and the 24h window. A notification-only path stays ephemeral and easy to miss — the problem we are solving.
3. **A plain view instead of a SECURITY DEFINER function.** Rejected: a view over `mystery_packages` is subject to the caller's RLS; a `SECURITY DEFINER` function (matching the existing sweep/heal pattern) gives admin/service-role callers a consistent backlog and a clean parameter for the launch-date floor.
4. **Backfill the 40 pre-feature historical packages too.** Rejected as default behaviour: those customers were never promised images. The `_since` parameter leaves the option open without polluting the active backlog.
5. **Redesign the Make image flow now (separate scenario + incremental save + 120s timeout).** Right durable fix, but external to this repo and a larger change; deferred and specced separately so this low-risk detector can ship immediately.

## Consequences

- A one-query backlog (`SELECT * FROM list_packages_missing_evidence_images();`) is available anytime; today it returns **0** (both 2026 failures recovered). `list_packages_missing_evidence_images('2000-01-01')` returns the 40 pre-feature packages if historical backfill is ever wanted.
- The detector is **detection only** — it does not fix or re-trigger anything. Until the Make redesign lands, recovery remains the manual Imagen-4 + `store-evidence-images` flow ([recovery playbook](../../CHANGELOG.md)).
- The root cause (batch-save-after-all-images + 40s timeout) is **still live in Make** until the redesign is imported. The 2026-06-04 120s-timeout blueprint reduces frequency but does not eliminate the batch-abort failure mode.
- Recommended next step (separate scenario) would let the sweep/a healer **auto-re-trigger** image generation, closing the loop and retiring manual recovery.

## Discussion

**The key realization** was that detection already existed but was being silently undone: the sweep correctly flagged the Tiki Torch package and emailed support (`last_notified_at` ~27 min post-generation), then `heal` reset it to `completed` because the characters were fine. So the fix was not "add a check" (it's there) but "make the signal durable and stop coupling it to a flag that heal clears." Decoupling into a read-only backlog resolves this without the UX cost of keeping a usable mystery in `needs_review`.

**On the separate-image-scenario idea (raised by the user):** splitting image generation into its own Make scenario — mirroring the per-character child scenarios — is the right architecture, but the split alone does **not** fix the data loss. The main package content already saves before images today, so isolation isn't the win. The load-bearing change is **saving each image as it completes** (incremental upsert; `store-evidence-images` already tolerates partial sets) plus **error-tolerant modules** and a **raised timeout (120s)**, so one round's timeout can't lose the others. The genuine prizes the split unlocks are (a) an independent retry hook the monitoring sweep can fire to **auto-recover images** — the same proven pattern used for empty characters — and (b) image-specific error handling and timeout without touching the rest of the pipeline. Build target captured in the vault note.

**Scope:** kept this ADR to the in-repo, low-risk, behaviour-preserving detector. The Make redesign is a separate decision with external implementation and its own testing surface; bundling it here would inflate review and couple a 60-second migration to a multi-step Make change.

## Key Files

- [supabase/migrations/20260608_detect_missing_evidence_images.sql](../../supabase/migrations/20260608_detect_missing_evidence_images.sql) — the detector function
- `supabase/functions/store-evidence-images/index.ts` — upload/merge function used by both Make and manual recovery (tolerates partial sets)
- `sweep_incomplete_packages()` / `heal_completed_packages()` — existing monitoring sweep + healer (unchanged; the heal/sweep interaction is the bug context)
- Vault: `00_INBOX/make-image-scenario-redesign-2026-06-08-mystery-maker.md` — deferred Make redesign spec
