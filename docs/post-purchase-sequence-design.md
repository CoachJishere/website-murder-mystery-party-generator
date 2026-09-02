# Post-Purchase Sequence — Design (Phase 1: design only, nothing sends)

**Date:** 2026-08-12
**Status:** Proposed — awaiting owner approval before any build work
**Depends on:** [`docs/email-lifecycle-audit.md`](email-lifecycle-audit.md) (read that first — it's the ground-truth map this design slots into), [ADR-0036](adr/0036-guest-dropout-adaptation-feature.md), [ADR-0078](adr/0078-post-purchase-sequence-scheduling-and-video-hosting.md)

## The two blockers this design has to account for

The audit surfaced two things the original brief assumed that don't hold up against the code:

1. **There is no confirmed customer-facing T0 purchase email.** The only thing the webhook sends at purchase time goes to `support@mysterymaker.party`, not the buyer. Whatever the buyer gets (if anything) is Stripe's own receipt, controlled outside this repo. **Recommendation: verify the Stripe Dashboard "Successful payments" customer-email setting before this ships** — if it's off, the T+1d email below is effectively the first branded touchpoint after checkout and should say so explicitly (see draft copy). *(Still unconfirmed as of 2026-09-02 — the static Payment Link / support-only-email architecture this depends on hasn't changed since the audit.)*
2. ~~**ADR-0036 (the feature the second email would sell) is Status: Proposed, not built.** No `adapt-mystery-*` functions, no frontend entry point exist yet. **The T+2-3d email cannot go live until that feature ships.** This design includes its copy and scheduling so the sequence is ready the moment ADR-0036 lands, but flags it clearly as blocked.~~ **Resolved as of 2026-08-15 — no longer a blocker.** ADR-0036 shipped as "Recast" (later renamed "Remove a Character," ADR-0091), live in production with a real UI entry point (`src/components/GuestDropoutPanel.tsx`) and real paid usage. Email B's gating condition (below) is satisfied; it's buildable now, pending the owner's go-ahead on the rest of this design.

## The sequence

```
Day 0   Purchase (is_paid=true, purchase_date set) → generation runs (Make.com)
          └─ generation_completed_at set on mystery_packages
             (per Sales Signals data, most buyers convert same-session, so purchase
             and generation-complete are usually hours apart, not days)

Day 0   [existing, unconfirmed] Stripe receipt, maybe — verify before relying on it

Day +1  NEW: hosting-tips + video email  ─┐
Day +2–3 NEW: guest-dropout-intro email    ├─ this design
                (BLOCKED on ADR-0036)      ┘

Day +14 [existing] guest feedback request — per-guest, off character_assignments.sent_at
Day +14 [existing] invite_friends — off generation_completed_at, paid hosts only
Day +21 [existing] how_did_it_go (Trustpilot ask) — off generation_completed_at
```

### Collision analysis

- **No timing collision.** The new emails land at +1 and +2-3 days; the nearest existing email is +14 days. Eleven days of clearance.
- **No audience collision with the welcome-discount reminders** (day 5/7 post-*signup*): that cron explicitly skips anyone with `is_paid=true` on any conversation, so a buyer never receives both a discount nudge and the new sequence.
- **`invite_friends` already restricts to paid hosts** (`convo.is_paid`); the new sequence is *only* triggered for paid hosts by construction (see anchor below), so no new audience-gating logic is needed there.
- **Anchor choice:** recommend anchoring the new sequence to `generation_completed_at` (same anchor `how_did_it_go`/`invite_friends` already use), not `purchase_date`. Reasons: (a) the hosting-tips email is about the *package*, which doesn't exist until generation completes; (b) it reuses the exact trigger/cron pattern already proven in production (see ADR-0078) instead of introducing a second anchor column to reason about; (c) for the ~91% of buyers who convert same-session, purchase and generation-complete are close enough in practice that "Day +1" reads the same either way.

### Unsubscribe handling

Recommend **splitting behavior between the two new emails**, matching how the existing lifecycle already treats "instructional" vs. "marketing" mail differently:

- **Day +1 hosting-tips email** = treat as transactional/instructional, like the host-guide and character-assignment emails (neither of which checks `unsubscribed_from_followups` today). A buyer who wants their package tips shouldn't lose them because they unsubscribed from Trustpilot nudges.
- **Day +2-3 dropout-intro email** = treat as the marketing/upsell tier, like `invite_friends` and `how_did_it_go` — respect `unsubscribed_from_followups`.

This is a judgment call, not a fact pulled from code — flagging it as an open decision below in case the owner disagrees.

## Open decisions needing the owner's call

| Decision | Recommendation | Why | Alternative |
|---|---|---|---|
| **Scheduling mechanism** | Extend `followup_emails` + the existing trigger/cron (Pattern A in the audit) with two new `email_type` values | Reuses proven infra, no new cron job, no new table, respects the existing `(conversation_id, email_type)` uniqueness | A dedicated new table/cron — more code, no clear benefit |
| **Video hosting** | YouTube, unlisted, linked via a clickable thumbnail image in the email (not embedded — most email clients strip `<video>`/iframe) | Zero infra cost, no bandwidth bill, YouTube handles all device/bandwidth adaptation | Self-host (adds a CDN cost + infra you'd own) |
| **Localization of the new emails** | Ship EN-only initially; non-EN buyers get the **written fallback only**, rendered in their locale using the existing 13-lang string-table pattern (cheap — it's just text) | EN ≈ 91% of revenue per the brief; recording/subtitling 3-4 videos in 13 languages is a real production cost for the other 9% | Full 13-lang video from day one |
| **Segmentation** | Send the dropout-intro email to **all paid buyers**, not just large parties | It's a single cheap email; party size isn't a clean proxy for dropout risk (a 4-person party can still lose a guest); simplicity | Restrict to parties above N guests |
| **Day +2-3 email launch timing** | ~~Hold until ADR-0036 ships~~ **No longer blocked — ADR-0036 shipped 2026-08-15 (see update at top of doc).** Can ship whenever the owner approves the rest of this design. | Can't sell a feature that returns a 404 — no longer applies, the feature is live | N/A, blocker resolved |

## Draft copy (EN) — for your review, not final

Copy avoids em dashes per the customer-messages rule. `{{title}}` = mystery title, `{{host_name}}` = host's name, `{{mystery_style}}` branches the subject/body.

---

### Email A — Day +1: Hosting tips + video

**Subject (character style):** `3 quick tips for hosting {{title}}`
**Subject (detective style):** `3 quick tips for hosting {{title}} (and how the detective role works)`

> Hi {{host_name}},
>
> Your mystery, **{{title}}**, is ready to go. Before the big night, here's a short video (about 4 minutes) with a few things that make hosting go smoothly, from someone who's run a lot of these.
>
> **[Watch the video →]**
>
> Prefer to read instead? Here's the short version:
>
> - **Pace the reveal.** Don't rush between rounds, let guests actually talk to each other and dig for clues, that's most of the fun.
> - **Cast the key roles carefully.** A couple of characters carry the plot. If you can, give those to the guests you're most confident will show up on the night.
> {{#if detective}}
> - **The detective's job.** Whoever runs the detective role reads the final reveal script at the end, no acting required, just reading clearly and keeping the pace up.
> {{/if}}
> - **Keep your host guide handy.** It's got the full timeline and everything you need on hand: **[Open your host guide →]**
>
> Have a great night. If anything comes up, just reply to this email.
>
> — The Mystery Maker team

*(If the T0 receipt question resolves to "no branded email exists," open with a one-line "Thanks again for your purchase" before the tips, so this doesn't read like a cold follow-up.)*

---

### Email B — Day +2-3: Guest-dropout adaptation (was BLOCKED on ADR-0036 shipping — unblocked 2026-08-15, see update above)

**Subject:** `If a guest can't make it to {{title}}`

> Hi {{host_name}},
>
> One more thing worth knowing before the night: sometimes a guest cancels last minute. It happens, and it doesn't have to derail your party.
>
> Your host guide already has some free options: a remaining guest can double up on a role, or you can simply hold that character "offstage" for the night.
>
> If neither of those works for your group, we also offer a quick paid fix: for $5, we'll adapt your mystery so it plays cleanly with one fewer character, no re-sending sheets your other guests already have. It's meant as a last resort, not something you need to plan around.
>
> **[See how it works →]**
>
> Hopefully you never need it. Just wanted you to know it's there.
>
> — The Mystery Maker team

---

## What this phase does NOT include (per the hard constraints)

- No code, no migration, no new `followup_emails` rows, no cron changes.
- No video has been recorded.
- No live/test emails were sent. No real customer data was touched.
- Email B is copy-only, no code written yet — nothing in this phase was ever wired into the trigger function, regardless of ADR-0036's status.
