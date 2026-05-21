# ADR-0007: Email Localization via Per-Function Inlined Locale Tables

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made May 2026, captured retroactively)

## Context

The frontend is localized into 13 languages (`en, es, fr, de, it, pt, nl, da, sv, fi, ko, ja, zh-cn`) via `react-i18next`. Until May 2026, every transactional email was hardcoded English. A user who experienced a fully Spanish homepage and chat flow would receive a welcome email, character emails, feedback request, and discount reminders all in English. This silently undermined the localization investment: the moment the relationship moved from web to inbox, the language broke.

Six edge functions send transactional email:

1. `send-welcome-email`
2. `send-host-email`
3. `send-character-email`
4. `send-guest-feedback-email`
5. `send-followup-emails`
6. `send-discount-reminders`

All six needed to render in 13 languages. The structural question: **where do the translated strings live, and how do edge functions get to them?**

A prior attempt centralized the strings in a shared module that emails fetched at runtime. It broke under cold starts — the first invocation after idle could timeout or hit an empty cache and ship a partial email — and the failure mode was hard to test locally because cold starts don't reliably reproduce.

The choice space:

1. **Centralized shared strings module, statically imported.** All 6 emails import a single source file containing every locale string for every email.
2. **Centralized strings fetched at runtime** (from DB, KV, or a shared bundle). The approach that already broke.
3. **Per-function inlined locale tables.** Each function defines its own `Record<Locale, FooStrings>` table as a constant. Only types and helpers (`Locale`, `normalizeLocale`, `pickByLocale`, `getUserLanguage`) live in a shared module.
4. **i18n SaaS** (Lokalise, Crowdin, Phrase). External translation memory, runtime fetch via SDK.

We also needed a single source of truth for *which language* a given user gets, given that emails are triggered from two very different places:
- **Frontend-triggered emails** (welcome, host, character) know the language because the user's i18n context is live.
- **Cron-triggered emails** (followup, guest-feedback, discount-reminders) run hours or days after the user last interacted with the frontend.

## Decision

**Per-function inlined locale tables, plus a shared `profiles.language` column for cron-time language resolution.**

### Strings

- Each email edge function inlines its own `T: Record<Locale, ...Strings>` constant. Examples:
  ```ts
  const T: Record<Locale, WelcomeStrings> = {
    en: { subject: "...", greeting: "...", ... },
    es: { ... },
    // ... 13 entries
  };
  ```
- The shared module `supabase/functions/_shared/email-i18n.ts` contains **only** the `Locale` type, `KNOWN_LOCALES` array, `normalizeLocale()`, `pickByLocale()`, and `getUserLanguage()`. **No strings.**
- This matches the existing `LABELS_BY_LOCALE` pattern in `supabase/functions/mystery-ai/index.ts`.

### Language source of truth

- **`profiles.language`** (TEXT, nullable; added via `add_profiles_language_column` migration). Defaults to `'en'` at read time when NULL.
- **Frontend writes it:** `AuthContext.tsx` has a useEffect that syncs `i18n.language` → `profiles.language` whenever the user is authenticated, and on `i18n.on('languageChanged')`. The column stays in sync without any explicit save calls elsewhere.
- **Frontend-triggered emails** pass `language: i18n.language` in the request body. The edge function calls `normalizeLocale()` on it.
- **Cron-triggered emails** look up `profiles.language` server-side. For guest-targeted email (`send-guest-feedback-email`), guests have no profile — we resolve via `assignment.mystery_id → conversations.user_id → profiles.language`. The **host's** language is used since the host is the customer.

### Adding things

- **New locale:** add to `Locale` union + `KNOWN_LOCALES` in `_shared/email-i18n.ts`. TypeScript then surfaces every missing entry across all 6 functions' `T` tables. Fill them in. Deploy.
- **New email function:** import the 4 helpers from `_shared/email-i18n.ts`. Define an inline `T`. Deploy.

## Consequences

**Positive:**
- **Cold-start resilient.** Each function is statically self-contained. No runtime fetch, no shared-module dependency that can be cold or stale. The first invocation after idle ships the same email as the hundredth.
- **TypeScript catches missing translations at compile time.** Adding a locale forces every `T: Record<Locale, ...>` to update; the type system surfaces every gap. No "we forgot to translate the Day 5 reminder into Finnish" surprises in production.
- **Each function is a complete artifact.** You can read one email function and understand every string it might send without cross-referencing other files. Deploys are independent — changing the welcome email's Italian copy doesn't redeploy anything else.
- **Tested via deploy.** No need for a runtime cache layer that has its own correctness story.
- **Single source of truth for user language** (`profiles.language`) means cron-time emails don't have to guess; the column is kept warm by the frontend's auth-context useEffect.

**Negative:**
- **String duplication across functions.** "Best regards, Mystery Maker" might appear in 5 of the 6 function `T` tables in 13 languages each. Genuine cost: O(functions × locales) lines per shared phrase. Acceptable at 6 functions; would hurt at 20.
- **No translation memory.** A translator working on a fix to the Spanish welcome copy doesn't automatically benefit from already-correct Spanish in the host email. We accept this in exchange for the cold-start property.
- **Adding a locale touches 6 files.** TypeScript guides you to all 6, but it's still a 6-file PR. At the current cadence (locales added rarely, emails added occasionally) this is fine.
- **The pattern is "wrong" by conventional wisdom.** Most i18n advice centralizes strings. Anyone joining this codebase will instinctively try to refactor toward a shared strings module and needs to be told why we don't. This ADR is part of telling them.
- **Guest emails use host's language.** A guest in Korea receiving a character profile from a French host gets it in French. Acceptable because the host is the customer and is more likely to want their guests to receive content in their (the host's) language, and because guests have no profile to read a language from. Per-guest language preferences would require a separate flow we have no demand for.

**When to revisit:**
- **If a sixth-plus email function is added** and shared phrases start to feel like maintenance pain, consider a shared "common strings" module (greetings, sign-offs, brand boilerplate) while keeping email-specific strings inlined. The bar: the savings have to be real — not just "this would be cleaner."
- **If cold starts stop being a concern** (e.g. Supabase edge runtime gains keep-warm or in-region caching that eliminates the failure mode), runtime-fetched centralization could be revisited. The original blocker was operational, not aesthetic.
- **If we add per-guest language preferences,** guest emails should look up the guest's language rather than the host's. Requires UI for guests to declare a language, which doesn't exist today.
- **If translations grow to the point where a non-engineer should be editing them** (e.g. we hire localization), a centralized strings module — possibly synced with a translation SaaS — becomes more attractive even at the cost of cold-start risk. Decision then changes.

## Rejected alternatives

- **Centralized strings fetched at runtime.** Rejected by experience: this is what broke under cold starts. The failure mode (partial or English-fallback emails on first-after-idle invocation) was both hard to test for and customer-visible. The cost of fixing it properly (warm cache, retry layer) exceeded the cost of inlining.
- **Centralized strings, statically imported.** Closer to acceptable, but each function still bundles all the strings for all the other functions at deploy time, slowing cold starts and bloating the function bundle. The wins (DRY for shared phrases) didn't outweigh the cost (every email function ships every other email's strings).
- **i18n SaaS (Lokalise, Crowdin).** Rejected at current scale. Adds a vendor, a sync pipeline, and a runtime fetch (back to the cold-start problem) or build-time generation (rejected for the bundle-bloat reason above). Could become attractive if/when localization is owned by non-engineers.
- **Per-guest language preferences.** Rejected for now: no UI to capture it, no demand, and adds a column or table for a benefit (guest sees email in their language rather than the host's) that's marginal at current volumes.
- **Skip localization for transactional email entirely.** Rejected: silently undermines the rest of the localization stack. If we localize the homepage we should localize the lifecycle.
