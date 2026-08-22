# 0029 — Cold Case Files: second product line with async backend generation

**Status:** Built, launch **paused indefinitely** (owner decision 2026-07-05 — see amendment below; original: Proposed, plan approved 2026-07-02, build gated on engine Phase 0 — see Consequences)
**Date:** 2026-07-02

## Context

A sibling repo (`~/CascadeProjects/MM-cold-case-prototype/`) has produced a finished,
fully autonomous product engine: **Cold Case Files** — a single-player, self-contained
HTML detective game. One command (`node tools/pipeline.js cases/<slug> --generate`)
invents a fresh original case and builds a validated playable `.html` (~3–13 MB, all
assets inlined, works offline) through six fail-closed quality gates including an
LLM fair-play reader (engine ADR-026/027/028/029). Measured COGS ~$2.96/case
(~$2.80 generation + $0.16 suspect portraits), ~24 min wall-clock.

This site sells one thing with a deliberately sharp message: a custom murder-mystery
**party** generator (multi-player, host-a-dinner, assign roles). Cold Case is the
opposite mode — solo, read-and-deduce, no hosting. The overlap is "likes mysteries";
the divergence is buyer intent. Two questions had to be settled before building:
how the new product lives alongside the party product without muddying its message,
and how an inherently **asynchronous** (~24 min + queue) purchase→generate→deliver
flow works on this site's stack (Stripe Payment Links + Supabase + Resend).

A hard constraint settles the infrastructure question up front: the engine's gates
spawn headless Chrome (`puppeteer-core`) and shell out to `cwebp`. Neither Make.com
nor Supabase edge functions (Deno) can run that; a backend container is unavoidable
(engine ADR-028 §2).

## Decision

1. **Positioning (b): distinct section / sub-brand on the same domain.** Cold Case
   gets its own landing page, story, and URL space (`/cold-case-files`) under
   mysterymaker.party, with its own aged-document/noir visual treatment — sharing
   domain authority, traffic, checkout, and email infra, but kept visually and
   narratively separate from the party funnel. Landing copy sells the **solo
   read-and-solve** experience exclusively; the only bridge between products is a
   subtle cross-sell link (no homepage chooser).
2. **Buyer model: guest checkout + email delivery.** No login. Stripe Payment Link
   collects the email; the order row is created **by the webhook**, keyed by
   `stripe_session_id` (a static landing page has nothing to pre-mint). After-payment
   redirect is configured **on the Payment Link in the Stripe dashboard** —
   `success_url`/`cancel_url` query params are not honored by Payment Links.
3. **Async flow: webhook enqueues, worker executes.** `stripe-webhook` (extended)
   detects the cold-case price id, inserts a `cold_case_orders` row
   (`paid → generating → ready | failed`, plus `buyer_language`, `retry_count`,
   `delivery_token`), and immediately sends a "we're crafting your case — usually
   within the hour" confirmation. A **net-new worker container** (node + headless
   Chrome + cwebp + `ANTHROPIC_API_KEY` + `REPLICATE_API_TOKEN`, on Fly.io/Railway)
   polls for the oldest `paid` order, claims it atomically (concurrency = 1), runs
   the engine pipeline, uploads the `.html` to a private Supabase Storage bucket,
   and triggers a `send-cold-case-ready` email with a tokenized delivery link
   (`/cold-case/:token`) that mints short-lived signed URLs per visit.
4. **Uniqueness must survive restarts.** The engine's STEP 0 freshness scans the
   local `cases/` dir, which is empty on a fresh container — so each sold case's
   identity (setting/cast/milieu) is persisted (DB table `cold_case_identities`,
   or volume) and materialized for the manifest before every run. "One-of-one" is
   the product promise.
5. **Failure UX.** First gate failure → auto-retry once (~$3). Second → `failed`,
   Telegram alert to the owner (the exception handler, engine ADR-026), **and** a
   customer-facing "taking a little longer than expected" email. Never silent limbo.
6. **Pricing: a two-tier ladder.** Bespoke one-of-one at **$15–25** (~30–60 min
   wait, premium framing); a **pre-made shop tier (~$9, instant download)** as the
   trial on-ramp — pending validation by a separate data-grounded exploration before
   over-investing (kickoff prompt written; also covers the same idea for party kits).
7. **Showcase: playable gated sample.** A fixed pre-generated case, free through
   Objective 1, then a paywall interstitial. Chosen over video-only because a
   bespoke case is generated one-of-one — a sample cannot "be the product," which
   dissolves the IP-rip concern that keeps the party product video-only.
8. **Launch blocker — full imagery first (Phase 0, engine repo).** Owner's bar:
   "any time there could be an image (evidence, portrait), it should be there — a
   case without photos isn't worth selling." The engine currently images the
   4 suspects only; evidence/scene "photograph" documents render a placeholder.
   Engine work (generation authors evidence/scene image prompts; builder renders
   them; webp+downscale becomes required for payload; fair-play gate must still
   pass) precedes all storefront work. Kickoff+eval prompt written.

## Rationale

- **(b) over (a)/(c):** a homepage chooser (a) taxes the proven party funnel at the
  moment of highest intent for an audience that only partially overlaps. A separate
  site (c) is the "cleanest" option and the most tempting — but it discards domain
  authority, traffic, and working Stripe/Supabase/Resend infra for marginal
  positioning purity, at solo-founder cost. (b) is pragmatic, reuses ~everything,
  and is reversible: Cold Case can graduate to its own brand if it earns one.
- **Worker-owns-the-queue over event-push:** orders survive worker restarts,
  concurrency=1 caps spend/CPU, and the design mirrors the engine's own
  fail-closed/alert operating model. The webhook stays a thin enqueue.
- **Guest checkout:** a one-off impulse product should not demand account creation;
  the party product's auth-gated purchase path (`MysteryPurchase.tsx`) is
  deliberately *not* reused.
- **"Usually within the hour," never "~30 min":** concurrency=1 serializes the
  queue (3 queued orders ≈ 72 min for the 3rd); the copy must absorb queue depth.
- **Async as premium, not defect:** the wait differentiates the bespoke tier from
  the instant pre-made tier and supports the one-of-one framing.

## Alternatives Considered

- **Make.com orchestration** (the party product's pattern). Rejected — cannot run
  Chrome/cwebp; settled by engine ADR-028 §2.
- **Supabase edge function / serverless generation.** Rejected — same reason (Deno,
  no Chrome, and a ~24-min run exceeds serverless budgets).
- **Homepage product chooser (a) / separate brand site (c).** Rejected per Rationale.
- **Require an account + dashboard delivery.** Rejected for v1 — friction on an
  impulse buy; a "claim your cases with an account" hybrid can come later.
- **Live progress bar / instant-delivery UX.** Rejected — generation is ~24 min +
  queue; the whole UX is designed around "we'll email you."
- **Launch document-only, add photos later.** Rejected by the owner — full imagery
  (evidence + scene, not just suspect portraits) is a launch blocker (Decision 8).
- **Checkout Sessions API instead of a Payment Link.** Not needed — the Payment
  Link's dashboard-configured redirect covers the flow; a server-minted session adds
  an edge function for no v1 benefit.

## Consequences

- **Sequencing:** Phase 0 (engine imagery completeness) and Phase 0b (gated-sample
  build affordance) land in the cold-case repo **before** any storefront code here.
  Storefront phases follow: Stripe product/link + webhook extension + orders table,
  worker container, delivery pages/emails, landing page.
- **Net-new infra:** the worker container is the only genuinely new operational
  surface (deploy, secrets, monitoring via `ALERT_WEBHOOK`→Telegram).
- **Webhook changes touch the party purchase path** — the cold-case branch must be
  additive; GA4 gets a distinct `item_id: 'cold_case_files'` (today hardcoded
  `murder_mystery_party`).
- **Guest emails default to `en`** unless the link's `locale` param captured a
  language (`buyer_language`); guests have no `profiles.language` row.
- **Payload:** fully-imaged cases run ~12.6 MB+; webp+downscale in the engine is
  required, and delivery stays link-based (never an email attachment).
- **Side-finding to verify:** the party Payment Link appends `success_url`/
  `cancel_url` params that Stripe likely ignores; its dashboard redirect config
  should be checked (tracked as a follow-up, not blocking).
- **Verification bar (from the approved plan):** a real test purchase must produce a
  fresh case end-to-end and deliver a playable, self-contained `.html` that opens
  offline; the fail-closed path must alert without emailing a download; no copy may
  promise instant delivery.

## Amendment — 2026-07-03 (owner review of the built storefront)

Four decisions from the owner's review of the live pages and demo artifacts, all shipped:

1. **Customization is the core value proposition, not an add-on.** The original plan sold a
   randomly-invented one-of-one case ("you just want a really cool case"). The owner corrected:
   the brand IS custom generation ("otherwise we're like everyone else") — the buyer picks the
   era, the place, and details, THEN we generate. Mechanics: two custom fields on the Stripe
   Payment Link (`setting_era`, `details` — keys are load-bearing, see the runbook) → webhook
   stores `cold_case_orders.brief` → worker passes `BUYER_BRIEF` → the engine's Pass 0 honors the
   wishes while keeping cast names fresh against every case ever sold. Blank fields = "surprise
   me" (the original behavior). Landing page leads with it: "You pick the era and the place.
   We hide the killer."
2. **Every named person gets a portrait** (engine ADR-031 amendment): empty portrait frames for
   minor cast read as missing images. All-cast portraits are now generation defaults enforced by
   the gates (~$0.20 extra per case).
3. **No party-product comparisons on the landing page.** They're different products; buyers
   aren't cross-shopping them, and definition-by-negation manufactured confusion. The site
   header/footer carry the only cross-links.
4. **Sales imagery is real product imagery** — screenshots of an actual generated case (no
   asset repeated on the page), plus a case-title register rule in the engine so generated
   titles read like case files ("The Kestrel Ridge Plate"), not novels ("The Plate That
   Remembered").

## Amendment — 2026-07-04 (flow unification)

**The buyer model changed from guest to authenticated**, superseding Decision 2 above. The
owner's call: the whole site should share one flow shape — the animated brief box (the party
homepage's typewriter chatbox, showing the possibility space), then the auth gate, then a
review form (`/cold-case/create`), then Stripe checkout. Trade-off accepted knowingly: guest
checkout optimized for impulse purchases; accounts buy consistency across the site, order
history, easier support, and a durable buyer identity. Delivery remains token-based (the
emailed link works on any device, no login needed to download). Orders now carry `user_id`;
the "Opening soon" pre-launch state was removed — the page ships only once wiring is live.

## Amendment — 2026-07-05 (premise chat replaces the review form)

The owner pushed three times for the create step to mirror the party product's form→AI-chat
shape; the standing "a chat would fake interactivity" objection was conceded as a strawman
once the chat's job was defined as **premise co-design**, not case generation. `/cold-case/create`
is now an intake chat: the hero brief opens the conversation, the AI (the "intake officer")
proposes a working title + premise (setting, era, victim, official ruling, reopening trigger —
NEVER the killer or solution, enforced by the system prompt), the buyer iterates, and the agreed
premise renders in a "Premise on file" card that unlocks checkout. That premise becomes the
`BUYER_BRIEF` the engine's Pass 0 honors — the chat genuinely improves the product (richer
briefs → better cases) and recreates the party side's buying psychology (invest → see the
concept → pay). Implementation: rides the existing `mystery-ai` edge function with a custom
`system` prompt (no new backend); the reply's `PREMISE:` block is extracted client-side;
`create-cold-case-checkout` splits briefs up to 1000 chars across the two Stripe metadata keys
(`setting_era` + `details`) the webhook already composes from. Chat state persists in
sessionStorage; turns cap at 12. Verified live: real `mystery-ai` round-trips honored the brief,
produced case-register titles, and correctly regenerated the premise on iteration
("make the victim the keeper's wife" → new victim, same milieu).

Same-day refinements from owner review:
- **Docket format.** The premise card renders five labeled rows (Case / Setting / Victim /
  Ruled / Reopens) instead of a paragraph — the approval artifact looks like the product, and
  the joined labeled lines are the brief the engine receives. The AI emits the docket as
  labeled plain-text lines; parsing is field-by-field and order/markdown-tolerant.
- **Desktop layout: docket beside the chat** (sticky right column, 400px), not below it;
  mobile stacks. The chat input got a dark variant (`.cold-case-chat-input`) — the component's
  default white pill clashed on the noir page, and the global dark-textarea rule needed a
  `#cold-case-brief-input` carve-out to stop painting a black box inside it.
- **No pre-chat form.** The party form's structured knobs (player count, suspect count, type)
  have no cold-case equivalents — the engine's gates are tuned to a fixed case shape (25 docs,
  4 objectives) and everything buyer-variable is prose. The landing brief box is the form.
- **Difficulty knob: deliberately rejected** (owner concurred). Generating harder cases is
  prompt work, but verifying "harder AND still fair" turns the binary fair-play gate into a
  calibrated-measurement problem — LLM judges can't score difficulty reliably, hard mode would
  have the worst retry COGS and gate-failure rate, and there is no player data yet to calibrate
  against. If demand materializes, the path is difficulty-as-assistance (an Inspector's Notes
  hint sheet toggled at build time on an already-validated case, same machinery as the sample
  builder), never structural tiers.

## Amendment — 2026-07-05 (unified dashboard v2: gated trial, parties first)

Owner review of the live dashboard + landing produced five decisions, all shipped:

1. **The free sample is gated and lives in the dashboard.** "Play the free trial" on the
   landing triggers the SignInPrompt for guests (a `ccf_sample_intent` localStorage flag
   survives the OAuth bounce); after signup they land on the dashboard, where a gold banner
   points to the trial card. Signup already starts the 7-day welcome-discount countdown —
   the gating friction buys an identified lead with a ticking $24.99 → $19.99 offer.
   **Supersedes** the "party-only users see an unchanged dashboard" rule: the trial card now
   shows for every signed-in user (deliberate launch cross-sell to the party base).
2. **Parties first, cold cases second.** Reverses the first layout. The owner's challenge
   held: party kits are long-lived planning artifacts revisited for weeks (host guide,
   printing, guest edits), while a cold case is bought, tracked for ~an hour, then only
   occasionally re-downloaded. The one transient moment a cold case outranks the party list
   — while it's being written — is served by a status banner at the top, not by reordering.
3. **Dashboard downloads directly.** The Download button now mints a fresh signed URL and
   downloads in place (falls back to the token page on error). The `/cold-case/:token` page
   remains the email-link and in-progress surface. Cold-case cards restyled to match the
   mystery cards (Card grid + Badge chips); page title neutralized to "Dashboard"; each
   product section carries its own create button.
4. **Trial labelled honestly** — "(trial)" in the card title, "Free trial" badge, landing
   copy says "playable up to the first objective / not the complete file."
5. **The stale demo artifact was the imagery/setting bug.** The dashboard download had been
   serving `demo-proof.html` — an early pre-Steinadler generation (South Africa, incomplete
   portraits). Replaced in storage with the current Steinadler build (13/13 portraits,
   save-state). No regeneration was needed. Side-note from the owner's observation: the
   engine casts milieu-consistently (Afrikaner names → white cast, historically coherent);
   cast representation for US-set cases is worth a conscious review pass — logged as
   deferred engine work.

Still open from this round (next build): welcome-discount wiring in
`create-cold-case-checkout` (apply the buyer's active promo → $19.99), and cutting the
logged-in /cold-case-files page to the workbench state like the party homepage.

## Amendment — 2026-07-05 (dashboard v3: one unified grid (v3), discount wired, workbench)

Owner overrode the two-section layout hours after it shipped, with the decisive data point:
dozens of orders, no customer has ever ordered twice — the typical dashboard holds ONE item,
so per-product sections were bureaucracy around a single card. Now: one grid, mysteries and
cold cases interleaved by date, every card carrying an uppercase type label ("Murder mystery
party" / "Cold case" — new i18n key in 13 locales), cold-case cards rebuilt on the
HomeMysteryCard shell (badge header, title, date line, full-width action) so sizes match,
the free-trial card closes the grid, and two create buttons sit under the page header.
The transient "being written" banner survives from v2.

Also shipped from the v2 queue:
- **Welcome discount wired into cold-case checkout** (function v4): the buyer's personal
  promo code auto-applies when inside the 7-day window ($24.99 → $19.99); expired/redeemed/
  missing codes fail OPEN to a full-price session with allow_promotion_codes. The app-wide
  countdown ribbon's numbers already match (party price is also $24.99).
- **Logged-in workbench**: /cold-case-files cuts everything below the hero for signed-in
  users (the party homepage pattern) — brief box + "your cases are in your dashboard" link.

## Amendment — 2026-07-05 (launch paused indefinitely, reversibly)

The owner decided to delay launch and focus on the core party product longer — no fixed
return date, revisit whenever he chooses. This is a scope/timing decision, not a build
problem: the storefront (landing, premise chat, gated trial, unified dashboard, checkout/
webhook/delivery) is functionally complete on branch `feat/cold-case-files`.

**Mechanism, verified rather than assumed:** three independent gates are already closed —
(1) `COLD_CASE_PRICE_ID` is not set as a Supabase secret, so `create-cold-case-checkout`
can never mint a real session; (2) no `VITE_COLD_CASE_PAYMENT_LINK` exists anywhere, so the
old pre-chat page still live on `main` shows a disabled button, not a real link; (3) the Fly
worker was never deployed (`flyctl` isn't installed on this machine), so nothing exists to
generate or deliver a case even in the hypothetical of an orphaned order. All storefront
code stays unmerged on `feat/cold-case-files`. No code was changed to produce this pause —
it was already this way; the work here was verifying it and writing it down so a future
session doesn't have to reconstruct the safety argument from scratch.

The full runbook (`docs/cold-case-launch-runbook.md`) now carries a pause banner with the
exact re-launch checklist in order. Re-launching later means, in order: merge the branch,
re-verify the webhook hasn't drifted from this repo (drift was already found once, 2026-08-15
— see the website repo's memory / vault `00_INBOX`), then the two remaining touchpoints
(Stripe price + secret, Fly deploy), then the end-to-end proof — never skip straight to
setting the price ID as a shortcut.

## Discussion

The main debate was positioning purity vs. leverage. (c) kept surfacing as the
"clean" answer; it was consciously resisted as the high-conviction-but-costly
option, in favor of the reversible middle. Second debate: portraits-only launch vs.
full imagery — resolved by the owner making imagery a hard launch blocker after
seeing that the autonomous engine images people only, while the hand-built Wardour
reference case (the quality bar) is fully imaged. Third: a triple review pass on the
approved plan surfaced two build-breaking assumptions (Payment Link redirect params;
filesystem-only freshness on a stateless container) that were folded into the
decisions above before any code was written. The pre-made shop was deliberately kept
as a validated experiment rather than committed scope, because its cannibalization
risk vs. the bespoke tier is an empirical question the sales data should answer.

## Key files

- Plan of record: `~/.claude/plans/synchronous-gliding-fox.md` (approved 2026-07-02;
  includes both kickoff+eval prompts: Phase 0 imagery, pre-made shop exploration)
- Engine: `~/CascadeProjects/MM-cold-case-prototype/tools/pipeline.js` (entry point),
  `decisions/ADR-026` … `ADR-030` (operating model, orchestration, generation, portraits)
- To extend here: [supabase/functions/stripe-webhook/index.ts](../../supabase/functions/stripe-webhook/index.ts) (enqueue branch),
  [src/App.tsx](../../src/App.tsx) (routes `/cold-case-files`, `/cold-case/:token`),
  `send-*-email` functions under [supabase/functions/](../../supabase/functions/) (pattern for `send-cold-case-ready`)
- Deliberately not reused: [src/pages/MysteryPurchase.tsx](../../src/pages/MysteryPurchase.tsx) (auth-gated party purchase path)
