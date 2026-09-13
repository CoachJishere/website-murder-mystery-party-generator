# ADR-0122: concept-chat's hardcoded 10,000-character message cap silently killed a customer's conversation

- **Status:** Fixed and deployed live.
- **Date:** 2026-09-13
- **Related:** ADR-0097 / ADR-0097 Addendum 2 (a different oversized-content bug, in the generation-time transcript path, not this pre-purchase chat path)

## Context

A customer (Deborah "Deb" Phillips, `whodunnitsocietyhq@gmail.com`, user `b37ba4b8-d38b-43ea-9ec7-f6da403e45a8`) emailed support: "Your Program Keeps Crashing." She described pasting notes from an old, unfinished mystery into a new concept-chat conversation and the chat going unresponsive.

Traced her actual conversation (`conversations.id = 39f9c23e-928c-4ccc-a514-f934e73bf191`, "Murder At The Copper Creek Saloon") via the `messages` table:

- 16:43:46 — she pastes a 22,042-character block of old planning notes ("COMPLETE TIMELINE...")
- 16:44:31 — "Can you see what I sent you?" — no assistant reply
- 16:45:26 — "You crashed on me again!!!!!!!!!!!!" — no assistant reply
- 16:46:22 — "Helo" — no assistant reply

**Root cause:** `supabase/functions/mystery-ai/index.ts` hard-capped any single message at 10,000 characters, rejecting anything longer with a bare HTTP 400 `{ error: 'Message too long' }`. Her paste was more than double that. The cap was never a deliberate token/cost budget — it predates this investigation with no comment explaining a chosen value, and 10,000 characters is well within what Sonnet 5 handles in a single turn for this conversational, non-generation use case.

The frontend (`src/components/MysteryChat.tsx`) made this worse in two ways:
1. `callAIWithRetry` retried the identical rejected message up to 3 more times with increasing delay — pointless, since a 400 for "message too long" fails identically every time. It also never read the Edge Function's actual JSON error body; `supabase-js`'s `FunctionsHttpError.message` is a generic "non-2xx status code" string, with the real body sitting unread on `error.context` (the raw `Response`).
2. After all 4 attempts failed, the only user-visible feedback was a `toast.error(t("chat.errors.responseFailed"))` — a transient toast, not written anywhere into the persisted chat transcript. From the customer's side, the conversation just went silent with no visible explanation, matching her exact description.

Notably, `chat.errors.aiUnavailable` already existed as a translation key in all 13 locale files ("I apologize, but I'm having trouble responding right now. Please try again in a moment.") but was never referenced anywhere in the code — a dead key, apparently intended for exactly this kind of persisted-failure message but never wired up.

This is unlikely to be unique to Deb: any customer pasting a long backstory/timeline block into concept chat — a use case the chat itself invites ("go as deep as they want on character concepts") — would hit the same silent dead end, with no client-side character counter or warning before sending.

## Decision

**Backend (`supabase/functions/mystery-ai/index.ts`):**
- Raised the per-message cap from 10,000 to 50,000 characters — generous enough to cover large backstory/timeline pastes (Deb's was 22,042) while still bounded against a genuinely pathological paste.
- The rejection response now includes a `code: 'MESSAGE_TOO_LONG'` field and a specific, actionable message (actual length vs. limit, suggesting the customer split the paste into sections), instead of the previous bare `'Message too long'`.
- Deployed via `supabase functions deploy mystery-ai --project-ref mhfikaomkmqcndqfohbp` (CLI, reads from disk — see `feedback_edge_function_deploy_content_verification` in memory on why not the MCP deploy tool). Live as version 177; verified via `get_edge_function` that the deployed source actually contains the new cap and error code.

**Frontend (`src/components/MysteryChat.tsx`):**
- `callAIWithRetry` now reads the Edge Function's real JSON error body off `error.context` (falling back to the generic `error.message` if that fails) and carries `code` through on the thrown `Error`.
- A `MESSAGE_TOO_LONG` error now short-circuits the retry loop instead of retrying a request that will fail identically 3 more times.
- Both call sites (`triggerAIResponse` and `handleSendMessage`) now call a new `appendErrorMessage()` helper on failure, which pushes a real, persisted chat message (`is_ai: true`, saved via `onSave`) instead of only firing a toast. For `MESSAGE_TOO_LONG` this shows the backend's specific message; for any other failure it now finally uses the previously-dead `chat.errors.aiUnavailable` translation key.

## Rationale

The message-too-long case is a cheap, deterministic prompt/validation gap with no ongoing cost to fix properly — this project's own convention (see `CLAUDE.md`'s "sweep" checklist discussion of fixing prompt-gap bugs immediately rather than waiting for a second occurrence) says root-cause it now rather than patch narrowly. Raising the cap addresses the immediate case; fixing the silent failure addresses the actual complaint ("keeps crashing") for every future customer who hits any AI-call failure in this chat, not just this one cause.

## Alternatives Considered

- **Only raise the cap, leave the silent-failure UX alone.** Rejected — a customer could still paste something over the new (larger) limit, or hit a transient/other failure, and see the same silent dead end. The complaint was as much about the missing feedback as the trigger.
- **Only fix the silent failure, leave the cap at 10,000.** Rejected — would still make Deb's exact paste fail, just with a clearer message; 10,000 characters is an arbitrary, undocumented limit for a chat that explicitly invites deep backstory content.
- **Full i18n for the new `MESSAGE_TOO_LONG` message.** Not done — the message is generated server-side in English and shown as-is. Matches existing precedent in this same file (the outer catch's hardcoded English apology, returned regardless of the customer's chat language) rather than risk a low-quality guessed translation across 12 languages for a rare edge-case string.

## Consequences

- Any customer's oversized single-message paste up to 50,000 characters now succeeds instead of failing.
- Any AI-call failure in concept chat (this cause or otherwise) now leaves a visible, persisted explanation in the transcript, not just a toast that can be missed or dismissed.
- The dead `chat.errors.aiUnavailable` key is now live and localized across all 13 locales for the generic-failure case.
- Not addressed: there's still no client-side warning (e.g. a character counter) before a customer types/pastes something that would exceed even the new 50,000-character cap. Left as a lower-priority follow-up since 50,000 characters is a large amount of pasted text to hit accidentally.

## Key files

- `supabase/functions/mystery-ai/index.ts` — cap raised, structured error response, deployed v177
- `src/components/MysteryChat.tsx` — `callAIWithRetry` error-body extraction and retry short-circuit, new `appendErrorMessage()` helper wired into both call sites
- `src/i18n/locales/*.json` — `chat.errors.aiUnavailable` (pre-existing, now actually used)

## Discussion

The retry logic's design — 3 blind retries with no distinction between "transient" and "deterministic" failures — is a pattern worth checking for elsewhere in this codebase; it wastes user-perceived latency without ever telling the customer why, and this incident happened to be a validation error but the same shape would equally mask a real backend outage behind an unhelpful delay-then-toast sequence.

## Addendum 1 (2026-09-13, same day): made the model itself aware of the length limit, so it manages expectations before a customer pastes something huge, not just after

Jonathan's follow-up question: in Deb's actual transcript, she explicitly asked "I'm going to copy and paste for you in sections, is that ok?" before the paste that crashed her — and the model answered "Absolutely, please go ahead" with zero awareness that any limit existed. The two fixes above (raised cap, visible failure) are a safety net for when a paste is rejected, but do nothing to stop the model from cheerfully green-lighting an offer that's likely to hit that net in the first place.

Added a new unconditional system-prompt append (same pattern and same justification as the existing CRITICAL guardrails in this file — `MYSTERY_FREE_PROMPT` is the dominant production path and isn't editable from this file, so an addition here can't be silently lost if that external prompt changes later): when a user offers or asks to paste a large amount of existing text, the model now briefly mentions the ~50,000-character-per-message limit and suggests splitting anything longer into a few messages, before they paste — rather than only finding out after a paste fails.

Deployed via CLI as version 178; verified via `get_edge_function` that the new instruction text is present in the live source.

### Key files (Addendum 1)

- `supabase/functions/mystery-ai/index.ts` — new unconditional system-prompt append, deployed v178
