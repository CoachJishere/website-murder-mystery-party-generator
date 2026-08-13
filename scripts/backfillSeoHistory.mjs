/**
 * SEO/GEO Historical Backfill — retroactive before/after read on known content
 * interventions, using GSC + GA4's own retained history (no new data collection,
 * no paid API). See ADR-0084.
 *
 * For each entry in INTERVENTIONS: pulls GSC totals (site-wide + blog-only) and
 * GA4 AI-referral-traffic share for a window before the intervention date and a
 * window after it (skipping a short lag so Google has had time to re-crawl/re-rank
 * the changed pages), then writes both windows into seo_performance_snapshots
 * (source='backfill') and prints the delta.
 *
 * This is a one-off/occasional script, not a cron job — run manually:
 *   node scripts/backfillSeoHistory.mjs
 *
 * Auth: same as fetchSeoWeeklySnapshot.mjs (GSC_SERVICE_ACCOUNT_JSON in CI, or a
 * local key file in dev). Deliberately does NOT share code with that script beyond
 * copying the small auth/query helpers — this is a rarely-run analysis tool, not
 * part of the weekly pipeline, so keeping it self-contained avoids coupling a
 * stable production script to an occasional one.
 */

import { google } from 'googleapis';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from './_supabase-node.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  propertyId: process.env.GA4_PROPERTY_ID || '504442584',
  siteUrl: process.env.GSC_SITE_URL || 'https://www.mysterymaker.party/',
  localKeyFile:
    process.env.GOOGLE_SA_KEYFILE ||
    join(__dirname, '../temp-files/mystery-maker-analytics-3e8af2760f57.json'),
};

const AI_SOURCES = [
  'chatgpt.com', 'chat.openai.com', 'claude.ai', 'perplexity.ai',
  'gemini.google.com', 'copilot.microsoft.com', 'you.com', 'phind.com',
  'poe.com', 'bard.google.com',
];

// Known past content interventions worth checking against the playbook's claims.
// Add more here as they're identified (e.g. from CHANGELOG.md / docs/adr/) — this
// list is intentionally small to start; each entry is one deliberate, dateable,
// site-wide-ish content change, not every individual post edit.
const INTERVENTIONS = [
  {
    name: 'march_2026_geo_enrichment',
    date: '2026-03-17',
    description:
      '58 EN posts voice-rewritten + GEO-enriched (stats, expert quotes, citations) '
      + 'per docs/blog-content-pipeline-history-2026-03.md — the playbook\'s own most '
      + 'specific claim (Princeton GEO paper: stats/citations +30-40% AI visibility).',
    windowDays: 30,
    lagDays: 10, // skip this many days post-intervention for crawl/re-rank lag
  },
];

// ---- auth -----------------------------------------------------------------
function buildAuth(scopes) {
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON),
      scopes,
    });
  }
  return new google.auth.GoogleAuth({ keyFile: CONFIG.localKeyFile, scopes });
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function totalsFromRows(rows) {
  const t = rows.reduce(
    (a, r) => {
      a.clicks += r.clicks || 0;
      a.impressions += r.impressions || 0;
      a.posWeighted += (r.position || 0) * (r.impressions || 0);
      return a;
    },
    { clicks: 0, impressions: 0, posWeighted: 0 }
  );
  return {
    clicks: t.clicks,
    impressions: t.impressions,
    ctr: t.impressions ? Math.round((t.clicks / t.impressions) * 1000) / 10 : 0,
    position: t.impressions ? Math.round((t.posWeighted / t.impressions) * 10) / 10 : 0,
  };
}

// ---- GSC: site-wide + blog-only totals for an arbitrary window ------------
async function fetchGSCWindow(webmasters, range) {
  const res = await webmasters.searchanalytics.query({
    siteUrl: CONFIG.siteUrl,
    requestBody: { ...range, dimensions: ['page'], rowLimit: 5000 },
  });
  const rows = res.data.rows || [];
  const blogRows = rows.filter((r) => (r.keys?.[0] || '').includes('/blog/'));
  return {
    siteWide: totalsFromRows(rows),
    blogOnly: totalsFromRows(blogRows),
    blogPageCount: blogRows.length,
  };
}

// ---- GA4: AI-referral traffic for an arbitrary window ----------------------
async function fetchAIWindow(analyticsData, range) {
  const property = `properties/${CONFIG.propertyId}`;
  const filter = {
    orGroup: {
      expressions: AI_SOURCES.map((s) => ({
        filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: s } },
      })),
    },
  };
  const [aiRes, totalRes] = await Promise.all([
    analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges: [range],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: filter,
      },
    }),
    analyticsData.properties.runReport({
      property,
      requestBody: { dateRanges: [range], metrics: [{ name: 'sessions' }] },
    }),
  ]);
  const aiSessions = (aiRes.data.rows || []).reduce(
    (a, r) => a + Number(r.metricValues?.[0]?.value || 0), 0
  );
  const totalSessions = Number(totalRes.data.rows?.[0]?.metricValues?.[0]?.value || 0);
  return {
    aiSessions,
    totalSessions,
    sharePct: totalSessions ? Math.round((aiSessions / totalSessions) * 1000) / 10 : 0,
  };
}

async function persistBackfillRow({ intervention, phase, range, gsc, ai, error }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  const supabase = createClient(url, key);
  const { error: dbError } = await supabase.from('seo_performance_snapshots').insert({
    window_start: range.startDate,
    window_end: range.endDate,
    source: 'backfill',
    intervention_name: intervention.name,
    intervention_phase: phase,
    metrics: { gsc: gsc ?? null, ai: ai ?? null, errors: error ? [error] : [] },
    notes: intervention.description,
  });
  if (dbError) throw new Error(dbError.message);
}

function fmtDelta(pre, post, label, isPct = false) {
  if (pre === 0 && post === 0) return `${label}: 0 → 0`;
  const delta = pre ? Math.round(((post - pre) / pre) * 1000) / 10 : (post ? 100 : 0);
  const sign = delta >= 0 ? '+' : '';
  const unit = isPct ? 'pp' : '%';
  const rawDelta = isPct ? Math.round((post - pre) * 10) / 10 : delta;
  return `${label}: ${pre} → ${post} (${sign}${rawDelta}${unit})`;
}

async function runIntervention(webmasters, analyticsData, intervention) {
  const { name, date, windowDays, lagDays } = intervention;

  const preRange = { startDate: addDays(date, -windowDays), endDate: addDays(date, -1) };
  const postRange = { startDate: addDays(date, lagDays), endDate: addDays(date, lagDays + windowDays) };

  console.log(`\n=== ${name} (${date}) ===`);
  console.log(intervention.description);
  console.log(`Pre:  ${preRange.startDate} → ${preRange.endDate}`);
  console.log(`Post: ${postRange.startDate} → ${postRange.endDate} (${lagDays}d lag)`);

  const results = {};
  for (const [phase, range] of [['pre', preRange], ['post', postRange]]) {
    let gsc = null, ai = null, error = null;
    try {
      gsc = await fetchGSCWindow(webmasters, range);
    } catch (err) {
      error = `GSC: ${err.message}`;
      console.error(`  ❌ ${phase} GSC: ${err.message}`);
    }
    try {
      ai = await fetchAIWindow(analyticsData, range);
    } catch (err) {
      error = (error ? error + '; ' : '') + `AI: ${err.message}`;
      console.error(`  ❌ ${phase} AI: ${err.message}`);
    }
    results[phase] = { gsc, ai };
    await persistBackfillRow({ intervention, phase, range, gsc, ai, error });
    console.log(`  ✅ ${phase} persisted`);
  }

  if (results.pre.gsc && results.post.gsc) {
    console.log('\nGSC — blog pages only:');
    console.log('  ' + fmtDelta(results.pre.gsc.blogOnly.clicks, results.post.gsc.blogOnly.clicks, 'Clicks'));
    console.log('  ' + fmtDelta(results.pre.gsc.blogOnly.impressions, results.post.gsc.blogOnly.impressions, 'Impressions'));
    console.log('  ' + fmtDelta(results.pre.gsc.blogOnly.ctr, results.post.gsc.blogOnly.ctr, 'CTR', true));
    console.log('  ' + fmtDelta(results.pre.gsc.blogOnly.position, results.post.gsc.blogOnly.position, 'Avg position', true) + ' (negative = better)');
  }
  if (results.pre.ai && results.post.ai) {
    console.log('\nGA4 — AI-referral traffic:');
    console.log('  ' + fmtDelta(results.pre.ai.aiSessions, results.post.ai.aiSessions, 'AI sessions'));
    console.log('  ' + fmtDelta(results.pre.ai.sharePct, results.post.ai.sharePct, 'AI share of traffic', true));
  }
}

async function main() {
  const gscAuth = buildAuth(['https://www.googleapis.com/auth/webmasters.readonly']);
  const webmasters = google.webmasters({ version: 'v3', auth: gscAuth });
  const ga4Auth = buildAuth(['https://www.googleapis.com/auth/analytics.readonly']);
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth: ga4Auth });

  for (const intervention of INTERVENTIONS) {
    await runIntervention(webmasters, analyticsData, intervention);
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
