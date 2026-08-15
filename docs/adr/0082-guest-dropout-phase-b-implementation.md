# ADR-0082: Guest-Dropout Adaptation — Phase B Implementation (staging only)

- **Status:** Proposed — staging-only, feature-flagged off, not deployed to prod. Backend (edge functions, including a Claude Sonnet 5 prose-smoothing pass) AND frontend UI both verified end-to-end against a local scratch stack, including two real browser walkthroughs (see Consequences). Stripe TEST-mode checkout not live-wired; the Sonnet 5 call itself not live-tested (no Stripe API access and no Anthropic key in the build session, respectively).
- **Date:** 2026-08-13
- **Related:** `docs/adr/0036-guest-dropout-adaptation-feature.md` (the feature spec this implements Phase B of), `00_INBOX/whispers-from-the-void-remove-pemberton-2026-07-18-mystery-maker.md` (the manual precedent this automates)

## Context

ADR-0036 scoped a paid "a guest can't make it" adaptation feature in four phases. This ADR covers the concrete implementation decisions made while building **Phase B only** (paid surgical removal of a non-essential character), on a fresh, cold-context pickup of that spec. Several decisions and findings surfaced during the build that aren't in ADR-0036 and are recorded here rather than left only in session history.

## Decision

### Eligibility gating is narrower than ADR-0036's role table alone implies

ADR-0036's gating table says "red herring / spare suspect → paid surgical removal." That's only safe for `mystery_style='detective'` packages. In `mystery_style='character'` (slip-mechanic) packages, `character_role` is legitimately `NULL` on most/all rows by design — the culprit is drawn by physical slip at the table, not predetermined (see `docs/generation-guardrails.md` G8 and the coercion comment in `supabase/migrations/20260801_normalize_character_role_on_write.sql`). An untagged `'suspect'`/`NULL` row in a slip package could be real guilt-branch material.

**Rule implemented (`adapt-mystery-create`):** eligible iff `character_role = 'redHerring'`, OR (`character_role = 'suspect'` AND `mystery_style = 'detective'`). Murderer/accomplice always rejected. The victim is never offered at all — it isn't a `mystery_characters` row (confirmed via `20260802_detect_victim_is_playable_character.sql`; the victim is name-matched in prose only), so the ADR's "victim: blocked" gate is structurally automatic, not code.

### Data model: `mystery_adaptations`

New table (`supabase/migrations/20260813_mystery_adaptations.sql`), styled after `acknowledged_health_alerts`: one row per removal request, `pending → paid → processing → verified/failed/rolled_back`, holding a full pre-edit snapshot for rollback. It is its own audit trail (no separate log table). RLS is service-role-only for writes, plus one narrow SELECT policy (`conversation_id` ownership via `auth.uid()`, wrapped per the existing `(select auth.uid())` performance convention) so the frontend's success/polling page can read its own adaptation's status directly.

### Transform algorithm

Two edge functions: `adapt-mystery-create` (validates eligibility, opens a Stripe Checkout Session) and `adapt-mystery-apply` (snapshot → scan/transform → delete rows → verify → accept-or-revert), reusing the accept-or-revert invariant already proven in `auto-remediate-packages`'s `runGatedAttempt()` / `regenerate-child-content`'s `revertAll()` — re-implemented, not shared, because this unit of repair also deletes rows, which neither existing helper does.

Fields are split into two transform classes, matching what the manual Pemberton precedent actually did by hand:
- **LIST fields** (`rumors`, `round2-4_questions`, `relationships`) — each mention lives in its own blank-line-separated block; the whole block is dropped.
- **PROSE fields** (backgrounds, scripts, secrets, and every `_pointform` twin) — every mention is substituted with a present guest's name, chosen via a deterministic hash of `(package_id, removed_character_id, source_character_id, field_name)` mod remaining-cast size (excluding the murderer). This gives per-line variety, matching the manual edit's own varied substitutions, without a real LLM or true randomness.

`detective_script` gets a substitution pass plus an unconditional appended "absent, cleared" note that deliberately names the removed character once — mirroring the precedent's own host-facing acknowledgment. The verify step's leftover-reference scan strips exactly that known templated suffix before checking, rather than either (a) blanket-failing on the one intentional mention, or (b) genericizing the note to avoid the check.

`conversations.player_count` is decremented by 1 — not called out in ADR-0036 or the manual precedent, but required: `HostGuideTemplate.tsx` renders the "cut N slips" instruction live from that column, not from stored text.

**Bug found and fixed during verification:** `evidence_cards` is a jsonb **array** holding one markdown string (`["## EVIDENCE...']`), not a jsonb-wrapped string like `relationships`/`host_guide`. The first implementation assumed the wrapped-string shape (matching `remediation_read_field`'s pattern for other package jsonb fields) and silently skipped it in both the transform *and* the verify scan — a real gap in the "zero leftover references" guarantee that a first full local test caught (the removed character's name survived, untouched, in evidence_cards, and verify still reported `outcome: "verified"`). Fixed: the transform now handles the array-of-string shape explicitly, and the verify scan stringifies whatever shape a jsonb field actually holds rather than assuming a specific one, so this class of bug can't recur silently for any jsonb field.

**MIN_REMAINING_CHARACTERS = 4** is invented for this slice (no existing constant governs a minimum viable real-package headcount) — needs explicit product sign-off before this ships past staging.

### Prose-smoothing pass: wired, using Claude Sonnet 5 (owner decision, post-review)

The original build brief explicitly stubbed the AI step (deterministic transforms only, no LLM). Owner review pushed back: the $5 price is meant to buy an AI-assisted result, and a purely mechanical substitution ("find Ashworth, replace with Priya Shah") isn't that — the deterministic pass is necessary infrastructure (it must stay reliable regardless of AI availability) but isn't sufficient on its own. Owner explicitly requested Claude Sonnet 5 specifically, matching the model the rest of this pipeline was upgraded to (ADR-0074's blanket Haiku→Sonnet 5 move), not the Haiku 4.5 baseline `regenerate-child-content`/`auto-remediate-packages` use for their own field-rewrite calls.

**Integration point:** `polishWithClaude()` in `adapt-mystery-apply/index.ts` runs AFTER the deterministic transform computes every field's substituted value, and BEFORE any DB write. This required refactoring character writes (previously immediate, per-character, inside the transform loop) into a deferred batch alongside the package writes, so the polish step has a chance to replace `.after` values first. Its output goes through the **exact same verify-or-revert gate** as the deterministic pass — no new trust boundary; a bad LLM response is caught and rolled back exactly like a deterministic bug would be.

**Request shape:** one call per removal (not per field), given every touched field's original + deterministically-substituted text, asking Sonnet 5 to smooth only what reads awkwardly and flag anything it can't confidently fix into the same `needs_review` mechanism the deterministic pass already uses. `output_config.format` (structured outputs, `json_schema`) constrains the response instead of the parse-then-repair pattern `regenerate-child-content` needs — see project memory on Sonnet 5 occasionally emitting raw unescaped newlines in free-form JSON; a schema-constrained response sidesteps that class of bug rather than adding a repair regex for it. `thinking: {type: "disabled"}` (bounded rewrite task, no tools) with `effort: "medium"` — allowed since disabling thinking requires effort ≤ `high`. No `temperature`/`top_p`/`top_k`: Sonnet 5 rejects non-default sampling params outright (400).

**Cost:** flat per-call estimate of $0.05 (Sonnet 5 introductory pricing, $2/$10 per MTok through 2026-08-31, one call touching ~10-15 short fields) — logged into `transform_result.llm_polish.cost_usd_estimate` per request. Comfortably inside the $5 price with wide margin, consistent with ADR-0036's own cost estimate for harder tiers.

**Fails open, not closed:** if `ANTHROPIC_API_KEY` is unset, or the call errors, or the model refuses, the removal proceeds on the deterministic-only result — logged in `needs_review`, never blocking the removal. The polish pass is a quality enhancement layered on a mechanism that must work without it.

**Not live-tested:** no Anthropic API key was available in the build session (checked — not in the shell env). The no-key fallback path (skip cleanly, `llm_fields_polished: 0`) is verified via curl; the actual Sonnet 5 call is verified only by code review against the current API skill reference. Needs a real key before this can be called done.

### Flow architecture: pick-then-pay, not a pay-first credit model (owner asked for a pros/cons comparison)

Owner's initial description matched a **pay-first credit model**: a generic "Purchase Edit" button → Stripe → button unlocks on return → pick character(s) in a lightbox → generate. Asked to compare against **pick-then-pay** (what was already built) from the customer's point of view before committing to a rebuild.

**Pay-first pros:** simpler Stripe product (no per-character context needed at checkout); naturally supports banking multiple credits.
**Pay-first cons (decisive):** a host can pay $5, return, open the picker, and *then* discover the character they needed removed was the murderer/accomplice — ineligible. They're left holding a credit that doesn't fix their actual problem, the worst possible moment for that discovery. Also more round-trips (pay → wait for redirect → notice unlocked → pick → generate → confirm) at exactly the moment — day-of, guest already canceled per the owner's own framing — when speed matters most.
**Pick-then-pay pros:** eligibility (including the murderer/accomplice gate) is shown for free, before any payment — the stranded-purchase scenario above structurally can't happen. Fewer steps. Matches ADR-0036's own drafted customer-email copy, which frames this as reactive ("if a guest cancels... we offer a quick paid fix"), not something bought in advance.

**Decision: kept pick-then-pay.** The UX polish from the owner's description — a focused, lightbox-style interaction for the pick → confirm → generate sequence, rather than the roster inline in the tab body — was real and worth keeping; see the next section. Only the payment ordering was reconsidered and kept as originally built.

### Entry point: dedicated "Extras" tab, lightbox interaction, pick-then-pay (owner decisions, two rounds of review)

First round: moved from a button + modal inside the Characters tab to its own dedicated tab (more discoverable as a real paid action; room for Phase C/D re-solve tiers later). Second round: owner described a lightbox-style interaction for the actual pick/confirm/generate sequence, and "Extras" as the tab name over "Manage". Final shape combines both rounds: the **tab** solves discoverability, a **lightbox** (Shadcn `Dialog`, opened from a single "A guest can't make it?" CTA inside the tab) solves focused-task UX for the interaction itself. `MysteryPackageTabView.tsx`'s `TabsList` grid (`grid-cols-2 md:grid-cols-4`, built for exactly 4 tabs) is conditionally `md:grid-cols-5` when the flag is on. `GuestDropoutPanel.tsx` renders the tab-level teaser + CTA, and wraps the picker/confirm views in a `Dialog` that resets to the picker every time it's reopened.

### Stripe: Checkout Sessions API, not the client-built Payment Link pattern

`MysteryPurchase.tsx`'s existing flow builds a `buy.stripe.com` URL client-side. This feature instead has `adapt-mystery-create` create a server-side Checkout Session with inline `price_data` (no pre-created Stripe product needed) and a `client_reference_id` prefixed `"adaptation:"`. `stripe-webhook/index.ts` gets one additive branch, checked before the existing conversation-lookup logic, that routes prefixed ids to `adapt-mystery-apply` (fire-and-forget) and `break`s — every line of the existing purchase path is unchanged for any non-prefixed id. A prefixed, server-controlled value is strictly safer against ever colliding with a bare `conversations.id` than extending the client-built pattern would have been.

**Local verification surfaced an edge-runtime compatibility issue, not a code defect:** `?target=deno` on the `esm.sh/stripe` import (the same specifier `stripe-webhook/index.ts` already uses in production) triggers a `brotli` module-graph boot error against the locally-pulled `supabase/edge-runtime:v1.74.3` image. Switched to `?target=denonext` for this new function only — verified working locally, and it's also the more current esm.sh target for recent Deno versions. `stripe-webhook/index.ts` itself was left untouched (proven working in production; not this session's to fix).

### Feature flag

`VITE_ENABLE_GUEST_DROPOUT_ADAPTATION` (frontend, checked once in `MysteryPackageTabView.tsx`) and `ENABLE_GUEST_DROPOUT_ADAPTATION` (both edge functions, 404 if unset) — unset in prod, matching the existing `VITE_COLD_CASE_PAYMENT_LINK` off-by-default pattern in `ColdCaseFiles.tsx`. The edge-function-side check exists so a direct curl against a deployed-but-unflagged prod function can't bypass the frontend's visibility gate.

### Existing contradictory copy

`MysteryPackageTabView.tsx` (~L920) told every host "the number of suspects is fixed for this mystery — adding or removing a character means regenerating." Updated (behind the flag) so the tab notice doesn't sit next to a sentence saying it's impossible.

### Irreversible-action confirmation step (owner-requested)

Picking an eligible character no longer goes straight to checkout. Inside the lightbox, picking a character shows a confirmation view ("This can't be undone...") with Cancel/Confirm, and only Confirm calls `createAdaptation`. Component state (`confirmingCharacter`) within the same `Dialog`, not a second modal stacked on top.

## Consequences

**What's verified (staging, local scratch Supabase stack, not the linked project):**
- Full edge-function-level flow: eligibility gate (accept/reject for every role, including the slip-mechanic case), duplicate in-flight rejection, snapshot → transform → verify → **accept**, and snapshot → transform → verify → **rollback** (engineered via a package seeded at exactly the minimum headcount) — confirmed the rollback restores every touched character field, package field, `player_count`, and re-inserts the deleted character + assignment rows byte-for-byte. Idempotency confirmed (re-invoking `adapt-mystery-apply` on a terminal row is a clean no-op). Zero-dangling-reference verified across every character field, `detective_script`, `game_overview`, `host_guide`, and `evidence_cards` after a real removal — re-confirmed after the write-timing refactor for the polish pass (no regression; `llm_fields_polished: 0` on the no-key path, deterministic output unchanged).
- TypeScript compiles cleanly for every new/changed frontend file (`tsc --noEmit`), including after the Extras-tab/lightbox rework.
- **Two full live browser walkthroughs**, real sign-in, real routing, real rendering (Playwright, screenshots taken both times): the first against the original inline-tab picker, the second against the reworked lightbox — Extras tab renders only with the flag on, alongside Host Guide/Characters/Evidence/Detective Guide; a single "A guest can't make it?" CTA opens a `Dialog` listing all 6 seeded characters with correct gating (murderer + accomplice show "Coming soon", the 4 non-essential characters show "Remove - $5"); clicking one shows the confirmation step inside the same dialog with the character's name interpolated into the "can't be undone" warning; confirming calls the real `adapt-mystery-create` edge function and shows the staging-mode toast. Both required temporarily hand-editing the URL/key in **two** separate hardcoded Supabase client files (see finding below), reverted immediately after each (confirmed via `git diff` showing zero changes to either file both times).

**Mock preview page — no backend/env-var setup required:** `src/pages/GuestDropoutPreview.tsx`, routed at `/guest-dropout-preview`, was added after the owner asked for an easier way to see the flow than "run the full local stack." It's a self-contained, hardcoded-mock-data recreation of the tab + lightbox UI (picker → confirm → simulated processing → done) with zero Supabase/Stripe calls — safe to view with a plain `npm run dev`, no env vars, no feature flag, no auth. Verified via a full Playwright click-through (screenshots), confirming all four steps render correctly including the eligible/gated character split and the character count decrementing after a mock removal. It is not linked from anywhere in the real app and is not the real entry point (that's still the flag-gated Extras tab in `MysteryPackageTabView.tsx`, wired to real data).

**What's NOT verified — and why:**
- **Stripe checkout session creation itself is not live-tested** — the Stripe MCP connector never became available in this session despite the owner enabling something in Stripe's dashboard (possibly a different setting than connector authorization). `adapt-mystery-create`'s no-key fallback path (returns the adaptation id without a checkout URL) is verified, including through the real UI; the actual `stripe.checkout.sessions.create()` call is unexercised beyond code review and the `?target=denonext` boot fix.
- **The Sonnet 5 prose-smoothing call itself is not live-tested** — no `ANTHROPIC_API_KEY` was available in the build session (checked the shell env directly; not present). The skip-cleanly fallback path is verified via curl (`llm_fields_polished: 0`, no error); the request/response handling (structured-outputs schema, disabled-thinking + effort gating, refusal handling) is verified only by code review against the current API reference, not a real call.

**Two significant findings surfaced while getting the live UI check working, recorded in full at [[hardcoded-supabase-client-blocks-local-testing-2026-08-13-mystery-maker]]:**
- **There are TWO independent, both-hardcoded Supabase clients**, not one: `src/integrations/supabase/client.ts` (Lovable-generated, 15 files) and `src/lib/supabase.ts` (not marked generated, 38 files — including `AuthContext.tsx`/`SignIn.tsx`, i.e. the one that actually gates login). Neither reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Editing only the first has no visible effect on auth, which reads as "env override doesn't work at all" until the second file is found.
- **Incident during discovery, before this was understood:** a first Playwright sign-up attempt (before switching to sign-in against an admin-created local user) completed against **production** auth instead of the intended local stack, creating one real spurious user (`adaptation-ui-test-<ts>@local.test`, id `b574dbe4-0845-4cf9-977a-bf010b414214`) and its auto-created `profiles` row. No conversations/packages were created under it. **Found and deleted both rows from production the same session** (`profiles`, then `auth.users`), confirmed zero rows remain. No real customer data was touched. Recorded here per the decision-tracking rule rather than left only in session history, since it's a real (if contained) violation of the "nothing to production" constraint this build was scoped under — and it's exactly what led to finding the two-client issue in the first place.
- Local Supabase CLI was upgraded 2.53.6 → 2.114.0 (60 versions behind) as a prerequisite — the old version's storage-api migration runner didn't match a freshly-pulled image. Old binary backed up to scratchpad, not committed anywhere (a machine-local tool, not a repo file).
- Local `supabase/migrations/` replay is currently broken from a clean volume (an early migration references `profiles` before any migration creates it — real schema drift between the tracked migration history and the live remote project, unrelated to this feature). Not fixed here — out of scope, and editing that shared history file mid-build risked colliding with the concurrent workstream also active in this checkout this session. Worked around with an isolated `--workdir` scratch stack (hand-written minimal schema for just the tables this feature touches) rather than the real migrations directory, so nothing in `supabase/migrations/` besides the new `20260813_mystery_adaptations.sql` file was touched.

**To promote past staging:**
1. Get a real Stripe TEST secret key into a local env and exercise the actual checkout redirect → webhook → apply path once.
2. Get a real Anthropic API key into a local env (owner already approved this specific use — the polish pass itself, at the estimated ~$0.05/call) and exercise the real Sonnet 5 call once, including the structured-outputs schema actually round-tripping and the refusal fallback path.
3. Product sign-off on `MIN_REMAINING_CHARACTERS`.
4. Fix (or formally accept) the `supabase/migrations/` drift separately — it will block any future local-stack work, not just this feature.
5. Consider a permanent fix for the two hardcoded Supabase clients (env-var-aware with current values as fallback) — would save real time on the next feature that needs local UI testing.
6. Only then: feature flag on in a real preview deploy, owner review, explicit go-ahead before touching prod env vars.
7. Remove (or explicitly keep and flag-gate) the `/guest-dropout-preview` mock route — it's a dev aid, not meant to be reachable in production.

## Key files
- `supabase/migrations/20260813_mystery_adaptations.sql`
- `supabase/functions/adapt-mystery-create/index.ts`, `supabase/functions/adapt-mystery-apply/index.ts`
- `supabase/functions/stripe-webhook/index.ts` (additive branch only)
- `src/components/GuestDropoutPanel.tsx`, `src/services/adaptationService.ts`, `src/pages/AdaptationSuccess.tsx`
- `src/components/MysteryPackageTabView.tsx`, `src/App.tsx`, `src/i18n/locales/en.json` (new `adaptation.*` block)
- `src/pages/GuestDropoutPreview.tsx` (mock preview, not the real feature — see above)
