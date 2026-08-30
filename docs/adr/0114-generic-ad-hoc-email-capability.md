# ADR-0114: generic `send-custom-email` function so Claude can send ad hoc emails on explicit request

- **Status:** Superseded — reversed and removed same day, see Addendum below
- **Date:** 2026-08-30
- **Related:** none directly, but follows the same Resend/sender pattern already established by `send-mystery-ready-email`, `send-welcome-email`, `send-host-email`, etc.

## Context

Jonathan currently drafts one-off customer/operational emails and sends them by hand (copy from wherever they were drafted, paste into his email client). He asked for a faster path: Claude drafts, and — on his go-ahead — sends directly through the project's existing Resend account, instead of him copying and pasting.

Every existing `send-*-email` function in this codebase is single-purpose and trigger-bound (`send-mystery-ready-email` fires only from the `notify_package_ready()` DB trigger, `send-welcome-email` only from signup, etc.) — none of them accept arbitrary caller-supplied content, and none are meant to be invoked ad hoc for a one-off message.

## Decision

Added a new edge function, `send-custom-email`, that accepts `{ to, subject, bodyHtml, replyTo? }` and sends via the same Resend account and `support@mysterymaker.party` sender identity every other transactional email already uses, wrapped in the same brand shell (red header, dark body, footer) for visual consistency. It does no drafting or templating of its own — the caller (Claude, per Jonathan's explicit request each time) supplies the actual subject/body.

**Guardrails, by design:**

- **`verify_jwt = true`** (the codebase default — no function here overrides this without a reason, and this one has none). Matches the existing security posture of every other internal/repair function in this repo (`regenerate-child-content`, etc.), none of which add extra caller-identity checks beyond a valid Supabase JWT.
- **Not wired into any trigger, cron, or webhook.** Every call is a direct, deliberate invocation — currently only by Claude, using the service-role key already present in the local `.env` (never exposed client-side, never referenced in any frontend code). This is a categorically different risk shape than an automated send: it happens only when explicitly asked, the same way this ADR itself only exists because Jonathan asked for the capability.
- **No standing permission to send without asking first.** This ADR documents that the *mechanism* now exists, not that Claude may use it autonomously. The global rule on paid/metered APIs and the execution-care guidance on actions "visible to others" both still apply per-send: draft the content, get a go-ahead for that specific email, then send. Building a fully autonomous customer-contact loop (e.g., wiring this into a detector or cron) is explicitly out of scope here and would need its own ADR if ever proposed.

## Rationale

- **Reuses, doesn't duplicate, existing infrastructure.** Same Resend account, same sender, same brand shell pattern as six other functions already in this repo — no new dependency, no new provider decision.
- **Minimal surface.** No template logic, no customer-data lookups, no dedup/idempotency concerns (unlike `send-mystery-ready-email`, which has to guarantee exactly one send per package) — it's a thin, generic pass-through, which keeps the failure modes easy to reason about.
- **Matches this codebase's actual security bar for internal tools**, rather than inventing a stricter one for this function alone that the rest of the admin/repair surface doesn't have.

## Alternatives Considered

- **Reuse the local `.env`'s `SUPABASE_SERVICE_ROLE_KEY` to call the Resend API directly from this environment, no new edge function.** Rejected: would mean handling the `RESEND_API_KEY` outside Supabase's own secret store, and duplicating the brand-shell HTML that already lives in every other send function — more places for the sender identity/styling to drift.
- **Extend `send-mystery-ready-email` or another existing function to accept arbitrary content.** Rejected: that function's whole design is single-purpose and dedup-guaranteed by its trigger; overloading it with a generic "send anything" mode blurs that guarantee for no benefit.
- **Add a caller-identity check beyond `verify_jwt`** (e.g., a specific admin secret header). Considered, not built: no other function in this repo does this, and the service-role key itself is already the access boundary in practice — adding a second one here alone would be inconsistent without a broader admin-auth pattern to slot into.

## Consequences

- **Positive:** Claude can now send a reviewed, one-off email through Resend on Jonathan's explicit go-ahead, without him needing to copy/paste.
- **Deployed and smoke-tested live**: `send-custom-email` v1, `verify_jwt: true`. Sent a real test email to Jonathan's own address (not a customer) to confirm the full path — Supabase function → Resend API → real inbox — before considering this done.
- **Not done:** no logging/audit table for sends through this function (Resend's own dashboard has delivery history; not duplicated here). No rate limiting — acceptable given every call is a manual, explicit invocation, not an automated volume path.

## Key files

- `supabase/functions/send-custom-email/index.ts` — this ADR's implementation
- `supabase/functions/send-mystery-ready-email/index.ts` — the sender/brand-shell pattern this follows

## Addendum (2026-08-30, same day): reversed — Jonathan doesn't want this used

Later the same day, mid-incident (the Staša package-generation race condition, see ADR-0115), Jonathan said he'd changed his mind: he doesn't want branded/automated emails sent to customers on his behalf, even via an explicit per-send go-ahead. He copy/pastes plain, regular emails himself, almost always, because he doesn't want customer-facing messages carrying the brand shell — the thing this ADR's Rationale section treated as a feature (visual consistency with other transactional emails) is exactly what he doesn't want for ad hoc customer contact.

**Decision:** `send-custom-email` stays deployed (no destructive action taken without being asked) but is not to be used for customer-facing sends going forward. When asked to draft a customer email, produce plain text for Jonathan to copy/paste, not an HTML draft routed through this function.

**Follow-up (same day):** Jonathan confirmed removal. Deleted the deployed edge function (`supabase functions delete send-custom-email`) and the local source directory. This ADR's Status is superseded by this removal — the capability no longer exists.

This ADR's original Decision/Rationale/Consequences sections are left unedited above as the accurate record of same-day intent; this addendum is the correction, not a rewrite of history.

See also: memory note `feedback_no_automated_resend_customer_emails` (session-level behavioral guidance for future conversations); ADR-0115 for the incident this reversal happened during.
