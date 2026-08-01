# ADR-0050: Normalize generation_status at the write boundary (root cause of the double-encoding)

- **Status:** Accepted
- **Date:** 2026-08-01

## Context

`20260801_normalize_generation_status_double_encoding.sql` (same day, earlier) backfilled 24 `mystery_packages` rows where `generation_status` was stored as a jsonb **string** containing JSON text (`"{\"status\": \"completed\", ...}"`) instead of a jsonb **object** (`{"status": "completed", ...}`). On those rows `generation_status->>'status'` returns `NULL`, so the `= 'completed'` filter used by every content detector (ADR-0016, ADR-0041, ADR-0042) and the health check's stuck/needs-review checks silently skipped them — 18 of the 24 were `completed`. That migration's own header flagged the gap explicitly: *"ROOT CAUSE NOT YET FIXED ... something in the write path ... persists generation_status as a string on some runs."* This ADR is that follow-on.

### Root cause, traced with evidence

Every code path that writes `generation_status` was audited:

- `src/services/mysteryPackageService.ts` (`generateCompletePackage`, `getPackageGenerationStatus`'s auto-correction) — writes plain JS object literals through `supabase-js` `.update()`/`.insert()`.
- `supabase/functions/mystery-webhook-trigger/index.ts` (the `needs_more_info` gate write) — same pattern, plain object.
- `api/generation-complete.js` (the Make.com parent's Vercel completion callback) — `generationStatus` is built as a plain object (`{ status: 'completed', ... }`) and passed straight into `updateData`.

None of these double-encode — `supabase-js` and `fetch` + `JSON.stringify(body)` both serialize a JS object as a native JSON object in the request body, which Postgres stores correctly as jsonb.

The actual writer is Make.com. The live production scenario is **"MM Live - Parent v49 (Accomplice-Beat Silent-Omission) (ADR-0042 G9)"**, Make scenario id `9106101` (confirmed active via `scenarios_list`; local backup: `temp-files/MM Live - Parent49 (Accomplice-Beat Silent-Omission).blueprint.json`). Querying the Supabase connector's own `getTableParams` RPC for `mystery_packages` (via the Make API, `appName: supabase`, `rpcName: getTableParams`) shows **every column — including the jsonb `generation_status` column — is exposed as Make field `type: "text"`.** The connector has no object/collection field type for jsonb columns; it never did the type-aware introspection PostgREST's schema would allow.

Consequently every `supabase:upsertARecord` module mapper in the scenario supplies `generation_status` as a hand-built, backslash-escaped JSON string, e.g.:

```
"generation_status": "{\"status\": \"in_progress\", \"progress\": 20, \"currentStep\": \"Processing by external service...\"}"
```

Confirmed present in **25 module instances across all 4 parallel routes** of the live blueprint (module ids `48, 178, 15300, 185, 220, 222, 217, 158, 15301, 100, 307, 310, 313, 2423, 15302, 2435, 2443, 2446, 2449, 2459, 15303, 2471, 2479, 2482, 2485`). Make serializes that text-typed field value as a JSON string in the outgoing PostgREST request body; PostgREST/Postgres accepts a string as a perfectly valid jsonb scalar (jsonb permits any JSON value, including bare strings) — so it stores the string, not an object. That is the double-encoding, mechanically, at the exact point it happens.

This is a **structural limitation of Make.com's generic Supabase connector for this table**, not a one-off authoring mistake in a single module — every module that touches `generation_status` was built the only way the connector's UI allows for a jsonb field, which is why the pattern is uniform across all 25 instances and both scenario generations (v49 and its predecessors, by the same construction).

## Decision

Reproduced the exact write Make.com performs (`'"{\"status\": \"in_progress\", ...}"'::jsonb` — a jsonb scalar string, not an object) directly against a disposable test row and confirmed it lands as `jsonb_typeof = 'string'`, reproducing the bug precisely before deciding on a fix.

Added migration `20260801_normalize_generation_status_on_write.sql`:

1. **`public.normalize_generation_status()`** — a `BEFORE INSERT OR UPDATE` trigger function on `mystery_packages`:
   - `generation_status IS NULL` → pass through unchanged.
   - Already a jsonb object → pass through unchanged (no-op for every existing correct writer).
   - A jsonb **string** that decodes to a JSON **object** (the Make.com pattern above) → **coerced** to that object before storage. Self-heals the known failure mode without requiring any Make.com change, so the live revenue-critical generation pipeline is not put at risk.
   - A jsonb string that does **not** decode to a JSON object (malformed JSON, or valid JSON that's an array/number/bool) → **rejected** with `RAISE EXCEPTION`, naming the parse failure or the wrong type. Anything else non-object → rejected the same way.
2. **`trg_00_normalize_generation_status`** — named to sort alphabetically before the existing `trg_maintain_needs_review_at` trigger (which reads `generation_status->>'status'` on the same `BEFORE UPDATE` event), so it always sees the normalized value, never the raw string.

**The Make.com scenario itself was not edited.** `scenarios_update` wholesale-replaces the blueprint (no partial/field-level edit exists in the API) on a 2MB, revenue-critical, actively-serving-customers scenario with 25 duplicated instances of the affected field across 4 parallel routes. Attempting a blind field-level string surgery across that many sites in one pass, with no way to visually verify the result the way the Make UI would, was assessed as materially riskier than the bug it would fix. The connector also offers no non-text field type to switch to for a jsonb column — the only real fix on the Make side is replacing the `supabase:upsertARecord` modules with raw `http:ActionSendData` calls that build a true nested JSON body, which is a scenario redesign, not a field edit. That redesign is recorded as deferred work (see Consequences), not attempted here.

## Rationale

- **Fixing "the writer" and "the recurrence guard" are the same move here.** The task's own acceptable alternatives list a DB trigger/CHECK or normalize-on-write as equivalent to fixing the app-layer writer. Given the connector structurally cannot emit a native jsonb object (confirmed via `getTableParams`, not assumed), the write boundary — a `BEFORE INSERT OR UPDATE` trigger on the table every writer already goes through — **is** the correct place to fix this, not a workaround bolted on top of an untouched bug.
- **Coerce, don't just reject, for the known pattern.** Make.com will keep sending the escaped-string form until the scenario is redesigned. A guard that only rejects would turn every legitimate in-flight generation status update into a hard failure, breaking the live pipeline for paying customers — an unacceptable trade for closing a data-quality hole. Coercing the known-good pattern (valid JSON object, just double-wrapped) keeps the pipeline working exactly as before while permanently fixing what lands in the column.
- **Still reject the genuinely malformed case.** A string that isn't valid JSON at all, or that decodes to a non-object (array, number), is not the known Make.com pattern — it's either a bug in some other future writer or a sign something upstream is broken. Silently accepting it would recreate exactly the kind of "looks fine, detectors can't see it" hole this whole incident chain started from. Verified both branches live (see Verification).
- **Named to fire before `trg_maintain_needs_review_at`.** Postgres fires same-event `BEFORE` triggers in alphabetical order by name; without the `trg_00_` prefix forcing this trigger first, `trg_maintain_needs_review_at`'s own `->>'status'` read could still see the un-normalized string on the same statement, reintroducing the exact bug being fixed one trigger later.
- **Did not attempt the Make.com blueprint edit via API.** Same discipline ADR-0049 already established for a different Make.com fix in this codebase: "identified with confidence" and "safe to auto-apply via a wholesale blueprint replace" are different bars, and this project's own convention is that scenario edits happen on the Make canvas where a human can visually verify the result, not via blind JSON round-tripping — more so here, where the affected sites number 25 across 4 routes rather than a handful.

## Alternatives Considered

1. **A CHECK constraint (`jsonb_typeof(generation_status) = 'object'`) instead of a trigger.** Rejected: a CHECK can only reject, it cannot coerce. Given Make.com will keep sending the escaped-string form, a hard reject would break every live generation until the scenario is redesigned — not viable as the immediate fix. A CHECK is a reasonable *addition* once the Make.com redesign ships and the coercion path is provably dead, but that's future work, not this change.
2. **Edit the Make.com blueprint via `scenarios_update` now**, changing all 25 module mapper values (they'd still have to remain escaped strings, since the connector's field type is fixed to `text` — there's no object field to switch to). Rejected: doesn't actually fix anything (the field type constraint is the connector's, not the module author's), and risks a wholesale-replace mistake on a 2MB live scenario for zero benefit.
3. **Replace the `supabase:upsertARecord` modules with raw `http:ActionSendData` modules** that build a true nested JSON body (bypassing the connector's text-field limitation entirely). This is the actual, complete root-cause fix on the Make side. Rejected for *this* change — a full scenario redesign across 25 write sites and 4 routes is a substantial, high-risk project in its own right and does not belong in the same change as an emergency data-integrity fix. Recorded as deferred work below.
4. **Do nothing beyond the backfill, rely on the health check to catch future occurrences.** Rejected — that is exactly the gap the backfill migration's own header called out as unresolved, and it's what let 24 rows go silently unseen by every detector for an unknown period before ADR-0048's structural detector happened to surface them.

## Verification

Run live against the production DB (`mhfikaomkmqcndqfohbp`), using a disposable synthetic row created and deleted within the same session — nothing left behind:

1. **Reproduced the exact Make.com write.** `INSERT ... generation_status = '"{\"status\": \"in_progress\", \"progress\": 20, \"currentStep\": \"Processing by external service...\"}"'::jsonb` (the literal pattern from module 48's mapper) → stored as `jsonb_typeof = 'object'`, content correct (`{"status":"in_progress","progress":20,"currentStep":"Processing by external service..."}`). Confirms the coercion fires on `INSERT`.
2. **Same pattern on `UPDATE`** (mirrors a later module in the same scenario firing on an existing row) — `UPDATE ... SET generation_status = '"{\"status\": \"completed\", ...}"'::jsonb` → `jsonb_typeof = 'object'`, correct content. Confirms the coercion fires on `UPDATE`, not just `INSERT`.
3. **Rejected: non-JSON string.** `UPDATE ... SET generation_status = '"not json at all"'::jsonb` → `ERROR P0001: generation_status was written as a non-JSON string (parse error: invalid input syntax for type json): "not json at all"`. Write did not land.
4. **Rejected: valid JSON but not an object.** `UPDATE ... SET generation_status = '"[1,2,3]"'::jsonb` → `ERROR P0001: generation_status string does not decode to a jsonb object (decoded type: array): "[1,2,3]"`. Write did not land.
5. **Legitimate path unaffected.** `UPDATE ... SET generation_status = jsonb_build_object('status','needs_review','progress',100,'currentStep','Some characters failed to generate')` (the shape every in-repo TS/JS writer already sends) → passes through unchanged, `jsonb_typeof = 'object'`.
6. **No regression to the rest of the table.** Post-test: `SELECT jsonb_typeof(generation_status), count(*) FROM mystery_packages GROUP BY 1` → `{"object": 145}` — identical to the pre-change count, confirming the disposable test row was fully cleaned up and no production row was altered.
7. **Security advisors clean.** `get_advisors(type: security)` run immediately after applying the migration shows no new findings attributable to `normalize_generation_status()` or its trigger (the function sets `search_path = ''` per this project's established convention from `security_lint_function_search_path`).

## Consequences

- New `mystery_packages` rows can never again land with `generation_status` as anything other than a jsonb object — regardless of which writer (existing or future, Make.com or app-layer) sends it, and regardless of whether that writer is fixed. Every detector's `->>'status' = 'completed'` filter can now trust the column unconditionally.
- **The Make.com connector's structural limitation is not fixed** — only its symptom is neutralized at the DB boundary. Every write from the live scenario still sends an escaped string; the trigger silently coerces it on every single write, forever, until the scenario is redesigned. This is an accepted, ongoing (tiny) overhead, not a one-time cost.
- **Recommended follow-up (deferred, not applied here):** replace the 25 `supabase:upsertARecord` `generation_status` writes in scenario `9106101` with `http:ActionSendData` modules posting a true nested JSON body, eliminating the escaped-string pattern at the source. This is a genuine scenario redesign (new modules, not field edits) and should be scoped as its own change with its own rollback plan, ideally starting from a duplicated version (Parent v50) per this project's blueprint-versioning convention (see ADR-0049's own Make-follow-up note for the exact pattern to use). Logged as a vault note (`00_INBOX/`) rather than left only in this ADR, per this project's decision-tracking rule.
- Once that redesign ships and is stable, the coercion branch in `normalize_generation_status()` becomes dead code and could be tightened to a hard CHECK (Alternative #1) — revisit then, not now.

## Discussion

The central judgment call was whether "fix the writer" required touching Make.com at all, given the task's framing pointed at "a Make module or code doing `JSON.stringify(status)` into a jsonb column." The actual mechanism turned out to be subtly different and, in a sense, worse: it isn't a single mistaken module that double-stringifies — it's *every* module of this connector for this column type, because the connector itself has no way to represent a jsonb object. There is no single field to fix; the fix would have to be architectural (replace the connector modules) or structural (fix at the boundary). Given the live scenario's size (2MB) and blast radius (every paying customer's generation pipeline) and the wholesale-replace-only nature of the scenario-editing API, doing the DB-boundary fix first — provably correct, tested against the exact write pattern Make.com performs, zero risk to the live scenario — and recording the Make-side redesign as deliberate, scoped-out follow-up work was the more defensible sequencing than attempting a 25-site blind edit under the same time pressure that produced the original incident.

The second judgment call was coerce-vs-reject for the trigger. A stricter reading of "recurrence guard" might argue for an outright CHECK constraint that rejects any string outright, forcing the Make.com fix immediately by breaking the pipeline until it's done. That was rejected deliberately: a data-integrity fix that takes down live paying-customer generation until an unrelated, larger piece of follow-up work ships is a worse outcome than a self-healing trigger that closes the actual data-quality hole today. The narrower "reject anything that isn't the known double-encoding shape" version keeps that discipline for everything else — it doesn't silently swallow a genuinely new kind of malformed write, only the one specific pattern that's independently verified, at the source, to be benign and losslessly reversible.

## Key Files

- `supabase/migrations/20260801_normalize_generation_status_on_write.sql` — this migration: the trigger function and its trigger.
- `supabase/migrations/20260801_normalize_generation_status_double_encoding.sql` — the backfill this ADR's trigger prevents from being needed again.
- `docs/adr/0049-prevent-structural-defects-at-completion.md` — sibling ADR from the same day; established the "DB trigger is the one point every writer goes through" reasoning this ADR reuses, and the "Make-UI edits, not blind API blueprint edits" convention this ADR follows for the deferred scenario redesign.
- `src/services/mysteryPackageService.ts`, `supabase/functions/mystery-webhook-trigger/index.ts`, `api/generation-complete.js` — audited, confirmed correct, unmodified.
- `temp-files/MM Live - Parent49 (Accomplice-Beat Silent-Omission).blueprint.json` (local backup of live scenario `9106101`) — where the 25 affected module instances were traced; not modified.
