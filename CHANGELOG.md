# Changelog

## 2026-05-04

### SEO: trim long meta descriptions across all 13 languages (1,339 published metas)
- After EN, audited all 12 other published locales — Latin-alphabet languages had 24-47 metas each over Google's 160-char SERP cutoff (longest: 319 chars, FR). Same systemic pattern as titles: original generation drifted past target. CJK locales were fine (Japanese chars carry more meaning per character)
- Re-translated 339 over-limit metas across 9 Latin languages, plus extended the EN-trim concept to corresponding non-EN slugs for cross-language consistency. Used the established locale keyword from the title pass (Krimidinner / Soirée enquête / Cena con delitto / etc.) so meta and title share the topic signal
- Final state: avg 128-139 chars (Latin), 45-69 (CJK); max 160 everywhere; 0 over-limit across all 1,339 published rows. Combined with the title pass: every published post now has both H1/SERP title and meta description optimized for Google SERP visibility AND topic-cluster consistency across locales

### SEO: trim long titles + re-translate across all 13 languages (1,339 published titles)
- After EN, audited all 12 other published locales — 70-90 titles per Latin-alphabet language were over Google's 60-char SERP truncation; longest was 150 chars (FR). CJK locales (ja/ko/zh-cn) were mostly fine because each character carries more meaning
- Standardized one primary "murder mystery" keyword per locale (existing translations used 4+ different terms within each language, fragmenting topic-cluster signals): de=Krimidinner, fr=Soirée enquête, es=Misterio de Asesinato, it=Cena con delitto, pt=Mistério, nl=Moordmysterie, da/sv=Mordmysterium, fi=Murhamysteeri, ja=マーダーミステリー, ko=머더 미스터리, zh-cn=谋杀谜案. Choices reflect highest-volume commercial terms in each market
- Re-translated all 74 trimmed EN titles into 12 languages, plus fixed Phase B residuals (4-16 per Latin language) where EN was already short but the local title still ran long. Also re-translated CJK even though already under-limit, for cross-language consistency with the new EN concept
- Final state: avg 39-43 chars (Latin), 12-21 chars (CJK); max 60 everywhere; 0 over-limit across all 1,339 published rows
- Caught + fixed one pre-existing data quality issue: the FR row for `5-ancient-egyptian-temple-murder-themes` had a Spanish title sitting in the FR slot. Replaced with proper French translation as part of the FR pass
- Drafts (4,133 rows: ~318 unique slugs × 13 languages) are still untouched — those get the same treatment in the next phase before tomorrow's daily-publish cron starts flipping them

### Fix: CI build broken by @supabase/realtime-js requiring native WebSocket on Node 20
- The previous three commits (schema fix, /about page, headshot) failed to deploy because `npm run build` runs `node scripts/generate-sitemap.mjs` after `vite build`, and the script calls `createClient` from `@supabase/supabase-js@2.49.4`. The newer realtime-js inside that version requires a native WebSocket constructor; Node 20 (used by GitHub Actions and Vercel build) doesn't ship one. Result: build exited 1, no deploy
- Added `ws@8.20.0` as a direct dependency and created [scripts/_supabase-node.mjs](scripts/_supabase-node.mjs) — a thin wrapper around `createClient` that injects `realtime: { transport: ws }`. Build-time and CI scripts import from here instead of `@supabase/supabase-js` directly, so when we move to Node 22+ (which has native WebSocket) only the wrapper changes
- Migrated [scripts/generate-sitemap.mjs](scripts/generate-sitemap.mjs) (build) and [scripts/apply-crosslinks.mjs](scripts/apply-crosslinks.mjs) (called by daily-publish workflow) to the wrapper. Updated [.github/workflows/publish-daily-blog.yml](.github/workflows/publish-daily-blog.yml) to install `ws` alongside `@supabase/supabase-js` so tomorrow's daily publish doesn't hit the same crash. Other Node-side scripts (backfills, analytics fetchers) still use the raw client; they're local-only and can be migrated when next touched
- Verified locally: `npm run build` now completes through sitemap generation. **Side-finding logged separately**: the sitemap script returns "Found 1000 published blog posts" but the database has 1,339 — Supabase REST defaults to a 1000-row cap and the script doesn't paginate, so ~339 published URLs are missing from sitemap.xml. Pre-existing, not introduced by this commit; flagged for a follow-up

### Feature: real author identity across the blog (E-E-A-T pass)
- 89 of 103 published EN posts had `author = "AI Assistant"` and the rest were `"Jonathan Miller"`. Both Google E-E-A-T and 2026 GEO research treat anonymous/AI authorship as a citation-killer — AI engines de-prioritize unverifiable authors and Google de-ranks YMYL-adjacent content from generic bylines
- Set `author = 'Jonathan Miller'` across all 5,472 rows (every language, published + draft) so the daily-publish cron inherits the fix automatically when it flips drafts
- Built [src/pages/About.tsx](src/pages/About.tsx) at `/about` and `/:lang/about` so the JSON-LD `author.url` from the previous commit actually resolves. Page includes a real bio, headshot ([public/images/MMbiopic.png](public/images/MMbiopic.png)), and Person schema with `sameAs` links to the verified external profiles (LinkedIn, YouTube). Narrativa Improv Festival is mentioned in bio prose only — the festival site doesn't currently list Jonathan as a co-founder, so wiring it into `sameAs` would fail AI verification and weaken the entity signal
- Added a "By Jonathan Miller" byline below each post title in [BlogPost.tsx](src/pages/BlogPost.tsx) that links to `/about`. Closes the loop between the JSON-LD author entity and the on-page rendering — both Google and AI crawlers now see a consistent author claim from schema, byline, and dedicated bio page

### SEO: trim long titles + meta descriptions on published EN posts
- 74 of 103 EN titles were over Google's 55–60 char SERP truncation threshold (longest: 113 chars — "5 Haunted Library Murder Mystery Themes: Check Out Deadly Secrets with Ghostly Librarians and Supernatural Stacks"). Truncation hurts CTR and forces Google to guess at the cut point, often dropping the value-prop after the colon
- Trimmed all 74 to 30–60 chars (avg dropped 68 → 42, max now exactly 60). Strategy: keep the primary topic keyword and intent (`5 X Themes`, `How to Host X`, `Murder Mystery for X`) at the front, drop colon subtitles that just embellish. Slugs unchanged — URL stability preserved
- 30 EN meta descriptions were over Google's 160 char cutoff (longest: 258). Trimmed all to ≤ 160 (avg 144 → 134, max 160). Lead now opens with what the reader gets, not adjective-stacking
- Both passes touched only `language='en' AND status='published'`. Drafts (~318 unique posts × 13 languages) and non-EN translations get their own audit passes next

### Fix: blog post schema missing `author` and `image` (Google Article requirements)
- Audit against 2026 AEO/GEO best practices flagged that the `BlogPosting` JSON-LD in [src/pages/BlogPost.tsx](src/pages/BlogPost.tsx) emitted `headline`, `description`, dates, and publisher — but not `author` or `image`. Both are required by Google for Article rich results; without them Google logs Search Console warnings and skips the rich result entirely
- Added `author` (Person, with `url` pointing at `/about`) and `image` to the JSON-LD. Author resolves from `post.author`, but treats the legacy `"AI Assistant"` value as missing and falls back to `Jonathan Miller` until the full author backfill lands (#2 in this audit pass)
- Image resolves from `post.featured_image_url`; falls back to the homepage share image so the schema validates today and starts using real per-post images automatically once the image backfill ships in the coming weeks
- Also wired the same `shareImage` into `og:image` (previously only emitted when a per-post image existed → bare social shares for every post) and added `twitter:card=summary_large_image` + `twitter:image` so Twitter/X cards render properly. Added `<meta name="author">` for non-Schema crawlers
- **Latent bug fixed in the same pass**: the React `BlogPost` interface declared `featured_image?: string` while the database column is `featured_image_url`. All references (interface, JSON-LD attempt, og:image conditional, hero `<img>`) were reading the wrong field — meaning even when real images arrive, none would have rendered. Renamed everywhere

### Fix: blog index was hiding 57 of every 58 same-day posts
- A spot-check of `/blog` showed only one card for March 17, 2026 ("Unique Pirate Murder Mystery Plot Ideas — 58 posts") with a broken `Available in: EN, EN, EN…` badge repeated 58 times
- Two coupled bugs in [src/pages/BlogIndex.tsx](src/pages/BlogIndex.tsx):
  1. The query already filters by current `language`, but the render still grouped posts by date and rendered only `posts[0]` as the card. Every additional post on that date was reachable only by direct URL — 57 EN posts hidden behind the March 17 card alone (Make.com's daily-publish job back-filled 58 posts on its first run, all stamped with the same `published_at`)
  2. The `Available in:` badge mapped `group.posts.map(p => p.language.toUpperCase())` over a list that was already single-language, so it printed the same code N times instead of advertising sister translations
- Replaced the date-grouping reducer with a flat list — every published post in the current language gets its own card. Removed the `Available in:` badge entirely (its original purpose — surfacing translations of the same article — was never implemented and the language filter made it actively wrong)
- Backfilled `post_date` for all 1,339 published rows (every locale × every post had `post_date IS NULL`); set to `published_at::date` so future sorting and grouping work without falling through to the `published_at.split('T')[0]` fallback

### Audit: blog post length is far above the assumed 5k-character target
- Spot-check of one Ancient Greece post showed ~20k chars; audit confirmed this is systemic, not isolated. Across 103 published posts × 13 languages: Latin-alphabet locales average 19k–22k chars (en avg 19,938; fr avg 22,252; de avg 21,447) with maxima above 30k. CJK locales are smaller by character count (zh-cn avg 6k, ja avg 9k, ko avg 10k) but reading time is comparable
- Generation lives in Make.com (no prompt files in this repo), so this is a flag for the content pipeline rather than a code fix — surfacing it here so the next pass at the prompt knows the current output drifted ~4× past target

## 2026-04-30

### Fix: AI mystery concepts now fully localized — no English bleed-through
- A Spanish concept came back with English section titles ("Characters", "Murder Method") despite the rest of the response being in Spanish. Same latent issue affected every non-English language
- Two root causes in [supabase/functions/mystery-ai/index.ts](supabase/functions/mystery-ai/index.ts):
  1. `buildLabels()` was fetching `https://mysterymaker.party/locales/<lang>.json`, but the deployed site does not serve those JSON files as static assets (they're bundled into the SPA). The fetch returned `index.html`, JSON parse failed, and the catch fell back to ALL-CAPS English labels for every locale
  2. The function ignored the `language` field that `MysteryChat` already sends from `i18n.language`, instead doing fragile character-set regex on the user's first message — which silently misclassified Spanish/Italian/Portuguese as English whenever the user typed without diacritics
- Inlined `LABELS_BY_LOCALE` for all 13 supported locales (kept in sync with `src/i18n/locales/*.json`), removed the network fetch, and switched locale resolution to: trust client-supplied `language` (normalized for tags like `es-ES`, `pt-BR`, `zh-CN`) → fall back to text detection only when absent
- Replaced the weak "respond in the same language the user writes to you" directive with an explicit `Write the ENTIRE response in <LanguageName>` instruction that calls out section labels by name, so the model never leaves "Premise" / "Victim" / "Murder Method" untranslated even when the format template shows them in English
- Filled in Danish section labels (all eight were untranslated) and the five remaining English Swedish labels in [da.json](src/i18n/locales/da.json) / [sv.json](src/i18n/locales/sv.json) so the UI matches what the AI now emits


- GSC sweep revealed 1,695 blog URLs Google has indexed (last 365d) that don't exist in `blog_posts` for the language they're served at — 7,416 impressions and 117 clicks/year landing on hard 404s. Spread across all 13 locales: ~860 EN, ~80–115 in each major non-EN locale, smaller tails in Nordic/CJK
- Root cause: a prior publishing pipeline emitted translated slugs (e.g., `5-bailes-de-mascaras-con-misterio-y-asesinatos`, `einzigartige-zirkus-krimi-dinner-handlungsideen`) and lang-prefixed/suffixed slugs (e.g., `ko-butler-murder-mystery-themes-...`, `how-to-fix-confusing-murder-mystery-clues-sv`). Current schema uses shared English slugs differentiated by `language` column ([BlogPost.tsx:164](src/pages/BlogPost.tsx#L164)), so the old URLs orphaned. Only 98 of 421 posts per language are currently `status='published'`, meaning many old slugs map to topics that are still drafts and have no published canonical to redirect to
- Two-tier fix:
- **Tier 1 — graceful in-app redirect** ([BlogPost.tsx](src/pages/BlogPost.tsx)): when a slug isn't found, render `<Navigate to="/<lang>/blog" replace />` with `<meta name="robots" content="noindex,follow">` instead of throwing "Post not found." Catches all 1,695 orphans in one place; users land somewhere useful, Google deindexes naturally. Soft signal, but covers the long tail
- **Tier 2 — 148 high-confidence 301 redirects in [vercel.json](vercel.json)**: only orphans where stripping a known language prefix or suffix yields an exact match in the published EN slug list (e.g., `ko-butler-murder-mystery-themes-...` → `butler-murder-mystery-themes-...`, `how-to-fix-confusing-murder-mystery-clues-sv` → `how-to-fix-confusing-murder-mystery-clues`). These are unambiguous — zero risk of wrong-target redirects. Recovers 754 impressions / 14 clicks/year via proper 301
- Deliberately did **not** ship fuzzy translated-slug matching (e.g., `5-bailes-de-mascaras-...` → `5-masquerade-ball-...`). Token-overlap scoring produced a confident-but-wrong match for `unique-circus-murder-mystery-plot-ideas` → `unique-pirate-murder-mystery-plot-ideas` (5/6 tokens overlap, only theme word differs); estimated 10–20% of fuzzy matches would land on the wrong post. With only ~20 impressions/day at stake, the risk wasn't worth it. The Tier 1 catch-all handles those translated orphans

### SEO: Tier 2 expansion — manual cell-by-cell match for all 584 unique orphans
- Followed the automated Tier 2 with a manual one-by-one review of every remaining orphan slug across all 13 locales — 584 unique slugs (orphans appearing under multiple locale prefixes deduplicated). For each: decoded URL-encoded slugs (zh-cn / ko / ja native script + romanized variants), recognized topic semantically, picked the best-matching canonical EN slug from the 98 published candidates
- Generated **1,282 total 301 redirects** (148 from automated Tier 2 + 1,134 from manual decisions × locale prefixes each orphan appears under). Recovers ~5,000 of the 7,416 wasted impressions/year via specific 301s; the remaining ~2,400 (orphans with no published canonical: ice hotel, dream world, ancient Celtic, rockstar, post-apocalypse/zombie-wedding edge cases — 9 unique slugs total) continue to flow through Tier 1's blog-index fallback
- Decision log saved to `temp-files/orphan-decisions.jsonl` for future audit + re-runs as more drafts get published

### Fix: clear stuck `in_progress` package from Apr 12
- Package `21976b4c` ("Death At The Velvet Rose", test account) had been pinned at `in_progress` / 20% since 2026-04-12 because the parent Make.com execution stalled before any character rows were created — falling outside the sweep's "completed-with-bad-characters" criteria
- Make.com's Incomplete Executions queue replayed the stale parent on 2026-04-29, firing 10 child inserts with empty `characterName`/`packageId` and producing 10 NOT-NULL constraint warnings
- Marked the package `failed` with `resumable: true` so the UI exits the stuck state. Diagnostic confirmed this is the only such occurrence since the monitoring/verification stack shipped (1 in 6+ months, test-account only) — leaving the systemic safeguards as-is rather than adding code for a non-recurring edge

## 2026-04-27

### Localization: broad sweep across 12 user-facing pages
- Followed up the homepage / header pass with the rest of the app. Audited every user-reachable page (skipped admin/preview/print/font-preview routes) and wrapped every hardcoded English string in `t()`. ~120 new keys, fully translated into all 13 locales
- Conversion-path pages: [MysteryPurchase.tsx](src/pages/MysteryPurchase.tsx) (6 checkout-flow toast errors + the "Fully editable" explainer), [MysteryView.tsx](src/pages/MysteryView.tsx) (~25 strings — generation status messages, "Try Again"/"Resume Generation"/"Check Again" buttons, "Generation Failed" / "Taking Longer Than Expected" / "We're Finalizing Your Mystery" cards, all reassurance copy + `support@mysterymaker.party` instructions), and the auth set: [SignIn.tsx](src/pages/SignIn.tsx), [SignUp.tsx](src/pages/SignUp.tsx), [AuthCallback.tsx](src/pages/AuthCallback.tsx) (was 0 t() calls), [CheckEmail.tsx](src/pages/CheckEmail.tsx) (was 0 t() calls), [ResetPassword.tsx](src/pages/ResetPassword.tsx), [ForgotPassword.tsx](src/pages/ForgotPassword.tsx)
- Account / post-purchase pages: [AccountSettings.tsx](src/pages/AccountSettings.tsx) (Profile/Security/Billing tabs + delete-account toasts), [BillingHistory.tsx](src/pages/BillingHistory.tsx) (entire page — Purchase Summary, Total Spent, Status badges, View/Download buttons), [Feedback.tsx](src/pages/Feedback.tsx) (~30 strings — full feedback form including ratings, NPS scale, public-opt-in copy), [GuestFeedback.tsx](src/pages/GuestFeedback.tsx)
- Lower-traffic pages: [NotFound.tsx](src/pages/NotFound.tsx) (404 + meta tags), [HostAccess.tsx](src/pages/HostAccess.tsx) and [CharacterAccess.tsx](src/pages/CharacterAccess.tsx) (error messages + footer CTAs)
- For interpolated strings with HTML (e.g. "Your feedback for **{{title}}**…"), used `<Trans>` component instead of plain `t()` so the `<strong>` tag survives translation
- Already-localized pages (audited but no work needed): PaymentSuccess, MysteryCreation, MysteryChat, Dashboard, MysteryDashboard, Support
- Skipped intentionally: AdminDashboard (admin-only), all *Preview / *Print / FontPreview pages (dev tooling), Privacy (legal copy — separate effort), BlogIndex/BlogPost (already DB-localized via `posts.title` / `posts.meta_description`)

### Fix: header Sign In/Sign Up buttons + auth dialog stuck on English
- Despite Header.tsx itself using `t()`, the desktop header rendered `<AuthButton />` which hardcoded "Sign In", "Sign Up", "Account Settings", and "Sign Out" — so a Spanish visitor on a Spanish-localized page still saw EN auth buttons. Mobile header was already correctly i18n'd; the bug only ever showed up on desktop
- Wired [AuthButton.tsx](src/components/AuthButton.tsx) to existing `navigation.signIn` / `signUp` / `signOut` keys (already populated for all 13 locales) plus new `navigation.accountSettings`. Same surface as the mobile menu now, so Spanish desktop users see "Iniciar Sesión" / "Registrarse" / "Configuración de la cuenta" / "Cerrar Sesión"
- [SignInPrompt.tsx](src/components/SignInPrompt.tsx) (the dialog the hero shows on submit-when-not-authenticated) was fully hardcoded — title, description, Google button, divider, both CTAs, and three toast error messages. Wired to existing `auth.signIn.title` / `auth.signIn.googleButton` and new `auth.signInPrompt.{description,or}` + `auth.errors.{googleSignInFailed,googleSignInInitFailed,unexpected}`
- [Header.tsx](src/components/Header.tsx) mobile-menu toggle's `aria-label="Toggle menu"` localized via new `navigation.toggleMenu`
- Side-fix: `navigation.signIn` and `navigation.signUp` in `ja.json` and `ko.json` were stuck on the English literal (not actually translated at original i18n setup time). Patched to サインイン/新規登録 (ja) and 로그인/회원가입 (ko)

### Fix: chatbox typewriter rendered half-EN / half-target-language placeholder
- Spanish (and every non-EN/PT locale) saw the typewriter placeholder render as `Create a mystery Diseña un misterio en un mundo de fantasía…` — a literal English prefix glued to the full localized prompt. Two bugs combined: `hero.typewriterPrefix` only existed in `en.json` so all other locales fell back to the English literal, and the suffix-strip regex in [Hero.tsx](src/components/Hero.tsx) only handled English and Portuguese verb prefixes (`Create a mystery` / `Crie um mistério`)
- A locale-by-locale verb-list patch wouldn't scale: Spanish prompts alone use `Crea`, `Diseña`, `Desarrolla`, `Construye`, `Quiero organizar`. Instead, dropped the static prefix entirely — each localized prompt already contains a natural-language opener, so the full prompt now cycles through the typewriter
- Removes the `STATIC_PREFIX` span and the prefix-strip `useCallback` dependency surface; works correctly for all 13 locales by construction with no per-locale verb maintenance

### UX: Localize remaining hardcoded English on homepage
- Stats counter labels (`Mysteries Created` / `Themes Possible` / `To Get Started`), the `Verified Trustpilot Review` badge under each tilt-card, the YouTube iframe `title="Watch a Demo"`, and the three parallax testimonials (Sophia / Will / Jed) were rendered as literal English regardless of i18n locale. All wrapped in `t()` against new `home.*` keys in [Index.tsx](src/pages/Index.tsx)
- The parallax testimonials are real customer reviews — translating them is a slight artistic licence, but holding back creates a worse trust signal than a localized version for non-EN visitors who can't read the originals

### SEO: Localize homepage `<title>`, meta description, `og:locale`, and `<html lang>`
- The blog already emits proper `hreflang` alternates and per-language meta via DB-stored `posts.title` / `posts.meta_description` ([BlogPost.tsx:432-475](src/pages/BlogPost.tsx#L432-L475)) — verified 421 Spanish posts have native-language `meta_description`. The homepage was the gap: `<Head>` shipped a hardcoded English title/description and inherited `<html lang="en">` from [index.html](index.html), so Google saw an English page even when the visitor was browsing in Spanish
- [Head.tsx](src/components/Head.tsx) now reads from `i18n`: defaults `title`/`description` to `home.seo.*` keys, sets `<html lang>` via Helmet (BCP-47, `zh-Hans` for Chinese), and emits `og:locale` from a small i18n-code → OG-locale map. Existing callers that pass an explicit title/description are unaffected
- [Index.tsx](src/pages/Index.tsx) drops the literal English title/description and uses the i18n fallback path

### UX: Stop showing English testimonials to non-English visitors
- [TestimonialsSection.tsx](src/components/TestimonialsSection.tsx) was always rendering the latest 6 public reviews from `mystery_feedback`, but the table has no `language` column and ~all paid hosts to date have been EN-speaking — so a Spanish visitor saw English reviews on a Spanish-localized page, which costs trust at the worst possible moment
- For non-EN locales, skip the `mystery_feedback` fetch entirely and fall straight through to the existing translated `testimonials.testimonialN.*` keys (already populated in all 13 locale files). EN behavior unchanged
- TODO marker left for the better long-term fix: add `mystery_feedback.language` (populated at submission time from `i18n.resolvedLanguage`) and language-match real testimonials instead of falling back to hardcoded copy

### UX: Swap homepage demo video
- Replaced YouTube embed ID `8WInnaFHMY0` with `IFZdtPfUtPo` in [Index.tsx](src/pages/Index.tsx) (and the matching `homepage_video_played` PostHog event payload) and [DarkHomePreview.tsx](src/pages/DarkHomePreview.tsx) so analytics keeps tracking the currently-displayed video

## 2026-04-26

### Architecture: script_type='both' rendering — twin-column "always generate, conditionally display" pattern
- Old approach asked one Claude call to emit both bullets AND prose inside a single JSON field. Model fidelity was unreliable: random characters got bullets-only, others prose-only, none got both. The dual-format-in-one-string pattern is fundamentally fragile for LLMs
- New schema: every spoken field has a `*_pointform` sibling column (`introduction_pointform`, `rumors_pointform`, `accusations_pointform`, `round{2,3,4}_script_pointform`, `final_statement_pointform`). Detailed prose lives in the existing column; bullets live in the new one. Each generation call has ONE clear output mode
- New Edge Function `generate-pointform-summaries` takes a `packageId` (and optionally `characterIds`), reads existing detailed fields, calls Claude Haiku 4.5 to summarize each into 4-7 bullets ≤20 words each, and updates the `*_pointform` columns. ~$0.05/character. Reusable as Call 4 of the future v14 child Make.com architecture
- Frontend (`CharacterAccess.tsx` and `MysteryPackageTabView.tsx`): `script_type='full'` shows detailed only, `'pointForm'` shows bullets only, `'both'` stacks detailed (with its own ## header) followed by `**Point Form:**` + bullets. Stacked instead of tabbed because email clients, mobile webviews, and print all render uniformly without JS state
- New RPC `get_packet_metadata_by_token` exposes the host's `script_type` choice to the guest packet route alongside the existing character data fetch

### Fix: relationships field chain-of-thought leak (Ash, Benny in package 949b49ac)
- Two characters in a freshly generated mystery had reasoning traces leaked into their `relationships` field — verbatim "Wait, this is wrong. Let me recalculate from the matrix... reviewing the relationship matrix:" followed by a neutral/hostile dump, then the corrected ALLIES/RIVALS section. Customer-facing content shouldn't contain the model's drafts or self-corrections
- Root cause: the v12 child blueprint's `<no_meta_text_in_output>` block targeted instructional preambles ("CRITICAL: Target 3 DIFFERENT characters") but didn't address mid-output reasoning leaks. Asking the model to "use the relationship matrix" sometimes triggered it to show its work
- v13 child blueprint adds a `NO CHAIN OF THOUGHT IN OUTPUT` section listing the exact leak phrases ("Wait,", "Let me recalculate", "reviewing the relationship matrix", "Disregard", duplicate `**RIVALS & ENEMIES:**` blocks) and flags `relationships` as the highest-risk field. `<final_format_check>` adds a CoT scan pass that runs before emitting. Imported into the existing unified child scenario — webhook URL unchanged
- After v13 + a delete/re-fire cycle, all 16 characters' relationships fields are clean. Verified across the cast

### Fix: child Make.com upsert was INSERT-only — caused unique-constraint warnings on re-runs
- The `supabase:upsertARecord` module in the child blueprint had no `onConflict` parameter, so PostgREST fell through to plain INSERT against `mystery_characters`. Worked fine on first generation (rows didn't exist yet), but every backfill / re-run hit the `(package_id, character_name)` unique constraint and silently lost the regenerated content
- Discovered while backfilling package 949b49ac after v13 prompt changes. Worked around by deleting rows before re-firing. Permanent fix is a v14 blueprint patch (TODO) — for now, document the workflow

### Fix: package 949b49ac (Midnight Confessions) — stale bullet-only round_scripts replaced with prose
- Three characters (Perry, Quinn, Victor) came back with bullets in `round_script` columns despite the prompt asking for full prose. Re-fired with `scriptType=full`; all three now have proper prose dialogue
- Frankie/Frances Vale failed Make.com's `json:ParseJSON` step because the model produced rumors with single-quote dialogue and forgot the closing JSON `"` before the next key. Re-fired and landed cleanly. Underlying fragility is the size of the monolithic JSON output — split-call architecture (planned for v14) is the durable fix

### Architecture: pointform columns added to mystery_characters
- Migration `add_pointform_columns_to_mystery_characters` adds 7 nullable text columns. Backfilled for package 949b49ac via the new summarizer Edge Function

### Architecture: child Make.com scenario v14 — split-call architecture (BOTH routes)
- Both Route 0 (detective) and Route 1 (character-based) now use the split-call pattern. Detective has 3 Claude calls (Context, Round 1, Round Scripts); character-based has 5 (Context, Round 1, Innocent Scripts, Guilty Scripts, Accomplice Scripts) — the accomplice call has a Make.com module filter on `hasAccomplice="true"` so it auto-skips when the mechanism doesn't apply
- Each route's first module carries the router-level filter on `mystery_style` so only the matching branch executes (was lost in an earlier rebuild — refile fixed this; only one route fires per webhook now, no more spurious failures on the wrong branch)
- Each route starts with `supabase:searchRows` against `mystery_characters` filtered by `package_id+character_name`. The found row's `id` flows into Upsert 1 — populated `id` triggers UPDATE in place (re-runs are now safe), absent `id` lets Postgres generate a fresh UUID for INSERT (first generation). Subsequent upserts in the same run reference Upsert 1's `id`. No more "delete-before-rerun" workflow
- Final step is an HTTP call to `generate-pointform-summaries` with `{packageId, characterName}` (using webhook input directly, since Make.com's Supabase upsert connector doesn't expose the inserted row's id reliably)
- 12 new role-variant pointform columns added for character-based mysteries: `round{2,3,4}_{innocent,guilty,accomplice}_pointform`, `final_{innocent,guilty,accomplice}_pointform`. Migration `add_role_variant_pointform_columns`
- `generate-pointform-summaries` updated: SOURCE_FIELDS includes both unified columns (detective) and per-role variants (character-based). Only fields with non-empty content are sent to the model — character-based mysteries don't waste tokens on unified columns and vice versa

### Architecture: parse-claude-json Edge Function — bulletproof JSON parsing
- The model occasionally emits JS-style apostrophe escapes (`That\'s`) inside JSON strings. JSON spec rejects `\'`, so strict parsers fail. Make.com's expression-level `replace()` for these escapes proved unreliable (the platform's string-literal escape rules behave differently than expected — `"\\'"` in expression source did not match the literal `\'` characters in the parsed text)
- New Edge Function takes Claude's raw text (plain text body or JSON `{text}`) and runs progressive sanitization stages between strict `JSON.parse()` retries: strip code fences → replace `\'` with `'` → collapse `''` → strip trailing commas. Returns the parsed object as the response body so Make.com's HTTP module (with parseResponse=true) exposes its keys via `{{moduleId.data.<field>}}` — same downstream contract as `json:ParseJSON` but rather than throwing on the first malformation, it recovers
- v14 child blueprint replaces all 8 `json:ParseJSON` modules (3 in route 0, 5 in route 1) with HTTP calls to this Edge Function. Upsert mappers updated to use `{{moduleId.data.<field>}}` paths
- Same fix is available for the parent scenario's remaining ParseJSON module — deferred

### Architecture: child Make.com scenario v14 — split-call architecture (detective route)
- Single 25KB Claude call per character replaced with three focused calls + an HTTP step that invokes the summarizer Edge Function. Each Claude call has a small, well-scoped output schema; each call's JSON is small enough to parse reliably. Eliminates the "model forgets a closing quote at end of long output" failure (Frankie/Frances Vale's JSON parse failure was this exact mode)
- Scenario flow for Route 0 (mystery_style='detective'): searchRows (find existing row by package_id+character_name) → Claude Call 1 (context: description, background, relationships, secret, introduction, characterRole) → Parse → Sleep → Upsert → Claude Call 2 (rumors, accusations) → Parse → Sleep → Upsert (UPDATE by id from Upsert 1) → Claude Call 3 (round2/3/4_script + questions, final_statement) → Parse → Sleep → Upsert (UPDATE by id from Upsert 1) → HTTP POST to generate-pointform-summaries
- Re-run safe: the searchRows step finds an existing character row if one is present, so Upsert 1 UPDATEs that row instead of failing on the unique constraint. First-time generation still INSERTs cleanly (search returns nothing → id reference resolves empty → Make.com omits → Postgres generates UUID via DEFAULT)
- script_type=both is no longer asked of the model. The summarizer step (Claude Haiku 4.5 via the Edge Function) takes the prose just written by the upserts and produces clean bullet summaries into the `*_pointform` columns. No more "model picks one format randomly" failure
- Cost: ~$3.20/mystery for child generation (was ~$1.60). With prompt caching across the 3 Claude calls' shared preamble, real input cost increase is small
- Blueprint at `temp-files/MM Live - Child (Unified)14-SplitCalls.blueprint.json`. Route 1 (character-based) is unchanged — separate work pending
- v13 preserved at `temp-files/MM Live - Child (Unified)13-NoCotAndBoth.blueprint.json` for rollback

### Fix: TLC Reunion (fb085089) materials field reduced to theme-only props
- The `materials` field renders under the "Theme-Specific Props (Optional)" header in `HostGuideTemplate`, but TLC's content was the old verbose format mixing universal items (printed character guides, name tags, timer, slips of paper, pens) with the actual theme bits — causing visible duplication with the static template's universal Materials list rendered just above
- Rewrote to 6 theme-only bullets: TLC reunion backdrop, mock show posters, Go-Go Juice prop bottle (Mountain Dew + Red Bull as murder weapon), faux paparazzi cameras, themed refreshments, reality TV background music
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`. Audited Villa Amore (`02337aff`) and BEFORE THE NIKAH (`c7d0995f`) — same duplication pattern but left untouched per request

## 2026-04-25

### Fix: Better dark-mode contrast on "We're Finalizing Your Mystery" warning card
- Amber-on-dark colors were nearly unreadable; added `dark:text-amber-200` / `dark:text-amber-300` variants throughout the card
- Refresh button now has proper hover states for both light and dark modes

### Milestone: Mystery generation pipeline end-to-end working
- After multi-day debugging session, all generation issues resolved as of this commit
- Full backend now runs reliably: master_context, host guide content, character scripts (point form), evidence cards, detective/investigator script, evidence images all populate cleanly
- Frontend renders the new static host guide template with adaptive Detective/Investigator + Murderer/Culprit terminology, phased generation progress with live character count, evidence card print without Significance section
- Make.com Parent27 (split architecture: 3 separate Claude calls for Detective Script + Evidence Cards + Image Prompts instead of one monolithic JSON), Child v10 (expanded pointForm enforcement covering introduction/rumors/accusations + corrected rumors targeting to skip Friendly relationships)
- Cost ~$2/mystery on Haiku 4.5 across the board



### Refactor: Static host guide template — most content is universal across mysteries
- New `HostGuideTemplate.tsx` component renders all the universal hosting content (preparation steps, slip-draw mechanics, time guidelines, detective setup choice, round-by-round flow, hosting tips) as a static template parameterised by mystery type and player count
- The Make.com prompt no longer regenerates this content per mystery — it only produces dynamic fields (`gameOverview`, `themedMaterials`, `mysteryTips`)
- Eliminates ~80% of host-guide tokens per generation, cuts cost, removes a recurring source of hallucinated content (e.g. "arrive 90 min early", "sealed envelopes")
- Terminology adapts to mystery type: Detective/Murderer for murder, Investigator/Culprit for intrigue
- Time table scales by player count (≤8 = ~1.5h, ≤14 = ~2h, ≤20 = ~2.5h, 20+ = ~3h)

### Feature: Phased generation progress with live character count
- New `GenerationProgress.tsx` component replaces the previous status card during in-progress generation
- Shows overall progress bar + 4 named phases: "Story foundation set", "World and host guide", "Creating characters (X of Y ready)", "Evidence and detective script"
- Active phase has a spinning loader; done phases get a green checkmark
- Live character count updates as each child scenario completes (subscribes to `mystery_characters` INSERT events via Realtime)
- Removes the misleading "automatically checks every 15 seconds" copy — page now updates from real DB events, not polling

### Fix: Supabase Realtime publication for mystery tables
- `mystery_packages` and `mystery_characters` added to the `supabase_realtime` publication so postgres_changes events actually fire
- Without this, the page subscribed to events that never came; `lastUpdate` was stuck at page-load time
- Now drives the new GenerationProgress live updates and the auto-refresh on the mystery view

### Fix: Tightened "We're Finalizing Your Mystery" warning trigger
- The card was firing prematurely during normal in-progress generation because of a fallback condition `(is_paid && gameOverview)` that matched at 60% (when `gameOverview` lands but characters haven't arrived yet)
- Removed the soft fallback; warning now only fires when `generation_status = 'needs_review'` OR `generation_status = 'completed' && characters.length === 0` — i.e., only when there's a real problem
- Manual refresh button now bypasses the 10-second throttle and refetches package + character data (was previously a no-op when clicked within the throttle window)
- Realtime handler also refetches characters now (was only refetching mystery_packages, leaving `characters` state stale)

### Fix: Adaptive Detective/Investigator tab terminology by mystery type
- Tab label was a single i18n key showing the same string for both murder and intrigue mysteries
- Now reads `mystery_type`: "Detective Guide" for murder, "Investigator Guide" for intrigue (matches the script content terminology)
- Added `inspectorIntrigue` keys to en.json desktop + mobile tabs

### Fix: Evidence card print strips Significance section
- New evidence prompt format includes a `#### SIGNIFICANCE (Host Only)` block alongside the description; the print parser was including both
- `PRINT_STRIP` regex now also matches `Significance` so printed cards show only the description + image, as intended

## 2026-04-24

### Feature: PostHog analytics + homepage video play tracking
- Installed `posthog-js` and initialised alongside existing GA4 in `App.tsx`
- Tracks `$pageview` on every route change via PostHog
- Homepage YouTube embed now uses `enablejsapi=1`; a `homepage_video_played` event fires once per session when playback starts (via `postMessage` from the YouTube IFrame API)
- PostHog project key stored as `VITE_POSTHOG_KEY` Vercel env var — never in the repo

### Feature: Intrigue mystery gathering hook — premise and Make.com generation
- Intrigue mysteries need an explicit in-world reason for suspects to stay ("nobody leaves" equivalent from murder mysteries). Added the **gathering hook** requirement across the full stack
- **mystery-ai (v160):** Both intrigue generation branches now instruct the AI to include in the PREMISE: (1) what occasion brings all suspects together, (2) that the wronged party summoned everyone and engaged an outside investigator, (3) why no one can simply leave (venue control, time pressure, or leaving = guilt). The wronged party description now also notes they are NOT a suspect but ARE present and determined
- **Make.com Parent12:** Updated three intrigue modules — Part 1 Planning (2417) adds `gatheringMechanism`, `retentionReason`, `investigatorEngagement` fields to the wronged party profile and JSON output spec; Part 2 Gameplay (4020) requires Round 1 evidence to reference and support the gathering hook; Host Guide (2419) adds a `wronged_party_framing` step before the detective opening with explicit three-part opening structure (identity + engagement → the crime → why no one leaves)
- Blueprint saved as `temp-files/MM Live - Parent12.blueprint.json` — import this into Make.com to replace Parent11

### Fix: Intrigue mystery type generating murder content (confirmed working)
- Four bugs combined to cause this — all fixed and verified end-to-end
- **Bug 1 (auto-generated user message):** `createFormattedInitialMessage` in `MysteryCreation.tsx` always started with "I want to create a murder mystery" regardless of the selected type; added `defaultStartIntrigue` translation key to all 13 locale files and now picks the correct key based on `mysteryType`
- **Bug 2 (Edge Function unaware of mystery type):** `mystery-ai` builds its own system prompt from scratch; the frontend `systemInstruction` prop was always sent as `null` and ignored; added `mysteryType` to the request body and gave all four prompt branches (pre-concept, first message, follow-up, refinement) intrigue-specific variants using THE CRIME / THE WRONGED PARTY / CRIME METHOD format with an explicit "no one dies" constraint
- **Bug 3 (state timing):** `useState(initialMysteryType || 'murder')` captured `undefined` on first render because `formData` loads asynchronously — locked in as `'murder'` forever; fixed by adding `initialMysteryType` to the existing `useEffect` that syncs all other initial props
- **Bug 4 (wrong page):** `ConversationManager` is not used in the `/mystery/chat/:id` route — `MysteryChatPage` renders `MysteryChat` directly and never passed `initialMysteryType` at all; now reads `mystery_type` from the top-level conversation record (individual column) with fallback to `mystery_data` JSONB
- Added intrigue section labels (`theCrime`, `wrongedParty`, `crimeMethod`) to all 13 locale files for localised section headings in the generated concept

### Fix: Character profile field order and accusations label
- `introduction` now appears before `secret` in the character accordion — matches the game's logical sequence (character introduces themselves in Round 1 before secrets are explored)
- Renamed "Round-by-Round Summary" label to "Accusations" — the field is either a plain accusation speech ("I accuse X because…") in newer mysteries or a per-round strategy summary in older ones; the neutral label works for both
- The order follows the TLC sample reference: description → background → relationships → introduction → secret → rumors → round scripts → accusations → final statement

### Fix: Print character guide now uses compiled round scripts
- `buildCharacterGuideContent` was reading only the old per-role sub-fields (`round2_innocent`, `round2_guilty`, etc.) — which are null for any mystery generated by the current unified child scenario. This meant 17 of 19 TLC characters had no round scripts in their printed packets
- Now prefers `round2_script` / `round3_script` / `round4_script` / `final_statement` if present, falling back to the old sub-fields only for legacy mysteries that predate the compiled format
- Side effect: prevents Abby Lee and Sarah Palin's old contaminated sub-field scripts from surfacing in the TLC print view

### Fix: TLC Reunion — Honey Boo Boo secret motive now matches confession
- `secret` field previously said she needed Buddy alive as a class-action lawsuit witness (making her appear innocent), directly contradicting her `final_statement` confession which reveals she killed him over blackmail footage from her childhood show
- Updated `secret` to reflect the actual motive: Buddy had been blackmailing her with unaired childhood footage for two years; tonight he escalated to releasing it unless she left TLC entirely; she and Sarah acted to stop him
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### Fix: TLC Reunion — Honey Boo Boo `secrets` array synced with corrected `secret`
- The `secrets` (JSONB array) field is a separate column from `secret` (text) and was never updated; it still contained the old "lawsuit witness" narrative
- Synced to match the new blackmail/footage motive
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### Fix: TLC Reunion — Sarah Palin accusations removed Honey Boo Boo as a suggested target
- As the accomplice, Sarah should protect the murderer; the `accusations` field was listing Honey Boo Boo as a "strong alternative suspect" to consider accusing — the opposite of her role
- Rewritten with ACCOMPLICE framing: explicit "do not accuse Honey Boo Boo" instruction, and a list of genuinely usable alternative targets (Cousin Anthony, Mama June, Kate Gosselin, Gypsy Rose)
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### Fix: TLC Reunion — Sarah Palin rumors removed stale accomplice instructions
- `rumors` field contained an old `### ACCOMPLICE INSTRUCTIONS` block pairing her with Michelle/Michael Duggar as the murderer — leftover from an earlier generation run before the murderer/accomplice roles were locked
- Sarah's actual role is accomplice to Honey Boo Boo (correctly reflected in all round scripts and `final_statement`); the stale instructions were confusing and incorrect
- Removed the block; `rumors` now opens directly with the three spread-able rumors (unchanged)
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### UI: Dashboard link restyled as a pronounced button in the header
- Authenticated users were confusing the logo with the dashboard entry point because the "Dashboard" link was styled identically to "Support" — flat cream text on red. Now the dashboard link renders as a cream-filled pill button with red text, a subtle shadow, and a lift-on-hover transform so it reads as the primary nav action
- Only the desktop header changed; mobile menu is unaffected

### Feature: Post-party "invite friends" email at +14 days
- New `invite_friends` followup email type. Trigger `schedule_followup_emails` now schedules two rows on generation completion: `how_did_it_go` at +21d (existing) and `invite_friends` at +14d (new). The 14-day cadence lands a week before the Trustpilot ask, while the host's party is freshest in mind
- Edge function `send-followup-emails` rewritten to dispatch on `email_type`. invite_friends template is light, low-pressure, and visually distinct from the Trustpilot ask (red CTA vs. green) so they don't read as duplicates
- Skip rules for invite_friends: respects `unsubscribed_from_followups`, only sends to paid hosts (`is_paid = true`), no point asking a free-draft owner to share
- Edge function redeployed (v9). Trigger updated via `schedule_invite_friends_followup` migration. Existing completed mysteries are NOT backfilled — only new generations get the second email

### Feature: Word-of-mouth share CTAs on Trustpilot email + guest character packet
- Trustpilot followup email (`send-followup-emails`) now includes a small "Friends will love this too" share section below the review CTA. Link is UTM-tagged with `utm_source=share`, `utm_medium=email`, `utm_campaign=trustpilot_followup`, `utm_content=host-{user_id}` so we can attribute the resulting traffic. URL pattern is designed to upgrade to `?ref={code}` once the two-sided referral system lands without changing the email
- Guest character packet (`/character/:token`) now ends with a footer: "Loved playing as {character}? Host your own custom mystery at mysterymaker.party". Every printed packet becomes a low-friction leaflet — every guest is a host candidate. UTM-tagged `utm_source=share&utm_medium=character_packet&utm_campaign=guest_footer`. Footer is a `div`, not a `<footer>` element, so it survives the print rules that hide page chrome
- Edge function `send-followup-emails` redeployed (v8)

### Feature: UTM/referrer attribution capture on signup
- New `profiles` columns: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `landing_referrer`, `landing_page`. Captured into `localStorage` on first external landing (skips internal navs and same-host referrers), then persisted into the user's profile on signup (email + Google OAuth). First-touch only — never overwrites existing non-NULL columns
- Why: self-reported attribution is biased (high-intent buyers skip the survey, browsers answer it). Silent UTM/referrer capture gives ground-truth that can be cross-referenced with the survey
- New helper `src/lib/attribution.ts`; capture wired in `RouteTracker` (`App.tsx`); persistence wired in `SignUp.tsx` and `AuthCallback.tsx`

### Improvement: Attribution survey UX overhauled
- Defer first prompt: only shown after the user either has at least one mystery OR is on their second-or-later dashboard visit. Avoids the "high-intent buyer skips past" selection bias
- Skip is no longer terminal: re-prompt once after 7 days (max two skips, then permanently quiet). Backed by new `attribution_skip_count` column
- Allow natural dismissal: closing the modal (Esc / outside click) now counts as a soft skip, not a forced lock-out
- Added "Bing / Other search" option (DuckDuckGo and bare-typed "GOOGLE" were both showing up as Other previously)
- Mobile layout: switched 2-column grid to single-column on small viewports + scroll cap, so all 9 options are reachable without obstruction
- Migration: `add_utm_attribution_to_profiles`

## 2026-04-23

### Fix: Death At Hollowcrest Manor (7b3766fe) Iris/Ivan rumor about victim retargeted to a cast member
- Preventative audit of paid mystery "Death At Hollowcrest Manor" (20-character random-murderer format, victim Cornelius Hollowcrest). Swept `rumors`, `introduction`, `secret`, `accusations`, `background`, `relationships` across all 20 `mystery_characters` rows
- Only contamination found: Iris/Ivan Thornfield's `rumors` second entry was `**About Cornelius:**` — rumors should target other living suspects, not the victim. Rewrote to `**About Lucian Vale:**` preserving Iris's painter-perception voice and the agitation/atmosphere theme. Other two rumors (about Quinn Mortimer and Noel Fairchild) untouched
- Broader proper-name scan across all 5 audit fields surfaced only cast tokens, "Cornelius/Hollowcrest" (canonical victim, OK as referent), and in-world organizations (Threshold Circle, Preservation Society) / English place names (Edinburgh, Yorkshire) — no further rewrites required
- 1 UPDATE run via `to_jsonb(text)`. Customer-supplied verification regex returns 0 rows. `master_context` is NULL on this package — random-murderer mystery, no fixed murderer/accomplice pairing to preserve

### Fix: TLC Reunion (fb085089) rumors/intro/secret/accusations/background scrubbed of contamination
- Customer (Christina) re-flagged that "Rumors to Spread" still referenced non-cast characters and the wrong victim ("Vicky"/"Chad"/"Dave Hester"). Audit expanded the sweep across `rumors`, `introduction`, `secret`, `accusations`, and `background` for all 19 `mystery_characters` rows
- Found contamination across 5 fields: 12 characters had dirty `rumors` (referencing Anfisa, Colt Johnson, Angela Deem, Carson Kressley, Bethenny Frankel, Dr. Phil, JoJo Siwa, Gordon Ramsay, Nicholas Godejohn, Michelle Dean, Taylor Swift, Neil deGrasse Tyson, Crypto Bro, Bachelor Contestant, Martha Stewart, Colleen Ballinger, Ina Garten, Duff Goldman, Anthony Bourdain, Paula Deen, Tan France, Oprah, Simon Cowell, Bill Klein, the Property Brothers, Sal Vulcano, Brian Quinn, Megan McKenna, Scotty T, Stephen Bear, Sig Hansen, Teresa Giudice, Lisa Vanderpump, Kyle Richards, Garcelle Beauvais, Buddy's family members Mary/Joey/Grace, Storage Wars, Pawn Stars, Deadliest Catch, Real Housewives, Rebecca Romney, Jarrod Schulz, Jen Arnold); 2 dirty `introduction`s (Breaking Amish Cast, Mama June, Toddlers & Tiaras); 4 dirty `secret`s (Breaking Amish, Mama June, Theresa Caputo, Toddlers & Tiaras, Pauly D); 4 dirty `accusations` (Guy Fieri, Gypsy Rose, Mama June, Toddlers & Tiaras, Michelle Duggar, Pauly D, Breaking Amish, Theresa Caputo, Kate Gosselin); 4 dirty `background`s (Breaking Amish, Kate Gosselin, Mama June, Toddlers & Tiaras)
- Rewrote each contaminated field replacing wrong-victim references with "Buddy"/"Buddy Valastro" and swapping non-cast targets for plausibly-grounded members of the 19-cast list. Preserved STOP markers and accomplice instruction blocks; preserved murderer/accomplice pairings (no `character_role` changes)
- For accomplice secrets that named a specific covered-for murderer (Theresa Caputo → Gordon Ramsay, Toddlers child → Bachelor Contestant, Pauly D → Jen Arnold, Breaking Amish → Deadliest Catch Captain), retargeted to a cast member or generic "your true ally" so the secret stays internally coherent without inventing pairings
- Total ~25 UPDATE statements; final verification SQL (both customer-supplied regex and broader noncast-name detector across all 5 fields) returned 0 rows. `quick_reference` is NULL on all 19 — skipped
- Tricky: original rumors used `## RUMORS TO SPREAD`; clean siblings use `### RUMORS TO SPREAD` — standardized rewrites to `###` to match the rest of the package

### Audit: Death At Villa Amore (02337aff) follow-up sweep of rumors/intro/secret/accusations/background — clean
- After this morning's `relationships` rewrite, ran a wider audit across `rumors`, `introduction`, `secret`, `accusations`, and `background` for all 7 `mystery_characters` rows looking for non-cast contamination and wrong-victim references
- Customer-supplied verification regex (`**About <Name>:**` rumor targets) returns 0 contaminated rows — the only "mismatch" hits ("Frankie Bellini") are first-name false positives, since Frankie is the canonical nickname for Francesca Bellini per `master_context`
- Broader proper-name pair scan across all 5 fields surfaced only cast members, the canonical victim Beatrice Romano, and canonical NPCs already established in `master_context` (Alessandro Conti = Giulia's groom and Dane's business partner; Zia Beatrice; Lake Como; Villa Amore). No rewrites required — no UPDATEs run

### Fix: Death At Villa Amore (02337aff) character relationships restructured to ALLIES/RIVALS format with cast-only references
- All 7 characters' `relationships` sections now use the standard `## YOUR RELATIONSHIPS` > `**ALLIES:**` / `**RIVALS & ENEMIES:**` structure with 2-3 entries per subsection, drawn exclusively from the 7-person cast and grounded in each character's actual background. Coordinated symmetrically (e.g. Val ↔ Sage food/wellness tension, Frankie ↔ Riley suspicion) and kept victim Beatrice Romano out of the peer blocks. One-off content fix

### Fix: TLC Reunion (fb085089) character relationships referenced non-cast names
- Customer (Christina) flagged that every character's `relationships` section referenced real-world celebrities and fictional NPCs ("Danny the baker," etc.) who weren't in the 19-person cast — unusable at the table
- Rewrote `relationships` for all 19 `mystery_characters` rows with 3 ALLIES + 3 RIVALS each, drawn exclusively from the cast list; kept victim Buddy Valastro out of peer-relationship blocks (he's handled separately in the mystery)
- Coordinated the network to be symmetric (e.g. Abby Lee ↔ Mama June hostility appears on both sides; Honey Boo Boo ↔ Toddlers & Tiaras child alliance appears on both sides)
- Verified with regex over `relationships::text`: all 114 `**bolded**` name references resolve to the 19-person cast by first-name/slash-variant. One-off content fix, not systemic

### Fix: Character profile tab — labelled sections and parsed accusations JSON
- Every character field (description, background, introduction, round scripts, etc.) is stored as plain text without an embedded `#` heading, so `EditableSection` was rendering them with no label — a wall of unstructured paragraphs with three mystery "Point Form" headers (from within round scripts) and a raw JSON blob from `accusations`
- Added `fallbackLabel` prop to `EditableSection` — displays the friendly label as the section H3 when the content has no embedded heading (embedded heading still wins where present)
- Added `CHARACTER_FIELD_LABELS` map in `MysteryPackageTabView` — `round2_script` → "Round 2 Script", `accusations` → "Round-by-Round Summary", etc., covering all detective-style and character-based fields
- Added `formatAccusations` — parses the `{round2, round3, round4}` JSON into bolded markdown lines so hosts see "**Round 2:** …" instead of raw JSON
- Systemic display fix — benefits every package without touching DB content

### Fix: Deadwood Saloon (79ab2ac3) game_overview leading heading
- Field started with `# Death At The Deadwood Saloon` + `## A Murder Mystery for 9 Players — Deadwood Gulch, 1882` before the body
- `EditableSection` uses the first `#`/`##` line as the section's fixed H3 label and renders everything after (including any remaining H1/H2) as body → resulted in 3 visible titles stacked on the Host Guide tab: the page header, then "DEATH AT THE DEADWOOD SALOON" (as section label), then the subtitle (as body H2)
- Replaced the title + subtitle with the canonical `## GAME OVERVIEW` heading used by every Blueprint-11-generated package — now the Host Guide tab shows only the page-level mystery title plus a single "Game Overview" section heading
- **Not systemic.** Surveyed 10 recent packages: 8 use `## GAME OVERVIEW`, 1 uses `## Welcome to the Train`, 1 has no heading, and only Deadwood (manually authored in this conversation) had the dual title/subtitle pattern. Blueprint 11 itself is fine; this was a one-off authoring mistake

### Fix: Evidence card parser compatible with Blueprint 11 sub-headings
- Parser was treating any h2/h3 as a round boundary — so Blueprint 11's `### [Evidence Name]` sub-heading under `## EVIDENCE: ROUND N` was stopping extraction immediately, leaving descriptions empty and the print portal returning `null` (blank print preview)
- Fixed: only h2/h3 lines containing `ROUND N` count as boundaries; any other h3 stays inside the round
- Legacy `### EVIDENCE CARD — ROUND 2` format still parses (matches the new regex too)

### Fix: Evidence card print — hide #root via inline style instead of CSS
- Previous CSS approach (`body > *:not(.evidence-print-inline) { display: none }`) was losing the specificity fight against `print.css`'s `[role=tabpanel][data-state=active] { display: block !important }` — the active Clues tab re-showed itself alongside the portal, printing the whole page
- Replaced with JS: Print button now sets `#root.style.display = 'none'` (inline style beats all CSS), calls `window.print()`, restores on `afterprint`. Guaranteed isolation regardless of global CSS

### Fix: Cache-bust evidence card image URLs per page load
- Supabase Storage files live at stable URLs (`.../round{N}.webp`) that never change across regenerations, so browser disk cache would serve the old image even after admins uploaded new ones
- Every `<img>` src (tab grid, lightbox, print-inline) now gets a `?v=<mount_time>` query param — each fresh page load pulls the current storage version

### Feature: Deadwood Saloon (79ab2ac3) — evidence cards + images regenerated as Blueprint 11 reference implementation
- `evidence_cards` rewritten: three `## EVIDENCE: ROUND N` sections, each with `### [Name]`, `#### DESCRIPTION` (≤3 sentences, forensics-report voice, no character names or narrative framing), `#### IMPLICATIONS` (neutral across all suspects — no pointing at one character), `#### VISUAL DESCRIPTION` (4-sentence strict format: composition+subject+texture / lighting / depth-of-field / bans+period)
- 3 images regenerated via `black-forest-labs/flux-1.1-pro`, uploaded to `evidence-images/{package_id}/round{2,3,4}.webp` via `store-evidence-images` edge function
- Verification: all three `#### DESCRIPTION`/`#### IMPLICATIONS`/`#### VISUAL DESCRIPTION` headers present, 3 round sections, all 3 image URLs return HTTP 200
- This package is the reference other conversations should read before rewriting their own evidence cards

### Fix: Death At The Velvet Rose (package 546eec7e) — evidence cards and images rebuilt to Blueprint 11 spec

- Rewrote `evidence_cards` from legacy format (`### EVIDENCE CARD — ROUND X: SUBTITLE`, `#### Discovered`, `#### Physical Description`, `#### What This Reveals`, `#### Who It Implicates`) to Blueprint 11 spec (`## EVIDENCE: ROUND N`, `### [Name]`, `#### DESCRIPTION`, `#### IMPLICATIONS`, `#### VISUAL DESCRIPTION (FOR IMAGE GENERATION)`)
- DESCRIPTION sections: max 3 sentences, pure physical facts, no narrator voice, no alibi references
- IMPLICATIONS sections: neutral — presents how multiple parties could have accessed/placed the evidence
- VISUAL DESCRIPTION prompts: corrected to 4-sentence structure (composition + subject + texture in one sentence; raking light; depth of field; bans + period)
- Regenerated all 3 evidence images via Replicate `black-forest-labs/flux-1.1-pro` with new spec-compliant prompts
- Re-uploaded to Supabase Storage `evidence-images/546eec7e-f886-4457-b6fe-a7204e13c5d9/round{2,3,4}.webp`; all URLs return 200
- Verification: `ec_length=5278`, all boolean checks true, all 3 images set

### Fix: Death On The Silver Screen (package 41a581cc) — evidence cards and images rebuilt to Blueprint 11 spec
- Rewrote `evidence_cards` to match Blueprint 11 structure: correct intro text, `### [Evidence Name]` subsection per round, `#### DESCRIPTION` / `#### IMPLICATIONS` / `#### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` subsections
- Round 3 evidence changed from "drink cabinet lock scratches" (faint-trace category) to "prop department sign-out log" (notebook page with visible writing — visually concrete per BP11 selection rules)
- All three VISUAL DESCRIPTION prompts rewritten to strict 5-sentence FLUX 1.1 Pro structure: Extreme close-up composition, texture/contrast with concrete adjectives, raking 45° tungsten side-light, shallow depth-of-field, no-figures ban + period style
- Removed banned language from all prompts: "dim warm lamp light", "moody atmosphere", "dramatic shadows", "soft glow"
- Regenerated all 3 evidence images via Replicate flux-1.1-pro with new prompts; uploaded to evidence-images storage bucket; all three URLs return 200
- Verification: ec_length 5095, all boolean checks true

### Fix: Evidence cards tab — clean heading display for Blueprint 11 and legacy formats
- Added `stripH4Label` helper: removes only the `####` heading line, keeps body text (vs `stripH4Section` which removes heading + entire body)
- `#### DESCRIPTION` / `#### Physical Description`: label stripped, body text kept — hosts see clean paragraphs without sub-headings
- `#### IMPLICATIONS`: label stripped, body text kept — host retains the gameplay context
- `#### Who It Implicates` / `#### What This Reveals` / `#### Discovered` / `#### Visual Description`: entire section removed (spoilers / image-gen only)
- Deadwood Saloon (`79ab2ac3`) evidence_cards rewritten in Blueprint 11 format: 3 rounds, `#### DESCRIPTION` + `#### IMPLICATIONS` + `#### VISUAL DESCRIPTION`, two evidence items consolidated per round

### Improvement: Parent11 blueprint — evidence card sections now use explicit #### headers
- Changed evidence card template from flat text under `### [Evidence Name]` to explicit `#### DESCRIPTION`, `#### IMPLICATIONS`, `#### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` subsections
- `#### DESCRIPTION` instruction tightened to physical facts only — no detective narrative or emotional language — so printed cards stay clean
- Online tab already strips `#### VISUAL DESCRIPTION` via `stripH4Section`; structure now matches the 3-part model (print: Description only, online: Description + Implications, image gen: Visual Description)
- `master_context` merge fix: removed fragile SetVariable string-surgery; Supabase upsert modules now write both Claude outputs directly concatenated — no comma, no merge failure
- Restored `max_tokens` 8192 → 24000 across all 16 Claude modules (Haiku 4.5 supports 64k output; 8192 was an unnecessary reduction)

### Improvement: Child (Unified) v4 — CAST-ONLY CONSTRAINT on character relationships
- New blueprint file: `MM Live - Child (Unified)4-CastConstraint.blueprint.json`
- Root cause found via Christina's TLC Reunion feedback: the character-generation prompt said "List friendly/hostile relationships from matrix" but didn't enforce that names must stay within the provided cast — model fell back to real-world celebrity castmates (90 Day Fiancé, Storage Wars, Pawn Stars, RHOBH etc.) and fictional NPCs (e.g. "Danny the baker", "Mary Buddy's sister")
- Audit of Christina's package (`fb085089`): 15 of 19 characters had relationships referencing non-cast names
- Fix: rewrote the `relationships` prompt to add explicit CAST-ONLY CONSTRAINT — "names MUST come from the cast list provided in input; DO NOT reference real-world celebrities, the character's real-life castmates, or fictional NPCs"; also requires symmetry (A↔B) and 1-2 sentence grounded explanations
- Previous versions preserved (Child Unified, 2, 3-WithRetry) — v4 is the new one to import

### Improvement: Parent11 — Part 2 prompts now bias evidence selection toward visually concrete objects
- Master constraints generation (Part 2 prompts in modules 3000/4010/4020/4030) now instructs model to PRIORITISE VISUAL CONCRETENESS when choosing each round's evidence item
- Prefers physically distinctive objects (engraved items, torn fabric, labelled bottles, notebook pages, sealed letters, distinctive weapons, signet rings) over faint traces, subtle residues, or barely visible marks
- When trace evidence is required by the murder method, instructs model to name the CONTAINER or surrounding object as the depicted item (e.g. "labelled poison bottle" not "faint chemical residue")
- Applied to 7 places: 1 markdown spec section + 3 evidenceProgression JSON templates (Murder routes) + 3 evidenceNeutrality JSON templates (alt route)

### Note: FLUX model is already at top tier (flux-1.1-pro), no model upgrade needed
- Investigated whether to upgrade from FLUX Schnell → FLUX Dev as suggested in image-quality feedback note
- Confirmed Replicate module in blueprint already calls `black-forest-labs/flux-1.1-pro` (12 modules across all routes) — the highest-quality FLUX tier, not Schnell
- The Round 4 gunpowder image issue was a prompt problem (hedged language being dropped), not a model capability problem; tightened VISUAL DESCRIPTION rules should resolve it on next regeneration

### Improvement: Parent11 — VISUAL DESCRIPTION rewritten for FLUX 1.1 Pro detail rendering
- Replaced the loose VISUAL DESCRIPTION template with a strict 5-sentence structure (corrected to reference the actual model `flux-1.1-pro`, not Schnell):
  1. Composition + subject (close-up macro, evidence FILLS THE FRAME)
  2. Texture + contrast (concrete adjectives only — BANNED: "faint", "subtle", "trace", "hint of")
  3. Hard directional lighting (BANNED: "dim", "soft glow", "moody", "dramatic shadows" — produces blur)
  4. Shallow depth-of-field (evidence razor-sharp, background out-of-focus)
  5. Bans + period (no human figures, no faces, no wide scene)
- Reason: FLUX Schnell drops hedged language and inserts atmosphere when subject is implicit; Round 4 gunpowder smear came back as a moody silhouette because the prompt said "faint grey smear catching the light" (all dropped words)
- Applied to all 6 VISUAL DESCRIPTION instructions (3 rounds × 2 evidence-card-generating routes)

### Improvement: Parent11 — DESCRIPTION voice hardened + one-section-per-round structural rule
- DESCRIPTION instruction now mandates "FORENSICS REPORT" voice and explicitly PROHIBITS: detective/narrator framing ("On close examination...", "the deputy noticed...", "had no business being..."), references to character alibis or how evidence was discovered, and emotional/dramatic language
- Added structural rule before evidence card template: exactly ONE `## EVIDENCE: ROUND N` section per round (3 total across rounds 2/3/4), no continuation/split sections (no "ROUND 2: MOTIVES (CONTINUED)" or "PART 2"), one `### [Evidence Name]` item per round with one DESCRIPTION/IMPLICATIONS/VISUAL DESCRIPTION subsection — matches the one-image-per-round print constraint
- Both fixes applied to all routes that generate evidence cards (6 DESCRIPTION instructions, 2 structural rule injections)

### Fix: Evidence cards tab — strip all spoiler/metadata h4 sections
- Previous `/^Discovered$/i` pattern was broken: `^` anchors didn't match against the full heading line `"#### Discovered"`, so it silently stripped nothing
- Fixed with `\bDiscovered\b`; also added stripping for `What This Reveals`, `Who It Implicates`, `Implications` — same sections already stripped in print view
- Older blueprint output (e.g. Deadwood Saloon) that uses these h4 sections now shows only physical description and narrative body text in the tab

### Fix: Evidence card print repeating on every page (portal approach)
- `position: fixed` in print CSS stamps the element on every page of the document — all 3 cards appeared on each page
- Replaced with `createPortal(…, document.body)` so `.evidence-print-inline` is a direct body child; the `body > *:not(.evidence-print-inline)` selector now works correctly and prints exactly 3 landscape pages

## 2026-04-22

### Fix: Evidence card print — blank output on window.print()
- Previous CSS used `body > *:not(.evidence-print-inline) { display: none }` which hides `#root` (a direct body child), cascading down and making the print div invisible despite matching `:not()`
- Replaced with the visibility isolation pattern: `body { visibility: hidden }` + `.evidence-print-inline, .evidence-print-inline * { visibility: visible }` + `position: fixed` — this correctly reveals only the print cards regardless of DOM nesting depth

### Fix: Inline evidence card print + shared parse utility (531f954)
- Moved evidence card print from `window.open('/evidence-card-print?packageId=xxx')` to an inline hidden `<div>` rendered in the Clues tab; `window.print()` is called directly
- Eliminates 404s in Lovable preview, local dev, and any environment without a server rewrite rule
- Extracted `parseEvidenceCards` + `EvidenceCard` into `src/utils/evidenceCardUtils.ts` so both `MysteryPackageTabView` and `EvidenceCardPrint` share the same logic

### Feature: Manual package generation — Death On The Dance Floor (ec22e358)
- Generated full mystery party kit for "Death On The Dance Floor" (18-player disco murder mystery, purchased by miller_jm@hotmail.com) bypassing Make.com pipeline
- Inserted all package-level fields into `mystery_packages`: game_overview, master_context, host_guide, detective_script, materials, preparation_instructions, timeline, hosting_tips, evidence_cards
- Inserted all 18 characters into `mystery_characters` with complete 7-field scripts (introduction, rumors, round2–4 scripts, final_statement, accusations) — 1 murderer (Jett Midnight), 1 accomplice (Nico Nightshade), 16 suspects
- Marked conversation `b53854bd` as `has_complete_package=true`, `needs_package_generation=false`, `display_status=purchased`

### Feature: Manual package text generation — Death At The Deadwood Saloon (79ab2ac3)
- Generated and inserted all 8 package-level text fields directly into Supabase for the Wild West 1882 mystery (9 players, accomplice mechanic)
- Fields written: `game_overview`, `master_context`, `host_guide`, `detective_script`, `materials`, `preparation_instructions`, `timeline`, `hosting_tips`
- Bypasses Make.com pipeline; characters to be inserted separately in a subsequent step

### Fix: Pre-flight character count validation tightened to exact match
- Edge function (v105) now hard-fails if extracted character count differs from `player_count` by even 1 (previously allowed ±1 tolerance)
- Prevents ghost characters from sneaking through when the AI lists N+1 characters in the approved message — stops expensive half-broken generations requiring manual recovery
- Also: `approved_concept_message_id` snapshot now used to extract exactly what the user saw at purchase, not the latest message

### Feature: Tiered timing copy across all 13 locales
- Replaced flat "10 minutes" claim with tiered estimates: small (10-15 min), medium (~20 min), large (25-30 min), xlarge (up to 45 min)
- Updated `timing` section in all 13 locale files (en, de, fr, es, pt, it, nl, sv, da, fi, ko, ja, zh-cn) with idiomatic translations
- Reflects actual generation times now that Haiku is used for all Claude calls in Make.com

### Fix: Refunded mystery hidden from customer dashboard
- Added `.neq("display_status", "refunded")` to `fetchMysteries` query in `Dashboard.tsx`
- Added `"refunded"` to `display_status` and `status` union types in `mystery.ts`
- Prevents refunded mysteries from appearing in user's mystery list

### Fix: Evidence card VISUAL DESCRIPTION section now present in all 4 blueprint routes
- `Parent10.blueprint.json`: added `### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` section after each `### IMPLICATIONS` section in the 3 routes that were missing it (6 total sections across 2 routes now populated)
- Online UI (`MysteryPackageTabView.tsx`) already stripped the VISUAL DESCRIPTION section before display — confirmed no user-facing exposure
- Updated description: 3 sections per evidence card — Description (prints on cards), Implications (online only), Visual Description (image gen only, never shown to users)

### Improvement: Both Make.com blueprints switched to Haiku 4.5
- `Parent10.blueprint.json`: model `claude-sonnet-4-5-20250929` → `claude-haiku-4-5-20251001`, max_tokens 24000 → 8192 (16 modules)
- `Child (Unified)3-WithRetry.blueprint.json`: model `claude-sonnet-4-5-20250929` → `claude-haiku-4-5-20251001`, max_tokens 12000 → 8192 (2 modules)
- Faster generation, lower cost; Haiku 4.5 max output is 8192 tokens (not 24k)

### Fix: TLC Reunion customer mystery (eaf06b79) manually recovered
- Deleted 25 duplicate/incomplete character rows generated by retries
- Generated round scripts for 2 characters missing them (Abby Lee/Abbott Miller, Sarah/Samuel Palin) using Claude Code agent with host_guide + existing character scripts as context
- Updated `player_count` from 18 → 19 to match actual character count (AI generated 19 characters)
- Mystery is now 19/19 characters complete with correct murderer/accomplice role assignments

### Fix: TLC Reunion — deep quality audit and full script repair (DB-only)
- Root cause: `master_context` in `mystery_packages` was stored as a bare comma (`,`) — effectively empty — so the Make.com child scenario had no mystery context when generating round scripts, producing systematic errors across the full character set
- **Victim name corrections**: 4 characters (Breaking Amish, Mama June, Toddlers & Tiaras, Gypsy/Grey) had wrong victim names ("Dave", "Vicky", "Vicky Spotlight", "Chad", "Chad Chaddington IV") in their scripts; corrected to "Buddy Valastro" across all affected rounds via SQL `REPLACE()`
- **Accomplice final statement rewrites**: All 4 accomplice characters (Breaking Amish, Toddlers & Tiaras, Pauly D, Michelle/Duggar) named a specific character as the murderer in their final statement — incompatible with the random murderer selection mechanic where any of 4 characters could be the murderer; rewritten to reference "the murderer" / "the person who told me I was their accomplice" generically
- **Randy Fenoli Round 4**: Original script placed him at home alone from 7 PM onward (left the boutique, not at the party); rewrites to place him at the garden terrace and bar area for a plausible party alibi
- **Toddlers & Tiaras Rounds 2 and 3**: Completely wrong mystery — scripts referenced a crypto scandal, "Chad Chaddington IV", a Bachelor Contestant, and an Influencer (from a different mystery entirely); fully rewritten for the TLC reunion / Buddy Valastro poisoning context
- **Breaking Amish Round 4**: Alibi referenced "the Deadliest Catch Captain" — a non-cast character; rewritten to reference Gypsy/Grey and Big Ed (both confirmed present in the same area from their own scripts)
- **Abby Lee Round 4**: Alibi referenced Randy Fenoli, but Randy's Round 4 said he was home all evening; rewritten to reference Mama June (at catering table) and Gypsy/Grey (in common area)
- **Sarah Palin Round 4**: Alibi referenced Pauly D (wrong time window) and Willie Robertson (in his room); rewritten to reference Lisa Rinna and Big Ed (both confirmed at bar area)
- **Verification**: Final SQL check across all 19 characters confirmed zero wrong victim name references, zero named-murderer accomplice finals, zero NULL script fields

### Fix: "Failed to load conversation" after submitting the mystery creation form
- Root cause: adding the `approved_concept_message_id UUID REFERENCES messages(id)` column on `conversations` created a second FK path between `conversations` and `messages` (the existing one being `fk_messages_conversation_id` on `messages.conversation_id`). PostgREST can no longer auto-resolve the embed `messages(*)` and responds with HTTP 300 (Multiple Choices), which surfaces client-side as the `loadConversationFailed` toast — blocking every new chat because the post-create load immediately 300s
- Fix: disambiguate every `.select("*, messages(*)")` call by specifying the FK hint `messages!fk_messages_conversation_id(*)`, matching the pattern the Supabase dashboard already generates
- Updated call sites: `MysteryChat.tsx`, `ConversationManager.tsx`, `mysteryPackageService.ts`, `VercelChatbot.tsx`, `MysteryPurchase.tsx`, and the `mystery-webhook-trigger` Edge Function
- The webhook-trigger change requires redeploying that Edge Function to take effect

### UI: "Current Step" panel now has visible motion to signal processing
- Previously the Current Step box was entirely static — no indication anything was actively happening during the ~10-minute generation window
- Swapped the static Clock icon for a spinning `Loader2` in the primary color, and added a subtle `animate-pulse` to the step-description text so the panel visually breathes while work is in flight

### UI: Refresh icon in generation progress card is now legible
- Ghost-variant button inherited no explicit text color, so the refresh icon on the dark "Generating Your Mystery Package" card rendered in a washed-out tint that was hard to see
- Set `text-muted-foreground hover:text-foreground` on both instances (progress card and failed-state card) so the icon is clearly visible at rest and pops on hover

### UX: Instant transition from Generate button to progress card
- Previously: clicking "Generate Mystery Package" left the user on the same card with a disabled "Starting Generation..." button (which rendered in the muted disabled-primary state and looked off) until the next poll cycle populated `generationStatus` — only a manual refresh would flip the UI to the proper "Generating Your Mystery Package" progress card
- Now: `handleGeneratePackage` in `MysteryView.tsx` optimistically seeds `generationStatus` to `in_progress` on click, so the progress card renders immediately; on webhook error we roll the status back to `null` so the Generate button reappears for retry
- Eliminates the inconsistent pre-/post-refresh UI the user was seeing after purchase

### Fix: Ghost characters from earlier draft versions sent to Make.com generation
- Root cause: `mystery-webhook-trigger` Edge Function was aggregating characters across ALL assistant messages in the conversation, so removed-then-replaced characters from earlier drafts (e.g. "Sam Valentino", "Devon Rothschild") were still being extracted and sent for generation alongside the current cast — creating "ghost" character rows that never got scripts populated and made the parent scenario hang
- Implemented Option B (snapshot at purchase time): when the user clicks Generate in `MysteryChatCreator.tsx`, we now identify the latest AI message containing a Character List and store its ID as `approved_concept_message_id` on the conversation
- Edge function (v102) prefers the snapshot — extracts characters from exactly the message the user approved on the preview page, falling back to the latest list message if no snapshot exists (legacy conversations)
- Eliminates the manual ghost-character cleanup step that was required for every multi-iteration mystery
- Added new `approved_concept_message_id UUID REFERENCES messages(id)` column on `conversations`

### Improvement: Diagnostic log for every character generation attempt
- New `child_generation_attempts` table + Postgres trigger that fires on every `mystery_characters` INSERT
- Captures `package_id`, `conversation_id`, `character_name`, `mystery_style`, and length of intro/round2/round3/round4/final fields, plus a `has_full_scripts` generated column
- Indexed on `(package_id, attempted_at DESC)` and a partial index on failures for fast triage
- Lets us answer "which characters failed and how many attempts did each take" in a single query instead of forensic reconstruction next time a customer reports an issue

**How to inspect failures (run in Supabase SQL editor):**

Per-attempt log for a specific conversation:
```sql
SELECT character_name, attempted_at, intro_length, round2_length,
       round3_length, round4_length, final_length, has_full_scripts
FROM child_generation_attempts
WHERE conversation_id = '<conversation-uuid>'
ORDER BY attempted_at;
```

Just the failures across all packages:
```sql
SELECT conversation_id, character_name, attempted_at, intro_length, round2_length
FROM child_generation_attempts
WHERE has_full_scripts = false
ORDER BY attempted_at DESC
LIMIT 50;
```

Failure rate per character (for spotting "always-fails" patterns):
```sql
SELECT character_name,
       COUNT(*) as attempts,
       SUM(CASE WHEN has_full_scripts THEN 1 ELSE 0 END) as successes,
       SUM(CASE WHEN NOT has_full_scripts THEN 1 ELSE 0 END) as failures
FROM child_generation_attempts
WHERE attempted_at > NOW() - INTERVAL '7 days'
GROUP BY character_name
HAVING SUM(CASE WHEN NOT has_full_scripts THEN 1 ELSE 0 END) > 0
ORDER BY failures DESC;
```

### Fix: Pre-flight character count validation in mystery-webhook-trigger (v103)
- Hard-fail (HTTP 400) if extracted character count differs from `player_count` by more than 1, after the existing Claude fallback runs
- Prevents silently sending a mismatched character count to Make.com (which produces a half-broken generation that's expensive to recover)
- Returns a structured error with `extractedCount`, `expectedCount`, and `extractionMethod` for client display

### Improvement: Make.com child Anthropic calls now retry on transient failures
- Replaced the silent `Resume` (detective route) and `Rollback` (character-based route) error handlers on the child scenario's Anthropic modules with `Break` handlers (3 retries, 60s interval, autoComplete=true)
- Matches the pattern already used on the Parse JSON module (which is why JSON failures self-healed but Anthropic failures didn't)
- New blueprint at `temp-files/MM Live - Child (Unified)3-WithRetry.blueprint.json` — re-imported into existing scenario

### Fix: Parent retry loop never caught child script failures
- Root cause: `get_empty_characters` RPC was checking `description IS NULL OR character_role IS NULL`, but those columns are populated during basic-character creation (long before scripts are generated) — so the RPC always returned 0 even when round scripts were missing, and the parent's existing 3-pass retry loop never fired
- RPC now joins to `conversations.mystery_style` and checks the actual script columns: `round2_script`/`round3_script`/`round4_script`/`final_statement` for detective style, `round2_innocent`/`round2_guilty`/`round2_accomplice` (etc) for character-based style
- Customer recovery: completed Death In The Spotlight (25-player) — final character (Parker/Penelope Ashford) auto-recovered via the parent retry once the RPC was fixed; cleaned up 2 duplicate empty rows left by failed attempts

## 2026-04-20

### Feature: Intrigue mystery type alongside classic murder mysteries
- Added new "Mystery Type" selector on the creation form with two card-style options: **Murder** (classic killing) and **Intrigue** (theft, scandal, sabotage, conspiracy — no one dies)
- Broadens audience: corporate events, kid-friendly parties, and customers who find murder themes uncomfortable can now use the generator
- Mystery Type and Mystery Style (Detective vs Character-Based) are now independent choices — every combination works (4 total routes)
- New `mystery_type` column on `conversations` table (defaults to `'murder'` for backward compatibility)
- System prompt adapts language and output format based on the selected type: intrigue mysteries use "crime", "culprit", "wronged party" instead of "murder", "killer", "victim"
- Added mismatch detection in both directions: if the user selects intrigue but describes a killing (or vice versa), the chatbot gently flags the conflict and asks them to confirm
- Make.com parent scenario now routes on both `mysteryStyle` and `mysteryType`, with dedicated prompts for each of the 4 combinations (Master Constraints, Host Guide, Script & Evidence)
- Make.com child scenario (per-character script generation) receives `mysteryType` and adapts automatically via a preamble that matches the master constraints document's language
- JSON field names kept as-is for downstream compatibility — the content within them uses intrigue language when appropriate
- Translated all new UI strings across 13 locales (en, pt, fr, es, de, it, nl, sv, da, fi, ja, ko, zh-cn) using idiomatic terms for "Intrigue" in each language
- Neutralized existing `mysteryStyleCharacterDescription` and `mysteryStyleDetectiveDescription` translations (e.g. pt "assassino" → "culpado", de "Mörder" → "Schuldige") so the Mystery Style descriptions work for both Murder and Intrigue types

## 2026-04-16

### Improvement: Characters now generated with defining personality traits
- Updated concept generation prompts to require a vivid personality trait or quirk for each suspect (e.g. "a jittery accountant who triple-checks everything") instead of just a job title and connection
- Applied to both the first-message and follow-up concept generation paths in mystery-ai Edge Function
- Makes characters instantly more memorable and playable; users can still edit traits during the concept refinement phase

## 2026-04-15

### Fix: Stripe webhook crashing with 500 — no purchase notification emails sent
- Root cause: `stripe.webhooks.constructEvent()` (sync) uses Node.js `crypto` module which fails in Deno Edge Functions runtime
- Switched to `constructEventAsync()` which uses the Web Crypto API compatible with Deno
- Added `?target=deno` to Stripe esm.sh import for proper Deno compatibility
- Improved error logging with null-safe property access for better debugging
- Redeployed as v54

### Feature: AI referral traffic tracking via GA4 Data API
- Added `scripts/fetchAIReferrals.mjs` — queries GA4 for sessions from ChatGPT, Claude, Perplexity, Gemini, Copilot, and other AI engines
- Reports breakdown by source/medium, landing page, daily trend, and AI vs all traffic comparison
- Integrated into `fetch-all-analytics.sh` pipeline and added `npm run fetch-ai-referrals` script
- First 90-day snapshot: 10 AI sessions (0.63% of traffic), ChatGPT leading with 8 sessions, Gemini and Perplexity with 1 each

### Fix: Prevent empty tabs when generation completes without characters
- MysteryView.tsx now requires `characters.length > 0` before showing the tab view — previously `is_paid` or `status === 'completed'` alone would show empty tabs
- Added fallback: if status looks complete but characters are missing, shows the "We're Finalizing Your Mystery" card instead of broken empty content
- Root cause: when the Make.com character-based child scenario was off, the parent marked packages as "completed" before child webhooks returned, leaving 0 characters in the DB while the UI showed empty tabs

### Fix: Customer recovery — BEFORE THE NIKAH and Death At Villa Amore
- Both packages had parent content (overview, host guide, master context) but 0 character scripts due to child scenario being off
- Generated and inserted all character scripts directly (5 for BEFORE THE NIKAH, 7 for Villa Amore)
- Fixed double-encoded `extracted_characters` and `generation_status` fields on Villa Amore package
- Generated evidence cards, detective script, and 3 evidence card images for Villa Amore (parent hadn't completed those steps)
- Set `character_role` on all characters to prevent monitoring sweep from re-flagging

## 2026-04-13

### Fix: generate_sql.py — incorrect column mapping for wedding mystery characters
- Removed `round2_statement` and `round3_statement` assignments (columns do not exist in `mystery_characters`)
- Removed `whereabouts` (never existed)
- Fixed `relationships` from plain `text` escaping to `::jsonb` cast — source is a markdown string, stored as a JSON string value via `json.dumps()` + `::jsonb` cast
- Added `secrets = NULL` (jsonb column exists but source has no data)
- Added `accusations` assignment (text column, field IS present in source JSON)
- Set `round2_accomplice`, `round3_accomplice`, `round4_accomplice` to NULL (columns exist but source has no data for them)
- Re-generated `update_1.sql` through `update_5.sql` with corrected mappings

## 2026-04-12

### Fix: Section label headings not uppercase in host guide
- `EditableSection` extracts the first `#` heading from content and renders it as an `<h3>` outside the `.prose` div — so `text-transform: uppercase` on `.mystery-content .prose h3` never applied to it
- Added `.mystery-content .editable-section h3` rule with Bowlby One font, red color, and `text-transform: uppercase !important` to match prose heading style — covers "Welcome to the Train", "Materials", "Prep Guide", and all other section labels

### Fix: Alpine Express — duplicate mystery title in host guide
- `game_overview` had `# Murder On The Alpine Express` as its first line, which `EditableSection` extracted and rendered as a visible header — duplicating the page-level title already shown at the top of the view
- Stripped the `# Murder On The Alpine Express` line from `game_overview` in the DB for record `054ca914`; content now starts cleanly with `## Welcome to the Train`
- Make.com blueprint already generates `gameOverview` starting with `## GAME OVERVIEW` (no title) — no blueprint change needed; this was a one-off data issue from an older generation

### Fix: h2/h3 headings not uppercasing in mystery content
- `text-transform: uppercase` on `.mystery-content .prose h2` and `.mystery-content .prose h3` was being overridden by Tailwind's prose cascade — added `!important` to both so headings render uppercase in host guide, character guides, and evidence sections

### Fix: Stripe webhook failures — both Supabase and Vercel endpoints
- Supabase edge function redeployed with corrected DB update (removed non-existent `stripe_session_id`/`stripe_payment_intent` columns, now sets `purchase_date`)
- Added `vercel.json` with rewrites so `/api/webhook` routes to the serverless function instead of the SPA catch-all
- Backfilled `purchase_date` for 10 March purchases that were missing it due to webhook failures

### Fix: Parent blueprint — evidence cards VISUAL DESCRIPTION and Note 1 showing on live site
- Module 182 (detective-style route): removed `*Note 1: Use the visual descriptors...*` and all three `### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` blocks from the `evidenceCards` template — image prompts already exist separately in `imagePrompts` field and should never be saved to `evidence_cards` in DB
- Module 182: added MAXIMUM 3 sentences constraint to all three round descriptions — evidence card text prints on physical cards with limited layout space
- Module 171 (master constraints): added same 3-sentence constraint to `Item: [Physical description]` fields in Evidence Progression section so the source descriptions are constrained from the start
- Changes apply to `MM Live - Parent.blueprint.json` in temp-files — ready to import into Make.com

**Note**: Module 171/182 changes refer to the promotional video mystery creation project using Claude/Make.com, NOT the main website mystery generation system. The main website uses master constraints stored in `mystery_packages.master_context` field in Supabase.

### Fix: Generation prompt style detection reading wrong table
- Prompt said "handle whichever style it is" with no direction on where to look, causing the AI to read `mystery_packages.mystery_style` which defaults to `'character'` — wrong if not explicitly set
- Added Phase 0: query `conversations.mystery_style` and `conversations.script_type` as the source of truth before any generation begins; state both values out loud; explicitly sync them to `mystery_packages` on save
- Added explanation of what detective vs character style means for the host guide structure

### Fix: Excessive spacing between evidence card sections on mystery view
- `EditableMultiSection` splits on both `##` and `###` headers, causing round headers (e.g. "EVIDENCE: ROUND 3") to become isolated header-only sections with `space-y-6` (24px) gap pushing them away from the cards below
- Reduced `space-y-6` to `space-y-3` in `EditableMultiSection`
- In `EditableSection`, the header div's `mb-2` is now `mb-0` when there is no body content, removing dead vertical space from header-only sections

### Fix: Mystery generation prompt — evidence card format and image prompt wording
- Phase 5 Step 1 said "as part of the evidence_cards content" which could be misread as instruction to embed image prompts inside the evidence_cards text saved to Supabase; rewrote to keep image prompts in memory only, never write to DB
- Evidence card template updated to match the round-based format (Round 2/3/4 with IMPLICATIONS sections) and to cap physical descriptions at 3 sentences max — descriptions are printed on physical cards with a fixed layout; IMPLICATIONS are web-only and do not print

### Fix: Alpine Express evidence_cards — visual descriptions stripped from live site
- `evidence_cards` JSONB field contained `*Note 1: Use the visual descriptors...*` and `**VISUAL DESCRIPTION (FOR IMAGE GENERATION)**` blocks that were rendering on the live mystery page
- Stripped both blocks and saved clean text back to Supabase (`package_id: 054ca914-d115-432a-9760-6f462c2cef04`)

### Fix: Evidence tab crash — screen goes dark when clicking Clues & Evidence
- `packageData.evidenceCards` can arrive from Supabase as a non-string (e.g., JSON object), causing `TypeError: t.replace is not a function` in `EditableMultiSection.splitByHeaders`
- Added `typeof` guard in both `splitByHeaders` and the `evidenceCards` memo so non-string values fall through to the clue-extraction fallback instead of crashing

### Feature: Generate "Murder On The Alpine Express" — 12-player mystery saved to Supabase
- Full character-based mystery generated and saved directly to Supabase (package ID `054ca914-d115-432a-9760-6f462c2cef04`, conversation ID `bd5318f4-5a78-4413-85a3-6ce2f902556d`)
- 12 European characters: Victoria Ashworth (murderer), Count Franz Hoffmann, Isabelle Renard, Dr. Leopold Crane, Natalya Volkov, Marcus Thorne, Lord Archibald Pembrooke, Baroness Elise von Hartmann, Signora Lucia Ferrara, Heinrich Braun, Madame Colette Moreau, Professor Erik Lindqvist
- All 14 fields populated per character (description, background, relationships, secret, introduction, rumors, round 2–4 scripts and questions, accusations, final statement)
- STOP blocks confirmed present at end of rumors and all three question rounds for all 12 characters
- Master context saved to `mystery_packages.master_context` covering murderer identity, method (strychnine in brandy decanter, 9:45 PM window), full relationship matrix, evidence cards, and deception guidelines
- All 12 characters passed quality audit: STOP block placement, background cleanliness, alibi specificity, secret red-herring design, honest suspect arcs, murderer deception layering
- `generation_status` set to `complete`

### Fix: In-progress generation falsely shown as completed on dashboard
- `checkGenerationStatus` treated `is_paid === true` as a completion signal, but `is_paid` is set when the user pays — before generation finishes
- Combined with `allCharactersGenerated` defaulting to `true` (no `extracted_characters` at start), the auto-completion logic fired immediately, marking the mystery as "purchased" with empty content
- Removed `is_paid` from `conversationIndicatesComplete` — only `has_complete_package` is a reliable completion indicator
- Added guard: when `generation_status` is explicitly `in_progress`, require actual content (title/host_guide) before auto-completing

### Fix: Chatbot generate button hidden behind mobile bottom nav
- The fixed chat input + "Generate Full Mystery" button was positioned at `bottom-0` with `z-20`, hidden behind the bottom nav (`z-40`, 64px tall)
- On mobile, the chat container now uses `bottom-16` to sit above the nav bar
- Increased bottom padding on chat messages area (`pb-48`) and page container (`pb-40`) to prevent content from being obscured

### Improvement: Remove duplicate items from mobile hamburger menu
- Removed Dashboard and Account Settings links from the hamburger menu since they already exist in the bottom nav bar
- Hamburger menu for logged-in users now shows: user info, Sign Out, Support, and Language Switcher
- Follows UX best practice: bottom nav for primary actions, hamburger for secondary/utility actions

### UI: Remove redundant Mysteries tab from mobile bottom nav
- Home and Mysteries both linked to `/dashboard` — confusing and redundant
- Removed Mysteries tab, now a clean 3-tab layout: Home, Create, Settings

### UI: Shorten bottom nav "Account Settings" label to "Settings"
- "Account Settings" was too long for a bottom nav tab, causing text wrap and misaligned icon
- Shortened to single-word labels across all 13 locales (e.g. "Settings", "Ajustes", "Konto", "設定")

## 2026-04-12

### Improvement: Mystery generation prompt — add image generation phase and missing documents
- Added Phase 5: Replicate image generation via Supabase Edge Function workaround (sandbox blocks api.replicate.com directly)
- Documents the full flow: generate image prompts → get Replicate key from user → deploy one-off edge function → invoke → verify → remind user to delete function to clean up API key
- Added `evidence_card_images` to Phase 6 verification SQL check

### Improvement: Mystery generation prompt — add missing documents and character count fix
- Added Phase 2 character count confirmation: Claude must explicitly list and confirm all characters before generating any, preventing early stops (e.g. stopping at 6 when there are 12)
- Added Phase 4 covering the three missing package-level documents: `host_guide`, `evidence_cards`, `detective_script` — with full format templates for each
- Added Phase 6 SQL check verifying all three package documents are saved before sign-off
- Renumbered phases accordingly (now 8 total)

## 2026-04-09

### Feature: Unarchive mysteries from the dashboard
- Archived mystery cards now show "Unarchive" instead of "Archive" in the dropdown menu
- Restores the mystery to its correct prior status (purchased or draft) based on payment state
- Added translations for both EN and PT

### Feature: 7-day welcome discount for new accounts (20% off)
- New users get a unique, single-use Stripe promotion code (20% off) generated at signup
- Sticky countdown ribbon (cream + red CTA badge style) appears site-wide showing time remaining and discounted price ($19.99 vs $24.99)
- Purchase page auto-applies promo code to Stripe checkout URL and shows discount pricing
- Banner disappears silently after 7 days or once the user has purchased
- Automated reminder emails at day 5 (48h left) and day 7 (final hours) via pg_cron + Edge Function
- Welcome email updated to prominently feature 20% discount offer and 7-day window
- Backfilled 15 recent signups (last 7 days) with unique promo codes + sent welcome discount notification emails
- New Edge Functions: `generate-welcome-discount`, `send-discount-reminders`, `backfill-welcome-discounts` (one-time)
- New DB columns on profiles: `welcome_promo_code`, `welcome_promo_expires_at`, reminder tracking flags

### Improvement: Relationships section — Allies / Rivals & Enemies (Make.com blueprint)
- Updated `relationships` field template in module 70 of the Detective-Style blueprint
- Replaced "Friendly Relationships / Hostile Relationships" with "Allies / Rivals & Enemies" — more thematic and in-character
- Dropped neutral tier: anyone not listed is implicitly neutral, keeping the sheet scannable during play

### Fix: Remove duplicate "Your Relationships with Others" from character backgrounds (Make.com blueprint)
- Updated `MM Live - Child (Detective-Style).blueprint.json` in temp-files
- Removed the `**Your Relationships with Others:**` section from the `background` field template in module 70's Claude prompt
- This section was being generated twice: once in `background` (plain text) and once in the separate `relationships` field (properly formatted)
- Fix applies to all future mystery generations from this scenario

## 2026-04-08

### Improvement: Enable Character-Based mystery style
- Removed "Coming Soon" badge, disabled state, and opacity from the Character-Based radio option
- Detective style remains the default selection

### Improvement: Accessible heading color + no red in body copy
- Reverted primary brand red to #C81400 (nav, buttons, backgrounds stay bold and striking)
- Mystery content headings (screen only) now use #E53E2A — 3.1:1 contrast, passes WCAG AA for large text
- Body copy red eliminated: `strong`, `a`, `code`, `thead th` inside mystery content forced to cream
- Chat headings also updated to #E53E2A
- PDF/print: mystery title (h1) now uses Bowlby One display font; section headings remain Inter for readability

### Fix: Reduce excessive spacing in evidence cards section
- Tailwind prose `<hr>` default margin was 3em top/bottom — reduced to 1.25rem inside `.mystery-content`
- First child element in prose body no longer adds top margin that stacks with the section label gap

### Fix: Mystery headings now render red Bowlby One as intended
- `mystery-package.css` was setting heading color to `var(--color-cream)` instead of `hsl(var(--color-primary))` (red); added `!important` to both `color` and `font-family` to win over Tailwind typography plugin load-order
- Removed `text-foreground` utility from EditableSection's extracted h3 heading — it was overriding the CSS rule with cream instead of letting the cascade apply
- Character accordion name headings now get inline red + Bowlby One styles directly since they sit outside `.prose`
- Print overrides in `print.css` already use `!important` to revert to Inter/black — no change needed there

### Improvement: Dual-format detective script (Script + Key Points per round)
- Detective script now requires both a `#### Script` (full narrative dialogue) and `#### Key Points` (bullet-point summary) sub-section for every round
- Hosts can read the script verbatim, improvise from bullet points, or have the script recorded by an AI voice
- Updated Make.com blueprint7 (all 3 prompt instances: detective-style + 2 character-based) with `#### Script` / `#### Key Points` template structure and `DUAL FORMAT` instructions
- Updated `script_type_instructions` to clarify detective script always includes both formats regardless of scriptType
- Added format spec comment in `mystery-ai` Edge Function for codebase documentation
- No DB or frontend changes needed — `EditableMultiSection` already handles the header hierarchy

### Fix: Host guide game overview now shows its "Game Overview" section title
- `stripFirstHeading()` was stripping the `## GAME OVERVIEW` heading before passing to `EditableSection`, so that section rendered with no visible title
- Removed the strip call; heading is now extracted and displayed like all other host guide sections

### Fix: Mystery title and action buttons no longer crowd each other
- Added `flex-1 min-w-0` to the title `<h1>` so long titles wrap instead of overflowing
- Added `flex-shrink-0` to the buttons container and `gap-6` to the row for consistent breathing room at all screen sizes

### Fix: Mystery content headings now visible on dark background
- `prose-slate` was overriding the custom typography heading color (`hsl(var(--color-primary))`) with `#0f172a` (near-black), making headings invisible on the dark background
- Removed `prose-slate` from `EditableSection` and the fallback host-guide prose block in `MysteryPackageTabView`; the app-level custom typography config now applies correctly

### UI: Stylized headings in mystery content on screen; plain when printed
- Added CSS in `mystery-package.css` to render `##`/`###` headings inside mystery content using the Bowlby One display font with uppercase tracking
- `EditableSection` section-label `<h3>` elements also styled with the display font
- `print.css` already overrides all headings to plain Inter with `!important`, so printed/PDF output is unaffected

## 2026-04-07

### Feature: Generated and stored evidence card images for "Murder At The Velvet Rose"
- Generated 3 photorealistic film-noir evidence card images via Replicate (flux-schnell): sale agreement documents (round 2), revolver + key (round 3), stopped pocket watch (round 4)
- Deployed a temporary Supabase Edge Function to run Replicate + upload to `evidence-images` storage bucket + update DB — bypassing sandbox proxy restrictions
- Images stored at `evidence-images/{package_id}/round{N}.webp`; all 3 URLs saved to `evidence_card_images` JSONB column

### Feature: Manually populated "Murder At The Velvet Rose" mystery for YouTube demo
- Bypassed Make.com pipeline to avoid API costs for a demo mystery (package ID `40957647-8c4f-4fbb-bc36-ac3e153fb272`)
- Populated all `mystery_packages` fields: master_context (57,580 chars), host guide, evidence cards, detective script, game overview, materials, preparation instructions, timeline, hosting tips
- Inserted all 10 characters into `mystery_characters` with full scripts for all 4 rounds, intro, rumors, accusations, and final statements
- Murderer: Ricky/Rita Moretti; setting: New Year's Eve 1927 Chicago speakeasy
- `generation_status` set to `"completed"` so mystery appears in Mystery Maker UI

### Fix: Generation time now shows "about 10 minutes" for all mystery sizes
- New architecture generates all mysteries in ~10 minutes regardless of player count, so dynamic per-size estimates were misleading
- Simplified `getEstimatedTime` to return a flat estimate across all locales (13 languages updated)
- Removed "Larger mysteries require more time" copy from generation page descriptions

## 2026-04-06

### Fix: Theme from homepage hero input lost when form theme filled
- When user typed a theme on the homepage (e.g. "1920s speakeasy") then added details on the form (e.g. "New York City"), only the form value was used
- Now combines both inputs: "1920s speakeasy in New York City" — hero input provides the concept, form theme refines location/setting
- Conversation title also uses the combined theme for better dashboard display

### Fix: Detective/Inspector incorrectly appearing in character list
- AI was including the detective as a playable character in the suspect list
- Added explicit instructions to system prompt: Inspector/Detective is the HOST role, not a player, and must never appear in the character list
- All listed characters must be suspects with motives and secrets

### Improvement: Updated generation time estimates to match actual performance
- Small (≤6 players): 5-8 min (was 5-10), Medium (7-12): 8-12 min (was 15-30), Large (13-20): 12-20 min (was 30-45), XL (21+): 20-30 min (was 45-60)

### Fix: Spurious "I apologize" error message after AI generates concept
- AI was sometimes double-triggering a response after sending the concept, causing a failed request
- Added guard: if the last message is already from the AI, don't send another request
- Removed error message persistence to DB — transient errors now show as a toast notification only, not saved to conversation history

### Improvement: AI asks clarifying question even from form submissions
- Previously, form submissions with player count skipped straight to concept generation
- Now the AI evaluates whether the theme would benefit from one clarifying question (e.g., "1920s speakeasy" → asks about location/occasion)
- Highly specific themes (e.g., "Victorian mansion dinner party where the host is poisoned") still skip straight to generation
- Results in richer, more personalized mystery concepts

### Fix: Purchase preview showing wrong character count after edits
- When a user revised characters (e.g., swapped a pianist for a gangster), the preview aggregated characters from ALL AI messages, including old revisions
- Now only uses characters from the most recent complete concept message, so the count matches the final version

### Fix: Dashboard showing theme instead of mystery title
- Title extraction regex didn't handle quoted titles (e.g. `# "MURDER IN THE BIG APPLE"`) — updated regex
- Additionally: now updates the conversation `title` column in the DB when the AI generates a concept with a `# TITLE` header
- Dashboard no longer depends solely on message-based extraction at render time — the title is persisted as soon as the AI generates it

### UI: Restore stylized headings in mystery chat
- Chat headings (h1/h2) were overridden to plain body font — restored Bowlby One display font with uppercase styling and red (#C81400) color
- Used inline styles to prevent `prose-invert` from overriding heading colors to white
- Removed `dark:prose-invert` from chat prose wrapper since component-level styles handle all colors
- Gives the mystery reveal sections more visual impact and thematic pop

### Fix: Accomplice toggle invisible in dark mode
- Switch component used near-black background for unchecked state on dark background
- Now uses explicit cream-tinted rgba values (15% fill, 40% border) for clear visibility in dark mode

### UX: Improve "Create New Mystery" form from dashboard
- When creating from the dashboard (no hero input), the theme field now shows "Describe Your Mystery" with an inviting placeholder
- When creating from the homepage (with hero input), the theme field keeps its secondary "Theme/Setting Details (Optional)" label
- Translated across all 13 supported languages

### UX: Show loading message during initial mystery concept generation
- When AI generates the first mystery concept (~20s), now shows "Crafting your mystery concept — this can take up to 30 seconds..." beneath the typing dots
- Only appears on the initial generation (no prior AI messages), not on subsequent back-and-forth
- Translated across all 13 supported languages

### Improvement: Print-friendly headings
- Added `@media print` CSS rules to override display font (Bowlby One) with plain Inter/Helvetica for all headings
- Web display keeps the stylized decorative headings; print/PDF output uses clean readable fonts

### Fix: Attribution survey responses not persisting
- UPDATE RLS policy on `profiles` was checking `auth.uid() = user_id` but `user_id` is NULL for all rows; actual auth column is `id`
- Updated policy to `auth.uid() = id` so survey responses (and any profile updates) actually save
- Previously the dialog would close but nothing was written, causing it to reappear on every Dashboard visit

### Feature: "How did you hear about us?" attribution survey
- Added post-signup lightbox dialog that asks new users how they discovered the site
- 8 visual source buttons (Google, YouTube, TikTok, Instagram, Reddit, Friend, Blog, Other) with icons and brand colors
- "Other" option expands a text input for free-text attribution detail
- Skip button for users who don't want to answer; response saved to `profiles` table
- Fully translated across all 13 supported languages
- Shows once on Dashboard for users who haven't completed it; tracked via `attribution_surveyed_at` column
- Hidden X button to funnel users toward an explicit choice (pick source or skip)
- GA4 event tracking for completions and skips

### Fix: Consolidate Stripe webhook to single endpoint
- Merged GA4 purchase tracking and Resend email notifications from Supabase Edge Function into `api/webhook.js`
- Eliminates duplicate webhook endpoints that caused Stripe delivery failures (signature mismatch on redundant endpoints)
- All purchase handling now in one place: DB updates, Make.com trigger, GA4 event, and email notification

## 2026-04-05

### Improvement: Expand pillar post outbound links in cross_link_map.json
- Expanded all 5 pillar blog posts from 5 to 15 outbound links each in `cross_link_map.json`
- Pillars: `murder-mystery-party-planning-checklist`, `ai-murder-mystery-generator-complete-guide`, `first-time-hosting-murder-mystery-complete-guide`, `murder-mystery-party-for-adults-guide`, `murder-mystery-party-ideas`
- For each pillar: selected 10 new thematically relevant target slugs, prioritising bidirectional targets that already link back
- Found verbatim match phrases (count=1) in EN and all 12 non-EN language versions (ES, FR, DE, IT, DA, FI, NL, SV, PT, KO, JA, ZH-CN)
- All 5 pillars verified at exactly 15 entries in `links_to`, `insertions`, and all 12 `lang_insertions` arrays

## 2026-04-05

### Fix: Remove scroll flicker on logged-in homepage
- Disabled parallax/fade animations on the hero for authenticated users since there's no content below to scroll to
- Added `overflow-hidden` to the page container for authenticated users to prevent any scroll
- Disabled Lenis smooth scroll when authenticated (no scrollable content)

### Improvement: Smarter clarifying questions in initial chat
- Rewrote the pre-concept system prompt in the mystery-ai Edge Function to reliably ask clarifying questions for vague themes
- The AI now evaluates creative specificity rather than word count: "restaurants" triggers a question, "1920s speakeasy" does not
- Includes concrete examples of vague vs specific themes to guide the AI's judgment
- When asking, the AI suggests 2-3 concrete directions to spark imagination rather than putting the burden on the user

### Fix: Complete dark theme color audit across all pages
- Purged all remaining old burgundy #8B1538 from BlogPost, BlogIndex, Feedback, AdminDashboard, Showcase, NotFound, EvidenceCard pages, MysteryRoomHero, EmailVerificationBanner
- Feedback nudge card: charcoal bg with cream text (was cream/burgundy)
- Print Evidence Cards button: red bg instead of invisible outline
- Chat typing indicator dots: full #C81400 red, larger (was maroon at 60% opacity)
- Blog pages: black backgrounds, semantic text colors, dark CTA sections
- Form inputs: charcoal bg with cream border (excludes hero chatbox)
- Chat input bar: charcoal container, red send button
- Alert/info boxes: charcoal bg with subtle borders globally
- Zero instances of old theme colors (#8B1538, #6B0F28, #F7F3E9, #FEFCF8) remain in codebase

### Improvement: Smarter clarifying questions in initial chat
- Rewrote the pre-concept system prompt in the mystery-ai Edge Function to reliably ask clarifying questions for vague themes
- The AI now evaluates creative specificity rather than word count: "restaurants" triggers a question, "1920s speakeasy" does not
- Includes concrete examples of vague vs specific themes to guide the AI's judgment
- When asking, the AI suggests 2-3 concrete directions to spark imagination rather than putting the burden on the user

### Improvement: Translated "Copy for AI" button across all 13 languages
- Added `blog.copyForAI`, `blog.copied`, and `blog.copyForAITooltip` translation keys to all 13 locale files
- Updated BlogPost.tsx to use `useTranslation()` for the button labels and tooltip
- Button now displays in the user's selected language (e.g., "Copiar para IA" in Spanish, "AI用にコピー" in Japanese)

### Feature: "Copy for AI" button on blog posts
- Added a "Copy for AI" button in the blog post header next to reading time
- Copies the post's title, meta description, source URL, and full markdown content to the clipboard in a format optimized for pasting into ChatGPT, Claude, Perplexity, or any AI assistant
- Improves UX for AI-first users who want to ask follow-up questions about the content
- Button shows a check icon and "Copied!" confirmation for 2 seconds after clicking

### Feature: llms.txt for AI engine discoverability (AEO)
- Added `public/llms.txt` served at mysterymaker.party/llms.txt — a hierarchical index of all published blog posts organized by thematic cluster
- Following the llmstxt.org standard format (H1 title, blockquote summary, grouped H2 sections with link + description)
- Initial version contains 83 published posts across 11 clusters (pillar, how-to-host, theme ideas, troubleshooting, etc.)
- Added `scripts/generate-llms-txt.mjs` — reads Supabase and cross_link_map.json to build llms.txt
- Daily publish action now regenerates llms.txt after each publish and commits it back to the repo
- Makes site content discoverable to AI engines (ChatGPT, Claude, Perplexity, Gemini) via the standard llms.txt convention

### Improvement: Expanded pillar page outbound links from 5 to 15
- All 5 pillar pages now link to 15 cluster posts each (up from 5), across all 13 languages
- Completes the bidirectional hub-and-spoke architecture recommended by the SEO/GEO playbook
- Pillar pages: murder-mystery-party-ideas, adults-guide, first-time-hosting, ai-generator, planning-checklist
- Total pillar outbound links: 75 (5 × 15) up from 25 (5 × 5)

### Feature: Blog link added to footer
- Added "Blog" link to Quick Links section of the Footer component
- Added `footer.links.blog` translation key to all 13 locale files
- Footer shows on all public-facing pages (homepage, blog, support, auth pages) but not for logged-in users
- Provides crawl path from homepage to blog content per SEO/GEO playbook's 3-click rule

### Feature: Cross-link insertions complete for all 13 languages
- All 420 slugs × 12 non-EN languages now have 5 cross-link insertions each (25,200 total non-EN insertions)
- Combined with EN insertions: 27,300 total cross-links across all 13 languages
- Languages: EN, ES, FR, DE, IT, DA, FI, NL, SV, PT, KO, JA, ZH-CN
- Each insertion has verbatim match_text unique to that language's content, with correct `/{lang}/blog/{slug}` URL patterns
- Verified: zero nulls, zero broken links, zero empty targets, 420/420 coverage per language

### Fix: 515 broken NL cross-link insertions across 103 slugs
- Fixed all NL insertions where `target_slug` was empty and replacement URL ended in `/nl/blog/)` with no slug
- For each broken entry, extracted the correct target slug from the corresponding EN insertion's replacement URL (by index position)
- Reconstructed proper replacement markdown links using `/nl/blog/{target-slug}` format
- All 515 existing Dutch match_text phrases (already valid verbatim substrings of NL content, 3–8 words) were preserved; only target_slug and replacement URL were corrected
- Saved progress after every 20 slugs (103 total slugs fixed, 5 insertions each)

### Feature: ES cross-link insertions for 1920s-speakeasy-murder-mystery-party-guide
- Added `lang_insertions.es` with 5 Spanish insertions to the speakeasy slug
- Targets: murder-mystery-party-ideas, ancient-egypt-murder-mystery-party-guide, 1950s-diner-murder-mystery-party-guide, 1960s-mod-murder-mystery-party-guide, 1970s-disco-murder-mystery-party-guide
- All match_text phrases are verbatim unique substrings of the ES content, not in headings or existing links, 3–8 words
- All existing lang_insertions keys preserved (fr, de, it, da, fi, nl, sv, pt, ko, ja, zh-cn)

### Feature: IT cross-link insertions for cold-war-spy-murder-mystery-party-guide
- Added `lang_insertions.it` with 5 Italian insertions to the cold-war-spy slug
- Targets: murder-mystery-party-ideas, bollywood-murder-mystery-party-guide, comedy-murder-mystery-party-guide, downton-abbey-murder-mystery-party-guide, horror-murder-mystery-party-guide
- All match_text phrases are verbatim unique substrings of the IT content, not in headings or existing links, 3–8 words
- All existing lang_insertions keys preserved (fr, de, da, fi, nl, sv, pt, ko, ja, zh-cn, es)

### Feature: Danish (DA) cross-link insertions for rows 2–215
- Added `lang_insertions.da` to 213 slugs in `cross_link_map.json` (rows 2–215 of blog_map.xlsx, skipping R122 duplicate)
- Each slug received exactly 5 DA insertions matching its EN insertion targets (target_slug extracted from replacement URL for entries lacking explicit target_slug field)
- All match_text values are verbatim unique substrings of the Danish content, not inside headings or existing links
- Phrases are 3–8 words (up to 12 where needed), drawn from body paragraphs, with no reuse across the 5 insertions per post
- Semantically keyword-matched to each target post's topic where possible; contextual fallback for mid-content phrases otherwise
- All existing fr, de, and it keys in lang_insertions were preserved — only the da key was added/merged

### Feature: AI-generated evidence card images (Make.com integration tested)
- Verified end-to-end Make.com pipeline: Webhook → 3x Replicate Flux 1.1 Pro → Supabase Edge Function → Storage + DB
- Fixed edge function to merge image URLs on partial updates instead of overwriting
- Added lightbox to evidence card images (click to enlarge, X to close)
- Fixed print page parser to handle both detective-style and improv-style evidence card formats
- Added "Photorealistic" prefix to image prompt instructions for better Flux output quality
- Added pointForm carve-out in Make.com blueprint so evidence prompts are always full detail
- Stripped visual description text from evidence cards display when real images exist
- Cost: ~$0.12 per mystery (3 images × $0.04 each)

### Feature: Italian (IT) cross-link insertions for rows 216–422
- Added `lang_insertions.it` to 206 slugs in `cross_link_map.json` (rows 216–422 of blog_map.xlsx that had IT content)
- Each slug received exactly 5 IT insertions matching its EN insertion targets
- All 1,030 match_text values are verbatim unique substrings of the Italian content, not inside headings or existing links
- Phrases are 3–8 words, drawn from different sentences within each post, with no same-sentence reuse across the 5 insertions
- Semantically relevant to each target post's topic; keyword-matched where possible, contextual fallback otherwise
- Existing EN, FR, DE data preserved unchanged

## 2026-04-04

### Feature: Italian (IT) cross-link insertions for rows 2–215
- Added `lang_insertions.it` to 213 slugs in `cross_link_map.json` (rows 2–215 of blog_map.xlsx, skipping R122 known duplicate)
- Each slug received exactly 5 IT insertions matching its EN insertion targets
- All 1,065 match_text values are verbatim unique substrings of the Italian content, not inside headings or existing links
- Phrases are 3–8 words, semantically relevant to target post topics, and drawn from diverse locations within each post
- Existing EN, FR, and DE data preserved unchanged

### Feature: AI-generated evidence card images
- Integrated Replicate Flux 1.1 Pro API to auto-generate photorealistic evidence card images (16:9, webp)
- Created `store-evidence-images` Supabase Edge Function to download from Replicate, upload to Supabase Storage, and update DB
- Added `evidence-images` storage bucket and `evidence_card_images` JSONB column to mystery_packages
- Improved Make.com blueprint prompt instructions for higher quality image generation prompts (photorealistic style anchors, composition terms, material specificity)
- Added `imagePrompts` as separate JSON output field in Claude prompt for clean extraction
- Added pointForm carve-out so evidence card prompts are always full detail regardless of script type
- Evidence tab shows 3 images in a grid with click-to-enlarge lightbox
- "Print Evidence Cards" button opens landscape A4 print-ready view with real images
- Visual description sections auto-hidden from evidence text when images exist
- Print parser handles both detective-style and improv-style evidence card formats

### Feature: German (DE) cross-link insertions for rows 216–422
- Added `lang_insertions.de` to 207 slugs in `cross_link_map.json` (rows 216–422 of blog_map.xlsx)
- Each slug received exactly 5 DE insertions matching its EN insertion targets
- All match_text values are verbatim unique substrings of the German content, not inside headings or existing links
- Total DE cross-link coverage now 420/420 slugs

### UX: Improve initial chat message grammar
- Fixed awkward message when starting from hero input (e.g. "Cypherpunk nightclub This is for 6 players...")
- Now reads naturally: "I want to create a murder mystery with a Cypherpunk nightclub theme for 6 players with full scripts."
- Hero input is treated as the theme when form theme field is empty
- Updated all 13 locale translation strings to match new sentence-fragment pattern
- Added localhost:8080 to Edge Function CORS allowed origins for dev

### Fix: Chat AI not responding — deprecated Anthropic model
- Updated `mystery-ai` Edge Function model from `claude-sonnet-4-5-20250929` (deprecated by Anthropic) to `claude-sonnet-4-5-20250514`
- All new conversations since 2026-04-04 were returning error fallbacks; redeployed as v148
- Cleaned up error messages from affected conversations

### Feature: Full site dark redesign with parallax homepage
- New color system: black #000000 / charcoal #111111 backgrounds, red #C81400 accents, cream #F5F0E8 text (no pure white)
- Bowlby One display font for all headings, Inter for body text, all headings uppercase
- Parallax hero: detective background image with scroll depth effect, white chatbox with typewriter
- Lenis smooth scrolling across entire homepage
- Animated counter stats section: 500+ mysteries, 999+ themes, 5 min to start
- Horizontal scroll How It Works (GSAP pinned, desktop) with timeline fallback (mobile)
- Zigzag staggered scroll reveal for Features section
- 3D tilt testimonial cards with real Trustpilot reviews (Sophia, Will Treaty, Jed)
- "Verified Trustpilot Review" badge with green star under each reviewer name
- Red #C81400 navigation, Support CTA section, and accent elements throughout
- Redesigned auth modal: Google OAuth button, or-divider, red Sign Up, outline Sign In
- Mobile-optimized: responsive hero, stacked How It Works, centered feature text

### Improvement: Dark theme applied across all pages and components
- Mystery package tabs: charcoal strip, red active state, cream text
- Chat bubbles: charcoal background with cream border (not invisible black-on-black)
- Chat input bar: charcoal container, red send button, cream text
- Form inputs globally: charcoal bg with cream border (excludes hero chatbox)
- Alert/info boxes: charcoal bg with subtle borders (removed yellow/cream/white)
- FAQ: left-aligned questions in body font, red chevrons, consistent heading sizes
- Mystery content headings: Inter body font, normalized H1-H3 sizing
- Duplicate title stripped from Host Guide tab content
- Print/PDF styles: forced black text on white for accessibility
- HostAccess tabs: red active state, charcoal background
- "Scroll to explore" hidden for logged-in users

### Improvement: Email templates redesigned for dark theme
- Welcome, character assignment, and host guide emails all updated
- Red header with MYSTERY MAKER wordmark, charcoal content area, cream text
- Red CTA buttons, black feature boxes with red left border
- From name changed to "Mystery Maker", simplified footer with link only
- Deployed all three Edge Functions to Supabase

### Improvement: Wizard prompt translations updated to sentence-fragment pattern
- Updated `mysteryCreation.wizard.prompt` keys (withTheme, withoutTheme, withAccomplice, withoutAccomplice, additionalDetails) across all 12 non-English locales
- Changed from standalone sentences to sentence-continuation fragments that flow naturally after "I want to create a murder mystery..."
- Danish and Swedish were previously untranslated (English fallback); now have proper translations
- All {{template}} variables preserved

### Fix: Chat AI not responding — deprecated Anthropic model
- Updated `mystery-ai` Edge Function model from `claude-sonnet-4-5-20250929` (deprecated by Anthropic) to `claude-sonnet-4-5-20250514`
- All new conversations since 2026-04-04 were returning error fallbacks; redeployed as v147
- Cleaned up error messages from affected conversations

### Feature: German (DE) cross-link insertions for 213 blog posts (rows 2–215)
- Added `lang_insertions.de` arrays to `cross_link_map.json` for 213 blog posts (rows 2–215, skipping R122 known duplicate)
- Each post has exactly 5 DE insertions matching the 5 EN insertion targets
- Phrases are 3–12 word unique substrings from the German content, scored for semantic relevance to target slug topics
- All match_text values verified unique within their post's DE content
- No headings, existing links, code blocks, or metadata lines targeted
- Existing data (EN insertions, FR lang_insertions) preserved unchanged

### Feature: Guest feedback system
- Added `guest_feedback` table for collecting per-character feedback from mystery party guests
- Built `/guest-feedback/:token` page — dark-themed, minimal (star rating + optional highlight text), uses existing character assignment access tokens
- Created `send-guest-feedback-email` Edge Function with batch mode — sends branded feedback request emails via Resend 14 days after character profiles are sent
- Set up daily pg_cron job (`send-guest-feedback-emails`, 10:00 AM UTC) to automatically find and email eligible guests
- Thank-you page includes "Browse Our Mysteries" CTA for organic guest-to-host conversion
- Added GDPR Art. 14 privacy notice to character profile emails ("Your email was provided by the host... one follow-up email... no mailing lists")
- Feedback email includes one-time email disclaimer
- Backfilled `feedback_email_sent_at` on all existing assignments so only new guests receive feedback emails going forward

### Feature: Host Trustpilot review prompts + followup email system
- Created `send-followup-emails` Edge Function — processes pending `followup_emails` rows (the 21-day "how did it go" emails that were scheduled but never had a sender)
- All host followup emails now drive to Trustpilot review first, internal feedback page as secondary CTA
- If positive guest feedback exists when the host email sends, it includes social proof ("Your guests loved it! [Character] rated it 5 stars")
- Created `notify-guest-feedback` Edge Function — triggered by database insert on `guest_feedback`:
  - Sends you an email notification (support@) with mystery, character, rating, and highlight
  - If guest gave 4-5 stars AND host's followup email already sent/skipped, sends immediate Trustpilot prompt to host with guest quote
  - If host's followup is still pending, does nothing — the scheduled email will include guest data when it sends
- Set up daily pg_cron job (`process-followup-emails`, 10:15 AM UTC) to send due host emails
- Skipped 28 stale followup emails (conversations older than 1 month); 9 recent ones retained for sending
- Green Trustpilot-branded CTA button (#00b67a) with unsubscribe link

### Feature: French (FR) cross-link insertions for 207 blog posts (rows 216–422)
- Added `lang_insertions.fr` arrays to `cross_link_map.json` for all 207 blog posts in rows 216–422
- Each post has exactly 5 FR insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the French content, semantically relevant to target slug topics
- All 420 entries in the map now have FR insertions (213 from previous batch + 207 from this batch)
- No rows skipped — all had FR content and valid cross-link entries
- Saved progress every 20 posts; existing `insertions`, `lang_insertions.es`, and prior `lang_insertions.fr` data preserved

### Feature: French (FR) cross-link insertions for 213 blog posts (rows 2–215)
- Added `lang_insertions.fr` arrays to `cross_link_map.json` for all 213 blog posts in rows 2–215
- Skipped row 122 (`how-murder-mystery-parties-can-transform-team-dynamics-and-morale`) — known duplicate with no content
- Skipped 1 slug not in cross_link_map (`how-to-fix-venue-decoration-disasters-transform-spaces-successfully-without-breaking-budgets`)
- Each post has exactly 5 FR insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the French content, semantically relevant to target slug topics
- Position-tracked to ensure no overlapping phrases within a single post
- All 1,065 insertions validated: unique match_text, correct `/fr/blog/{slug}` URLs, existing EN and ES data preserved

### Feature: Spanish (ES) cross-link insertions for 104 blog posts (rows 111–215)
- Added `lang_insertions.es` arrays to `cross_link_map.json` for 104 blog posts (rows 111–215)
- Skipped row 122 (`how-to-fix-venue-decoration-disasters-...`) — not in cross_link_map
- Each post has exactly 5 ES insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the Spanish content, not inside headings or existing links
- All 520 insertions validated: unique match_text, correct `/es/blog/{slug}` URLs, existing EN and Convo A ES data preserved

### Feature: Spanish (ES) cross-link insertions for 109 blog posts (rows 2–110)
- Added `lang_insertions.es` arrays to `cross_link_map.json` for all 109 blog posts (rows 2–110)
- Each post has exactly 5 ES insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the Spanish content, not inside headings or existing links
- Each insertion spread across different paragraphs to avoid clustering
- All 545 insertions validated: unique match_text, correct `/es/blog/{slug}` URLs, EN insertions preserved

### Feature: Backfill EN cross-links for published posts
- Added `scripts/backfill-crosslinks.mjs` — one-time script to apply cross-links to already-published EN posts in Supabase
- Added `.github/workflows/backfill-crosslinks.yml` — manual-trigger GitHub Action to run the backfill
- Script fetches all published EN posts, applies match_text → replacement from cross_link_map.json, skips already-linked posts
- Added .gitignore exception for the new script

### Feature: EN cross-link application in daily publish action
- Updated `publish-daily-blog.yml` to checkout the repo and read `cross_link_map.json`
- Before publishing, the action now fetches EN content, applies up to 5 cross-link insertions (match_text → replacement), and patches the updated content back to Supabase
- Uses Node.js for reliable string replacement (handles special chars in markdown)
- Gracefully skips if no cross-links exist for a slug or if `cross_link_map.json` is missing
- Committed `cross_link_map.json` (420 entries × 5 insertions = 2,100 EN cross-links) and `CROSS_LINKING_PLAN.md`

### Fix: Filled 46 null cross-link insertions across 30 slugs
- Part A: Created full `insertions` array (5 entries) for `how-to-fix-lighting-and-atmosphere-issues-that-could-dim-your-murder-mystery-party` which had `links_to` and `cluster` but no insertions
- Part B: Filled 41 null `match_text`/`replacement` entries across 29 slugs where no organic fit was initially found
- Every post was read manually to find natural, contextually relevant phrases for each target link
- All 46 insertions validated: unique match_text, not inside headings or existing links

### Feature: Cross-link insertions for 109 blog posts (Convo A, rows 2-110)
- Added contextual cross-link insertion data to `cross_link_map.json` for all 109 blog posts (pandas indices 1-109)
- Each post has 5 link target slots; 504 successful insertions placed with natural anchor text, 41 nulled where no organic fit existed (92.5% success rate)
- Every post was read manually section by section to find natural insertion points — no regex or bulk pattern matching used
- Each insertion includes `match_text` (unique snippet from post) and `replacement` (same snippet with markdown link woven in)
- Null entries indicate the target topic had no natural mention in the source post (e.g., beach-resort links in gothic/viking posts)

### Feature: Cross-link insertions for 105 blog posts (Convo C, rows 216-320)
- Added contextual cross-link insertions to `cross_link_map.json` for 105 posts in rows 216-320
- 525 insertions placed (5 per post, 100% success rate) — each `match_text` is a unique verbatim substring of the EN content
- Phrases chosen by semantic relevance to target slug topic, avoiding headings, existing links, and code blocks
- 14 initially-failed insertions were manually resolved with broader keyword searches

### Feature: Cross-link insertions for 104 blog posts (Convo B, rows 111-215)
- Added contextual cross-link insertions to `cross_link_map.json` for 104 posts in rows 111-215
- Skipped row 121 (no EN content) and row 122 (known duplicate `how-murder-mystery-parties-can-transform-team-dynamics-and-morale`)
- 520 insertions placed (5 per post, 100% success rate) — each `match_text` is a unique verbatim substring of the EN content
- Phrases chosen by semantic relevance to target slug topic, avoiding headings, existing links, and code blocks

## 2026-04-03

### Feature: Supabase sync workflow for blog_map.xlsx
- Created `scripts/sync-blog-map.mjs` — reads blog_map.xlsx and syncs all posts to Supabase
- Updates 72 published posts with audited translations (preserves status/published_at)
- Deletes old draft rows, inserts 349 new draft slugs × 13 languages with staggered created_at
- Created `.github/workflows/sync-blog-map.yml` — manual-trigger GitHub Action to run the sync
- Compatible with existing `publish-daily-blog.yml` (oldest draft published daily)

### Improvement: Cleaned up stale files
- Deleted 10 stale xlsx/csv files (~190MB): blog_map_backup.xlsx, blog_map_fixed.xlsx, blog_map_fixed2.xlsx, blog_map_repaired.xlsx, blog_map_work.xlsx, mysterymaker_blog_master.xlsx, blog_posts_all_languages.csv, supabase_import.csv, translations_import.csv, batch3_en_import.csv
- Only blog_map.xlsx (master) and new_blog_topics_pipeline.xlsx (planning) remain

### Improvement: All 13 language translation audits complete
- Completed final cleanup: JA R87, ZH-CN R172/R197/R226 retranslated to full quality
- All 361 draft posts × 13 languages now audited and ready for Supabase sync

## 2026-04-02

### Improvement: ZH-CN translation audit R151–R250 — 98 full retranslations
- Audited 100 rows of Simplified Chinese blog translations (R151–R250) against English source content
- 2 rows (R151–R152) passed with no changes; 98 rows required full retranslation due to machine-garbled phrasing, incorrect terminology ("谋杀悬疑"→"谋杀推理"), broken syntax, and truncated content
- Rows 247–249 had the worst originals — barely readable telegraphic Chinese with grammatical particles stripped out
- All 100 rows now rated A; retranslations target 28–35% ZH/EN character ratio
- Full audit details appended to CHANGELOG_TRANSLATION_QA.md under "R151-R250 ZH-CN Content Audit"

### Improvement: ZH-CN translation audit R341–R422 — 82 full retranslations
- Audited 82 rows of Simplified Chinese blog translations (R341–R422) against English source content
- All 82 rows required full retranslation — originals were uniformly below 50% density ratio (machine-generated truncated translations)
- New translations target 28–35% ZH/EN character ratio; 77 of 82 rows (94%) hit target range
- Translations done manually sentence-by-sentence preserving all structure (headers, FAQs, meta descriptions, MysteryMaker references)
- Full audit details appended to CHANGELOG_TRANSLATION_QA.md under "R341-R422 ZH-CN Content Audit"

### Fix: Remove experimental preview pages to fix production build
- Deleted `ParallaxDemo.tsx` and its route — was importing `gsap` and `@studio-freight/lenis` which broke the CI build
- Removed `HomeParallaxPreview` import and route — file was untracked, causing build failure
- Removed unused `gsap` and `@studio-freight/lenis` dependencies from `package.json`

### Improvement: JA translation audit R341–R422 — 41 full retranslations, 8 spot fixes
- Audited 82 rows of Japanese blog translations (R341–R422) against English source content
- Fully retranslated 41 rows: 25 had garbled machine translation, 8 had formal です/ます tone (should be casual だ/である), 8 had severe MT artifacts (literal katakana, wrong kanji, Chinese characters mixed in)
- Applied spot fixes to 8 additional rows: word corrections (容疑人→容疑者, ストレンジャー→見知らぬ人, 赤ニシン→おとりの手がかり) and header fixes (最後更新日→最終更新日)
- All retranslations verified for header structure match, JA/EN length ratio (35–48%), and natural casual Japanese phrasing
- Full audit details appended to CHANGELOG_TRANSLATION_QA.md under "R341-R422 JA Content Audit"

### Feature: Full site dark redesign — Bowlby One + black/red/cream color system
- Replaced entire site color system: black #000000 / charcoal #111111 backgrounds, red #C81400 accents, cream #F5F0E8 text (no pure white)
- Replaced Playfair Display with Bowlby One for all headings, wordmark, and display text
- Navigation: red background, cream text, black Sign Up button
- Hero: detective background image with 55% dark overlay, red submit button, dark translucent input
- Sections alternate black/charcoal: Trustpilot (black), Demo (charcoal), How It Works (black), Features (charcoal), Testimonials (black), FAQ (charcoal)
- Support CTA: full vivid red section, black button with cream text
- Footer: black background, Bowlby wordmark, cream text hierarchy with opacity variants
- Testimonial cards: charcoal bg with cream border, red stars and avatars
- FAQ: cream questions, muted cream answers, red chevrons, cream-border dividers
- All colors defined as CSS custom properties at :root — no hardcoded hex in components
- Updated tailwind.config.ts font families, typography plugin, and index.css @import

### Improvement: Dark preview v3 — black/charcoal/red with cream text
- Complete color system rewrite: black #000000 and charcoal #111111 alternate, red #C81400 accents, cream #F5F0E8 text (no pure white anywhere)
- Navigation: red #C81400 background, cream text, black Sign Up button
- Hero: centered detective bg image with overlay on red
- Sections alternate: Trustpilot (black), Demo (charcoal), How It Works (black), Features (charcoal), Testimonials (black), FAQ (charcoal)
- Support CTA: full vivid red #C81400 background, black button with cream text
- Footer: black background, cream headings, muted cream links/copyright
- All text uses cream rgba variants: 70% for body, 40% for copyright, 35% for inactive, 10% for borders
- Stars, avatars, number circles, chevrons, active circles all use red accent

### Improvement: Dark preview v2 — black + navy alternating sections
- Complete rewrite of `/dark-preview` color system: hero/nav/footer/testimonials/how-it-works/support on pure black (#000000), video/features/FAQ on navy (#0D1B6E), trustpilot bar on dark navy (#0A1550)
- Chat input box uses navy background with subtle white border
- All CTA buttons, stars, avatars, number circles, and chevrons use red accent (#C0392B)
- Inactive feature step circles use transparent bg with rgba border and muted blue-grey text (#7986CB)
- Logo rendered as plain white text (no gradient)
- Every section has explicit inline style — zero CSS class inheritance for backgrounds

### Improvement: JA translation quality audit (R251–R340)
- Audited 90 rows of Japanese blog content cell-by-cell against English source
- All 90 rows were below 60% JA/EN character ratio, requiring full retranslation
- Rows 251-276 received comprehensive section-by-section retranslations
- Rows 277-320 received moderate to condensed retranslations covering core content
- Rows 321-340 received comprehensive retranslations with natural Japanese
- Results logged in CHANGELOG_TRANSLATION_QA.md under "R251-R340 JA Content Audit"

## 2026-04-01

### Fix: Complete truncated PT translations for 6 blog posts
- Completed PT (Portuguese) translations for rows R384, R386, R387, R388, R389, R390 in blog_map.xlsx
- These rows were flagged as TRUNCATED_END during prior retranslation pass — PT content was cut off before covering all EN source sections
- Missing EN sections identified by comparing EN/PT structure cell-by-cell, then translated and inserted into each row's PT content
- Results logged in CHANGELOG_TRANSLATION_QA.md under "R341-R422 PT Retranslation Completions"

### Feature: Dark navy theme preview page
- Added `/dark-preview` route with a full homepage preview using a dark navy color system
- New palette: deep navy backgrounds (#0D1B6E, #1A237E, #0A1550), red-orange CTAs (#C0392B), teal secondary (#00897B), white/light-grey text
- Scoped via `.dark-preview` CSS class — zero impact on the live site
- Overrides hardcoded colors (text-black, bg-white, #8B1538) within the preview scope
- Includes floating "View Current Site" link for easy A/B comparison

### Fix: Dark preview — eliminate all remaining light backgrounds
- Added inline `style` props on every section wrapper to guarantee navy backgrounds (#0D1B6E primary, #1A237E secondary)
- Logo "Mystery Maker" now renders plain white #FFFFFF (not gradient)
- How It Works section: explicit #1A237E background, white headings, #B0BEC5 body text
- Video Demo section: explicit #0D1B6E background
- Feature steps inactive items: visible against dark background (#B0BEC5 text, subtle white border)
- Footer forced to #0A1550, header to rgba navy with backdrop blur
- Trustpilot logo inverted for dark bg visibility
- Separators, borders, and accordion dividers all use rgba(255,255,255,0.15)
- Support CTA section uses #1A237E background with explicit white/light-grey text

### Improvement: PT translation quality audit (R341–R422)
- Audited 82 rows of Portuguese blog content cell-by-cell against English source
- Applied ~700+ fixes: full rewrites for R341-348 (near-PIDGIN quality), targeted fixes for R349-360 and R405, H1 titles added to all 82 rows, common calque/anglicism fixes across all rows
- Worst issues: "texto corajoso" (bold text), "Espíritos" (spirits→ghosts), "festa culpada" (guilty party), "isla" (Spanish), English words left in (upstairs, aim, budget, scheming, etc.)
- R356 had entire FAQ section missing — translated and added 7 Q&A pairs
- 6 rows flagged TRUNCATED_END (R384, R386-390): PT content cut short, missing 3000-6600 chars each — need retranslation
- Quality: 52 GOOD, 6 FAIR, 19 POOR (including 8 full rewrites from prior session), 0 PIDGIN, 6 TRUNCATED_END
- Full results appended to CHANGELOG_TRANSLATION_QA.md

### Improvement: PT translation quality audit (R151–R250)
- Audited 100 rows of Portuguese blog content cell-by-cell against English source
- Applied ~520 fixes: anglicisms (template→modelo, setup→configuração, email→e-mail), gender agreement (o estrutura→a estrutura), typos (aporentadoria→aposentadoria ×34 in R166), literal translations, untranslated English words
- R170 (invitations-wording) had 67 fixes — most problematic row with extensive untranslated English
- 72% rated GOOD, 24% ACCEPTABLE, 2% POOR; 0 PIDGIN or TRUNCATED
- Full results appended to CHANGELOG_TRANSLATION_QA.md

### Fix: Quarterly blog refresh GitHub Action
- Fixed jq field name mismatch: SQL function returns `lang` but workflow referenced `.language`
- Added HTTP status code checking so Supabase API errors fail fast with a clear message instead of silently piping error responses into jq
- Manually ran the refresh — all 13 languages updated to April 2026 (2,431 posts total)

## 2026-03-25

### Improvement: Detective-style child scenario prompt cleanup
- Added 🛑 **STOP!** 🛑 markers after rumors, round 2, round 3, and round 4 sections (these were present in character-based but missing from detective-style)
- Removed redundant innocent/guilty/accomplice script variants — detective-style only needs `round2_script`, `round3_script`, `round4_script`, and `final_statement` since the murderer is predetermined
- Removed `quickReference` field as redundant with existing character content
- Simplified `accusations` field to match character-based format (no role-specific guidance text)

### Fix: Detective-style character tab rendering
- Characters tab now correctly renders `round2_script`, `round3_script`, `round4_script`, and `final_statement` fields for detective-style mysteries
- Previously rendered only innocent/guilty variants which are empty for detective-style, resulting in blank character accordions

## 2026-03-24

### Fix: Show tab view immediately after purchase
- After completing payment, users now see the full tab view (Host Guide, Characters, Clues, Inspector) with the generate button inside, instead of a plain "Generate" card with no tabs
- `is_paid` is now set to `true` in the database as soon as the user arrives with `?purchase=success`, rather than waiting until generation completes

### Fix: Keep spinner until all tab content is loaded
- Spinner now stays visible in all tabs until package data AND characters are fully fetched
- Previously `setGenerating(false)` fired before data loaded, causing a brief flash of placeholder text
- Package data and characters are now batched together so all tabs populate simultaneously
- Removed unnecessary forced page reload on completion

## 2026-03-23

### UX: Clarify player count as suspects/characters in creation form
- Moved "Mystery Style" field above "Player Count" so users understand the host's role before choosing character count
- Relabeled player count field from "How many players will participate?" to "How many suspects/characters?"
- Updated description to clarify the count excludes the host/detective
- Updated dropdown items from "X players" to "X suspects" across all 13 languages

## 2026-03-22

### UI: Remove hero gradient blob
- Removed the blurred gradient circle (red/purple blob) above the homepage title for a cleaner look

### Feature: In-App Mystery Package Editing + PDF Export

**Inline Editing:**
- Users can now edit their generated mystery package content directly in the app
- Per-section editing with fixed headers (non-editable) and plain text textareas — users never see markdown syntax
- Covers all tabs: Host Guide (6 sections), Characters (per-field within each accordion), Evidence Cards, and Detective Script
- Evidence cards and detective script split by `##`/`###` headers into individually editable sections
- Escape key exits edit mode; unsaved changes prompt confirmation
- Saves directly to individual Supabase columns with optimistic local state updates
- New service functions: `updatePackageField()` and `updateCharacterField()` with field allowlists

**PDF Export:**
- "Save as PDF" button on mystery package view, character access page (guest email link), and host access page
- Uses `window.print()` with custom `@media print` CSS — zero new dependencies
- Print stylesheet hides app chrome, tabs, edit buttons; shows only active tab content
- Character accordions force-mount content so all characters print expanded, each on a new page

**Accomplice Display Bug Fix:**
- The host-facing tab view was never rendering `round2_accomplice`, `round3_accomplice`, `round4_accomplice`, or `final_accomplice` fields — accomplice characters appeared to have empty scripts even though the data was correctly generated and stored
- Fixed by including all accomplice fields in the new per-field character rendering

**Feedback Email Notifications:**
- New Supabase Edge Function `notify-feedback` sends email to support@mysterymaker.party on every feedback submission
- Database trigger `on_feedback_insert` fires automatically via `pg_net`
- Email includes star rating, NPS score, customer email, mystery title, comments, and testimonial
- Color-coded subject line (red for 1-2 stars, yellow for 3, green for 4-5)

**Files changed:**
- `src/components/EditableSection.tsx` — New: reusable edit/view toggle component
- `src/components/EditableMultiSection.tsx` — New: splits single markdown fields by headers into multiple EditableSections
- `src/styles/print.css` — New: print stylesheet for PDF export
- `supabase/functions/notify-feedback/index.ts` — New: feedback notification edge function
- `src/components/MysteryPackageTabView.tsx` — Per-section editing, accomplice field display, PDF button
- `src/pages/MysteryView.tsx` — Update handlers wired to tab view
- `src/pages/CharacterAccess.tsx` — PDF export button for guest character page
- `src/pages/HostAccess.tsx` — PDF export button for host access page
- `src/services/mysteryPackageService.ts` — `updatePackageField()`, `updateCharacterField()`
- `src/i18n/locales/en.json` — Edit and export i18n keys
- `src/i18n/locales/pt.json` — Edit and export i18n keys (Portuguese)

**Purchase Page Update:**
- Replaced amber "content cannot be edited" warning with green "Fully editable" reassurance on `MysteryPurchase.tsx`

**Homepage FAQ:**
- Added "Can I edit my mystery after it's been generated?" FAQ entry (EN + PT)
- Explains all content is editable post-generation and mentions PDF export

---

### Blog: Batch 2 Translation Quality Audit + SEO Schema Fixes

**Scope:** 708 translated posts (59 batch 2 slugs × 12 non-EN languages) in Supabase, plus `BlogPost.tsx` SEO schema code.

**Database fixes (Supabase `blog_posts`):**

1. **Meta descriptions trimmed** — ~320 Latin-script posts (ES, FR, PT, DE, IT, FI, NL, DA, SV) had meta descriptions >160 chars. Created PL/pgSQL function `trim_meta_description()` with smart truncation at natural sentence boundaries (period > comma > space). All now 80–160 chars.
2. **CJK meta descriptions rewritten** — 38 ZH-CN descriptions rewritten with natural Chinese (target 40–90 chars). 9 JA descriptions rewritten. 7 JA and 11 KO descriptions trimmed from >90 chars to ≤85 chars with natural CJK sentence breaks.
3. **Bold-wrapped heading fix** — 24 posts (17 FR, 4 NL, 3 FI) had `**## Heading` formatting that broke FAQ detection and markdown rendering. Stripped stray `**` markers from all `##` headings.
4. **Missing FAQ sections added** — 3 FR posts (`how-to-fix-unsatisfying-mystery-endings`, `how-to-host-a-fairy-tale-murder-mystery-party`, `how-to-host-a-hollywood-murder-mystery-party`) had FAQ sections in EN but not in FR. Translated and appended French FAQ sections with `## Questions fréquemment posées` heading and `### Question?` Q&A format.
5. **MysteryMaker CTA references** — 6 posts (DE 1, ES 1, FR 2, IT 2) were missing mysterymaker.party references. Appended localized CTA lines.

**BlogPost.tsx SEO schema fixes:**

6. **hreflang tags were completely broken** — The language variant lookup used `post_date` (NULL for all 766 posts), so `.eq('post_date', null)` returned nothing → zero hreflang tags on any page. Fixed to use `slug` (which all translations share). This is the highest-impact fix — hreflang is critical for multilingual SEO.
7. **zh-cn hreflang case mismatch** — Code checked `v.language === 'zh-CN'` but database stores `zh-cn`. Chinese posts got invalid `hrefLang="zh-cn"` instead of correct `hrefLang="zh-Hans"`. Fixed case comparison.
8. **Added x-default hreflang** — New `<link rel="alternate" hrefLang="x-default">` pointing to EN version for users outside specified language regions.
9. **FAQPage schema — expanded heading detection** — Added `UKK` (Finnish FAQ abbreviation, 9 FI posts), `Questions People Actually Ask` (1 EN post), and broadened accent-aware matching for `fréquemment` (FR). All 13 language FAQ heading variants now detected.
10. **HowTo schema — FAQ leak fix** — The H2 skip filter only excluded English FAQ headings (`FAQ|Frequently Asked|Related|Conclusion|Sources`). Translated FAQ sections like `## Häufig gestellte Fragen` were leaking into HowTo steps. Added all 13 language FAQ heading patterns to the skip filter.
11. **HowTo schema — multilingual title detection** — `isHowTo` only matched English "How to" titles. Added slug-based detection (`/^how-to/i.test(postSlug)`) plus translated title prefixes: `Sådan` (DA), `Kuinka` (FI), `So/Wie du` (DE), `Comment` (FR), `Cómo/Como` (ES/PT), `Come` (IT), `Hoe` (NL), `Hur man` (SV), `Hvordan` (DA), and `方法` (JA/KO/ZH-CN in title). Coverage went from ~60% to 100% of how-to posts across all languages.
12. **wordCount schema for CJK** — `post.content.split(' ').length` gave wrong counts for CJK languages (no word spaces). Now uses character count for JA/KO/ZH-CN.

**Final audit state:** 7 metrics × 12 languages = 84 checks, all passing with 0 issues. One expected gap: casino slug has no FAQ in any language (EN source has no FAQ).

**Known deferred items:**
- ZH-CN and JA content bodies need full re-translation (machine-translation quality)
- KO tone adjustment (overuse of formal 당신)
- FR missing 1 translation (`5-ancient-egyptian-temple-murder-themes`) — in-flight with batch 2 FR run
- Internal linking pass — after all translations complete
- No sitemap found in codebase — may need separate implementation

**Files changed:**
- `src/pages/BlogPost.tsx` (6 code changes: hreflang lookup, zh-Hans fix, x-default, FAQ regex, HowTo skip filter, HowTo title detection, wordCount CJK)
- ~400 rows updated in Supabase `blog_posts` table (meta descriptions, FAQ sections, heading formatting, CTA references)

---

## 2026-03-21

### Security: Fix Prototype Pollution in flatted

- Updated `flatted` from 3.3.3 to 3.4.2 to resolve high-severity prototype pollution vulnerability (GitHub Alert #45)
- Dev-only transitive dependency (`eslint` → `file-entry-cache` → `flat-cache` → `flatted`) — no production impact

### Blog: 235 New EN Posts — Content Generation + Full Audit Complete

**Scope:** 235 brand-new blog posts targeting long-tail SEO keywords, generated from `new_blog_topics_pipeline.xlsx`.

**What was done (Mar 20-21):**
1. **Topic Research:** 234 new topics identified across 20 categories (group sizes, corporate, occasions, themes, venues, characters, DIY, tech, comparisons, troubleshooting). Deduplicated against 185 existing slugs — 0 exact duplicates, 3 close matches all intentionally different.
2. **Research Packs:** 3 consolidated research pack prompts covering 50 themes. Jonathan generated 3 research packs (packs 29-31, 32-34, 35-38) with statistics, expert quotes, and consumer trends.
3. **Content Generation Prompts:** 13 self-contained batch prompts created (`CONTENT_GENERATION_PROMPTS.md`). Each includes voice system, SEO playbook, research pack references, anti-patterns, and a 5-step spot-check routine.
4. **Parallel Generation:** Jonathan ran 13 prompts in parallel CoWork sessions. 210 posts generated in first pass. 15 truly missing posts written directly in this conversation. 9 others existed with different filenames and were renamed.
5. **Multi-Pass Audit & Fix:**
   - Pass 1: Fixed 42 banned word violations across 24 files
   - Pass 2: Added FAQ headers to 5 files missing them
   - Pass 3: Removed 176 em-dashes (replaced with contextual punctuation)
   - Pass 4: Added MysteryMaker references to 2 files, FAQ sections to 13 files
   - Pass 5: Added statistics to 3 files missing GEO data
   - Pass 6: Fixed 6 more banned words (leverage, seamless) found in deeper audit
   - Pass 7: Fixed 1 final banned word (comprehensive → exhaustively)
   - Final state: **367 total files, 0 banned words, 0 exclamation marks, 0 em-dashes, 100% FAQ/MysteryMaker/stats coverage**

**Files created:**
- `new_blog_topics_pipeline.xlsx` — 234 topics with slugs, keywords, volume, priority, rationale
- `CONTENT_GENERATION_PROMPTS.md` — 13 batch prompts for parallel EN generation
- `RESEARCH_PACK_PROMPTS_CONSOLIDATED.md` — 3 mega research pack prompts
- `TRANSLATION_BATCH_PROMPTS.md` — 12 language prompts (235 posts each) for translation
- 235 new .txt files in `draft_rewrites/`

**Current local state:**
- 367 EN .txt files in `draft_rewrites/` (127 batch 2 + 235 batch 3 + 5 prefixed dupes)
- 127 batch 2 files already translated and imported to Supabase via CSV
- 235 batch 3 files ready for translation

**Next:** Run translation prompts (12 languages in parallel) → Build CSV from translations → Jonathan imports CSV to Supabase.

---

## 2026-03-20

### Phase I Complete: 127 Posts Translated + CSV Import

- 1,524 translation files completed (127 × 12 languages)
- CSV export: `translations_import.csv` (1,524 rows) + `blog_posts_all_languages.csv` (1,651 rows)
- Jonathan imported CSV to Supabase manually
- 80 translations had empty/short bodies from agent token limits — identified for re-generation

---

## 2026-03-18

### Blog: 127 EN Posts — Voice Rewriting Complete

**Scope:** 107 draft survivors + 20 new high-value topics = 127 EN posts, all voice-rewritten.

**What was done (Mar 17-18):**
1. **Phase E (Voice Rewrite):** All 107 draft survivors rewritten in Jonathan Miller's voice across 5 waves (problem-solving, theme/setting, occasion/event, character/profession, venue). Automated buzzword cleanup + short post expansion after each wave.
2. **Phase J (New Posts):** 20 brand-new posts written from scratch targeting high-value keyword gaps (murder mystery party ideas 10K+/mo, free games 8K+, how to write 5K+, costumes 4K+, food 3K+, etc.). Research packs 25-28 used for statistics and expert quotes.
3. **Quality verification:** All 127 posts pass: 329,445 total words (avg 2,594/post), 0 buzzwords, 0 exclamation marks, 0 missing headers, 0 posts without MysteryMaker references.

**Next:** Excel load (Phase G), SEO/GEO enrichment (Phase F), translations x 12 languages (Phase I), CSV export for manual Supabase import.

---

## 2026-03-17

### Blog: 58 Published Posts — Full SEO/GEO Pipeline Complete

**Scope:** 58 published EN posts × 13 languages = 754 rows in Supabase.

**What was done (Mar 13-17):**
1. **Phase 3a (Voice Rewrite):** All 58 EN posts rewritten in Jonathan Miller's voice — conversational, direct, MysteryMaker-native tone
2. **Phase 3b (SEO/GEO Enrichment):** Added verifiable statistics, expert quotes, and citation-rich content to all 58 EN posts for AI platform visibility
3. **Phase 4 (Translation):** All 58 posts translated into 12 languages (es, fr, de, it, da, fi, nl, sv, pt, ko, ja, zh-cn) using parallel agent pipeline with verification after each language
4. **Phase 5 (Supabase Push):** All 754 rows imported via CSV. Database constraint migrated from UNIQUE(slug) to UNIQUE(slug, language).

**Verified state:** 754 rows, 58 per language, 13 languages. All clean.

---

### Blog: 321 Draft Posts — Triage Complete

**Scope:** 321 EN draft posts triaged for quality and search volume viability.

**Results:**
- **107 survivors** (91 KEEP + 16 MERGE SURVIVOR)
- **214 cut/merged** (193 CUT + 21 MERGE INTO)
- **Cut rate:** 67%

**Cut reasons:**
- Obscure industrial venues (soap factory, paper mill, cheese factory, etc.)
- Absurd sci-fi sub-genres (teleportation lab, phasing technology, probability control, etc.)
- Micro-holidays (Flag Day, Groundhog Day, Columbus Day, World Poetry Day, etc.)
- Hyper-niche character types (cobbler, candle maker, blacksmith, postal worker, etc.)
- Duplicates of existing 58 published posts

**16 merge groups** identified (prohibition/speakeasy variants, wild west sub-themes, time travel/loop/machine, casino variants, vampire ball/castle, steampunk sub-themes, etc.)

**20 new high-value topics suggested** to fill keyword gaps (murder mystery party ideas, free murder mystery games, what to wear, food ideas, party for kids, virtual murder mystery, etc.)

**Research pack mapping:** All 107 survivors covered by existing packs 3-24. New topics need fresh research.

**Files:**
- `DRAFT_TRIAGE_RESULTS.md` — full triage document with all classifications
- `BLOG_TRANSLATION_EXECUTION_PLAN.md` — updated execution plan

**Next:** Voice rewrite 107 EN survivors → SEO/GEO enrichment → translate to 12 languages → push to Supabase.

---

## 2026-03-12

### Bug Fix: Partial character generation silently marked as complete

**Issue:** A customer purchased a 6-character vampire mystery ("Shadow And Fang: A Vampire's Final Death") but only received 4 of 6 characters. The package was marked as "completed" despite missing Bella Swan and Elena Gilbert.

**Root Cause:** Two issues working together:

1. **Make.com JSON parse error** — Character descriptions containing double quotes (e.g., `calling her "an abomination"`) broke the JSON payload when the Make.com parent scenario used string interpolation to build the child webhook request body. The unescaped `"` caused a `400 Bad Request` at JSON position 162. Characters without quotes in their descriptions (Luna, Edward, Dracula, Damon) succeeded; those with quotes (Bella, Elena) failed silently.

2. **No character count validation** — All completion logic paths only checked `characters.length > 0` rather than comparing against the expected count from `extracted_characters`. So 4 of 6 characters was treated the same as 6 of 6.

**Fix (2 commits):**

1. **Character count validation** (`86b32e8`) — Four files updated to compare generated character count against `extracted_characters` before marking "completed":
   - `src/services/mysteryPackageService.ts` — `saveStructuredPackageData()` and `getPackageGenerationStatus()` now validate counts
   - `src/pages/MysteryView.tsx` — Frontend status check validates `allCharactersGenerated` before forcing completion
   - `api/generation-complete.js` — Callback endpoint validates character count; incomplete packages stay "in_progress" with descriptive message (e.g., "Generated 4 of 6 characters")

2. **Description sanitization** (`ea9839f`) — `supabase/functions/mystery-webhook-trigger/index.ts` now replaces `"` with `'` in extracted character descriptions across all three extraction paths (primary regex, secondary regex, Claude API fallback). This prevents JSON parse failures in Make.com's string interpolation without affecting user-facing content (descriptions in `extracted_characters` are metadata only; actual character scripts are generated independently by Claude).

**Customer resolution:** Re-triggered Make.com child scenarios for Bella Swan and Elena Gilbert via the child webhook. Both characters now have full scripts (description, background, secret, introduction, all round scripts, final statement, quick reference).

**Files changed:**
- `src/services/mysteryPackageService.ts`
- `src/pages/MysteryView.tsx`
- `api/generation-complete.js`
- `supabase/functions/mystery-webhook-trigger/index.ts`

---

### Enhancement: Add soft format guidance to chat AI

**Issue:** Same customer expected a theatrical script with flashback scenes and a playable victim character (Sebastian). The chat AI had no guardrails to steer users toward the round-based party game format that the generation pipeline actually produces. This created a mismatch between what was designed in chat and what the package delivered.

**Fix:** Added two changes to `supabase/functions/mystery-ai/index.ts` (deployed to Supabase):

1. **Format guidance block** — Soft guardrails appended to `contentBoundaries` that guide the AI to translate creative ideas (flashbacks, theatrical scenes, victim speaking roles) into the round-based format without shutting down user creativity. The AI channels flashback energy into round reveals and explains the victim's backstory comes alive through other characters. Only activates when the user is clearly heading toward an incompatible format.

2. **Victim exclusion note** — Added to the concept generation prompt template so the AI knows the victim is NOT one of the playable characters. Prevents the victim from being counted in the character list and extracted as a playable character downstream.

**Files changed:**
- `supabase/functions/mystery-ai/index.ts`

---

### UX Fix: Clarify script type form labels

**Issue:** Same customer selected "Both Formats" expecting a full theatrical script because the label read "Full Scripts - Complete dialogue and detailed instructions." The term "complete dialogue" implied a scene-by-scene script, when it actually means detailed narrative prose (vs. bullet points) for each character's round content.

**Fix:** Updated labels in both English and Portuguese locale files to clearly communicate these are per-character round scripts:

- "Full Scripts" → "Detailed Scripts"
- "Complete dialogue and detailed instructions" → "Rich narrative for each character's rounds"
- "Script Detail Level" → "Character Script Detail Level"

**Files changed:**
- `src/i18n/locales/en.json`
- `src/i18n/locales/pt.json`

---

### UX Fix: Hide N/A stub scripts in detective-mode character guides

**Issue:** Same customer couldn't find their innocent/guilty scripts. In detective-style mysteries, each character has a fixed role, so only one script version has real content — the other is a 30-char stub ("N/A - See role-specific script"). The UI was rendering both, making it confusing to identify which section to read.

**Fix:** Added an `isStub()` helper in `MysteryPackageTabView.tsx` that filters out short placeholder text containing "N/A", "see role-specific", or "not applicable" from all innocent/guilty/accomplice round fields. Real content renders normally; stubs are silently hidden.

**Files changed:**
- `src/components/MysteryPackageTabView.tsx`

---

### Bug Fix: Regex extraction stops early on formatting variations

**Issue:** Investigation of the last 4 paid mysteries revealed that the "Murder At Hill House" mystery lost 7 of 14 characters during extraction. The character list in the AI conversation had subheadings and category labels between character entries (e.g., grouping characters by role), which the regex parser treated as the end of the list.

**Root Cause:** The `extractCharactersFromMessages` function in the webhook trigger used a `break` statement on any non-matching, non-empty line after finding the first character. Subheadings, dividers (`---`), and category labels between character entries triggered this break, causing the parser to stop mid-list.

**Fix:** Changed the break logic to only stop at new `##` section headers that aren't character list headers. Non-matching lines (subheadings, dividers, category labels) between character entries are now skipped, allowing the parser to find all characters regardless of formatting variations.

**Files changed:**
- `supabase/functions/mystery-webhook-trigger/index.ts`

---

### Bug Fix: Player count cross-validation with Claude fallback

**Issue:** All 4 recent paid mysteries had character count issues. The extraction pipeline could find fewer characters than the player count required, and all downstream validation compared against the extracted count only — so if regex found 7 of 14 characters, every validation checkpoint said "7/7 = complete."

**Root Cause:** Three validation points (`generation-complete.js`, `mysteryPackageService.ts` in two functions) only checked `extracted_characters` count, never `player_count` from the conversation. The extraction edge function had no cross-check either — it sent whatever it found to Make.com without comparing against the expected player count.

**Fix:** Three changes across 3 files:

1. **Claude fallback trigger** — The edge function now compares regex extraction count against `player_count`. When regex finds significantly fewer characters than expected (`< player_count - 2`), it automatically triggers a Claude API fallback extraction and uses whichever result found more characters.

2. **Callback cross-validation** — The `generation-complete.js` callback now fetches `player_count` from the conversations table and uses `max(extracted_count, player_count - 2)` as the expected character count. Packages with fewer characters stay "in_progress" instead of being marked "completed."

3. **Frontend cross-validation** — `mysteryPackageService.ts` applies the same `max(extracted_count, player_count - 2)` logic in both `saveStructuredPackageData()` and `getPackageGenerationStatus()`.

**Files changed:**
- `supabase/functions/mystery-webhook-trigger/index.ts`
- `api/generation-complete.js`
- `src/services/mysteryPackageService.ts`

---

### Customer Rectification: White Lotus, Hill House, Quest Board

Investigation of the last 4 paid mysteries revealed character generation issues in 3 of 4 packages (Shadow & Fang was previously resolved):

- **White Lotus** (jan.glaessner): 3 of 11 characters (Marlene, Elsa, Celine) were extracted correctly but lost during Make.com child scenario execution (HTTP failures with no retry). Regenerated all 3 by POSTing directly to the child webhook. All 11 characters now have complete scripts.

- **Murder At Hill House** (starckie): Character name mismatch — the AI conversation used "Ruby Rose" but the generated scripts used "Camelia Cerise" for one character. Updated `character_name`, `description`, `background`, and `introduction` fields in the database. Verified no remaining references to the old name across all 13 characters' scripts.

- **Quest Board** (busymommyof4): 14 of 17 characters generated. Root cause was NOT extraction or Make.com failure — the AI chat itself redesigned the mystery from the user's 17 characters down to 14 with an entirely new cast. Extraction and generation worked correctly for all 14. Customer outreach email drafted to offer regeneration with all 17 characters.

## March 20, 2026 — Translations Complete + Excel/CSV Export

### Phase I: Translation (127 posts × 12 languages = 1,524 translations)
- **All 1,524 translation files completed** and saved to persistent storage
- Languages: es, fr, de, it, pt, nl, da, fi, sv, ko, ja, zh-cn
- 1,444 translations (94.8%) have full body content
- 80 translations (5.2%) have headers but empty/short bodies (agent token limits)
- All files in `translations/{lang}/{slug}.txt` format

### Excel & CSV Export
- **Translation Import sheet** added to `mysterymaker_blog_master.xlsx` (1,524 rows)
- **translations_import.csv** — 1,524 translation rows (27.5 MB)
- **blog_posts_all_languages.csv** — 1,651 rows: 127 EN + 1,524 translations (30 MB)
- Format: supabase_id, slug, language, title, content, meta_description, meta_keywords, status
- Ready for manual Supabase import via CSV

### Translation Quality Notes
- Handled localized headers (TITULO:, TITRE:, TITEL:, etc.) in parser
- All files have TITLE and metadata; 80 files missing body content
- These 80 can be identified by filtering for rows with empty `content` column

### Improvement: PT translation quality audit (R62–R150)
- Deep cell-by-cell Portuguese translation audit of 89 rows against English source
- Applied ~302 total fixes across rows 62-150
- Key issues: false cognates (configuração, hospedando, hóspedes), untranslated English words (setup, roleplay, gear, hinge), gender agreement errors, misspellings (origems, foquado, Arruína)
- Notable: R76 had "cadeira" (furniture) for department chair, "letra" (alphabet) for letter document; R122-123 had entire English sentences left untranslated
- 27% Excellent, 39% Very Good, 25% Good, 9% Fair; 0 PIDGIN or TRUNCATED
- Full results appended to CHANGELOG_TRANSLATION_QA.md under "R62-R150 PT Content Audit"

## 2026-04-22

### Fix: Evidence card display — strip Visual Description, fix print parser

- **Print cards were blank**: parser expected `## EVIDENCE: ROUND X` but generated content uses `### EVIDENCE CARD — ROUND X` — zero cards were being found
- **3-section rule implemented**: print cards show Description only; online Clues tab shows Description + Implications; Visual Description is never shown to users in either view
- Online view: strips `#### Visual Description` (h4) in addition to the existing `### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` pattern
- Print page: strips `#### What This Reveals`, `#### Who It Implicates`, `#### Implications`, and `#### Visual Description` before rendering
- Multi-paragraph print descriptions now render as separate `<p>` tags instead of collapsing into one block
