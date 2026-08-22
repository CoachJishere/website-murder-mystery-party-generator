# ADR-0100: original PostHog project lost, recreated fresh without recovering historical data

- **Status:** Superseded by ADR-0102
- **Date:** 2026-08-21

## Context

Investigating a feature idea (inferring average time between purchase and actual game night from clustering/dwell-time patterns on character and Host Guide pages) surfaced that the site's PostHog integration — added 2026-04-24 (commit `652ceae`, `src/lib/posthog.ts`) and sending real production events (`$pageview`, `package_tab_viewed`, `homepage_video_played`) ever since — no longer points at anything reachable.

Confirmed empirically via the PostHog API (using a freshly created personal API key, since the one an agent created on the original setup date, "Windsurf-Claude," was itself unreadable after creation and untestable):

- The account (`millerdjonathan@gmail.com`) belongs to exactly one organization, "CoachJ" (id `019c6ffd-9c7b-0000-1e8c-59ab8be7b740`), created 2026-02-18.
- That org has exactly one member — this account, joined at the org's creation timestamp — ruling out a teammate or second account ever having had access.
- That org has exactly one project, created today (2026-08-21) during this investigation, with `ingested_event: false`.
- No project matching the live site's actual token has ever existed in this org, as far as the API can show.

The most likely explanation: a project existed in CoachJ from 2026-04-24 and was later deleted, plausibly when another project (Speedback) was set up under the same account and a plan limit forced a swap. This can't be confirmed — PostHog's audit/activity log (`/api/projects/{id}/activity_log/`) returned `payment_required`, gated behind a paid plan we're not on.

The old project's token (`VITE_POSTHOG_KEY` in Vercel) can't be recovered either: it was saved as a Vercel "Sensitive" environment variable, a type that is permanently unrevealable through the dashboard once saved, even to the account owner. Without the token, a PostHog support request has no self-serve lead to hand over beyond the account/org id and an approximate date range — and support itself isn't accessible without a paid plan.

## Decision

Stop pursuing recovery. Use the new project created during this investigation (id `569867`, "Mystery Maker," token `phc_nWJE7Euc6KTzgYtMNgX4S4vzf6kWhzABgSerCznbD4D3`) going forward:

1. No code changes — `src/lib/posthog.ts` already reads `VITE_POSTHOG_KEY` from the environment dynamically.
2. Update `VITE_POSTHOG_KEY` in Vercel (website project) to the new project's token, scoped the same as before (Production + Preview), then redeploy.
3. Accept that all events between 2026-04-24 and 2026-08-21 are gone. The purchase-to-play timing analysis that prompted this investigation starts collecting from zero today instead of drawing on ~4 months of existing history.

## Rationale

- **The paid-plan gate blocks every remaining recovery lever at once**: audit logs (confirm deletion), and a support ticket with enough evidence to be actionable (we have account/org/dates but not the token). There's no self-serve path left to exhaust.
- **Empirical confirmation, not assumption**: this wasn't given up on the first "I don't see it" — it was checked via direct API calls (`/api/organizations/`, `/api/organizations/{id}/members/`), which is a stronger signal than the dashboard UI alone (rules out UI caching/rendering bugs as the explanation).
- **The underlying question doesn't require the old data to move forward**: the dwell-time/clustering analysis is a go-forward measurement either way; every additional day spent chasing 4 months of history is a day not spent collecting the next 4.

## Alternatives Considered

- **Upgrade to a paid PostHog plan** solely to unlock audit logs and support access. Rejected: disproportionate ongoing cost for recovering supplementary analytics data (not a product-breaking loss), when the same spend could be revisited later if a stronger reason emerges.
- **Keep searching for a second account/org** (different email, forgotten login). Rejected: git blame on the original integration commit and the org's own membership record both point to this exact account; no evidence of any other identity being involved.
- **Try to brute-force or otherwise recover the Vercel "Sensitive" value.** Not possible by design — this is the feature's entire purpose (unlike a normal encrypted env var, a Sensitive one is never re-displayed after creation).

## Consequences

- **Positive:** unblocks the original ask immediately — once the env var is swapped and redeployed, event capture resumes and the purchase-to-play timing analysis can start accumulating real data.
- **Negative:** ~4 months of production analytics (2026-04-24 through 2026-08-21) — pageviews, tab views, homepage video plays — are permanently unrecoverable through any means available at the free plan tier.
- **Not addressed:** the precise mechanism and date of the original project's deletion (plan-limit auto-swap vs. a manual action) was never conclusively determined. Revisit only if a paid-plan upgrade happens for unrelated reasons — the audit log would settle it retroactively.

## Key files

- `src/lib/posthog.ts` — unchanged; reads `VITE_POSTHOG_KEY` from `import.meta.env`, no code path needs updating
- Vercel project `website-murder-mystery-party-generator`, env var `VITE_POSTHOG_KEY` (external to repo) — value to be swapped to the new project token
