# ADR-0124: Child webhook URL was hardcoded in a public repo, with no auth on the Make.com side — root cause for the recurring "null input" incidents

- **Status:** Resolved — code fix shipped, URL rotated, Parent scenario patched and imported, Child scenario re-exported for the record; Make.com-side shared-secret check remains an open (optional) recommendation
- **Date:** 2026-09-18
- **Related:** Prior incident memory (`project_make_child_webhook_null_input_sep16.md`), vault note `00_INBOX/make-child-webhook-null-input-incomplete-executions-2026-09-16-mystery-maker.md`, ADR-0103 (sweep ritual, same detector-threshold discussion), ADR-0086 (the $10/day shared spend cap this recovery loop already respects)

## Context

On 2026-09-16, "MM Live - Child (Unified)40" fired twice with a null webhook input, producing 20 failed `mystery_characters` inserts (blocked cleanly by the `character_name` NOT NULL constraint — no real data affected). That incident's own note logged two unconfirmed theories (accidental Make.com editor UI trigger vs. external unauthenticated hit) and explicitly deferred a fix: *"chalked up to a fluke... if this recurs, that's the trigger to actually close the auth gap."*

On 2026-09-17, it recurred: the same scenario, the same stale April row (`ab2c5dcf-769e-49fb-a03b-fd0a22cb74a1`, confirmed still untouched both times), the same "null value in column character_name" signature, this time 9 failed inserts across 21:42–21:46 UTC. Jonathan flagged a real order ("Shadows Over Blackwood Manor," purchased 20:40 UTC) 62 minutes earlier as a possible cause; investigation ruled this out — that package's generation had already fully completed by 21:02 (including 4 characters that legitimately self-healed via this same Child webhook at 21:00, with a real payload, successfully) — nothing from that order was still in flight 40 minutes later.

This second occurrence crossed this project's own established bar (ADR-0103's discussion of the same threshold) for moving from "log and watch" to "investigate and fix." Investigating further found a real, confirmed exposure: `CHILD_WEBHOOK` was hardcoded as a literal string in `supabase/functions/notify-generation-issue/index.ts`, a file tracked in this project's GitHub repo — and that repo is **public** (confirmed via `gh repo view`, `visibility: PUBLIC`). Anyone can read the URL directly off GitHub, and the Make.com scenario receiving it has no shared-secret or auth check of any kind.

**What this does and doesn't prove.** The exposure itself is a confirmed fact. That it *caused* either specific incident is not — no Make.com request logs or source-IP data were available to check (the Make MCP connection failed to authenticate both times this was attempted), and the original Sept 16 note's other theory (an accidental trigger from clicking around in Make's scenario editor — a known gotcha, and Jonathan was actively in that UI investigating an unrelated incident at the time) was never ruled out, including for this second occurrence, since whether anyone was in the Child scenario's editor around 21:42–21:46 UTC on the 17th was not checked. Both incidents also look like a single trigger event each (one execution's per-character loop plausibly producing all the failed rows at once), which doesn't distinguish between the two theories either. So: the exposure is real and worth closing regardless, but "external hit" should be read as the more mechanically-plausible explanation now that a concrete vector exists, not as proven. It does at least explain why the failing rows contain wildly different, mutually-unrelated fictional characters each time (a `Deacon/Reverend`-style winery retreat, a villa, a household-steward manor, an explicit Claude refusal — "no secret can be generated responsibly without..." — visible in one of the 2026-09-17 rows): whatever triggered it, each webhook call reached Claude with little to no real context, so it freelanced a plausible but disconnected character every time.

**Cost at stake, for calibration:** bounded and modest either way — recovery calls cost ~$0.15/character and are capped by the existing $10/day shared spend ceiling and 2-attempt-per-character limit (ADR-0086); both incidents combined likely cost a few dollars, not a runaway bill. This is a hygiene fix worth doing because it's cheap and permanent, not an emergency response to an active drain.

For comparison, the sibling Parent webhook (`mystery-webhook-trigger/index.ts`) never had this problem — it reads its URL from `Deno.env.get("WEBHOOK_URL")`, with no hardcoded literal anywhere in the codebase. The Child webhook was the one outlier.

## Decision

1. **Shipped now:** move `CHILD_WEBHOOK` off the hardcoded literal into `Deno.env.get("CHILD_WEBHOOK_URL")`, mirroring the Parent webhook's existing pattern exactly. Set the Supabase secret to the *current* URL value first, so the recovery loop's behavior is unchanged — this alone doesn't invalidate anything, it just stops the URL from being newly readable in the public repo going forward.
2. **Still required, not done here:** the current URL is already permanently visible in this repo's git history (confirmed via `git log -S`) and cannot be un-leaked by editing the current file. Closing the gap for real requires Jonathan to regenerate the webhook URL in Make.com's scenario editor (recreate the Instant/webhook trigger module), then tell me the new URL so the `CHILD_WEBHOOK_URL` secret can be updated to match. Until that happens, the old URL remains live and exploitable exactly as before.
3. **Not decided/deferred:** adding a shared-secret header/query-param check inside the Make.com scenario itself (defense-in-depth, so a future leak of the new URL doesn't reopen the same gap). This is a Make.com-editor-side change only Jonathan can make — flagged as a recommendation, not implemented.

## Alternatives considered

- **Do nothing, log it again as a fluke (rejected).** Explicitly rejected by this ADR's own trigger condition — the prior incident's note set "recurs → fix it" as the standing rule, and it recurred with a mechanically-confirmed cause, not just a second coincidence.
- **Make the repo private instead of rotating the URL.** Would also close the "anyone can read it off GitHub" vector, but doesn't fix the fact that the URL has already been publicly readable for an unknown period before this was caught — anyone who already has it (scraped, cached, cloned) keeps working access regardless of repo visibility going forward. Rotation is the only action that actually invalidates the specific leaked value. (Repo privacy is a separate, broader question not scoped to this incident.)
- **Add the auth check in Make.com without rotating the URL.** Plausible as a belt-and-suspenders addition, but doesn't remove the exposure — the URL itself is still public; anyone hitting it would just get rejected post-hoc rather than the exposure being closed at the source. Rotation is still necessary either way.

## Consequences

- No behavior change to the legitimate recovery path (`notify-generation-issue`'s empty/missing-character auto-recovery) — same webhook, same payload shape, same attempt/spend caps, just sourced from a secret instead of a literal.
- The vulnerability (URL readable in a public repo, no auth on the Make.com side) is now closed: the old URL is dead, the new one lives only in the Supabase secret and the two Make.com scenarios themselves, not in any tracked source file.
- If the "null input" signature recurs on this scenario post-rotation, that would point away from the URL-exposure theory and toward something else (e.g. the still-unruled-out accidental-editor-trigger theory) — worth re-opening investigation rather than assuming exposure again.

## Implementation (2026-09-18, rotation)

Jonathan regenerated the Child scenario's webhook trigger in Make.com's editor, producing a new URL (`https://hook.eu2.make.com/gzi7vxkpha3u8tibtisd93v5fxmhxvn8`, old one now dead). Closing the loop on both halves:

1. **Supabase secret** `CHILD_WEBHOOK_URL` updated to the new URL — no redeploy needed, edge functions read secrets at invocation time.
2. **Parent scenario.** The live Parent blueprint (`temp-files/MM Live - Parent66 (Fixed-Culprit Reveal Wording Fix).blueprint.json`, confirmed by Jonathan to be the current live version) hardcodes the Child URL in 4 separate `http:ActionSendData` modules (ids 180, 145, 2425, 2461 — one per route/style branch), each firing a per-character generation call with the same field shape (`characterName`, `characterDescription`, `characterIndex`, `packageId`, `scriptType`, `hasAccomplice`, `language`, `mysteryType`, `characterChatExcerpts`, `conversationContent`). All 4 occurrences replaced via a literal string swap (verified exact count before and after, valid JSON confirmed), written to `temp-files/MM Live - Parent67 (Child Webhook URL Rotation).blueprint.json`, and **confirmed imported into Make.com by Jonathan.**
3. **New-webhook "listening" state.** A newly (re)created Make.com Custom Webhook trigger needs one real sample call before it can determine its data structure for future use. Built a complete, realistic test payload matching the Parent's exact field shape (above), using a dedicated `is_test=true` conversation + package (id `c7050f74-91bd-42dd-abe6-e0c044c27475` / `aa00f73c-ef21-4ded-b605-8efe59bc2fa2`) cloned from a known-clean real package's `master_context`/`extracted_characters` rather than firing against any real customer data. POSTed directly to the new URL: `200 Accepted`. Verified end-to-end: a `mystery_characters` row was created under the correct test `package_id` with the correct `character_name` and real generated `background` content within ~30s, confirming the new URL is live, the Child scenario correctly learned the full field set, and the write path (including the `character_name`/`package_id` NOT NULL constraints that caught both original incidents) behaves normally.
4. **Child scenario record.** Per this project's own blueprint-versioning discipline (never reuse a version number, always work from the latest export), Jonathan exported the post-rotation Child scenario and it's saved as `temp-files/MM Live - Child (Unified)41-WebhookRotation.blueprint.json` — verified valid JSON, trigger `hook` id `4381494` (distinct from the pre-rotation v40 mirror's `4049171`, confirming this really is the rotated scenario). Future Child-side changes should build off this file, not the stale v40 one.

**Verification cost:** one real Sonnet 5 character-generation call (~$0.15, per this file's own `CHARACTER_REGEN_COST_USD` estimate), explicitly requested by Jonathan for this purpose.

**Fully closed.** Both halves of the fix (code + Supabase secret, Parent scenario) are live; the pre-rotation URL is dead. The only remaining open item is optional defense-in-depth (a shared-secret check inside the Make.com scenario), not required for this incident to be considered resolved.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — `CHILD_WEBHOOK` now reads `Deno.env.get("CHILD_WEBHOOK_URL")` instead of a hardcoded literal; deployed v37, verified ACTIVE via `supabase functions list`
- Supabase secret `CHILD_WEBHOOK_URL` — rotated to the new webhook URL
- `temp-files/MM Live - Parent67 (Child Webhook URL Rotation).blueprint.json` — Parent blueprint with all 4 Child URL references updated; imported into Make.com
- `temp-files/MM Live - Child (Unified)41-WebhookRotation.blueprint.json` — post-rotation Child scenario export, new source of truth for this scenario
- Test rows for verification: `conversations.id = 'c7050f74-91bd-42dd-abe6-e0c044c27475'`, `mystery_packages.id = 'aa00f73c-ef21-4ded-b605-8efe59bc2fa2'` (`is_test = true`, safe to delete)

## Links

[[01_Projects/Mystery-Maker]]
