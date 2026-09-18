# ADR-0124: Child webhook URL was hardcoded in a public repo, with no auth on the Make.com side — root cause for the recurring "null input" incidents

- **Status:** Accepted (code fix shipped; URL rotation still pending, owned by Jonathan)
- **Date:** 2026-09-18
- **Related:** Prior incident memory (`project_make_child_webhook_null_input_sep16.md`), vault note `00_INBOX/make-child-webhook-null-input-incomplete-executions-2026-09-16-mystery-maker.md`, ADR-0103 (sweep ritual, same detector-threshold discussion), ADR-0086 (the $10/day shared spend cap this recovery loop already respects)

## Context

On 2026-09-16, "MM Live - Child (Unified)40" fired twice with a null webhook input, producing 20 failed `mystery_characters` inserts (blocked cleanly by the `character_name` NOT NULL constraint — no real data affected). That incident's own note logged two unconfirmed theories (accidental Make.com editor UI trigger vs. external unauthenticated hit) and explicitly deferred a fix: *"chalked up to a fluke... if this recurs, that's the trigger to actually close the auth gap."*

On 2026-09-17, it recurred: the same scenario, the same stale April row (`ab2c5dcf-769e-49fb-a03b-fd0a22cb74a1`, confirmed still untouched both times), the same "null value in column character_name" signature, this time 9 failed inserts across 21:42–21:46 UTC. Jonathan flagged a real order ("Shadows Over Blackwood Manor," purchased 20:40 UTC) 62 minutes earlier as a possible cause; investigation ruled this out — that package's generation had already fully completed by 21:02 (including 4 characters that legitimately self-healed via this same Child webhook at 21:00, with a real payload, successfully) — nothing from that order was still in flight 40 minutes later.

This second occurrence crossed this project's own established bar (ADR-0103's discussion of the same threshold) for moving from "log and watch" to "investigate and fix." Investigating further found the actual mechanism: `CHILD_WEBHOOK` was hardcoded as a literal string in `supabase/functions/notify-generation-issue/index.ts`, a file tracked in this project's GitHub repo — and that repo is **public** (confirmed via `gh repo view`, `visibility: PUBLIC`). Anyone can read the URL directly off GitHub. The Make.com scenario receiving it has no shared-secret or auth check of any kind. This makes "external hit on an exposed webhook" a confirmed, mechanically-explained cause rather than a speculative theory — and explains why the failing rows contain wildly different, mutually-unrelated fictional characters each time (a `Deacon/Reverend`-style winery retreat, a villa, a household-steward manor, an explicit Claude refusal — "no secret can be generated responsibly without..." — visible in one of the 2026-09-17 rows): each POST to the webhook independently invokes Claude with little to no real context, so it freelances a plausible but disconnected character every time.

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
- Until Jonathan rotates the URL in Make.com, the vulnerability that caused both incidents remains live — this ADR's fix is necessary but not sufficient on its own, and should not be read as "resolved."
- Once rotated, a third recurrence of the "null input" signature on this scenario would point away from the URL-exposure theory and toward something else (e.g. the still-unruled-out accidental-editor-trigger theory) — worth re-opening investigation rather than assuming exposure again if it happens after rotation.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — `CHILD_WEBHOOK` now reads `Deno.env.get("CHILD_WEBHOOK_URL")` instead of a hardcoded literal; deployed v37, verified ACTIVE via `supabase functions list`
- Supabase secret `CHILD_WEBHOOK_URL` — set to the current (not-yet-rotated) webhook URL

## Links

[[01_Projects/Mystery-Maker]]
