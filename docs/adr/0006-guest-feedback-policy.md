# ADR-0006: Guest Feedback: One Email at T+14d, Hosts Go to Trustpilot Separately

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made April 2026, captured retroactively)

## Context

After a mystery is run, two separate audiences could plausibly give us feedback, and they want different things from us:

- **Hosts** — the paying customer. They have an account, a relationship with the brand, and a reason to come back. Their public review on Trustpilot is high-value social proof for prospective customers.
- **Guests** — the host's friends/family who played a character. They have no account, may never visit the site again, and have a much weaker connection to the brand. Their feedback is high-signal for *product* improvement (which characters worked, what the experience felt like) but low value as public social proof — a stranger leaving a Trustpilot review about a party they attended doesn't read like a credible customer review.

Two related design problems:

1. **When to ask.** The system doesn't know the party date. We send character profile emails to guests at host's discretion, possibly weeks before the party. The actual play date is invisible to us.
2. **How many times to ask.** Email sequences ("we haven't heard from you, just checking in!") raise response rates on the margin but have meaningful downsides: guests are essentially a cold list from a CAN-SPAM/GDPR perspective (they did not opt into our marketing), and repeat asks to a non-customer audience read as spam.
3. **Where to send each audience.** Trustpilot wants public reviews; our internal `guest_feedback` table wants structured product data. They are not the same thing and forcing one channel to serve both purposes degrades both.

## Decision

**Two separate flows, one email each, different destinations.**

### Guest flow — internal feedback only

- **Trigger:** 14 days after `character_assignments.sent_at` (the moment the host emailed the character profile).
- **Mechanism:** `send-guest-feedback-emails` pg_cron job runs daily at 10:00 UTC, finds eligible rows, calls `send-guest-feedback-email` Edge Function via Resend. `character_assignments.feedback_email_sent_at` records the send for idempotency.
- **Destination:** `/guest-feedback/:token` page on the site, dark-themed, uses the existing `access_token` from `character_assignments` (no auth required). Submission writes to `guest_feedback` table.
- **One email. No follow-ups. No "we haven't heard from you" nudges.**
- **Privacy:** character profile emails carry a GDPR Art. 14 notice that we may follow up with a feedback request, satisfying the lawful-basis requirement for the single later message.

### Host flow — Trustpilot first, internal as secondary

- **Trigger:** 21 days after `mystery_packages.generation_completed_at` (the moment generation finished, used as a coarse proxy for "the party has probably happened by now").
- **Mechanism:** Existing `schedule_followup_emails` trigger inserts a row in `followup_emails`. `process-followup-emails` pg_cron runs at 10:15 UTC daily; `send-followup-emails` Edge Function sends via Resend.
- **Destination:** Trustpilot review page (`https://ca.trustpilot.com/evaluate/mysterymaker.party`) is the primary CTA. Internal feedback link is secondary.
- **Social proof upgrade:** if positive guest feedback (≥4 stars) is already in the DB at send time, the host email includes guest quotes as social proof to nudge a Trustpilot review.

### Cross-flow: real-time Trustpilot prompt when guest feedback is strong

- `notify-guest-feedback` Edge Function fires on every `guest_feedback` insert (DB trigger).
- Always notifies `support@`.
- If the rating is 4–5 stars AND the host's 21-day followup has already been sent (or skipped) AND the host hasn't already given Trustpilot feedback → sends an *immediate* Trustpilot prompt to the host, including the guest's quote.
- If the host's followup is still pending → does nothing. The scheduled email will pick up the guest data via the social-proof logic above.

## Consequences

**Positive:**
- **Legally defensible to guests.** One email, with a privacy notice on the originating character-profile email, is the lowest-volume ask that still gets us feedback. No sequences means no escalation of contact frequency with a non-customer audience.
- **The two audiences are served correctly.** Hosts get pushed to Trustpilot where their review compounds; guests get a tight survey targeted at product signal. Neither audience is asked to do something that doesn't match their relationship to the product.
- **Real-time positive-feedback amplification.** A guest's 5-star moment can trigger an immediate Trustpilot nudge to the host with the guest's words in hand — a higher-converting prompt than a generic "leave us a review" email.
- **Date-of-party not required.** We sidestepped the unknown by anchoring on send events the DB does know about. The 14-day and 21-day windows are coarse but they're the right shape for the question.
- **All idempotent.** Each send is gated by a column (`feedback_email_sent_at`, the `followup_emails` row, etc.), so cron retries can't double-send.

**Negative:**
- **14 days from "host sent the character email" is not 14 days from "the party happened."** Hosts who plan ahead 6+ weeks will get guests' feedback emails before the party, asking for feedback on something that hasn't happened. Mitigated by neutral copy ("if you've played..."); not eliminated. Acceptable because the alternative — building UI for hosts to set a party date — adds friction to the primary host flow for a downstream-audience benefit.
- **Single email means lower total response rate** than a 2- or 3-email sequence would yield. We're trading volume for trust posture. Acceptable given the audience.
- **No fallback if the 21-day timing misses the party.** Same shape of issue as above. Hosts who run the party 60 days later will get the Trustpilot prompt 39 days early. Less concerning than the guest case because hosts have a relationship and can engage with the email whenever.
- **Real-time Trustpilot prompt depends on a guest actually submitting** ≥4-star feedback. Without that signal, the host gets the standard 21-day email with no social-proof upgrade. The mechanism rewards engagement rather than guaranteeing it.

**When to revisit:**
- **If we add the ability for hosts to enter a party date,** anchor both timings on that date instead. Until then, send-anchored timing is the best signal we have.
- **If guest response rate falls below ~5% of sends,** consider a single reminder ("did you get my last email?") — but only one, and only after a measured drop, not preemptively.
- **If Trustpilot is replaced** by another public review source (G2, Capterra, Google Business), the host email's primary CTA changes but the structural decision — one channel for hosts, a different one for guests — should hold.
- **If we ever ask guests to leave Trustpilot reviews directly,** revisit carefully. The reasoning here is that they're a cold list with weak product-brand connection; that may shift if we ever invite guests to create accounts or play repeat games.

## Rejected alternatives

- **Email sequence to guests (2–3 emails).** Rejected on trust posture and legal grounds. Marginal response-rate gains are not worth being perceived as spammy by an audience that didn't sign up for marketing.
- **Send guests directly to Trustpilot.** Rejected. Guest reviews aren't credible as social proof for prospective *customers* (who are hosts, not guests), and a guest's mixed-experience review on Trustpilot is worth less to us than an honest answer on a structured internal form.
- **Wait for the host to mark "party happened" before sending guest emails.** Rejected as the primary mechanism. Adds host friction, and most hosts won't mark it. We can build this as an *optional* override later if needed without disturbing the time-anchored default.
- **One unified feedback flow for both audiences.** Rejected. Trustpilot serves a marketing-funnel purpose; internal `guest_feedback` serves a product-data purpose. Forcing them into one channel degrades both.
- **No automated feedback at all; ask manually.** Rejected: doesn't scale, and the data we miss (guest experience signal) is exactly the data hardest to recover later.
