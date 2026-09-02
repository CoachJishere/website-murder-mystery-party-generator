# 0078 — Post-Purchase Sequence: Scheduling Mechanism, Video Hosting, and ADR-0036 Gating

**Status:** Proposed
**Date:** 2026-08-12

## Context

Phase 1 of the post-purchase onboarding pipeline project (audit + design, see
`docs/post-purchase-sequence-design.md`) proposes two new emails: a Day+1
hosting-tips-and-video email, and a Day+2-3 email introducing the guest-dropout
adaptation feature (ADR-0036) as a paid last-resort. Building either requires three
architectural calls that would survive a rewrite of this feature:

1. Where do the new sends get scheduled from — a new mechanism, or one of the two
   patterns already live in production (audited in `docs/email-lifecycle-audit.md`)?
2. Where does the Day+1 video live, given it needs to render inside an email and on
   a phone at a party, and 13-language production cost is real?
3. What gates the Day+2-3 email specifically, given the feature it sells
   (ADR-0036) is `Status: Proposed` with zero implementation in the codebase?

## Decision

**1. Scheduling: extend the existing `followup_emails` trigger/cron pattern.**
Add two new `email_type` values (`hosting_tips_video`, `guest_dropout_intro`) to
the `schedule_followup_emails()` trigger function (the same function
`20260424_schedule_invite_friends_followup.sql` already extended once, to add
`invite_friends`), anchored to `mystery_packages.generation_completed_at` like the
existing `how_did_it_go` (+21d) and `invite_friends` (+14d) rows. Dispatch the new
types from the existing `send-followup-emails` edge function. No new table, no new
cron job — `process-followup-emails` already sweeps `followup_emails` daily at
10:15 UTC.

**2. Video hosting: YouTube, unlisted, linked via a thumbnail image (not embedded).**
The email contains a clickable static thumbnail linking out to an unlisted YouTube
video, plus a full written fallback in the same email. No `<video>` or iframe embed
(unsupported by most email clients).

**3. Day+2-3 email is gated on ADR-0036 shipping.** The trigger-function change that
schedules `guest_dropout_intro` rows should not be deployed until ADR-0036's paid
adaptation feature has a live entry point. Shipping the copy without the feature
sends buyers to a dead end.

> **Update (2026-09-02): this gate has been cleared.** ADR-0036 shipped 2026-08-15
> as "Recast," later renamed "Remove a Character" (ADR-0091) — live in production
> with a real UI entry point (`src/components/GuestDropoutPanel.tsx`) and real paid
> usage. Decision #3's *reason* (don't sell a feature that returns a 404) no longer
> applies; the `guest_dropout_intro` trigger branch is buildable now, pending the
> owner's go-ahead on the rest of this proposal. Left the original decision text
> above unedited as the accurate record of what was decided and why at the time.

## Rationale

**Scheduling.** The audit found two live patterns: (A) DB trigger inserts a
`followup_emails` row, daily cron sweeps due rows (used by `how_did_it_go` /
`invite_friends`), and (B) a cron polls a condition directly off `profiles` (used by
the discount reminders). Pattern A is the closer fit: both new emails are anchored
to a package-lifecycle event and need per-conversation one-shot delivery with a
skip/retry story, which is exactly what `followup_emails` already provides
(`status`, `scheduled_for`, `skipped_reason`, and a `(conversation_id, email_type)`
uniqueness guarantee via `ON CONFLICT`). Reusing it means the two new email types
inherit unsubscribe handling, locale resolution, and the sweep cadence for free —
the only new code is two `INSERT` branches in the trigger function and two new
`case` branches in `send-followup-emails`'s dispatch. A brand-new table or cron job
would duplicate all of that for no benefit.

**Video hosting.** Self-hosting means owning a CDN bill and format/bandwidth
adaptation across phones, laptops, and however guests open the email mid-party.
YouTube (even unlisted) offloads all of that for free and is a well-understood
pattern for "link out from a transactional email." Embedding was rejected outright:
major email clients (Gmail, Outlook, Apple Mail) strip `<video>` and iframe tags,
so an embed would silently degrade to nothing for most recipients — a thumbnail
link degrades gracefully everywhere and the written fallback covers clients that
block images too.

**ADR-0036 gating.** This isn't a preference, it's a hard dependency: the audit
confirmed zero implementation of the guest-dropout feature (`docs/adr/0036...md` is
`Status: Proposed`; no `adapt-mystery-*` functions exist; no frontend entry point
exists beyond a static line in the generated host guide). An email that says "here's
how it works, click here" with nothing on the other end is worse than not sending
it. Recording gating explicitly here (rather than leaving it as a build-time
judgment call) makes sure a future session doesn't wire up the trigger branch for
`guest_dropout_intro` without checking ADR-0036's status first.

## Alternatives Considered

- **New dedicated table/cron for the post-purchase sequence.** Rejected — no
  requirement this phase surfaced that `followup_emails` can't already serve;
  would fragment the "what emails is this conversation getting and when" query
  across two systems.
- **Self-hosted video (Supabase Storage or similar).** Rejected — real, ongoing
  infra cost and bandwidth bill for a problem YouTube already solves; revisit only
  if there's a hard requirement to keep video off a third-party platform.
- **Ship Day+2-3 email now with a "coming soon" framing instead of gating it
  entirely.** Considered, not chosen as the default — left as an explicit
  alternative in the design doc's decision table, since it's a legitimate call the
  owner might prefer (build anticipation vs. avoid a dead-end click). Default
  recommendation is to hold the email until the feature ships.

## Consequences

- `schedule_followup_emails()` gets a second extension (first was
  `20260424_schedule_invite_friends_followup.sql` for `invite_friends`); the
  pattern of "extend the trigger fn, add a dispatch case" is now used three times
  and worth treating as the standard extension point for future one-shot
  lifecycle emails.
- The Day+1 hosting-tips email can ship independently of ADR-0036 — it has no
  feature dependency, only a video-recording dependency (production task, not
  engineering).
- The Day+2-3 trigger branch must be tracked as a follow-up blocked on ADR-0036;
  if ADR-0036 is later abandoned or its status changes, this ADR's Decision #3
  should be revisited (not silently shipped anyway).
- No new infra to operate (no new cron, no new storage bucket, no new CDN
  contract).

## Discussion

The load-bearing question was whether the new emails were different enough from
`how_did_it_go`/`invite_friends` to justify their own mechanism. They aren't: both
are "one-shot email, N days after a package-lifecycle event, respects a locale and
an unsubscribe flag" — the exact shape `followup_emails` was built for. The only
genuine complexity is on the content side (video, a not-yet-built feature to sell),
not the scheduling side, which argues for spending the engineering budget there
instead of on a parallel scheduling system.

The video decision was close to a non-decision (YouTube-unlisted-with-fallback is
the standard pattern for this exact problem), but recording it prevents a future
session from re-litigating "should we self-host" without knowing the bandwidth/CDN
tradeoff was already considered.

## Key files

- `supabase/functions/send-followup-emails/index.ts` — add dispatch cases for
  `hosting_tips_video` and `guest_dropout_intro`
- `supabase/migrations/20260424_schedule_invite_friends_followup.sql` — pattern to
  extend again for the two new `email_type` values (new migration, don't edit this
  one)
- `docs/adr/0036-guest-dropout-adaptation-feature.md` — the gating dependency for
  Decision #3
- `docs/email-lifecycle-audit.md` — ground truth this ADR builds on
- `docs/post-purchase-sequence-design.md` — the design doc this ADR supports
