# Cold Case Files — Launch Runbook

> ## ⏸ PAUSED — 2026-07-05 (owner decision: focus on the core party product longer)
>
> Launch is deliberately on hold, indefinitely, until Jonathan says otherwise. This is not
> "not done yet" — it's a conscious delay of a finished build. Verified safe to leave paused
> for as long as needed, via three independent, unrelated gates (checked 2026-07-05):
>
> 1. **`COLD_CASE_PRICE_ID` is not set** as a Supabase secret → `create-cold-case-checkout`
>    returns `503 not_configured` → no real Stripe session can ever be created for a cold case.
> 2. **No `VITE_COLD_CASE_PAYMENT_LINK`** anywhere (not in `.env`, not in the GitHub Actions
>    workflow) → the old pre-chat page still sitting on `main` shows a disabled "Opening soon"
>    button, not a live link.
> 3. **The Fly worker was never deployed** (Touchpoint 2 below, never run — `flyctl` isn't
>    even installed on this machine) → even in the hypothetical of an orphaned order row,
>    nothing exists to generate or deliver a case.
>
> All storefront code (landing, premise chat, gated trial, unified dashboard, checkout/webhook/
> delivery pages) lives on branch `feat/cold-case-files` — **not merged into `main`**. The
> Supabase edge functions ARE deployed (that's normal — they're inert without the price ID) and
> the DB tables/storage bucket exist (harmless, empty).
>
> **To flip the switch back on later, in order:**
> 1. Decide the branch is ready → `git checkout main && git merge feat/cold-case-files` (or open
>    a PR) → push → site deploys with the real landing.
> 2. Re-verify anything that drifted — check `stripe-webhook` for the cold-case branch still
>    matching this repo (there was drift found 2026-08-15, see the website repo's memory note
>    `project_cold_case_branch.md` / vault `00_INBOX`) before trusting it blindly.
> 3. Do Touchpoint 1 (Stripe price + `COLD_CASE_PRICE_ID` secret) below.
> 4. Do Touchpoint 2 (Fly worker deploy) below.
> 5. Run the end-to-end proof below with a real card before announcing anything.
>
> Until step 1 happens, nothing below is reachable by a real customer no matter what else
> changes on `main` or in Supabase — this is genuinely a full stop, not a soft pause.

Everything built 2026-07-03 (ADR-0029). What's LIVE, what needs **Jonathan** (two touchpoints),
and the end-to-end test that proves the whole flow before real customers touch it.

## Already live (no action needed)

| Piece | Where | State |
|---|---|---|
| `cold_case_orders` + `cold_case_identities` + `claim_next_cold_case_order()` | Supabase (mhfikaomkmqcndqfohbp) | migrated, deny-all RLS |
| Private `cold-case-files` bucket (25 MB, text/html) | Supabase Storage | created |
| `stripe-webhook` v58 — guarded cold-case branch (metadata `product=cold_case`) | Edge function | deployed; party flow untouched |
| `cold-case-status` — public token endpoint, rate-limited, signed URLs | Edge function | deployed |
| `send-cold-case-ready` — 13-lang READY email, service-role-gated | Edge function | deployed |
| `/cold-case-files` landing + `/cold-case/:token` delivery page | React app | built green; ships on next site deploy |
| Worker (`worker/` in the **engine repo**): poll → claim → generate → upload → notify, retry-once, fail-closed, freshness materialization | cold-case-files repo | code complete, not yet deployed |
| Engine: `CHROME_PATH` env override in probe-case/probe-stamps | cold-case-files repo | patched (containers) |

## Touchpoint 1 — Stripe (dashboard, ~5 min — simplified 2026-07-04)

The landing page now has a brief box that creates the checkout via API
(`create-cold-case-checkout`), so there is NO Payment Link, NO metadata, and NO custom
fields to configure. Two steps:

1. **Products → Add product**: "Cold Case File — bespoke", one-time price (**$24.99** —
   owner call 2026-07-05; the landing FAQ states this number, keep them in sync).
   Copy the price id (`price_...`).
2. Set it as a function secret and the landing goes live automatically:
   ```sh
   supabase secrets set COLD_CASE_PRICE_ID=price_... --project-ref mhfikaomkmqcndqfohbp
   ```
   Until it's set, the brief box shows "Opening soon" — safe to deploy the site first.

Post-payment flow is handled end-to-end: Stripe redirects to
`/cold-case/thanks?sid=...`, which resolves the buyer's own status page; the brief they
typed rides in session metadata → webhook → `cold_case_orders.brief` → the engine.

*(While in Stripe: check the PARTY Payment Link's after-payment redirect — its appended
success_url params are dead weight; confirm the dashboard redirect routes buyers to
/payment-success.)*

## Touchpoint 2 — Worker deploy (Fly.io, ~15 min)

From the **engine repo** (`~/CascadeProjects/MM-cold-case-prototype/`):

```sh
brew install flyctl && fly auth login       # once
fly launch --copy-config --no-deploy       # uses worker/fly.toml; say NO to Postgres/Redis
fly secrets set \
  SUPABASE_URL=https://mhfikaomkmqcndqfohbp.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API> \
  ANTHROPIC_API_KEY=<the generation key> \
  REPLICATE_API_TOKEN=<the images key> \
  RESEND_API_KEY=<same as edge functions> \
  ALERT_WEBHOOK=<optional Telegram bridge URL>
fly deploy
fly logs        # expect: "cold-case worker up — polling every 20s"
```

Cost: one shared-2x machine ≈ $10–15/mo. Railway works identically if preferred (same Dockerfile).

## The end-to-end proof (eval criterion #5 — run BEFORE announcing)

1. Buy through the real Payment Link with a real card (refund after).
2. Confirm: confirmation email arrives ("usually within the hour", status link works and shows "being assembled").
3. `fly logs`: worker claims, pipeline runs (~30 min), `order READY`.
4. READY email arrives (in the checkout language) → link → download → **the .html opens offline and is playable**.
5. Check `cold_case_identities` got a row (freshness), and GA4 shows a `purchase` with `item_id=cold_case_files`.
6. Refund the test purchase in Stripe.

## Not yet done (known, tracked)

- Engine repo `worker/` + CHROME_PATH patches are **uncommitted** (Phase 0b session owns that repo's git state; commit both together when it finishes).
- Landing page is English-only v1 (same precedent as OfficeMurderMysteryParty); confirmation email English-only (READY email is fully localized).
- `/cold-case-thanks` page not built (optional — Stripe's own confirmation page is fine for v1).
- Sitemap: add `/cold-case-files` to `scripts/generate-sitemap.mjs` when SEO push starts.
- Pre-made shop tier + gated sample embed: after Phase 0b + the data exploration (kickoff prompts in the vault).
