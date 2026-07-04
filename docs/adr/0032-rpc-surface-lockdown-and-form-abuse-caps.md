# 0032. RPC surface lockdown and anonymous-form abuse caps

## Status

Accepted

## Date

2026-07-03

## Context

A Supabase security-advisor scan (run during the July 2026 pre-expiry hardening pass) flagged:

1. **11 `SECURITY DEFINER` functions executable by `anon` and `authenticated`** via the public REST API (`/rest/v1/rpc/...`). Supabase grants `EXECUTE` to these roles by default on every new function, so the exposed surface grows silently as functions are added.
2. **Three tables with intentionally-open anonymous `INSERT` policies** (`WITH CHECK (true)`): `contact_messages`, `guest_feedback`, `mystery_feedback`. These back public forms, but had no size limits — an attacker could insert megabyte-sized junk rows at will.
3. **Leaked-password protection disabled** in Supabase Auth (HaveIBeenPwned check on signup).

Not every flagged function is a problem. The guest/host access system is *deliberately* built on anon-callable token-gated RPCs, and the Make.com generation-verification flow calls `get_empty_characters` with the **anon key hardcoded in its HTTP modules** (see generation-monitoring design, Apr 2026) — revoking that one would silently break package generation for every customer.

## Decision

Split the exposed functions into a documented public surface and a locked-down internal set, applied in migration `security_hardening_rpc_lockdown_and_form_caps` (2026-07-03):

**Revoked from `public`, `anon`, `authenticated`** (service_role/postgres retain access):

| Function | Why it was safe to lock |
|---|---|
| `cold_case_orders_touch_updated_at()` | Trigger function; triggers fire regardless of caller EXECUTE |
| `notify_contact_message_webhook()` | Trigger function; same |
| `list_packages_missing_evidence_images(timestamptz)` | Admin/service-role detector (ADR-0016); exposed paid-customer titles + package IDs to anonymous callers |

**Kept anon-executable (the deliberate public surface):**

| Function | Why it must stay public |
|---|---|
| `get_token_by_short_code`, `get_character_by_token`, `get_character_details`, `get_packet_metadata_by_token`, `get_host_package`, `get_assignment_for_feedback` | Token-gated guest/host access pages (`CharacterAccess.tsx`, `HostAccess.tsx`, `GuestFeedback.tsx`) — callers are anonymous by design; the UUID/short-code token is the credential |
| `get_empty_characters(uuid)` | Called by Make.com parent scenario with the anon key (hardcoded in its HTTP modules). Returns only character names, gated by unguessable package UUID |
| `is_admin()` | Referenced inside RLS policies on `profiles`/`messages` with role `public` — revoking would error those queries for anon/authenticated. Returns only a boolean, `false` for anyone not an admin; leaks nothing |

**Abuse caps on open-insert tables:** `CHECK` constraints capping every text field (e.g. `message ≤ 5000`, `testimonial ≤ 3000`, names ≤ 200) and range-checking numeric fields (`star_rating` 1–5, `nps_score` 0–10, `attendee_count` 0–10000). Largest real value in production at the time was 331 chars, so the caps are invisible to legitimate users.

**Leaked-password protection:** must be enabled by hand in the dashboard (Authentication → Sign In / Up → Passwords) — not settable via SQL/MCP. Left as an operator action.

## Rationale

- The advisor list conflates "exposed" with "dangerous". The real risk items were the two trigger functions (should never be RPC targets), and the monitoring detector, which leaked customer data (titles, paid status) to unauthenticated callers.
- Grants are the cheapest, most reversible control: `REVOKE`/`GRANT` are single statements, take effect instantly, and don't touch function bodies or the Make.com side.
- Table-level `CHECK` constraints beat RLS-policy tightening for the form tables because the inserts are *supposed* to be anonymous; the threat is volume/size abuse, not access. Constraints also protect against a future buggy client.

## Alternatives Considered

1. **Revoke default EXECUTE for future functions** (`ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated`). Rejected for now: the guest-access architecture depends on new token RPCs being anon-callable, and a silent default-flip would strand a future session debugging "permission denied" with no visible cause. The tradeoff is that new functions stay auto-exposed — rerun the advisor scan periodically instead.
2. **Move form inserts behind an edge function with CAPTCHA/rate limiting.** Right answer if spam actually materializes; rejected today as over-engineering — three rows total exist across the three tables, there is no observed abuse, and it adds a moving part to flows that currently work.
3. **Revoke `is_admin` from anon only.** Considered; rejected because RLS policies with role `public` are evaluated for anon queries too, and a policy whose expression errors fails the whole query. Not worth the fragility to hide a constant `false`.
4. **Do nothing** (all findings were WARN/INFO). Rejected: the detector function genuinely leaked customer data, and the fix is one migration.

## Consequences

- Anonymous/authenticated API callers can no longer invoke the two trigger functions or the evidence-image detector; `SELECT * FROM list_packages_missing_evidence_images()` still works from service_role (GitHub-Action or MCP callers unaffected).
- Verified post-migration: the six guest/host RPCs + `get_empty_characters` + `is_admin` remain anon-executable; the three locked functions return permission-denied for anon/authenticated.
- Future security-advisor scans will still flag the deliberately-public functions — this ADR is the record of why they're accepted.
- If Make.com scenarios are ever migrated off the anon key, `get_empty_characters` can join the locked set.
- Form submissions exceeding the caps now fail with a constraint violation; frontend forms have their own shorter limits, so only abusive payloads hit this.

## Discussion

The main debate was where to draw the public/private line. The linter's implicit position ("nothing SECURITY DEFINER should be anon-callable") doesn't fit this architecture, where bearer-token RPCs *are* the guest access system (ADR-0031 added another one the same week). The test applied: does the function leak or mutate anything without possession of an unguessable credential? The six token RPCs and `get_empty_characters` pass (UUID/62^8 short-code gated), `is_admin` passes trivially (constant `false` for outsiders), and the detector failed — it takes no credential and returns customer data, so it was locked.

The second debate was whether spam caps belong in this pass at all given zero observed abuse. Kept because the cost is one constraint per table and the failure mode they prevent (database bloat from unauthenticated writes) is the kind that gets discovered only after it hurts.

## Key files

- Migration: `security_hardening_rpc_lockdown_and_form_caps` (applied 2026-07-03 via MCP)
- `docs/adr/0016-detect-missing-evidence-images-decoupled-from-needs-review.md` — the locked detector
- `docs/adr/0031-short-code-guest-links.md` — newest member of the deliberate public RPC surface
- `src/pages/CharacterAccess.tsx`, `src/pages/HostAccess.tsx`, `src/pages/GuestFeedback.tsx` — consumers of the public surface
