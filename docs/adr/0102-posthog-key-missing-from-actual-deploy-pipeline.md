# ADR-0102: PostHog never fired in production — wrong deploy pipeline entirely, not a deleted project

- **Status:** Accepted
- **Date:** 2026-08-22
- **Supersedes:** ADR-0100

## Context

ADR-0100 concluded the original PostHog project was lost (most likely deleted) and moved forward by pointing `VITE_POSTHOG_KEY` at a freshly created project — but only in **Vercel**. After redeploying there and updating the key, a live check on `mysterymaker.party` (including in incognito, to rule out ad-blocker interference) showed **zero** requests to `i.posthog.com`, not even to a dead/wrong token. A wrong-but-present token would still generate outgoing requests — the browser has no way to know server-side whether a token is valid. Zero requests at all meant `posthog.init()` was never even being called.

Traced it to the actual serving infrastructure, which nobody had verified this whole investigation:

- `curl -I https://mysterymaker.party` returns `server: GitHub.com`, 301-redirecting to `https://www.mysterymaker.party/` — matching the repo's `CNAME` file (`www.mysterymaker.party`).
- The Vercel project (`website-murder-mystery-party-generator`) that ADR-0100 and this entire session's Vercel/PostHog investigation focused on **does not serve the production domain at all** — its own `domains` list only contains auto-generated `*.vercel.app` hostnames.
- The actual deploy pipeline is `.github/workflows/deploy.yml` → GitHub Pages. Its "Build project" step passes exactly three env vars to the build: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and a hardcoded `VITE_ENABLE_GUEST_DROPOUT_ADAPTATION`. **`VITE_POSTHOG_KEY` was never present in this workflow at all**, in any form — not as a secret reference, not as a literal.
- Given `src/lib/posthog.ts`'s guard (`if (!isProduction || !POSTHOG_KEY) return;`), an empty `VITE_POSTHOG_KEY` at build time means `initPostHog()` silently no-ops on every single page load, permanently.

This means ADR-0100's premise — that a project existed and received real events from 2026-04-24 onward and was later deleted — was never actually verified against the live site, only inferred from the commit history and the presence of an account/personal-key setup dated the same day. The simpler, now-confirmed explanation: whoever wired up PostHog on 2026-04-24 tested against a Vercel preview build (where the env var may well have been set and working) and never realized the site's actual production deploy target is GitHub Pages via a separate CI pipeline with its own, independently-configured env vars. The two hosting surfaces never shared configuration, so a working Vercel setup created a false impression that production was covered.

Whether the original PostHog project was in fact deleted, still exists untouched-but-empty, or something else entirely is now unknowable and no longer worth investigating — see ADR-0100's own Consequences section, which already accepted that loss. What this ADR corrects is *why* production events never showed up even after "fixing" it: the fix targeted the wrong pipeline.

## Decision

Add `VITE_POSTHOG_KEY` directly to `.github/workflows/deploy.yml`'s build step, as a literal value (not a repo secret) — same treatment as `VITE_ENABLE_GUEST_DROPOUT_ADAPTATION` one line above it, and for the same reason: PostHog documents this exact key type as "Write-only key for use in client libraries. Safe to use in public apps," so it carries no confidentiality requirement and a repo secret would add process for no security benefit.

Uses the project created during ADR-0100's investigation: `phc_nWJE7Euc6KTzgYtMNgX4S4vzf6kWhzABgSerCznbD4D3` (PostHog project id 569867, "Mystery Maker").

The Vercel project's `VITE_POSTHOG_KEY` (changed during ADR-0100) is left as-is — harmless, since that project doesn't serve production traffic, but also not worth reverting since it costs nothing to leave pointed at the same new project.

## Rationale

- **Fix where the bug actually is.** The failure was never about which PostHog project to use — it was that the real deploy pipeline never passed the variable at all. Changing Vercel's copy of the key a second time would have repeated ADR-0100's mistake.
- **Verified against the live domain, not assumed.** `curl -I` against the actual customer-facing hostname is the one check that can't be fooled by editing the wrong project's settings — it settled in one command what an hour of Vercel/PostHog UI navigation couldn't.
- **Matches existing precedent in the same file.** `VITE_ENABLE_GUEST_DROPOUT_ADAPTATION` already established the "non-secret client value goes in as a literal, not a repo secret" pattern one line above — reusing it here is consistent, not a new decision.

## Alternatives Considered

- **Store `VITE_POSTHOG_KEY` as a GitHub Actions repo secret** instead of a literal. Rejected: PostHog project tokens are explicitly designed to be public (they're already visible in the deployed page's own JS bundle to any visitor); a secret adds indirection with no confidentiality benefit, and breaks consistency with the adjacent `VITE_ENABLE_GUEST_DROPOUT_ADAPTATION` line.
- **Also point the Vercel project at production** (add `mysterymaker.party` as a custom domain there, retire GitHub Pages). Rejected as out of scope — a hosting-migration decision unrelated to the PostHog question that prompted this investigation; the two-pipeline situation is pre-existing and not something to change as a side effect of an analytics fix.

## Consequences

- **Positive:** once this workflow runs (next push to `main`, or a manual `workflow_dispatch`), `posthog.init()` will actually execute in production for the first time since the integration was originally written, and the purchase-to-play timing analysis that started this investigation can finally begin collecting real data.
- **Negative:** confirms the likely reading of ADR-0100's now-superseded finding — there is a real possibility PostHog has **never** captured a single genuine production event in the ~4 months since `posthog-js` was added, not just lost 4 months of history to a deleted project. Either way the practical outcome is identical (start clean today), but the "4 months of lost history" framing in ADR-0100 was probably never true history to begin with.
- **Not addressed:** whether the original PostHog project (from ADR-0100's investigation) still exists, was deleted, or is sitting untouched and empty. No longer actionable or worth pursuing.
- **Verification:** confirmed via `curl -I https://mysterymaker.party` (returns `server: GitHub.com`) and reading `.github/workflows/deploy.yml` directly — not inferred. Did not yet verify the *next* real deploy actually fires an event end-to-end; that requires a push to `main` and a subsequent live visit, follow-up not yet done as of this ADR.

## Key files

- `.github/workflows/deploy.yml` — added `VITE_POSTHOG_KEY` literal to the "Build project" step's env block
- `CNAME` — confirms `www.mysterymaker.party` as the GitHub Pages custom domain
- `src/lib/posthog.ts` — unchanged; the guard logic that made a missing key fail silently (correct behavior, not itself a bug)
