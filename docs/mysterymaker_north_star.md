# mysterymaker.party — North Star Document
*Context document for AI collaborators. Last updated: April 2026.*

---

## What This Is

mysterymaker.party is an AI-powered murder mystery party generator. Customers describe their group — theme, player count, relationships, vibe — and the platform generates a complete, personalized party package using their real guest names. Output includes a host guide, individual character sheets, clue/evidence cards with AI-generated images, and detective scripts. Everything is ready to run; no writing, no adapting, no preparation beyond reading it.

Price: $24.99 per mystery. Single purchase. No subscription.

---

## The Genuine Moat

Every competitor (Night of Mystery, Masters of Mystery, Shot in the Dark) sells pre-made kits. You pick a theme, you get the same package everyone else gets. Guest names are placeholders you fill in manually.

AI-powered generators are starting to appear, but the current crop works like a form builder — fill out fields, click generate. There's no conversation. mysterymaker.party uses a genuine multi-turn AI chat to refine the mystery before generation, which produces meaningfully better output and a better experience.

mysterymaker.party generates a unique mystery for every order. Real guest names, real relationships, real details woven into the narrative. The AI doesn't fill a template — it writes the mystery around the people attending. This is a creative services business using AI for fulfillment, not a template store with a chatbot on top.

The moat is: prompt engineering quality, personalization architecture, conversational refinement flow, 13-language output, and ongoing playability refinement. None of that is visible to a competitor looking at the tech stack.

---

## Who Buys This

Primary buyers are informal event organizers — people planning a party for their actual friend group (birthdays, bachelorettes, holiday gatherings). They're using a personal email, spending their own money, and want the event to feel special without doing a lot of work. The purchase decision is made by one person (the host), but the product is consumed by 4–32 people.

Key insight: the buyer is motivated by the reaction of their guests, not their own enjoyment. "It used real names" is the moment that lands. That's the core emotional hook — it only works because these are real people they know.

Secondary buyers: corporate/HR purchasers (confirmed but minority). These tend to skew higher player counts and represent a potential growth angle. Occasional edge cases: teachers, escape room hosts, repeat users.

---

## The Product (Current State)

**Full user flow:**
1. Land on homepage → theme picker (37+ themes) with animated text box that cycles through mystery ideas, or describe a custom scenario in freeform
2. Sign up (email or social auth) → new signups receive 20% off for 7 days
3. Configure mystery: theme, player count (4–32), style (character-focused or detective-focused), script type (full or point-form), accomplice toggle, freeform details
4. Multi-turn AI chat (Claude Sonnet) to refine the concept
5. Generation via Make.com webhooks → host guide + character sheets + round scripts per character + AI-generated evidence card images
6. Preview package → pay $24.99 via Stripe
7. Assign real guest names/emails to characters → system generates secure access tokens
8. Distribute: guests receive tokenized links to their character dossier (no login required)
9. Host runs the party using their guide; detective/inspector script available as readable text or audio playback
10. Post-party: automated two-week follow-up to host + separate follow-up to guests → feedback form → NPS + testimonial opt-in

**Key features:**
- Token-based guest access (guests see only their character, no login needed) — strong UX differentiator
- AI-generated images for evidence cards
- Audio playback for detective/inspector scripts — listen rather than read
- Accomplice mode — fully functional
- Post-party feedback + NPS system feeding real testimonials back to the homepage
- 13 languages with full translation parity across all UI and generated content
- Multi-language blog (400 posts written, ~80+ live, one published daily)

**Future opportunity:**
- Pre-made mysteries at a lower price point (inspired by mysteryshaper.com model) — would complement the custom generator, not replace it

---

## Languages

13 languages with full parity: English, Spanish, French, German, Portuguese, Italian, Dutch, Danish, Swedish, Finnish, Japanese, Korean, Chinese (Simplified).

Detection order: localStorage → browser language → English fallback. Language switcher in header. Blog uses URL-based language prefixes. All 40+ themes fully translated.

This is a real differentiator in a market where competitors are English-only. It opens bachelorette/birthday markets across Europe and Asia that have no equivalent local product.

---

## Business Model

**$24.99 per mystery. One-time purchase.**

This is intentional positioning, not a limitation. Subscription models create churn risk and support overhead for a product most customers use 1–3 times per year. The single-purchase model keeps the sales funnel simple, eliminates cancellation anxiety, and lets the product stand on its own merit.

The implication: growth comes entirely from new customer acquisition, not expansion revenue. Retention is a brand/referral play, not a billing play. Every customer who has a great party becomes a potential word-of-mouth channel.

---

## Growth Strategy (Current Focus)

**Blog / SEO / GEO content** — one channel, not separate tracks. 400 posts written, ~80+ live, one published daily. All posts are fully SEO and GEO optimized: statistics with citations, expert quotes, comparison tables — structured for both Google ranking and AI platform citation (ChatGPT, Perplexity, Google AI Overviews). This is the primary acquisition engine. Content production is complete; the work now is distribution and indexing.

**Social proof** — Trustpilot review campaign (active). Drip cadence ~3–4 reviews/week from real customers via WhatsApp outreach. Target: 20+ reviews establishing credibility.

**Channels explored and deprioritized:**
- Etsy (policy violation)
- Paid social (low ROI at current budget; revisit Aug–Sep 2026 ahead of Halloween spike)
- Subscription model (ruled out)
- Newsletter (low signup likelihood for single-purchase product)

**On the horizon:**
- Pinterest (evergreen, visual, "set and forget")
- Quora answers (long-tail SEO, community trust)
- Product Hunt launch (backlinks and domain authority, not direct conversion)
- Amazon KDP hosting guide book (distribution/SEO asset)
- PR pitches to event planning and bachelorette publications
- Platform listings (bachelorette/team-building directories)

**Budget:** ~$100/month. Preference for channels that compound over time without ongoing effort.

---

## Tech Stack (Summary)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Shadcn/UI + Tailwind CSS + Framer Motion |
| Backend | Supabase (Postgres + Edge Functions) |
| AI | Claude Sonnet (claude-sonnet-4-20250514) |
| Automation | Make.com webhooks |
| Payments | Stripe |
| Analytics | GA4 + Microsoft Clarity |
| i18n | react-i18next (13 languages) |
| Hosting | Netlify |

Replication risk is real but manageable. The stack is commodity; the value is in prompt engineering quality, personalization architecture, output playability, and 13-language coverage. Doubling down on output quality is the right hedge.

---

## Future Product Lines

**Cold Case Files** (not yet built)

A natural adjacent product targeting the same audience but a different use case. Where the murder mystery party is a group roleplay experience hosted by one person, cold case files are investigative puzzle experiences — designed for solo play, couples, or small groups working together to solve a fictional crime using documents, evidence, and clues.

Key differences from the core product:
- No host required — anyone can play
- Smaller groups (1–4 players vs. 4–32)
- Solo/date night/game night positioning, not party planning
- Lower social coordination overhead for the buyer

Market signal: searches for "unsolved case files" have grown 200%+ since 2020. Cold case-style games (Hunt A Killer, Unsolved Case Files, Cryptic Killers) have seen 300%+ sales growth in the same period. The true crime audience — 70%+ of whom are regular true crime podcast/TV consumers, skewing 62% female, ages 25–44 — overlaps almost entirely with the murder mystery party buyer.

AI angle: mysterymaker.party could generate personalised cold case files the same way it generates party mysteries — custom victim names, locations, evidence tailored to the buyer's preferences. No competitor currently offers AI-generated cold case files. This would be a genuine first-mover position in a fast-growing niche.

Not a cannibalisation risk — it's a different occasion, different group size, different purchase motivation. Expansion, not overlap.

---

## What "Winning" Looks Like

**12 months:** Consistent organic traffic from SEO/GEO content. 20+ Trustpilot reviews live. Blog ranking for mid-tail murder mystery keywords. Revenue covering costs with meaningful profit margin.

**3 years:** mysterymaker.party is the default answer when someone searches for a murder mystery party generator. AI platforms (ChatGPT, Perplexity, Gemini) cite it as the authoritative source. The 13-language coverage has opened meaningful non-English markets. Output quality is far enough ahead of any replicator that switching cost is high.

---

## What to Avoid Suggesting

- Subscription or freemium pricing changes
- Heavy social media content calendars
- Etsy or similar marketplace listings
- Features that require ongoing content moderation or community management
- Anything that significantly increases per-order support overhead

**Founder preference:** "set it up once, let it run" channels. Solo operation. Pragmatic and decisive. Prefers a single clear recommendation over a list of options.

---

## Current Open Initiatives

1. **Trustpilot outreach** — drip campaign targeting ~20 customers via WhatsApp. Adri and Jed sent (reminder ~March 10), ~16 remaining to contact.
2. **Blog rollout** — 400 posts ready, ~80+ live, publishing daily. No further content production needed; focus is indexing and distribution.
3. **Distribution** — Pinterest, Quora, Product Hunt, Amazon KDP, PR pitches (not yet executed).
