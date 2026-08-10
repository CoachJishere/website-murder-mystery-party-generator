# ADR-0071: Recent sales notification popup — data source, delivery, and display spec

- **Status:** Proposed
- **Date:** 2026-08-09
- **Final decision (2026-08-10):** no purchaser name or location, ever — title alone, always. See "Final decision" section below; the opt-in-checkbox plan documented inline further down was built, tested, then deliberately reverted.

## Context

Jonathan asked to scope a "recent sales" social-proof popup (the "Lisa from United States just purchased..." pattern used by tools like Fomo/Proof/TrustPulse) — a small toast in the corner of the site cycling through recent purchases to build urgency/trust. Before building, the ask was to nail down: what data actually backs it, whether it can be "real-time" off Stripe, and — the main open question — how these widgets behave in practice (frequency, does it loop or stop, how it coexists with other on-page widgets), since none of that is obvious from first principles.

Current state of the relevant systems:

- Checkout is a **Stripe Payment Link** (`buy.stripe.com/...`), constructed client-side in `MysteryPurchase.tsx`, not a dynamically created Checkout Session. `client_reference_id` carries the `conversations.id`.
- `stripe-webhook/index.ts` handles `checkout.session.completed`: sets `conversations.is_paid = true` and `purchase_date`, reads `session.customer_email` / `customer_details.email`. It does **not** currently read or store `customer_details.name` or `customer_details.address` — both exist on the Stripe session object when Stripe collects them, but nothing captures them today.
- The Payment Link is not currently configured to collect a billing address, so **no country/city data exists anywhere in the system today**. A first name (cardholder name) is collected by Stripe by default and is available on `customer_details.name` — just not persisted.
- `conversations` holds full chat history and PII (email, message content). It's guarded by RLS and by the payment-protection triggers from ADR-0032/0033 (service-role-only writes to `is_paid`). There is no existing public-safe view or RPC that exposes any slice of this table to anonymous visitors.
- No existing "recent activity" or stats-counter component exists on the site to model this after (checked `Hero.tsx` and friends).
- Toast infrastructure already exists (`sonner` via `src/components/ui/sonner.tsx` + `src/components/ui/toast.tsx`), globally mounted in `App.tsx`, used for one-shot user-action feedback (save success, form errors). No floating chat widget currently occupies a fixed screen corner, so there's no existing collision to design around — but the mounting point in `App.tsx` (alongside the global `<Toaster />`) is where anything new here would also live.

## Decision

Build this as a small, self-contained feature, phased:

### Phase 1 — ship without real geography

1. **Data source: a narrow, purpose-built read path — not direct table access.**
   Add a Postgres RPC (`SECURITY DEFINER`, e.g. `get_recent_public_sales(limit int)`) or a dedicated view that returns only `{ mystery_title, purchaser_first_name, purchased_at }` for the most recent N paid conversations, grantable to `anon`. **Never** expose `conversations` or `mystery_packages` directly to unauthenticated realtime/select access — those tables carry chat content and email, and payment fields are already deliberately locked down (ADR-0032/0033). This RPC is the only new attack surface, and it's intentionally minimal.

2. **Capture the first name.** Extend `stripe-webhook/index.ts` to also store `customer_details?.name` (first token only, e.g. `"Lisa"` from `"Lisa Chen"`) on the conversation row at checkout-completion time. This is a one-line addition to an existing, already-trusted webhook path — no new endpoint.

   **Update (2026-08-10, superseded same day — see "Final decision" below): displaying that name publicly requires its own consent, separate from capturing it.** Storing the name is fine (Stripe already collects it for the transaction), but *showing it to other site visitors* is a distinct processing purpose from fulfilling the purchase, and GDPR requires its own legal basis — the site's existing privacy policy only carried generic "legitimate interests" boilerplate, not a disclosure specific enough to cover public display to strangers. Built as an explicit opt-in checkbox on the purchase page (`MysteryPurchase.tsx`, unchecked by default), written to a new `conversations.social_proof_opt_in` boolean before the Stripe redirect, gating whether `get_recent_public_sales()` returned the real name. This was implemented, verified working end-to-end (including confirming `anon` still can't read `conversations` directly), then reverted the same day — see below.

   Also considered and rejected: using `conversations.theme` instead of `title` for extra anonymity. Checked real paid records — `theme` is raw, unmoderated customer-authored free text (e.g. one example named a specific real-sounding company and executive), while `title` is the AI's own generated, stylized product name derived from it. `theme` is strictly less safe, not more; `title` was already the right choice and remains so.

3. **No location in phase 1.** Copy reads "Lisa just purchased '{mystery title}'" — no city/country. Enabling billing-address collection on the Payment Link is a Stripe **dashboard** change (outside this repo) plus a webhook field addition; treated as a deliberate phase-2 decision, not bundled in, because it's additional PII collection from every paying customer and deserves its own yes/no rather than riding in on this feature.

4. **Delivery: polling, not Supabase Realtime.** Client polls the RPC every ~45s and caches the last N results client-side to cycle through between polls. Realtime would require opening a live subscription channel to `anon`, which is a larger surface than an RPC call for a feature where a 45-second staleness window is imperceptible — nobody is watching closely enough to notice the lag. Revisit only if this ever needs true sub-second latency, which nothing about the use case demands.

5. **New standalone component, not the shared toast queue.** `sonner`'s queue is semantically for one-shot user-action feedback; mixing a looping, self-perpetuating social-proof widget into that same queue risks it interleaving with real save/error toasts and stacking oddly. Build `RecentSalesPopup.tsx` as its own fixed-position element, mounted once near `<Toaster />` in `App.tsx`, gated by route (see below).

### Display / timing behavior (the "how do these widgets behave" question)

This is the converged pattern across Fomo/Proof/TrustPulse/Nudgify, and it's what the reference screenshot matches:

| Parameter | Default |
|---|---|
| Position | Bottom-left (industry-standard corner; keeps the right side free for any future chat/support widget) |
| Initial delay | 4s after page load |
| Visible duration | 5s per notification |
| Gap between notifications | 4s |
| Pool size | Last 15 paid sales, fetched via the RPC |
| Loop behavior | Cycles through the pool continuously, re-polling every 45s to refresh it — does **not** run once and stop |
| Session cap | Max 6 shown per browser tab session (`sessionStorage` flag), then goes quiet for the rest of that session — a returning-within-session visitor isn't bombarded indefinitely |
| Dismiss | Small × on the toast; manually dismissing suppresses the widget for the remainder of that session (respects explicit user intent, doesn't just reappear 4s later) |
| Pages shown | Landing page and the purchase/checkout page only — not chat, dashboard, or account pages, where it's just noise |
| Collision guard | Before showing, check for any open Radix dialog (`document.querySelector('[role="dialog"]')`) or the mobile menu; suppress if one is open rather than stacking on top of it |
| Self-purchase suppression | ~~Filter a user's own just-completed purchase out of the pool~~ — built during the named-popup phase to avoid a customer seeing their own name reflected back; **removed in the final anonymous-only version**, since seeing your own purchase as a generic "A customer just purchased X" carries no meaningful downside. |

### Alternatives considered

- **Third-party tool (Fomo, Proof, TrustPulse, Nudgify).** Rejected: recurring monthly cost, another vendor script on the page (perf + another party with a tracking pixel), and the entire data source is one RPC against a database we already run. Not worth outsourcing a single read query.
- **Supabase Realtime subscription for live updates.** Rejected for phase 1 — see above. The staleness tolerance here is high and realtime adds channel-management complexity and a wider anon-facing surface for no perceptible UX gain.
- **Reuse the `sonner` toast queue.** Rejected — different semantics (one-shot vs. looping ambient widget) and risk of interleaving with real UX feedback toasts.
- **Show real city instead of country, or show it in phase 1.** Rejected for now — city-level geolocation from IP is unreliable and creepier than it's worth; country requires billing-address collection we haven't turned on. Left as an explicit phase-2 decision rather than silently shipping partial/fake location data (fabricating a location, which some competitor tools do, was explicitly ruled out per the earlier scoping conversation).

## Final decision (2026-08-10)

After seeing the popup live on a preview deploy with real titles, decided the title alone already reads as customized and compelling enough — **no purchaser name or location, at all, for anyone.** Two reasons converged:

1. **Consistency.** With an opt-in checkbox defaulting to unchecked, most purchases would show anonymously and only an occasional one would carry a name — a visibly patchy, inconsistent-looking popup rather than a coherent one. Going fully anonymous (or, hypothetically, requiring opt-in from everyone) avoids that; anonymous-for-everyone was the simpler, consistent choice.
2. **Data minimization.** Not displaying a name means there's no reason to collect or store one either. Reverted `stripe-webhook`'s name capture, dropped the `purchaser_first_name` and `social_proof_opt_in` columns, and reverted the purchase-page checkbox and privacy policy section — none of that infrastructure should exist for a field that's never shown. This also fully closes the GDPR question raised in the update above: zero personal data collected for this feature, zero disclosure needed.

Location (country/city) was already deferred in the original phase-1 decision and stays deferred — same reasoning, not revisited further here.

Net effect: `get_recent_public_sales()` returns only `{ mystery_title, purchased_at }`. The self-purchase-suppression heuristic (built to stop a customer seeing their own *name* reflected back) was removed too — with fully generic copy, there's nothing to suppress.

## Consequences

**Positive:**
- Entirely self-hosted, no new vendor, no recurring cost.
- New anon-facing surface is exactly one narrow RPC returning two non-sensitive fields — doesn't touch the existing RLS/payment-protection posture from ADR-0032/0033.
- Timing/behavior defaults are all named constants in one place, so this is a config edit, not a code change, if Jonathan wants to tune cadence later.
- Zero personal data collected or displayed — no consent flow, no privacy policy update, no `stripe-webhook` edit at all. Simplest and lowest-risk version of this feature that still delivers the core "real person, real purchase" signal.
- Popup copy is uniform for every sale — no consistency gap between named and anonymous entries.

**Negative:**
- Copy ("A customer just purchased...") is less punchy than competitors' "Lisa from United States" — accepted trade for simplicity and consistency.

**Neutral:**
- If name and/or location are ever revisited, the opt-in-checkbox pattern documented above (and its full revert) is the reference design to start from — including the finding that IP-based geolocation (e.g. Vercel's edge geo headers) is the standard, lower-friction path for location, not Stripe billing-address collection.

## Key files

- Migrations: `supabase/migrations/20260809_add_recent_public_sales_rpc.sql`, `supabase/migrations/20260810_drop_recent_sales_name_and_opt_in.sql`
- `src/components/RecentSalesPopup.tsx`, `src/hooks/useRecentSalesPopup.ts`
- `src/App.tsx` — mount point (alongside existing `<Toaster />`), route-gating logic
- `supabase/functions/stripe-webhook/index.ts`, `src/pages/MysteryPurchase.tsx`, `src/pages/Privacy.tsx` — all touched and fully reverted during the opt-in exploration; no net diff on `main`

## Discussion

The main scoping risk here wasn't the popup UI — it's that "just poll the sales table" would have meant exposing `conversations` (chat content + email) to anonymous visitors, which conflicts with the payment-protection work already done in ADR-0032/0033. Routing through a single narrow RPC avoids that entirely and keeps this feature from becoming a second front on that table's access surface.

The name/location question went through a full cycle within one day: deferred in the original design → built as an opt-in-gated feature in response to "can we show names" → reverted entirely in response to "do we even need it, given the inconsistency it creates." Worth noting as a pattern: seeing the feature live (real titles, real timing) is what surfaced the consistency concern — it wasn't visible from the spec alone. The opt-in-checkbox implementation wasn't wasted effort; it's the reference design if this gets revisited, and ruling out billing-address collection in favor of IP-based geolocation for location is a real finding either way.
