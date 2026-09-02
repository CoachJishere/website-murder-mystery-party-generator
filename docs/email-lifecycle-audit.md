# Email Lifecycle Audit

**Date:** 2026-08-12
**Author:** Claude Code (phase-1 audit for the post-purchase onboarding pipeline project)
**Scope:** Every email currently sent by the Mystery Maker app, re-derived from the live code and the live Supabase project (`mhfikaomkmqcndqfohbp`) — not from prior chat/memory summaries. Provider is [Resend](https://resend.com) (`RESEND_API_KEY`, all sends via `https://api.resend.com/emails`, from address `Mystery Maker <noreply@mysterymaker.party>`) except where noted.

## TL;DR — the map

| # | Email | Audience | Trigger | Timing | Locales | Source |
|---|---|---|---|---|---|---|
| 1 | Welcome email | New signup (customer) | Client call on account creation | Immediate | 13 | [`send-welcome-email/index.ts`](../supabase/functions/send-welcome-email/index.ts), called from [`AuthCallback.tsx:89`](../src/pages/AuthCallback.tsx) |
| 2 | Welcome discount code generated | New signup (customer) | Client call on account creation | Immediate | n/a (no email itself) | [`generate-welcome-discount/index.ts`](../supabase/functions/generate-welcome-discount/index.ts), called from [`AuthCallback.tsx:118`](../src/pages/AuthCallback.tsx) and [`SignUp.tsx:72`](../src/pages/SignUp.tsx) |
| 3 | Discount reminder — Day 5 | Unconverted signup w/ active promo (customer) | Cron `send-discount-reminders` | Daily 09:00 UTC; fires when 24-48h left on the 7-day promo | 13 | [`send-discount-reminders/index.ts`](../supabase/functions/send-discount-reminders/index.ts) |
| 4 | Discount reminder — Day 7 | Same | Same cron | Fires when <24h left | 13 | Same file |
| 5 | **"Purchase confirmation"** | **Internal only** (`support@mysterymaker.party`) | `checkout.session.completed` webhook | Immediate | n/a (English, internal) | [`stripe-webhook/index.ts:171-232`](../supabase/functions/stripe-webhook/index.ts) — **see finding below, this is not a customer-facing receipt** |
| 6 | Host Guide + Detective Kit ready | Host (customer) | Host clicks "send host kit" in the app | Whenever host clicks it | 13 | [`send-host-email/index.ts`](../supabase/functions/send-host-email/index.ts), called from [`MysteryGuestManager.tsx:113`](../src/components/MysteryGuestManager.tsx) |
| 7 | Character assignment | Guest | Host clicks "send" per guest | Whenever host clicks it | 13 | [`send-character-email/index.ts`](../supabase/functions/send-character-email/index.ts), called from [`MysteryGuestManager.tsx:276`](../src/components/MysteryGuestManager.tsx) |
| 8 | Guest feedback request | Guest | Cron `send-guest-feedback-emails` → `public.send_guest_feedback_emails()` → batch call to edge fn | Daily 10:00 UTC; fires 14d after that guest's character email was sent (`character_assignments.sent_at`) | 13 (rendered in **host's** locale) | [`send-guest-feedback-email/index.ts`](../supabase/functions/send-guest-feedback-email/index.ts) |
| 9 | Host followup — Trustpilot ask (`how_did_it_go`) | Host | DB trigger `trigger_schedule_followup_emails` on `mystery_packages` schedules a row; cron `process-followup-emails` → `public.process_followup_emails()` → `send-followup-emails` edge fn sends due rows | Scheduled `generation_completed_at + 21 days`; sweep runs daily 10:15 UTC | 13 | [`send-followup-emails/index.ts`](../supabase/functions/send-followup-emails/index.ts); trigger fn in [`20260424_schedule_invite_friends_followup.sql`](../supabase/migrations/20260424_schedule_invite_friends_followup.sql) |
| 10 | Host followup — invite friends (`invite_friends`) | Host (paid only) | Same trigger/cron pipeline as #9 | Scheduled `generation_completed_at + 14 days` | 13 | Same files |
| 11 | Trustpilot ask — early fire | Host | DB trigger on `guest_feedback` INSERT → `notify-guest-feedback` edge fn | Immediate, only if guest rated 4-5★ **and** the scheduled #9 row is not still pending | 1 (fixed template, not locale table) | [`notify-guest-feedback/index.ts`](../supabase/functions/notify-guest-feedback/index.ts) |
| 12 | Contact-form auto-reply | Whoever submitted the contact form | DB trigger `on_contact_message_insert` → `notify-contact-message` edge fn | Immediate | 13 | [`notify-contact-message/index.ts`](../supabase/functions/notify-contact-message/index.ts); + internal copy to support@ |
| 13 | Generation-issue alert | **Internal only** | Client call from `MysteryView.tsx` when generation looks stuck | Immediate | n/a | [`notify-generation-issue/index.ts`](../supabase/functions/notify-generation-issue/index.ts), called from [`MysteryView.tsx:761`](../src/pages/MysteryView.tsx) |
| — | `backfill-welcome-discounts` | n/a | Manual/admin invoke | Ad hoc | — | [`backfill-welcome-discounts/index.ts`](../supabase/functions/backfill-welcome-discounts/index.ts) — one-off remediation utility, not part of the live automated lifecycle |
| — | `send-seo-digest` | Internal | Cron (SEO/GEO digest, ADR-0018) | Weekly | — | Unrelated to customer lifecycle, listed for completeness |

Non-email edge functions in `supabase/functions/` (`mystery-ai`, `mystery-webhook-trigger`, `parse-claude-json`, `regenerate-parent-content`, `regenerate-child-content`, `generate-evidence-images`, `generate-pointform-summaries`, `store-evidence-images`, `auto-remediate-packages`, `submit-contact-form`) are generation-pipeline plumbing, not part of the email lifecycle — omitted above.

## Finding: there is no customer-facing purchase confirmation email in code

The brief (and the ADR-0036 handoff note) assumed a T0 purchase-confirmation email "already exists." It doesn't, in this codebase:

- Checkout is a static **Stripe Payment Link** (`https://buy.stripe.com/dRm4gAgls6c47UccYV2Nq03`, hardcoded in [`MysteryPurchase.tsx:466`](../src/pages/MysteryPurchase.tsx)), not a dynamically created Checkout Session. There is no `checkout.sessions.create` call anywhere in the repo — I grepped for it and found nothing.
- The only Resend send inside `stripe-webhook`'s `checkout.session.completed` handler goes `to: ["support@mysterymaker.party"]` — it's a **sales alert to the team**, not a receipt to the buyer ([`stripe-webhook/index.ts:207-219`](../supabase/functions/stripe-webhook/index.ts)).
- The only thing a buyer could be receiving at T0 is **Stripe's own built-in payment receipt**, which is a Stripe Dashboard setting ("Settings → Customer emails → Successful payments") outside this repo — I cannot confirm from code whether it's switched on. Recommend checking the Stripe Dashboard directly before assuming buyers get anything at T0.
- Practically: the app does redirect the buyer to a `success_url` in-app, so there's an in-app confirmation moment, just not necessarily an email one.

**Why this matters for the new sequence:** if Stripe's receipt is off, or is generic/unbranded, the T+1d email in the proposed sequence may be the *first* branded email a buyer gets after paying — which argues for it opening with an explicit "thanks for your purchase" beat, not assuming that ground was already covered. See the design doc.

## Finding: ADR-0036 (the feature the T+2-3d email would promote) is not built

`docs/adr/0036-guest-dropout-adaptation-feature.md` is **Status: Proposed**. I grepped the frontend and edge functions for any trace of it (`dropout`, `adapt-mystery`, `GuestDropout`, `CantMakeIt`) and found only a static line in the generated Host Guide template ("If several guests drop out, consider regenerating the mystery..." — [`HostGuideTemplate.tsx:100-103`](../src/components/HostGuideTemplate.tsx)). None of the anticipated `supabase/functions/adapt-mystery-*` functions exist, and there's no "a guest can't make it" entry point in `MysteryView.tsx` or anywhere else. **The T+2-3d email cannot ship as scoped in the brief until ADR-0036's paid feature is actually built** — see the design doc for sequencing options.

> **Update (2026-09-02): this finding is now stale.** ADR-0036 shipped three days after this audit — launched live 2026-08-15 as "Recast," later renamed "Remove a Character" (ADR-0091), with a real entry point (`src/components/GuestDropoutPanel.tsx`), `adapt-mystery-apply`/`adapt-mystery-*` edge functions, and real paid usage (see CHANGELOG "Recast is LIVE in production," ADR-0088's reassignment work). ADR-0036's own header still says `Status: Proposed` — that's just stale metadata on that ADR, not a sign the feature is unbuilt. **The T+2-3d email's gating dependency is satisfied**; the blocker described in the rest of this audit (and in ADR-0078 Decision #3) no longer applies. Left the finding above unedited as the accurate historical snapshot at the time this audit was written.

## Update (2026-09-02): one lifecycle email missing from the table above

This audit predates [ADR-0106](adr/0106-single-source-of-truth-ready-notification.md) (shipped ~2026-08-20): the **"Your Mystery is Ready" email** (`supabase/functions/send-mystery-ready-email/index.ts`), fired by the `notify_package_ready()` trigger the moment a package's `generation_status` transitions into `completed`. It belongs in the table above as a 14th row (Host, immediate, 1 locale — English only, no i18n table). Not retrofitted into the table itself to keep this doc as an accurate point-in-time snapshot; noted here instead.

## Scheduling mechanisms in play (ground truth from `cron.job` + `pg_proc`)

Two distinct patterns are already live, both worth knowing before choosing a third:

**Pattern A — DB trigger inserts a row, daily cron sweeps due rows** (used by #9/#10):
```
trigger_schedule_followup_emails (AFTER UPDATE OF generation_completed_at ON mystery_packages)
  → INSERT INTO followup_emails (conversation_id, user_id, email_type, scheduled_for)
      ON CONFLICT (conversation_id, email_type) DO NOTHING
cron "process-followup-emails" @ 10:15 UTC daily
  → public.process_followup_emails()  -- plpgsql, net.http_post to the edge fn
  → send-followup-emails edge fn: SELECT * FROM followup_emails WHERE status='pending' AND scheduled_for <= now()
```
`followup_emails` columns: `id, conversation_id, user_id, email_type, status ('pending'/'sent'/'skipped'), scheduled_for, sent_at, skipped_reason, created_at`. Unique on `(conversation_id, email_type)` (enforced via the `ON CONFLICT` target). Adding a new `email_type` value is a pure data change — no schema migration needed, just a new `INSERT` branch in the trigger function and a new dispatch case in `send-followup-emails`.

**Pattern B — daily cron polls a condition directly off `profiles`** (used by #3/#4, the discount reminders): no intermediate table, the cron'd edge function computes eligibility (`welcome_promo_expires_at` window, `discount_reminder_dayN_sent` flags) itself each run.

**Guest feedback (#8)** is its own variant: no `followup_emails` row at all — `character_assignments.sent_at` + `feedback_email_sent_at IS NULL` is the eligibility check, run in batch mode daily at 10:00 UTC.

## Unsubscribe / suppression

- `conversations.unsubscribed_from_followups` (boolean) is checked by: `send-followup-emails` (both `how_did_it_go` and `invite_friends`), `send-guest-feedback-email` (batch mode filters it out via a join through `mystery_packages`), and `notify-guest-feedback` (skips the early-fire Trustpilot ask if set).
- It is **not** checked by: `send-discount-reminders`, `send-welcome-email`, `send-host-email`, `send-character-email` — those aren't "followups" in the unsubscribe's original sense (transactional/functional, not marketing-style nurture), which is a reasonable existing distinction to preserve for the new sequence.
- No separate "video sequence" unsubscribe scope exists — the new sequence would either reuse `unsubscribed_from_followups` (bundling with Trustpilot/invite-friends) or need its own flag. See design doc.

## Locale handling

All 13 languages (`en, es, fr, de, it, pt, nl, da, sv, fi, ko, ja, zh-cn`) are supported via `supabase/functions/_shared/email-i18n.ts` — a shared `Locale` type + `normalizeLocale()` + `pickByLocale()` + `getUserLanguage()` helper, with each function inlining its own string table (deliberate, for cold-start resilience per the file's own header comment). Guest-facing emails (character assignment, guest feedback) render in the **host's** locale, not a guest-specific one — guests don't have accounts/profiles to read a language from.

## Open items surfaced during this audit (not this phase's job to fix, flagging for awareness)

- Host-guide/character emails are host-triggered, not automatic — a host can purchase and sit on unsent invites for weeks. The 14d/21d host followups run off `generation_completed_at`, **not** off when the host actually sent anything to guests. That's an existing design choice, not a bug, but it means "day 14 invite-friends" can arrive before some guests have even been invited.
- `notify-guest-feedback`'s early-fire Trustpilot template is a single hardcoded-English template (not in the 13-lang `T` table pattern used elsewhere) — inconsistent with the rest of the lifecycle, worth a follow-up ticket, out of scope here.
