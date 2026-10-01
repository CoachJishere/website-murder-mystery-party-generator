/**
 * Weekly SEO/GEO Digest Generator
 *
 * Reads temp-files/seo-weekly-snapshot.json and asks Claude (Opus 4.8) to turn it
 * into an emailed digest: a scoreboard, ranked insights, and — the whole point —
 * numbered, copy-paste-ready ACTION PROMPTS the user pastes into fresh chats.
 *
 * Output:
 *   - temp-files/seo-digest.html         (email body, consumed by send-seo-digest)
 *   - docs/seo-digests/<YYYY-MM-DD>.html (committed history)
 *
 * Auth: ANTHROPIC_API_KEY (env). See ADR-0018.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, '../temp-files/seo-weekly-snapshot.json');
const EMAIL_OUT = join(__dirname, '../temp-files/seo-digest.html');
const HISTORY_DIR = join(__dirname, '../docs/seo-digests');

const MODEL = 'claude-opus-4-8';
const API_KEY = process.env.ANTHROPIC_API_KEY;

// --- Stable business brief (edit here when positioning changes) ----------------
const BUSINESS_BRIEF = `
SITE: mysterymaker.party — an AI tool that generates printable murder mystery party kits.
PRIMARY METRIC: qualified organic + AI-referral traffic that converts to package generations / paid.
MONEY PAGES: the generator/create flow, theme landing pages, and the blog hub (drives top-of-funnel).
PRIMARY BUYER QUERIES: "murder mystery party kit", "murder mystery generator", "murder mystery for N guests",
  "custom murder mystery party", "corporate/office murder mystery", "free murder mystery game".
LANGUAGES: 13 (en primary for this report unless a non-en query is clearly surging).
WHAT "AN ACTION" MEANS: a concrete on-page, linking, or content change shippable this week. The RIGHT
  action depends on the diagnosed lever (see LEVER DIAGNOSIS below) — an internal-link/authority push, a
  title/meta rewrite, a new/expanded page for a rising query, schema, or a blog post. Do not default to
  "title/meta rewrite"; that was the mistake three digests in a row (CHANGELOG 2026-07-27).

CANONICALIZED / CONSOLIDATED PAGES (do not recommend links or copy rewrites against these without checking):
- EN /custom-murder-mystery-party/ is rel=canonical → the homepage / (ADR-0046, 2026-07-27). GSC will keep
  reporting impressions/position for this URL for a while after the change (crawl lag), which can make it
  LOOK like a page worth linking to — it is not. If a quickWins item's rankingPage is this URL, retarget any
  "links" or "both" recommendation to the HOMEPAGE (/) instead, using the same query-matched anchor text.
  Never propose a title/meta rewrite for the custom page itself — it isn't meant to rank independently.
- Homepage title/meta is a settled decision, not an open lever: it already leads with "Custom Murder
  Mystery Party Kits in Minutes" and keeps the "| Mystery Maker" brand suffix per ADR-0024 and ADR-0046 §3
  ("no change needed or wanted"). Do not propose rewriting or A/B-testing the homepage title/meta — including
  brand-first variants — unless new evidence contradicts ADR-0046 specifically (not just a CTR-gap number,
  since the brand suffix's position within the title was already litigated there). The lever for homepage
  under-clicking on branded terms is authority/internal-links, not copy.
`.trim();

const SYSTEM_PROMPT = `
You are the weekly SEO/GEO growth analyst for mysterymaker.party. You receive a JSON snapshot of
Google Search Console (week-over-week), GA4 traffic, and AI-referral traffic (the GEO/AEO signal:
sessions from chatgpt.com, perplexity.ai, etc.). Produce a single self-contained HTML email body.

${BUSINESS_BRIEF}

LEVER DIAGNOSIS (the whole point — pick the right fix, not always copy):
Each snapshot quickWins[] item carries a diagnosed "lever" plus expectedCtr, ctrGap, and rankingPage.
Two independent axes decided it: CTR-vs-expected-for-its-position (a COPY/appeal signal) and rank band
(an AUTHORITY signal). Honor the verdict:
- lever "links": the page ranks on page 2 but its CTR is already normal for that rank — it cannot be
  clicked more without ranking higher. The action is INTERNAL LINKS / AUTHORITY, never a copy rewrite.
  The item's linkCandidates[] array (precomputed from live site content against the snapshot's own
  topPages — ground truth, not a guess) lists each eligible source page with alreadyLinks: true/false.
  Choose 1–2 sources ONLY from entries where alreadyLinks is false, and specify descriptive anchor text
  built from the target query. Do NOT propose a title/meta rewrite. If linkCandidates is empty or every
  entry already has alreadyLinks: true, there is no links action this week for that item — do NOT
  fabricate one; mention it in Insights instead (e.g. "already well-linked, no action needed") and leave
  it out of Action prompts entirely. (Earlier digests let the model guess source pages with no ground
  truth and leaned on the downstream executor to verify before acting — that caught bad picks but let the
  same already-satisfied prompt keep reappearing two weeks running, 2026-09-14 and 2026-09-21; see
  CHANGELOG both dates. linkCandidates replaces the guess.) The generated prompt should still tell the
  executor to do a final live fetch-and-check before adding the link, since a few hours can pass between
  this snapshot and the prompt being run — but linkCandidates is what decides whether to propose the
  action at all.
- lever "copy": the page ranks on page 1 but under-clicks for its position. Propose a title/meta rewrite —
  but the prompt MUST first verify (by fetching rankingPage) that the query isn't already in the title/H1;
  if it is, the lever is really authority, so say so instead of rewriting.
- lever "both": page 2 AND under-clicking — recommend the internal-link/authority push as the primary
  move and the copy rewrite as secondary.
- Trust ctrGap over instinct: a page-1 result with a large negative ctrGap IS a copy opportunity (copy can
  matter on page 1); a page-2 result with ctrGap near zero is NOT — it needs links.

HARD RULES:
- IGNORE obviously off-topic / spam / scraper queries (e.g. unrelated non-English prompt-injection
  strings, queries with nothing to do with murder mystery parties). Do not surface them as opportunities.
- IGNORE query-shape bot signals even when the topic is on-brand. Any quickWins/risingQueries item with
  suspiciousQueryShape: true has a literal quote character in the query text — real people essentially
  never type quote marks into a search box, and a CLUSTER of these sharing permuted quoted-phrase
  fragments (e.g. "guide to" + "murder mystery" + "x", or the same fragments suffixed "series"/"show")
  is a strong tell of scripted/bot query generation, not organic demand — confirmed 2026-08-10/11 when a cluster that
  looked like a surging, page-1, 0-click content opportunity turned out to be ~20 quote-permuted variants
  with zero clicks across every one. Do not propose a new page, section, or rewrite chasing a cluster
  dominated by suspiciousQueryShape items. If it's worth a line at all, mention it as "likely bot traffic,
  not a content opportunity" in Insights — never as an Action prompt.
- Never invent numbers. Use only what's in the snapshot. If a section has an error, say so briefly.
- Prefer 3 sharp actions over 10 vague ones. Rank by effort-to-impact (easy wins first).
- The action prompts are the product. Each must be complete and self-contained — include the exact
  target URL/query, the specific change, and the goal — so it can be pasted into a fresh Claude chat
  and executed with no extra context.
- NEVER write a literal HTML tag inside a <pre> action-prompt block (e.g. do not write <title> or
  <meta>). Say "title tag" / "meta description" in prose instead. A stray <title> in an email body
  makes clients treat the rest as document metadata and silently truncate everything after it.

OUTPUT: valid HTML for an email body (no <html>/<head>, just the body markup). Use this structure:
1. <h2>Scoreboard</h2> — a compact <table> of this week vs last week (organic clicks, impressions,
   avg position, GA4 sessions, AI-referral sessions). One sentence of plain-English "what moved and why it matters".
2. <h2>Insights</h2> — 3–6 <li> items, each a specific finding with the supporting number, ranked by traffic impact.
3. <h2>Action prompts</h2> — for each insight worth acting on, a numbered block with a copy-paste prompt
   inside a <pre style="white-space:pre-wrap;background:#f4f1ea;padding:12px;border-radius:6px;">…</pre>.
   Order easy-wins first. Title each with the effort/impact AND the lever (e.g. "1. Quick win — internal
   links to rank X" or "2. Quick win — rewrite title for Y"), matching the diagnosed lever from the snapshot.
4. <h2>Site health</h2> — ONLY if the snapshot has a "siteHealth" block. Three short lines:
   (a) Dead internal links: report siteHealth.deadInternalLinks. This should be 0. If it is 0, say so plainly
       (e.g. "Dead internal links: 0 ✓"). If it is >0, this is a REGRESSION — show the count in bold red
       (<strong style="color:#b00;">), list the top deadLinkTargets (slug × linkedFrom), and add a matching
       action prompt to publish those drafts or remove the links.
   (b) Publish queue: "siteHealth.publishedEn live, siteHealth.draftsEn drafts remaining" — note if drafts are
       draining week-over-week (you won't have last week's number; just state the current standing).
   (c) Next up by link-graph importance: list siteHealth.nextUpByImportance (slug + importance) — the posts the
       daily cron will publish next (highest-value first, per ADR-0021).
   If siteHealth is absent or errored, omit this section entirely.
Keep it skimmable. No preamble before the first <h2>. No closing sign-off.
`.trim();

// --- Date-gated reminders -------------------------------------------------------
// Self-expiring nudges injected at the top of the digest during a date window, for
// "come back and measure the effect of change X once it's had time to land" — the
// kind of follow-up that otherwise gets forgotten (scheduled routines here don't
// reliably surface to the user, but this weekly email does). Each carries a
// paste-ready prompt that re-derives from ground truth. Delete an entry once acted
// on, or let it lapse after `end` (inclusive). Dates are 'YYYY-MM-DD' (UTC).
const REMINDERS = [
  {
    // Found 2026-10-01 during a full SEO/GEO health sweep (translation
    // completeness, MT-rot heuristics, dead-link audit, sitemap HTTP health,
    // title/meta rot -- all otherwise clean across all 13 locales). This is
    // the one still-open thread: GSC URL Inspection on
    // alternative-party-ideas-by-culture (the 12-locale culture-comparison
    // series, see the 2026-09-28 digest's original reminder, now retired).
    // 2026-10-01 readings: da moved from "URL is unknown to Google" to
    // "Discovered - currently not indexed" (the 2026-09-09 internal-link fix
    // is working, Google just hasn't crawled it yet). de is "Crawled -
    // currently not indexed" on its second crawl (2026-09-27) -- a Google-side
    // quality/dedup signal, not a discovery problem; more linking won't move
    // this. 10/12 locales were already "Submitted and indexed" as of
    // 2026-09-28 and weren't re-checked this pass (no reason to expect
    // regression). Give da more time to get crawled; de likely needs a real
    // content differentiation pass if it's still stuck after another few weeks,
    // not just patience.
    start: '2026-10-15',
    end: '2026-11-05',
    title: 'Recheck da/de indexing on alternative-party-ideas-by-culture (da discovered-not-crawled, de stuck crawled-not-indexed)',
    body:
      'Two-week-old watch item from a 2026-10-01 full SEO health sweep (otherwise clean across all 13 locales -- ' +
      'translations, content rot, dead links, sitemap health, title/meta all checked and fine). <code>da</code> ' +
      'was "unknown to Google" on 2026-09-28, now "discovered, not yet crawled" -- the internal-link fix is working, ' +
      'just needs more time. <code>de</code> has been "crawled, not indexed" across two separate crawls (09-27 and ' +
      'earlier) -- worth checking if it is still stuck, which would point at a content/quality issue rather than discovery.',
    prompt: `Recheck GSC indexing status for the alternative-party-ideas-by-culture series' da and de locale URLs specifically (https://www.mysterymaker.party/da/blog/alternative-party-ideas-by-culture/ and .../de/blog/...), using the GSC URL Inspection API. Re-derive from ground truth, don't trust this note's prior readings as still current.

1. da: as of 2026-10-01 it had moved from "URL is unknown to Google" (2026-09-28) to "Discovered - currently not indexed" with no crawl yet. Has it been crawled now? If indexed, close this out for da. If still just "discovered" after another 2+ weeks, that itself would be worth flagging (slow discovery despite the internal link being live since 2026-09-09).
2. de: has been "Crawled - currently not indexed" across at least two separate crawls (one as of 2026-09-27). If it's still in this state, that's a real signal worth investigating -- compare de's content against the other 11 locale versions of the same post for anything that reads as thin, duplicate, or low-value to Google specifically (not a linking problem at this point, a content one). If it's since moved to indexed, no action needed.
3. Quick gut-check on the other 10 locales (es, fr, it, pt, nl, sv, fi, ko, ja, zh-cn) -- they were "Submitted and indexed" as of 2026-09-28; a spot-check of 2-3 is enough to confirm no regression, not a full re-audit.
4. Verdict: is da/de now resolved, or does de specifically need a content-quality look rather than more time?`,
  },
  {
    // Found 2026-10-01 during the same SEO health sweep. Very low stakes --
    // noting it so it doesn't get silently forgotten, not because it's urgent.
    start: '2026-10-15',
    end: '2026-12-01',
    title: 'One planned internal link never got placed -- best-murder-mystery-kits-buying-guide to homepage',
    body:
      'From the 2026-09-28 digest\'s homepage-authority action prompt: of the two suggested source pages, ' +
      '<code>best-murder-mystery-party-games-review</code> already linked to the homepage (done), but ' +
      '<code>best-murder-mystery-kits-buying-guide</code> never got its link added -- there was no natural spot in ' +
      'the existing prose to insert one without it reading as forced. Low priority; worth a look next time that page ' +
      'is edited for any other reason, not worth a dedicated pass on its own.',
    prompt: `Check if best-murder-mystery-kits-buying-guide (EN) has a natural place to add a homepage-linking sentence (query-matched anchor text like "custom murder mystery game generator") that wasn't there on 2026-10-01 -- the page may have been edited since for an unrelated reason, which could create a natural opening. If still no natural spot, close this out permanently rather than re-flagging it again; this is optional authority-building, not a real gap.`,
  },
  // RETIRED 2026-09-07: the ADR-0046 canonical-consolidation reminder that lived
  // here is closed out. Third ground-truth read (30/30 post-days, no longer thin)
  // confirmed the consolidation is working and still strengthening: homepage pos
  // "custom murder mystery game" 9.9→5.2, "custom murder mystery party" 14.0→5.3,
  // custom page's impressions on both terms now falling. The one loose end from
  // the 2026-08-31 read (the "game" query's custom-page impressions weren't
  // falling yet) resolved this read. Italian guardrail clean w.r.t. this ADR
  // (its separate, already-closed impression-collapse issue is unrelated and
  // predates ADR-0046 by 3 weeks). Full verdict: docs/adr/0046-en-custom-page-
  // canonical-to-homepage.md Addendum (2026-09-07). Not re-adding this reminder —
  // revisit only if the trend reverses, which would be a new incident, not a
  // continuation of this one.
  // RETIRED 2026-09-14: the Night of Mystery comparison post reminder is closed
  // out with a final negative verdict. Second ground-truth read (~8 weeks
  // post-publish, full working notes: vault 00_INBOX/night-of-mystery-post-
  // measurement-2026-09-14-mystery-maker.md) confirmed the 4-week read wasn't
  // noise — it got worse, not better:
  // - "night of mystery reviews" still ranks on the old generalist page
  //   (/blog/best-murder-mystery-party-games-review/), now at pos ~18.1 with 11
  //   impressions across the full 8-week window (vs pos ~8.9 / 43 impr in the
  //   original 3-week pre-publish baseline) — the impression RATE dropped
  //   further since the 4-week read, not just stayed flat.
  // - Halo query set (review, alternative(s), vs, worth it): zero impressions
  //   across the board now, in both windows — same as the 4-week read.
  // - The post itself: 2 total impressions in 8 weeks (both unrelated
  //   long-tail queries), 0 clicks, 1 GA4 session total (direct), 0
  //   AI-referral sessions.
  // - FAQ rich result: still absent. URL Inspection API shows only Breadcrumbs
  //   detected; no FAQPage item on either URL form despite more crawl history.
  // Verdict per the original decision framework: query volume never
  // materialized — not worth further investment. No more internal links to
  // this specific post, no more measurement cycles. Not re-adding this
  // reminder — revisit only if something changes independent of this incident
  // (e.g. a new inbound link from elsewhere naturally drives traffic here).
  {
    // Not an SEO item — riding along on this digest because it's the one
    // recurring channel that reliably reaches Jonathan (scheduled routines
    // don't). PostHog only started actually capturing production events on
    // 2026-08-22 (ADR-0102) — before that, VITE_POSTHOG_KEY was never wired
    // into the site's real GitHub Pages deploy pipeline at all, so
    // posthog.init() silently no-op'd on every page load since the
    // integration was first written 2026-04-24 (see ADR-0100, superseded).
    // Anything timestamped before 2026-08-22 does not exist in PostHog.
    //
    // Two known ground-truth dates to spot-check the method against once
    // there's enough real data (both from Jonathan directly, 2026-08-22):
    // - Raleigh, "Camp Pine Shadow" — hosted Sat 2026-08-15. Predates the
    //   fix by a week, so expect ZERO PostHog signal for this one; useful
    //   as a null-check that the method doesn't hallucinate a play date
    //   where there's no data, not as a positive example.
    // - Lyn, "The Cognitive Dissonance Incident: A Murder At The MSU
    //   Psychology Department Picnic" — she was sending links to her guests
    //   the same day the fix went live (2026-08-22), so this one's a coin
    //   flip depending on whether her guests opened pages before or after
    //   the fix's deploy time that day.
    start: '2026-10-06',
    end: '2026-10-27',
    title: 'Check whether there is enough PostHog data yet for the purchase-to-play timing analysis',
    body:
      'On <strong>2026-08-22</strong> (ADR-0102) we fixed PostHog actually capturing production events — before that, ' +
      'the tracking code existed but the live GitHub Pages deploy never had the API key wired in, so it silently did ' +
      'nothing since the integration was written back in April. It has now had 6-8 weeks to accumulate real ' +
      '<code>package_tab_viewed</code>/pageview data. Paste the prompt below into a fresh chat to check whether ' +
      'there is enough volume yet to attempt the purchase-to-play timing analysis (using character/Host Guide page ' +
      'view clustering and dwell time as a proxy for when a mystery actually gets played, vs. purchase_date).',
    prompt: `Check whether there is now enough PostHog data to attempt a "time from purchase to actual play" analysis for Mystery Maker, and if so, run a first pass.

Context (re-derive from ground truth, do not trust this note's framing alone): PostHog only started genuinely capturing production events on 2026-08-22 (ADR-0102, docs/adr/0102-posthog-key-missing-from-actual-deploy-pipeline.md) — before that date, VITE_POSTHOG_KEY was never wired into the site's actual GitHub Pages deploy pipeline (.github/workflows/deploy.yml), so posthog.init() silently no-op'd on every page load despite the client-side integration existing since 2026-04-24 (ADR-0100, superseded — its "4 months of lost history" framing was probably never real history to begin with). PostHog project id 569867 ("Mystery Maker"), events fired from src/lib/posthog.ts / src/lib/analytics.ts: \`$pageview\` (every route change) and \`package_tab_viewed\` (tab_name, conversation_id when available).

0. SAMPLE SIZE CHECK FIRST: query PostHog for the count of \`package_tab_viewed\` events with a non-null conversation_id, grouped by conversation_id, for events after 2026-08-22. How many distinct packages have ANY tab-view data at all? If it's a handful (under ~15-20), say so plainly and recommend waiting longer rather than drawing conclusions from too few packages — don't force a verdict out of thin data.
1. THE ACTUAL METHOD, if there's enough volume: for each package with tab-view events, join to Supabase's mystery_packages.purchase_date (or conversations table, check both — see the round-script-formats and payment-protection memory notes for which table is authoritative). For each package, look at the FULL set of tab-view/pageview timestamps across ALL its characters (not just one), not just the first one. The actual play-night signal is: do multiple distinct characters' pages get opened within a tight time window (e.g. same 1-3 hour block) with meaningful dwell time between events (not just a bounce), as opposed to scattered single visits over days? That clustering is the "this is when they actually sat down and played" signal, distinct from "the host poked around once right after purchase." Compute, for packages where a clear cluster exists: (purchase_date) to (start of the clustered play session) as the lag, in days.
2. SPOT-CHECK against two known ground-truth dates (both told to Jonathan directly on 2026-08-22, verify independently against the packages table rather than trusting this note):
   - Raleigh, "Camp Pine Shadow" — hosted Sat 2026-08-15, a full week BEFORE the PostHog fix. Expect ZERO PostHog data for this package. If there IS data, something is wrong with the date assumption above — flag it, don't explain it away.
   - Lyn, "The Cognitive Dissonance Incident: A Murder At The MSU Psychology Department Picnic" — guests were sent links same-day as the fix (2026-08-22). Check if there's a real, plausible clustered signal for this one; if the timing is too close to the fix's deploy time to tell, say so rather than forcing an answer.
3. Verdict: is there a usable purchase-to-play average yet, even a rough one from a small n? If under ~15-20 packages with real data, recommend re-running this same check again in another 3-4 weeks rather than publishing a number from too small a sample.`,
  },
  {
    // Found 2026-08-24 while acting on the digest's homepage-authority action
    // prompt (verification step: "confirm the H1/above-fold copy already
    // surfaces custom murder mystery party/game intent"). It doesn't: hero.title
    // i18n key = "Create Murder Mystery Parties in Minutes" — no "custom" at
    // all. hero.subtitle has "custom mysteries" but not the exact buyer phrase.
    // Only home.seo.title (the <title>/meta, locked by ADR-0024/0046) carries
    // "Custom Murder Mystery Party Kits in Minutes". The H1 itself was never
    // part of that lock — it's open territory, just never flagged before.
    // Deliberately NOT changed this session (out of scope for a links-only
    // pass) — this is a decision for Jonathan, not an automatic action.
    //
    // DECIDED 2026-08-31: leave it as-is, re-check later. Title/meta already
    // carries "custom murder mystery party" and it's working — the homepage
    // gained 5+ ranking positions on both head terms in the 5 weeks since
    // ADR-0046 without touching the H1 (see the ADR-0046 reminder's RESULT
    // above). Revisit only if that progress stalls. Reminder closed — not
    // re-showing.
    start: '2026-08-24',
    end: '2026-08-24',
    title: 'Homepage H1 does not contain "custom" — decide whether to update it',
    body:
      'Verifying the homepage-authority action prompt turned up a gap the digest assumed away: the H1 ' +
      '(<code>hero.title</code>, "Create Murder Mystery Parties in Minutes") does not contain "custom" at all, and the ' +
      'subtitle only has "custom mysteries" — not the exact "custom murder mystery party/game" buyer phrase. Only the ' +
      '<code>&lt;title&gt;</code>/meta (locked by ADR-0024/0046) carries it. The H1 itself was never part of that lock. ' +
      'Decide whether it is worth updating, or whether the meta + internal-link anchors already carry enough signal.',
    prompt: `Decide whether Mystery Maker's homepage H1 should be updated to include "custom murder mystery party/game" buyer-intent language.

Context (re-derive from ground truth, don't trust this note alone): the H1 lives at src/i18n/locales/en.json under hero.title = "Create Murder Mystery Parties in Minutes", rendered in src/components/Hero.tsx. The <title>/meta (home.seo.title/description) already carry "Custom Murder Mystery Party Kits in Minutes" and are locked per ADR-0024 and ADR-0046 §3 — do NOT propose changing those. The H1 was never part of that lock; it's a separate, open decision.

1. Pull current GSC data for "custom murder mystery game" and "custom murder mystery party" on the homepage (page-level breakdown, same method as the ADR-0046 reminder above) — what's the current position/CTR?
2. Weigh the case for changing the H1: would surfacing "custom" in the H1 plausibly help ranking/relevance on top of what the title/meta already do, or is that redundant once title/meta already lead with it? Consider whether an H1 change risks anything (brand voice, existing A/B assumptions, the "Create Murder Mystery Parties in Minutes" phrasing possibly targeting a different, broader intent than "custom").
3. If a change looks worth it, propose exact new H1 copy (a few options) rather than assuming any one direction. If not, say so plainly and close this out — don't manufacture a change for its own sake.`,
  },
  // RETIRED 2026-09-28: indexing check completed once the GSC URL Inspection API
  // access was fixed (see the fetchGAMetrics.mjs/fetchGSCMetrics.mjs bugfix commit
  // the same day -- it was a code bug, not missing GSC access). Internal links were
  // already confirmed fixed earlier the same session (2026-09-09, commit aa7d6c6).
  // Indexing results for all 12 locale URLs: 10/12 "Submitted and indexed"
  // (es, fr, it, pt, nl, sv, fi, ko, ja, zh-cn). de is "Crawled - currently not
  // indexed" (crawled 2026-09-27, Google chose not to index -- a quality/duplicate
  // signal, not a discovery failure, since it HAS been crawled repeatedly). da is
  // "URL is unknown to Google" -- never crawled at all, the one genuine discovery
  // gap. GSC performance (2026-09-01 to 09-28): 10 of 12 URLs have real impressions
  // (1-68 each, zh-cn highest at 68 impr/pos 6.0), es/fr/it/pt/fi/ko/nl at
  // reasonable positions (5.5-9 for most, it is an outlier at pos 36); de and da
  // show zero impressions, consistent with their indexing status. Verdict: 10/12
  // locales are discovering and indexing normally with real (if early) impression
  // volume -- the series overall is fine. da is the one locale that needs a look
  // (never crawled -- check its sitemap entry, hreflang correctness, and whether
  // IndexNow/GSC sitemap actually included it). de is likely just early in Google's
  // own quality evaluation given repeated recent crawls; revisit only if it's still
  // "crawled not indexed" after another few weeks. Not re-adding this reminder.
  {
    // Not an SEO item -- riding along on this digest for the same reason
    // the PostHog-timing reminder above does: it's the one recurring
    // channel that reliably reaches Jonathan (a bare vault note doesn't --
    // 2026-09-25 correction, he doesn't check the vault; recheck/watch
    // notes should default here going forward, see feedback memory
    // feedback_recheck_notes_default_to_seo_digest).
    //
    // ADR-0128 (2026-09-25): shipped live detection of "party clusters" --
    // originally a flat 3+ distinct character-token pages accessed within a
    // trailing 6h window, which pulls the existing 21-day how_did_it_go
    // follow-up email forward to +16h after the detected cluster, once per
    // conversation (conversations.party_detected_at). Built off a
    // retrospective PostHog-vs-Supabase join covering only 24 conversations
    // (2026-08-22 to 2026-09-25), so the threshold is a reasonable starting
    // point, not a tuned constant.
    //
    // Addendum 1 (2026-09-26): the flat "3" was a low bar for a large cast
    // (mass-send curiosity clicks could trip it), so the threshold is now
    // GREATEST(3, CEIL(player_count / 2)) -- scales up for large casts,
    // unchanged for small ones. A sent_at-based delay gate was considered
    // and rejected (would break same-day/night-before sends).
    //
    // Two more considerations raised 2026-09-26, not yet acted on -- folded
    // into this same recheck rather than opening new scope:
    // (a) Jonathan's hunch: "Remove a Character" feature usage might hint a
    //     host is close to their party date (finalizing the guest list).
    //     Plausible but weak/unconfirmed on its own -- someone could use it
    //     well in advance too. Worth a look if there's an easy correlation
    //     to check, not worth building detection around on a single anecdote.
    // (b) Jonathan's observation: for genuine near-day-of purchases, nearly
    //     ALL characters get accessed almost immediately (not just half) --
    //     this is reassuring, not a reason to change the threshold, but
    //     worth confirming against real data now that some exists.
    //
    // Full detail: docs/adr/0128-party-cluster-detection-for-feedback-email-timing.md,
    // vault 00_INBOX/recheck-party-cluster-detection-2026-09-25-mystery-maker.md.
    start: '2026-10-09',
    end: '2026-10-23',
    title: 'Check whether party-cluster detection (ADR-0128) is actually firing and helping',
    body:
      'On <strong>2026-09-25</strong> (ADR-0128) we shipped live detection of "party clusters" -- pulls the ' +
      'existing 21-day <code>how_did_it_go</code> follow-up email forward to ~16h after the detected party ' +
      'instead of a flat calendar delay. The threshold was tuned on only 24 conversations of retrospective data ' +
      'and adjusted once already (2026-09-26, scaled by cast size). Two weeks live is enough to check whether ' +
      'it is actually firing on real traffic, whether the threshold still needs adjusting, and two follow-on ' +
      'ideas raised the same day (Remove-a-Character as a timing hint, near-day-of purchases showing ' +
      'near-100% immediate participation).',
    prompt: `Check whether the ADR-0128 party-cluster detection system is working, using Mystery Maker's Supabase project (id mhfikaomkmqcndqfohbp). Re-derive everything from ground truth -- do not trust this note's framing or numbers, they are priors from 2026-09-25/26 only.

Context: ADR-0128 (docs/adr/0128-party-cluster-detection-for-feedback-email-timing.md, see Addendum 1) added character_assignments.last_accessed_at (updated via the touch_character_access RPC, called from CharacterAccess.tsx on every guest page load) and a scheduled function detect_party_clusters() (pg_cron job 'party-cluster-detection', every 30 min) that looks for GREATEST(3, CEIL(player_count / 2)) distinct characters with last_accessed_at in the trailing 6 hours per conversation, and on a hit pulls that conversation's pending 'how_did_it_go' row in followup_emails forward to NOW() + 16 hours, gated by conversations.party_detected_at IS NULL so it only fires once.

1. HIT COUNT: SELECT count(*) FROM conversations WHERE party_detected_at IS NOT NULL AND created_at > '2026-09-25' -- any detections at all yet? If zero or near-zero, say so plainly and recommend waiting longer rather than judging the threshold on no data.
2. SANITY-CHECK A FEW HITS: for a handful of conversations where party_detected_at is set, pull the actual character_assignments.last_accessed_at timestamps for that conversation's characters and confirm the pattern really does look like a cluster (several distinct characters within a few hours), not a false positive (e.g. one person re-opening several links back to back while proofreading, or a mass-send curiosity burst).
3. FALSE NEGATIVES: for conversations created since 2026-09-25 that are now well past their package_generated_at + 16h with no party_detected_at set, check whether there's guest activity that looks like it should have tripped the detector but didn't -- that's evidence the threshold is too strict, especially for large casts.
4. EMAIL OUTCOME: for followup_emails rows with email_type='how_did_it_go' and status='sent', compare scheduled_for against what it would have been under the old flat +21d rule -- how many actually got pulled earlier, and by how much on average?
5. NEAR-DAY-OF CHECK (2026-09-26 hunch): for conversations where purchase_date is within ~1-2 days of the first guest character access, what fraction of the cast actually got accessed in that initial burst -- is it really close to 100% (minus at most one), as hypothesized, or more mixed? This doesn't need to change the threshold either way, just confirm or correct the intuition.
6. REMOVE-A-CHARACTER CHECK (2026-09-26 hunch): for conversations with a completed row in mystery_adaptations (the "Remove a Character" feature), how close is the adaptation's timestamp to purchase_date or to the eventual party_detected_at (if set)? Is there any visible correlation suggesting adaptation usage clusters near the actual party date, or is it scattered? If the sample is too small to say anything, say so plainly rather than forcing a read -- this was flagged as a weak, unconfirmed hunch, not a claim.
7. VERDICT: is detection firing on real data yet? Does the current cast-scaled threshold look right, too strict, or too loose based on what's actually happening? If the sample is still thin, say so and suggest a specific next recheck date rather than forcing a verdict.`,
  },
  // RETIRED 2026-09-28: Jonathan confirmed directly (asked in the SEO-digest
  // sweep session, Make MCP was down so no scenario-version check was possible)
  // that Child (Unified)42-ConciseCharacterContent was imported and he's since
  // moved on to Child (Unified)47-TargetFloorGuarantee (local blueprint file
  // dated 2026-09-27, not yet committed -- temp-files/**/*.json is gitignored).
  // The manual re-test (generate a package, compare character-content length
  // against the Sherri/Marie 1000-1600-char baseline) was NOT run this session --
  // if a length/density complaint resurfaces, check that before assuming 42
  // regressed, since 47 is a separate later change on top of it. Not re-adding
  // this reminder -- revisit only on a new complaint.
  {
    // Migrated 2026-09-25 from a vault note that was never reaching Jonathan
    // (see feedback_recheck_notes_default_to_seo_digest memory). Not an SEO
    // item. Full detail: vault
    // 01_Projects/Mystery-Maker/stale-concept-audit-2026-08-02-mystery-maker.md.
    //
    // RE-CHECKED 2026-09-28 (Supabase reconnected mid-session): both conversations
    // confirmed still is_paid/purchased, approved_concept_message_id unchanged
    // since the audit -- original finding still holds. BUT: went to synthesize
    // the "correct final concept" from the later Q&A per this reminder's own
    // recovery plan and found neither conversation actually resolves. Black Swan
    // Society (43 messages) ends with the assistant mid-question ("Last
    // clarifying questions... What should Dr. Ashford's educational institution
    // be called? ... The Savannah connection -- which works best?") -- the
    // customer never answered. Adelaide Crane (50 messages) ends the same way,
    // assistant still asking follow-ups about Patricia's argument scene. So
    // there is no clean "repoint to the customer's real final intent" move here
    // -- any regeneration would require inventing plot specifics (institution
    // name, Savannah-connection variant, etc.) the customer never actually
    // decided. Jonathan said proceed if still needed, but this changes the
    // shape of the decision -- flagged back to him rather than guessing at
    // unconfirmed creative details, especially given the Black Swan Society
    // content touches HBCU/Black-history references that deserve his read
    // before anything is invented on top of them. No regeneration triggered,
    // no spend incurred.
    start: '2026-09-26',
    end: '2026-10-17',
    title: 'Two paid packages from a superseded concept: both source conversations dead-end mid-question, no clean "final concept" to regenerate from',
    body:
      'Re-checked 2026-09-28: both packages ("The Black Swan Society," "The Last Will And Testament Of Adelaide ' +
      'Crane") are still in the same stale-concept state as the 2026-08-02 audit. But their conversations don\'t ' +
      'actually resolve -- both end with the assistant mid-clarifying-question and no customer reply. Regenerating ' +
      'would mean inventing plot details the customer never confirmed, not just replaying their real intent. Needs ' +
      'a decision on whether that\'s acceptable, not just a go/no-go on remediating.',
    prompt: `Decide how to handle the two stale-concept-mismatched packages given that neither source conversation has a clean resolved endpoint: "The Black Swan Society: Unmasking Murder" (conversation 926cd375, 43 messages) and "The Last Will And Testament Of Adelaide Crane" (conversation a366885d, 50 messages). Re-derive from ground truth -- query Supabase directly (messages table, ordered by created_at, for each conversation_id), don't trust this note's framing.

1. Confirm both conversations are still is_paid/purchased with approved_concept_message_id unchanged (as of 2026-09-28 they were).
2. Read each conversation's last 5-10 messages directly. As of 2026-09-28 both ended with the assistant asking a clarifying question the customer never answered (Black Swan: institution name + Savannah-connection variant; Adelaide Crane: details of Patricia's argument scene). If still true, this isn't a clean "identify the customer's real final intent" job -- any concept synthesized would include invented specifics.
3. Options to put to Jonathan: (a) synthesize a best-effort concept from everything confirmed up to the dead-end, filling only the unresolved specifics with reasonable choices, and have him review it before triggering the paid regeneration; (b) leave both packages as-is, close this out as a deliberate decision, and log it as a CHANGELOG/ADR-0069 addendum; (c) something else he specifies. Don't pick for him given the Black Swan Society content involves real HBCU/Black-history references that deserve a human read before anything is invented on top of them.`,
  },
  // RETIRED 2026-09-28: locked down. The family had grown to 18 functions since
  // the original 2026-08-01 finding (ADR-0103 kept adding detectors, none of them
  // locked down individually). Confirmed all 18 anon/authenticated-executable via
  // has_function_privilege, confirmed zero call sites use the anon key (grepped
  // supabase/functions + src/ -- the only two callers, regenerate-child-content and
  // auto-remediate-packages, both build their Supabase client from
  // SUPABASE_SERVICE_ROLE_KEY only), applied migration
  // 20260928170000_lock_down_detector_rpc_anon_execute.sql, verified all 18 now
  // false for anon/authenticated, true for service_role. Full detail: ADR-0032
  // Addendum (2026-09-28). Not re-adding this reminder -- the real residual risk
  // is that the *next* new list_packages_with_* detector will inherit the same
  // default-open grant, which this migration can't prevent going forward (see the
  // ADR's own Addendum for why ALTER DEFAULT PRIVILEGES was rejected) -- worth a
  // quick has_function_privilege check whenever a new detector RPC ships, not a
  // recurring digest item.
  // RETIRED 2026-09-30: both da.json and sv.json are now functionally complete.
  // Open since 2026-07-19. GA4 (checked 2026-09-28) showed /da/ and /sv/ path
  // sessions (90 days) at 61 and 55 -- comparable to or HIGHER than fully-localized
  // de (54) and es (53) -- so traffic was never the reason these sat parked; the
  // missing translations were. Jonathan called it: close the gap, one string at a
  // time, no scripts generating the translation text (explicit ask). da.json done
  // first (~610 gaps, 8 checkpointed commits), sv.json followed the same day
  // (~612 gaps, 9 checkpointed commits) -- 17 commits total. Both verified
  // end-to-end: 0 orphaned keys, 0 i18next interpolation-token mismatches across
  // all 1355 keys, valid JSON. The handful of keys still "identical to English"
  // in each file are legitimate non-gaps (proper names, brand names, an email
  // address, punctuation, established tech-UI loanwords), not translation debt.
  // Full detail: CHANGELOG 2026-09-30. Not re-adding this reminder -- revisit
  // only if en.json gains substantial new content that both locales then need to
  // catch up on.
  // RETIRED 2026-09-28: confirmed working in CI. Checked the "Submit sitemap to
  // Google Search Console" step across 5 publish-daily-blog.yml runs spanning
  // 2026-09-13 to 2026-09-27 (databaseId 34760912649, 35107094632, 35513992780,
  // 36011349099, 36326974899) via `gh run view --json jobs` -- every one succeeded.
  // The 2026-09-07/08 double-slash fix held. Not re-adding this reminder --
  // revisit only if the step starts failing again, which would be a new incident.
  // RETIRED 2026-09-28 (decision made, not a finding): Jonathan considered the
  // disposable-synthetic-test plan this reminder describes and explicitly
  // decided against it -- the cheap experiment isn't the test he actually wants;
  // if it's worth testing, he'd rather ship 3-round generation to a subset of
  // real paying customers (~couple sales/day) and observe genuine outcomes,
  // since a disposable test mystery played solo can't validate real-party
  // pacing/solvability the way an actual game night does. Asked whether a
  // retrospective look at EXISTING customer packages could substitute for
  // either kind of test: no -- confirmed via grep (regenerate-child-content's
  // round-3/round-4 prompt text) that round count is uniformly hardcoded at 4
  // for every package ever generated, so there is no natural 3-round subset in
  // past data to compare against. Per his own call: stay parked, no synthetic
  // test, no real-customer test yet -- revisit only when a new complaint or
  // refund cites round count/game length specifically (same trigger as the
  // original 2026-08-15 deferral), at which point the real-customer-test
  // approach is the one to scope, not the disposable-mystery one this reminder
  // used to describe. Not re-adding this reminder.
];

// Safety net: neutralise any literal HTML tags the model leaves inside <pre>
// action-prompt blocks. A stray <title>/<meta> in an email body makes many
// clients (Proton included) treat the rest as document metadata and truncate
// everything after it — this bit the 2026-07-06 send. Escaping only < and >
// (not &) fixes literal tags without double-encoding existing &lt;/&amp; entities.
function escapePreTags(html) {
  return html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (_m, attrs, inner) => {
    const safe = inner.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre${attrs}>${safe}</pre>`;
  });
}

function renderReminders(today) {
  return REMINDERS
    .filter((r) => today >= r.start && today <= r.end)
    .map(
      (r) =>
        '<div style="border:1px solid #d9b310;background:#fffbe6;border-radius:6px;padding:12px 14px;margin:0 0 18px;">' +
        `<p style="margin:0 0 6px;font-weight:600;color:#7a5c00;">📌 Reminder — ${r.title}</p>` +
        `<p style="margin:0 0 10px;font-size:14px;color:#444;">${r.body}</p>` +
        `<pre style="white-space:pre-wrap;background:#f4f1ea;padding:12px;border-radius:6px;font-size:13px;margin:0;">${r.prompt}</pre>` +
        '</div>'
    )
    .join('');
}

async function main() {
  if (!API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }
  const snapshot = readFileSync(SNAPSHOT_PATH, 'utf8');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            'Here is this week\'s snapshot JSON. Produce the HTML email body per your instructions.\n\n' +
            snapshot,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`Anthropic API ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  const html = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!html) {
    console.error('Empty digest from model');
    process.exit(1);
  }

  // date stamp (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  const wrapped =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:680px;margin:auto;color:#222;">` +
    `<p style="color:#666;font-size:13px;">SEO/GEO digest — week ending ${today} · mysterymaker.party</p>` +
    renderReminders(today) +
    escapePreTags(html) +
    `</div>`;

  writeFileSync(EMAIL_OUT, wrapped);
  mkdirSync(HISTORY_DIR, { recursive: true });
  writeFileSync(join(HISTORY_DIR, `${today}.html`), wrapped);

  console.log(`Digest written: ${EMAIL_OUT}`);
  console.log(`History: docs/seo-digests/${today}.html`);
  console.log(`Tokens: in=${data.usage?.input_tokens} out=${data.usage?.output_tokens}`);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
