# ADR-0002: Contact Form Architecture

- **Status:** Accepted
- **Date:** 2026-05-21

## Context

The `/support` (and `/contact`) page on mysterymaker.party rendered a fully styled contact form that did not actually submit anything. The `onSubmit` handler in `src/pages/Support.tsx` tracked a `contact_form_submit` event in Google Analytics, logged the form data to the browser console, waited 1 second to simulate latency, and then showed a success toast. There was no email send, no database insert, no edge function call. A comment in the code read "In a real implementation, this would send an email or create a database entry."

This was discovered on 2026-05-21 after a customer reported attempting to submit the form multiple times without ever receiving a reply. None of their submissions were recoverable — only metadata (subject string, name length, email domain) was tracked, not the message content, name, or email itself.

The codebase already has two working feedback systems that serve as reference patterns:
- `mystery_feedback` (host feedback) — DB table + `notify-feedback` edge function triggered by Postgres after-insert.
- `guest_feedback` — DB table + `notify-guest-feedback` edge function with similar trigger pattern.

Both use the same shape: insert to DB → trigger fires → edge function posts to support and (optionally) sends additional email. The pattern is proven in production.

The choice space for replacing the broken Support form:

1. **Email-only via edge function.** Form posts to an edge function that sends a Resend email to support@. No DB.
2. **DB-backed with edge function notification.** Form posts to an edge function that inserts a row and triggers a notification email. Mirrors existing feedback patterns.
3. **Third-party form service** (Formspree, Basin, etc.). Outsource the whole thing.

Spam protection options:
- a. Honeypot field (hidden input bots fill in; rejected silently)
- b. IP rate limiting (max N submissions per hour)
- c. CAPTCHA / Cloudflare Turnstile (interactive challenge)
- d. Nothing

## Decision

**Architecture: option 2 — DB-backed with edge function notification.**

- New `contact_messages` table (`id`, `created_at`, `name`, `email`, `subject`, `message`, `language`, `user_id` nullable, `user_agent`, `ip_address`, `resolved_at` nullable). RLS: anon can insert, admins can read.
- New `submit-contact-form` edge function: validates input, enforces honeypot and IP rate limit, captures `user_id` server-side from JWT when present, inserts row.
- Postgres after-insert trigger calls new `notify-contact-message` edge function, which sends:
  - Email to support@mysterymaker.party with full content.
  - Localized auto-reply to the submitter confirming receipt. Reuses the per-function inlined locale-table pattern from ADR-equivalent email-localization work (May 2026).

**Spam protection: a + b (honeypot + IP rate limit).**

- Hidden `website` field; submissions where it is non-empty are rejected silently with a fake 200.
- IP rate limit: max 5 submissions per hour, enforced via a count query against `contact_messages` from the edge function.
- No CAPTCHA initially.

**Frontend changes (`src/pages/Support.tsx`):**

- Replace fake `onSubmit` with real `supabase.functions.invoke('submit-contact-form')` call.
- Pass current i18n language in the payload so the auto-reply is localized.
- Add hidden honeypot input.
- Toast success **only** on `data.ok === true`. Toast error otherwise. Remove the 1-second `setTimeout` simulation.

**Admin UI: out of scope for this ADR.** The email-to-support flow gives Jonathan the working surface today. A future ADR may add a `contact_messages` admin viewer if message volume warrants resolved/unresolved triage in-app.

## Consequences

**Positive:**
- **Messages cannot be lost again.** Even if Resend is down at submit time, the row is durable in Postgres and visible via SQL or future admin UI.
- Pattern reuse: matches `mystery_feedback` and `guest_feedback`, so future maintainers (human or Claude) recognize the shape immediately.
- Auto-reply gives the submitter visible proof their message was received — closing the trust gap that this incident created.
- Honeypot has zero UX cost; rate limit only affects abusers.
- Server-side `user_id` capture from JWT means authenticated users' messages are linkable to their account without trusting client input.

**Negative:**
- IP rate limit lives in the DB (one extra count query per submit). At current traffic volume this is trivial; if traffic grows by 100x we may want to move it to Redis or a dedicated rate-limit table with an index on `(ip_address, created_at)`.
- Honeypot will not stop targeted spam (an attacker who reads the source can skip the field). When/if spam volume crosses ~10/day of garbage that makes it past honeypot, escalate to Cloudflare Turnstile.
- Storing `ip_address` is a minor privacy consideration. Justified by the rate-limit and abuse-investigation use cases. Retention should be revisited if/when we add a formal data-retention policy.
- No admin UI means resolved/unresolved state is tracked manually via SQL until enough volume justifies the build. Acceptable at current scale (<<1 message/day expected based on historical pattern).

**When to revisit:**
- **Spam volume:** if >10/day of garbage gets past honeypot → add Turnstile. Write superseding ADR.
- **Message volume:** if >5/day legitimate messages → build admin UI for resolved/unresolved triage. Write superseding ADR.
- **Email reliability:** if Resend delivery to support@ becomes unreliable (>1% bounce/fail), consider adding a polling fallback that lists unread `contact_messages` in the admin dashboard. Write superseding ADR.
- **Multilingual auto-reply maintenance burden:** the per-function inlined locale-table pattern starts to hurt at ~5+ functions doing the same thing. Consider a shared locale module if a sixth email-sending edge function is added.

## Rejected alternatives

- **Email-only (option 1):** rejected because the failure mode of this incident is exactly "email send fails silently." DB-backed insurance is cheap.
- **Third-party form service (option 3):** rejected because we already have edge functions and Resend wired up. Adding a third party for a single form adds a vendor dependency without simplifying anything.
- **CAPTCHA from day one:** rejected because no observed spam yet. Adding friction to every user to defend against a hypothetical problem is the wrong default. Escalation criteria above.
- **No spam protection at all:** rejected because honeypot is free.
