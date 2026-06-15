# 0019 — Prompt caching for Anthropic API calls (chat + Make generation)

- **Status:** Accepted (chat); Proposed (Make child generation — needs in-Make work + a verification test)
- **Date:** 2026-06-15

## Context

Anthropic published/updated its prompt-caching docs (cache reads cost 10% of base input, 5-min default TTL refreshed free on hit, 1-hour TTL at 2× write). We audited where Mystery Maker calls the Anthropic API directly and whether any of it re-sends a large, stable prefix often enough to benefit. Nothing in the codebase used `cache_control` anywhere.

Three edge functions call Anthropic directly (`mystery-ai`, `regenerate-parent-content`, `generate-pointform-summaries`). The **heavy** generation does **not** run in our code — it runs inside the Make.com child/parent scenarios, which make their own `anthropic-claude:createAMessage` calls.

Measured ground truth (Supabase, last 60–90 days):

| Surface | Model | Volume | Re-sent prefix | Notes |
|---|---|---|---|---|
| `mystery-ai` chat | Sonnet 4.5 | ~350–630 user msgs/mo; avg 6.2 turns (median 2, p90 11, max 169) | system prompt + growing history (~5k tok) | 62% of convs reach ≥2 turns |
| Make **child** generation | Haiku 4.5 | ~11 generations/mo × ~11 chars × **8 calls/char** ≈ ~970 calls/mo | **`master_context` ≈ 20,000 tokens**, injected into every call | The dominant cost/latency driver |

The child finding is the important one: `mystery_packages.master_context` averages **~79.5k chars (~20k tokens)** and is interpolated (`{{142.master_context}}`) into all 8 Haiku calls per character, and re-fetched identically for every character in a generation. That is ~88 calls per generation each re-processing the same 20k-token document — a textbook caching target.

## Decision

**1. Chat (`mystery-ai`) — shipped.** Add automatic prompt caching: one top-level `cache_control: { type: 'ephemeral' }` field on the request body. The breakpoint auto-advances as the conversation grows, so each follow-up turn reads the system prompt + prior history from cache. Hits only while `systemPrompt` is byte-identical turn-to-turn (the stable refinement phase); each branch change to `systemPrompt` costs one cache miss. No behaviour change, near-zero risk.

**2. Make child generation — proposed, requires work inside Make.** Restructure each child Anthropic call so the 20k-token `master_context` is a **separate leading content block** carrying `cache_control` (prefer `ttl: "1h"`, since a full generation spans more than 5 minutes across characters). Put `master_context` **first**, breakpoint after it, then the per-call/per-character instructions and output schema. That makes one cache entry shared across all 8 calls of a character **and** across every character in the generation.

Blocker to verify first: the native Make `anthropic-claude:createAMessage` module does **not** expose a `cache_control` field in its mapper. Its `messages` content is already a raw typed-block array (`[{"type":"text","text":"…"}]`), so `cache_control` *may* pass through if added to the block JSON. **Verification test:** on one child call, split the block, add `cache_control`, run a single generation, and read `usage.cache_read_input_tokens` from the response. If Make strips the field (read stays 0 on the 2nd+ call), fall back to the raw **HTTP module** hitting `api.anthropic.com/v1/messages` directly — the scenario already uses 11 `http:ActionSendData` modules and we already have the `jsonEscape()` raw-body pattern.

**3. Deferred.** `regenerate-parent-content` and `generate-pointform-summaries` (one-shot, low frequency) — not worth caching unless they start running in tight batches. The Make **parent** scenario embeds large static research context and is a plausible secondary target, to be assessed with the same technique once the child is proven.

## Rationale

- **Economics.** Child `master_context` re-sends cost ≈ **$1.76/generation** at Haiku base ($1/MTok). With a 1-hour cache (write 2×, read 0.1×): one 20k write + ~87 reads ≈ **$0.21/generation** — an **~88% cut** on that line, ~$17/mo now, scaling linearly with growth *and* with character count (more characters → higher hit ratio).
- **Latency & reliability — the bigger prize.** Every child call currently processes 20k input tokens before generating. Cache reads collapse time-to-first-token on calls 2…88, shortening generation wall-time and reducing the timeout-driven failures we built the Apr-2026 monitoring/retry system around. Cache hits also aren't deducted against input rate limits, giving headroom at scale.
- **Chat** is a small dollar win (~$5/mo at this volume) but a real latency win for refine-heavy sessions (p90 = 11 turns), and it costs one line.
- **Bar for an ADR:** the Make decision is architectural (touches the generation pipeline, has real recurring spend behind it, and the native-module-vs-HTTP choice would survive a rewrite). The chat tweak rides along for a complete record.

## Alternatives considered

- **Explicit breakpoint on the chat system block** instead of automatic caching — marginally more targeted, but the system prompt branches per turn anyway, and automatic caching is simpler (matches "prefer simple"). Chosen against.
- **Leave Make alone** (the original assumption that Make "isn't as helpful") — wrong on value: Make holds the bigger token spend; it's only *harder to reach* because the edit is in Make's UI, not code.
- **5-minute TTL for the child** — risky because a full generation can exceed 5 minutes across characters, dropping the entry between reuses. 1-hour TTL's 2× write cost is negligible against ~87 reads.
- **In-place block edit on the native module without testing** — rejected; we don't yet know whether Make forwards an unknown `cache_control` key, so a one-generation read-rate test gates the rollout.

## Consequences

- Chat caching is live on next deploy of `mystery-ai`; verify via `usage.cache_read_input_tokens > 0` on turn ≥2 of a stable-phase conversation.
- The child change is **not** done in this repo — it is hands-on work in Make plus a verification run; until proven, the dollar/latency estimates are projections from measured token sizes, not confirmed savings.
- Future Anthropic calls (code or Make) should default to evaluating a cache breakpoint when a >1k-token stable prefix is reused within the TTL.

## Key files

- [supabase/functions/mystery-ai/index.ts](../../supabase/functions/mystery-ai/index.ts) — chat caching (shipped)
- `temp-files/MM Live - Child (Unified)15-PerCharacterContext.blueprint.json` — child scenario; `{{142.master_context}}` from `mystery_packages` via module 142 (`supabase:searchRows`); 8× `anthropic-claude:createAMessage` (Haiku 4.5)
- `mystery_packages.master_context` — the ~20k-token re-sent document

## Discussion

The instinct going in was that the chat was the opportunity and Make was "not as helpful." Re-deriving from the DB inverted that: the chat is low-volume (~500 calls/mo) so its dollar win is single digits, while the child scenario re-sends a 20k-token document ~88 times per generation — far more total reuse. The trade-off that kept Make from being a slam-dunk is purely *operability*: the win lives behind Make's native-module abstraction, which may not surface `cache_control`. We resolved that by shipping the trivial, guaranteed code win now and gating the larger Make win behind a cheap one-generation read-rate test, with the HTTP-module fallback already de-risked by the existing `jsonEscape` raw-body pattern. We chose the 1-hour TTL for the child because generation duration exceeds the 5-minute window.
