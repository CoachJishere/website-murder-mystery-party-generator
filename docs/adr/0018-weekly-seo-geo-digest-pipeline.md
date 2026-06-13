# ADR-0018: Weekly SEO/GEO Digest — Service-Account Fetch → Claude API → Emailed Push

- **Status:** Accepted
- **Date:** 2026-06-13

## Context

The goal: a recurring (weekly) SEO/GEO/AEO report that surfaces stats, insights, and **ready-to-paste action prompts**, delivered as a **push** (email), not a pull (a dashboard or chat the user has to open). The user's stated priority is organic + AI-referral *traffic that converts*, and a hard constraint is "it must push me, I don't pull" — consistent with the existing working-style note that scheduled routines must not depend on the user going to look at them.

The first design attempted to give **Claude Cowork** live data access via a **Composio Google Search Console MCP connector** plus a PostHog custom channel. Two problems killed that path:

1. **Cowork's custom-connector OAuth is currently buggy.** Adding the Composio remote MCP threw `Authorization with the MCP server failed … ofid_…`, a known Claude.ai/Desktop issue (anthropics/claude-ai-mcp#326) where the same MCP works in Claude Code/ChatGPT but fails in the Connectors UI. Even when connected, Composio's router executes tool calls through `COMPOSIO_MULTI_EXECUTE_TOOL`, which is gated behind "Needs approval" — **a scheduled, unattended run cannot click approve.**
2. **A Cowork chat artifact is a pull, not a push.** It satisfies neither the delivery constraint nor the reliability bar.

Discovery during setup changed everything: the repo **already contains a mature, service-account-based analytics pipeline** built Feb–May 2026 — `fetchSiteMetrics.mjs` (site-wide GA4 + GSC), `fetchGSCMetrics.mjs`, `fetchAIReferrals.mjs` (already tracks chatgpt.com/perplexity.ai/etc. referral traffic — the GEO/AEO signal), `findQuickWins.mjs`, and prompt-generators (`generate-regen-prompts.mjs`). The GA4 service-account key (`temp-files/mystery-maker-analytics-3e8af2760f57.json`) is valid and live; a GitHub Action (`publish-daily-blog.yml`) already injects it as the `GSC_SERVICE_ACCOUNT_JSON` secret. Email already runs through **Resend** in ~10 edge functions. The data layer, the CI auth, and the email transport all already exist.

## Decision

Build the digest as a **scheduled GitHub Action**, reusing the existing service-account + Resend + GitHub-Actions infrastructure. Drop Composio and Cowork entirely.

Pipeline (all server-side, non-interactive):

1. **`scripts/fetchSeoWeeklySnapshot.mjs`** — using `googleapis` (the library the working scripts use; *not* `@google-analytics/data`, which is uninstalled): query GSC (webmasters v3) for site-wide totals, top queries, top pages, and quick-wins, for the current 7 days **vs the prior 7 days**; query GA4 (analyticsdata v1beta) for sessions/users/engagement and channel mix, current vs prior; and merge the AI-referral metrics from `fetchAIReferrals.mjs`. Writes `temp-files/seo-weekly-snapshot.json`. Credentials load from `GSC_SERVICE_ACCOUNT_JSON` (CI) or the local key file (dev). Each section is independently `try/catch`'d so one failure degrades to a noted error, not a dead run.
2. **`scripts/generateSeoDigest.mjs`** — sends the snapshot to the **Claude API** (`ANTHROPIC_API_KEY`, Opus) with the digest system prompt (scoreboard + insights + numbered copy-paste action prompts). Emits HTML + a committed markdown copy.
3. **`send-seo-digest` edge function** — emails the digest via Resend to `millerdjonathan@proton.me`. Reuses the existing send pattern.
4. **`.github/workflows/weekly-seo-digest.yml`** — `cron` Mondays 06:00 UTC (~08:00 CET) → fetch → generate → email → commit `docs/seo-digests/YYYY-MM-DD.md` for history. Net-new secret: `ANTHROPIC_API_KEY`.

## Rationale

- **Reliability over novelty.** Service-account auth is non-interactive by design — the exact property unattended runs need, and already proven in CI. The Cowork/Composio path failed on both auth and the approval gate.
- **Reuse beats rebuild.** ~80% existed: data fetchers, the AI-referral GEO signal, CI credential injection, Resend transport. Net-new surface is two scripts, one small edge function, one workflow.
- **Push, by construction.** Email is the deliverable; the GitHub Action is the trigger. Nothing to open.
- **The prompts are the product.** The action-prompt list is what converts insight into shipped change; the digest is framed around producing those, ordered by effort-to-impact.

## Alternatives Considered

- **Cowork scheduled task + Composio GSC MCP.** Rejected: `ofid_` auth bug, unattended runs can't pass the approval gate, and the artifact is pull-not-push.
- **Cowork reading a committed snapshot via the official GitHub connector.** Viable and avoids Composio, but still pull (chat artifact) and adds a connector dependency for no gain over emailing from the Action that already produces the data.
- **PostHog custom "AI Engines" channel for GEO.** Dropped: PostHog has no live project for this site, whereas `fetchAIReferrals.mjs` already measures AI-referral traffic from GA4. Re-instrumenting PostHog would duplicate a working signal.
- **Daily cadence.** Deferred: SEO data barely moves day-to-day; weekly gives real week-over-week deltas with less noise. Can revisit.

## Consequences

- A new weekly email with an actionable SEO/GEO digest; a growing `docs/seo-digests/` history for trend-tracking.
- `ANTHROPIC_API_KEY` must be added as a GitHub secret; the existing `GSC_SERVICE_ACCOUNT_JSON`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` secrets are reused.
- The service account must retain **Full** access to the GSC `https://www.mysterymaker.party/` URL-prefix property (granted 2026-06-13) and Viewer on GA4 property 504442584.
- GSC's 2–3 day data lag means the "current week" trails real-time; deltas stay valid because both windows lag equally.
- If Claude API or Resend is down on a Monday, that week's digest is skipped (logged in the Action), not retried — acceptable for a weekly insight report.

## Discussion

The pivotal trade-off was **Cowork-native vs CI-native**. Cowork was the user's entry point and is attractive for its conversational surface, but it failed the two things that matter here: unattended reliability (OAuth bug + approval gate) and push delivery (artifact is pull). The deciding realization was that the heavy lifting — authenticated GA4/GSC access and a working AI-referral GEO metric — was **already built and running in CI**, so the CI-native path was both more reliable *and* less work. We also debated PostHog vs GA4 for the GEO signal and chose GA4 purely because it already works; standing up PostHog would have been rebuilding a solved problem. Cadence settled on weekly to maximize signal-to-noise, with daily explicitly left as a later option.

## Key files

- `scripts/fetchSeoWeeklySnapshot.mjs` (new) — combined GSC + GA4 + AI-referral snapshot, week-over-week
- `scripts/generateSeoDigest.mjs` (new) — Claude API → digest + action prompts
- `supabase/functions/send-seo-digest/index.ts` (new) — Resend email push
- `.github/workflows/weekly-seo-digest.yml` (new) — Monday 06:00 UTC orchestration
- Reused: `scripts/fetchAIReferrals.mjs`, service-account key, `GSC_SERVICE_ACCOUNT_JSON` secret, Resend
