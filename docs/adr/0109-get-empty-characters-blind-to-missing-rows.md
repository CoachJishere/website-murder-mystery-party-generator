# ADR-0109: `get_empty_characters()` was blind to wholly-missing character rows — and Make.com's Parent blueprint calls it directly as its own completion gate

- **Status:** Accepted — implemented and verified live 2026-08-25
- **Date:** 2026-08-25
- **Related:** ADR-0108 (the trigger fix this ADR pinpoints the actual source of — read that ADR's Context for the incident trace), ADR-0094/0095 (the row-count guard `get_empty_characters()` duplicates and shares a blind spot with), ADR-0096 (the migration comment that claimed this function "has done nothing since the day it was written" — true of this repo's code, false of the live Make.com blueprint)

## Context

ADR-0108 fixed the *symptom*: a package could reach `completed` while missing a whole character row, because the one Postgres trigger meant to catch it only fired once per package. That fix is deployed and verified — any future occurrence of this exact failure now gets caught and downgraded automatically, no matter what caused it.

This ADR is the *source*. Pulled the live Make.com blueprints via the Make API (`MAKE_API_TOKEN`, already in `.env` and usable per prior sessions) to find what actually performed the unguarded write ADR-0108 traced. The live Child scenario (`MM Live - Child (Unified)36-WebhookLanguageField`, id `9061052`) — the one the recovery re-fire calls — was checked first and ruled out: every one of its `supabase:upsertARecord` modules writes to `mystery_characters` only; it never touches `mystery_packages`.

The live Parent scenario (`MM Live - Parent60 (Wait Before Completion Check)`, id `9106101`) is where it actually happens. Its flow has a `builtin:BasicRouter` ("Mark generation outcome (no retry)") gating two branches on one condition: `{{length(223.data)}} == 0` writes `generation_status = 'completed'`; `> 0` writes `'needs_review'`. Module `223` (`http:MakeRequest`, labeled "Check empty chars (detective)") is a raw HTTP call to `https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/rpc/get_empty_characters` with `{"p_package_id": "{{46.id}}"}`.

`get_empty_characters(p_package_id)`'s definition (unchanged since a 2026-04-22 migration, `fix_get_empty_characters_to_check_scripts`) is a single `SELECT ... FROM mystery_characters mc ... WHERE mc.package_id = p_package_id AND (<content is empty/short>)`. It can only ever return rows that **exist** — a character that was never inserted at all cannot appear in this result set by construction, no matter what condition is checked. Reconstructed the exact incident in an isolated `BEGIN...ROLLBACK` test (1 fully-populated character, 1 wholly-missing, 2 expected): `get_empty_characters()` returned **0 rows** — exactly the `length(223.data) == 0` condition that routes to `'completed'`.

The migration comment introducing ADR-0096 (`20260820092046_add_missing_round_content_blocking_defect.sql`) states this function *"has done nothing since the day it was written... never wired into any caller (not the completion trigger, not any edge function, not any cron; confirmed via a full-codebase and full-schema search)."* That was an accurate statement about this git repository — grepped again here, zero hits outside that one comment. It was never true of the live system: Make.com's blueprint calls it directly via raw HTTP, invisible to any repo-based search because the caller's *entire definition* lives in Make.com's UI/API, not in this repository. Parent60 was last edited 2026-08-23 — two days before this incident, and plausibly the point this call was introduced or last touched, though the exact history wasn't traced further.

## Decision

Extend `get_empty_characters()` with a second, additive branch: when the actual `mystery_characters` row count for a package is short of `package_expected_character_count()` (the already-trusted ADR-0094/0095 parser), return one synthetic sentinel row (`id: NULL`, `character_name: '(missing character row)'`). This makes `length(...) == 0` correctly evaluate to false whenever a character is wholly missing, which is the only thing Make.com's router actually checks — no Make.com blueprint edit or manual import required.

```sql
UNION ALL
SELECT NULL::uuid AS id, '(missing character row)'::text AS character_name, mp.id AS package_id
FROM mystery_packages mp
WHERE mp.id = p_package_id
  AND (SELECT count(*) FROM mystery_characters mc2 WHERE mc2.package_id = p_package_id)
      < public.package_expected_character_count(mp);
```

Verified before deploying: reconstructed the exact incident shape in an isolated transaction — the missing-character case now returns the sentinel row (previously 0 rows); a genuinely complete package still returns 0 rows (no false positive). Confirmed via repo-wide grep that nothing in this codebase calls `get_empty_characters()` directly — Make.com's own check only reads array length, not the `id` field's value, so the `NULL` id in the sentinel row is safe for its only real caller.

## Rationale

- **Fixes the actual root cause Make.com depends on, not just the Postgres-side symptom.** ADR-0108 alone makes this incident class harmless (the trigger catches and downgrades it after the fact) but doesn't stop Make.com from doing the wasted premature write in the first place. This closes it at the point Make.com actually checks.
- **No Make.com blueprint edit needed.** Every prior ADR that's touched Make.com blueprints in this project has required a manual import via the Make UI (no write API access). Because Make.com calls this exact RPC and only inspects the result's length, fixing the RPC's *behavior* fixes what Make.com sees without needing to touch, understand, or re-import anything in Make.com itself.
- **Reuses already-trusted logic instead of re-deriving it.** The sentinel branch calls `package_expected_character_count()` — the same parser ADR-0094/0095 hardened against all three known `extracted_characters` shapes — rather than writing a second, parallel roster-size parser that could drift from it.
- **Minimal, additive, and tested against the reconstructed incident before deploying.** The existing empty-content check is untouched; only a new `UNION ALL` branch was added, verified in an isolated rolled-back transaction to both catch the missing-row case and not false-positive on a complete package.

## Alternatives Considered

- **Edit the Make.com blueprint's router condition directly** (e.g., add a second module also calling `package_expected_character_count` and checking it in the router's `AND` logic). Rejected: requires a manual Make.com UI edit and import, the exact friction ADR-0108 was specifically designed to avoid depending on. Fixing the RPC's return value is strictly less work for an equivalent (arguably better, since it also protects any *other* future caller of this RPC) outcome.
- **Leave `get_empty_characters()` alone, rely on ADR-0108 alone.** Valid and already sufficient for correctness — the Postgres trigger catches this regardless. Rejected as *insufficient on its own* only in the sense that Jonathan's stated goal ("aiming to get this right as possible on the first try, and then if not, self-healing") is better served by not needing the self-heal path to fire at all for this specific, now-understood cause. Both fixes are deployed; this one reduces how often the self-heal path needs to trigger, ADR-0108 remains the safety net if it does anyway.

## Consequences

- **Positive:** Make.com's Parent blueprint will now correctly route a package with a wholly-missing character to `needs_review` on its own first attempt, without ever needing ADR-0108's trigger to catch and downgrade it after the fact. Fewer wasted premature "ready" email sends, fewer needs_review→completed→needs_review flip-flops visible in `generation_status` history.
- **Deployed and verified live** (direct `pg_get_functiondef` check confirms the new branch is live; behavior verified via isolated `BEGIN...ROLLBACK` test against the reconstructed incident before and after the change).
- **Not addressed:** whether `get_empty_characters()` has other unknown live callers beyond Make.com's Parent60 and this repo (a Make.com organization can have scenarios beyond what a single blueprint pull surfaces). Checked the two most relevant live scenarios (Child36, Parent60) exhaustively; did not do an org-wide sweep of every scenario for other direct RPC calls to this function.
- **Not addressed:** the general risk this incident surfaces — that any Postgres RPC callable from Make.com's HTTP/`makeAnApiCall` modules is effectively a second, invisible-to-repo-search caller surface that can silently depend on a function's exact behavior. No process change proposed here to systematically audit for this; noted as a category worth remembering (see Discussion).

## Key files

- `supabase/migrations/20260825_get_empty_characters_detect_missing_rows.sql` — this ADR's fix, deployed live
- `supabase/migrations/20260422125154_fix_get_empty_characters_to_check_scripts.sql` (referenced, not modified) — original function definition this ADR extends
- `supabase/migrations/20260819_close_recovery_path_character_count_gap.sql` — `package_expected_character_count()`, reused here
- `docs/adr/0108-completion-gate-must-revalidate-every-write.md` — the Postgres-side trigger fix this ADR's finding traces the root cause of
- Make.com scenario `9106101` (`MM Live - Parent60 (Wait Before Completion Check)`), module `223` — the actual caller, confirmed via the Make API, not modified by this ADR

## Discussion

The investigation method here is worth naming explicitly: rather than guessing which Make.com module might be responsible, the live blueprints were pulled via the Make API and searched programmatically (`jq` over the exported JSON) for every module writing to `mystery_packages`, narrowing from "11 modules mention `generation_status`-shaped metadata" down to the exact router and its two branch conditions in a few minutes. This is meaningfully faster and more certain than reading blueprint screenshots or reasoning from memory about what a scenario "probably" does — worth reusing as a default approach whenever a live Make.com blueprint's actual behavior (not a `temp-files/*.blueprint.json` export, which can be stale) is in question.

The more durable lesson is the blind-spot shape itself: this repository has, across ADR-0094/0095/0096/0108, built increasingly careful guards against "a package reaches `completed` without every character actually existing and being non-empty" — entirely within Postgres and this codebase's own edge functions. All of that careful work coexisted, unnoticed, with a Make.com blueprint calling a *different*, older, never-hardened function directly over HTTP, with the identical blind spot the newer guards were built specifically to close. A `grep` across this repository will never find that caller. The only way to know a Postgres function is safe to change is to also check whether Make.com (or any other external system with API/HTTP access to this database) depends on it directly — this incident is the first confirmed case of that actually mattering, and won't be the last time it's worth checking before assuming a function is unused just because nothing in the repo calls it.
