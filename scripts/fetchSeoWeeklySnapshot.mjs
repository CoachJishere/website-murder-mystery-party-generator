/**
 * Weekly SEO/GEO Snapshot Fetcher
 *
 * Pulls a combined, week-over-week snapshot for the weekly emailed digest:
 *   - GSC (webmasters v3): site-wide totals, top queries, top pages, quick wins,
 *     rising queries — current 7 days vs the prior 7 days.
 *   - GA4 (analyticsdata v1beta): sessions / users / engagement + channel mix,
 *     current vs prior.
 *   - AI referrals: traffic from chatgpt.com / perplexity.ai / etc. (the GEO/AEO signal).
 *
 * Output: temp-files/seo-weekly-snapshot.json  (consumed by generateSeoDigest.mjs)
 *
 * Auth: service account via GSC_SERVICE_ACCOUNT_JSON (CI) or a local key file (dev).
 * Each section is independently try/catch'd so one failure degrades to a noted
 * error rather than killing the run.  See ADR-0018.
 */

import { google } from 'googleapis';
import { writeFileSync, readFileSync, existsSync } from 'fs';
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
  outputPath: join(__dirname, '../temp-files/seo-weekly-snapshot.json'),
};

const AI_SOURCES = [
  'chatgpt.com', 'chat.openai.com', 'claude.ai', 'perplexity.ai',
  'gemini.google.com', 'copilot.microsoft.com', 'you.com', 'phind.com',
  'poe.com', 'bard.google.com',
];

// ---- auth (CI env JSON, else local key file) ----------------------------------
function buildAuth(scopes) {
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON),
      scopes,
    });
  }
  return new google.auth.GoogleAuth({ keyFile: CONFIG.localKeyFile, scopes });
}

// ---- date helpers -------------------------------------------------------------
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
// current = last 7 days (ending yesterday); previous = the 7 before that
const RANGES = {
  current: { startDate: isoDaysAgo(7), endDate: isoDaysAgo(1) },
  previous: { startDate: isoDaysAgo(14), endDate: isoDaysAgo(8) },
};

function pctDelta(now, prev) {
  if (!prev) return now ? 100 : 0;
  return Math.round(((now - prev) / prev) * 1000) / 10;
}

// ---- GSC ----------------------------------------------------------------------
async function gscQuery(webmasters, range, dimensions, rowLimit = 25) {
  const res = await webmasters.searchanalytics.query({
    siteUrl: CONFIG.siteUrl,
    requestBody: { ...range, dimensions, rowLimit },
  });
  return res.data.rows || [];
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

function shapeRows(rows, key) {
  return rows.map((r) => ({
    [key]: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: Math.round((r.ctr || 0) * 1000) / 10,
    position: Math.round((r.position || 0) * 10) / 10,
  }));
}

async function fetchGSC(snapshot) {
  const auth = buildAuth(['https://www.googleapis.com/auth/webmasters.readonly']);
  const webmasters = google.webmasters({ version: 'v3', auth });

  // totals: query-dimension rows, aggregated locally (one round-trip per window)
  const curQ = await gscQuery(webmasters, RANGES.current, ['query'], 200);
  const prevQ = await gscQuery(webmasters, RANGES.previous, ['query'], 200);
  const curPages = await gscQuery(webmasters, RANGES.current, ['page'], 25);

  const totals = totalsFromRows(curQ);
  const totalsPrev = totalsFromRows(prevQ);

  const topQueries = shapeRows([...curQ].sort((a, b) => b.clicks - a.clicks).slice(0, 25), 'query');
  const topPages = shapeRows([...curPages].sort((a, b) => b.clicks - a.clicks).slice(0, 25), 'page');

  // quick wins: meaningful impressions + (low CTR or position 5-15)
  const quickWins = shapeRows(
    [...curQ].sort((a, b) => b.impressions - a.impressions).slice(0, 100),
    'query'
  )
    .filter((q) => q.impressions >= 20 && (q.ctr < 2 || (q.position >= 5 && q.position <= 15)))
    .slice(0, 15)
    .map((q) => ({
      ...q,
      reason:
        q.position >= 5 && q.position <= 15
          ? `position ${q.position} — one nudge from page 1`
          : `${q.impressions} impressions but ${q.ctr}% CTR — title/meta rewrite`,
    }));

  // rising queries: biggest impression growth vs previous window
  const prevMap = new Map(prevQ.map((r) => [r.keys[0], r.impressions || 0]));
  const rising = curQ
    .map((r) => ({
      query: r.keys[0],
      impressions: r.impressions || 0,
      prevImpressions: prevMap.get(r.keys[0]) || 0,
      clicks: r.clicks || 0,
      position: Math.round((r.position || 0) * 10) / 10,
    }))
    .map((r) => ({ ...r, growth: r.impressions - r.prevImpressions }))
    .filter((r) => r.growth >= 10)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 10);

  snapshot.gsc = {
    totals,
    totalsPrev,
    deltas: {
      clicksPct: pctDelta(totals.clicks, totalsPrev.clicks),
      impressionsPct: pctDelta(totals.impressions, totalsPrev.impressions),
      positionAbs: Math.round((totals.position - totalsPrev.position) * 10) / 10,
    },
    topQueries,
    topPages,
    quickWins,
    risingQueries: rising,
  };
}

// ---- GA4 ----------------------------------------------------------------------
async function fetchGA4(snapshot) {
  const auth = buildAuth(['https://www.googleapis.com/auth/analytics.readonly']);
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  const property = `properties/${CONFIG.propertyId}`;

  // totals current vs previous (two date ranges, one report)
  const totalsRes = await analyticsData.properties.runReport({
    property,
    requestBody: {
      dateRanges: [
        { startDate: RANGES.current.startDate, endDate: RANGES.current.endDate, name: 'current' },
        { startDate: RANGES.previous.startDate, endDate: RANGES.previous.endDate, name: 'previous' },
      ],
      metrics: [
        { name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagedSessions' },
      ],
    },
  });
  const byRange = { current: {}, previous: {} };
  for (const row of totalsRes.data.rows || []) {
    const name = row.dimensionValues?.[0]?.value || 'current';
    byRange[name] = {
      sessions: Number(row.metricValues?.[0]?.value || 0),
      users: Number(row.metricValues?.[1]?.value || 0),
      engagedSessions: Number(row.metricValues?.[2]?.value || 0),
    };
  }

  // channel mix (current window)
  const chanRes = await analyticsData.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate: RANGES.current.startDate, endDate: RANGES.current.endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
  });
  const channels = (chanRes.data.rows || []).map((r) => ({
    channel: r.dimensionValues?.[0]?.value || '(unknown)',
    sessions: Number(r.metricValues?.[0]?.value || 0),
  }));

  snapshot.ga4 = {
    current: byRange.current,
    previous: byRange.previous,
    deltas: {
      sessionsPct: pctDelta(byRange.current.sessions, byRange.previous.sessions),
      usersPct: pctDelta(byRange.current.users, byRange.previous.users),
    },
    channels,
  };
}

// ---- AI referrals (GEO/AEO signal) -------------------------------------------
async function fetchAI(snapshot) {
  const auth = buildAuth(['https://www.googleapis.com/auth/analytics.readonly']);
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  const property = `properties/${CONFIG.propertyId}`;

  const filter = {
    orGroup: {
      expressions: AI_SOURCES.map((s) => ({
        filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: s } },
      })),
    },
  };

  const aiRes = await analyticsData.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate: RANGES.current.startDate, endDate: RANGES.current.endDate }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }],
      dimensionFilter: filter,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
  });
  const bySource = (aiRes.data.rows || []).map((r) => ({
    source: r.dimensionValues?.[0]?.value,
    sessions: Number(r.metricValues?.[0]?.value || 0),
    engagedSessions: Number(r.metricValues?.[1]?.value || 0),
  }));
  const aiSessions = bySource.reduce((a, r) => a + r.sessions, 0);
  const totalSessions = snapshot.ga4?.current?.sessions || 0;

  snapshot.ai = {
    aiSessions,
    sharePct: totalSessions ? Math.round((aiSessions / totalSessions) * 1000) / 10 : 0,
    bySource,
  };
}

// ---- Site health (publish queue + dead internal links) ------------------------
// Surfaces in the digest so two regressions are visible weekly: (1) dead internal
// links climbing back above 0, and (2) the publish queue stalling or publishing
// low-value pages. Reads cross_link_map.json for the link-graph priority order
// (see ADR-0021). Requires SUPABASE_URL + SUPABASE_SERVICE_KEY.
async function fetchSiteHealth(snapshot) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  const supabase = createClient(url, key);

  const { count: publishedEn } = await supabase
    .from('blog_posts').select('slug', { count: 'exact', head: true })
    .eq('language', 'en').eq('status', 'published');
  const { count: draftsEn } = await supabase
    .from('blog_posts').select('slug', { count: 'exact', head: true })
    .eq('language', 'en').eq('status', 'draft');

  // Dead internal links: /blog/<slug> links in published content whose target
  // is not itself a published EN post.
  const { data: pub } = await supabase
    .from('blog_posts').select('slug, content')
    .eq('language', 'en').eq('status', 'published');
  const publishedSet = new Set((pub || []).map((p) => p.slug));
  const linkRe = /\]\(\/blog\/([a-z0-9-]+)/g;
  const deadTargets = {};
  let deadInstances = 0;
  for (const p of pub || []) {
    let m;
    while ((m = linkRe.exec(p.content || '')) !== null) {
      const target = m[1].toLowerCase();
      if (!publishedSet.has(target)) {
        deadInstances++;
        deadTargets[target] = (deadTargets[target] || 0) + 1;
      }
    }
  }
  const deadLinkTargets = Object.entries(deadTargets)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([slug, n]) => ({ slug, linkedFrom: n }));

  // Next-up drafts by intended in-degree in the cross-link map (ADR-0021).
  let nextUpByImportance = [];
  const mapPath = join(__dirname, '../cross_link_map.json');
  if (existsSync(mapPath)) {
    const map = JSON.parse(readFileSync(mapPath, 'utf-8'));
    const inDeg = {};
    for (const src of Object.keys(map)) {
      for (const t of (map[src]?.links_to || [])) inDeg[t] = (inDeg[t] || 0) + 1;
    }
    const { data: draftRows } = await supabase
      .from('blog_posts').select('slug, created_at')
      .eq('language', 'en').eq('status', 'draft');
    nextUpByImportance = (draftRows || [])
      .map((d) => ({ slug: d.slug, importance: inDeg[d.slug] || 0, created_at: d.created_at }))
      .sort((a, b) => b.importance - a.importance || new Date(a.created_at) - new Date(b.created_at))
      .slice(0, 5)
      .map(({ slug, importance }) => ({ slug, importance }));
  }

  snapshot.siteHealth = {
    publishedEn: publishedEn ?? null,
    draftsEn: draftsEn ?? null,
    deadInternalLinks: deadInstances,
    deadLinkTargets,
    nextUpByImportance,
  };
}

// ---- main ---------------------------------------------------------------------
async function main() {
  const snapshot = {
    generatedAt: new Date().toISOString(),
    site: CONFIG.siteUrl,
    ranges: RANGES,
    errors: [],
  };

  for (const [label, fn] of [['GSC', fetchGSC], ['GA4', fetchGA4], ['AI', fetchAI], ['SiteHealth', fetchSiteHealth]]) {
    try {
      console.log(`Fetching ${label}…`);
      await fn(snapshot);
      console.log(`  ✅ ${label}`);
    } catch (err) {
      console.error(`  ❌ ${label}: ${err.message}`);
      snapshot.errors.push({ source: label, message: err.message });
    }
  }

  writeFileSync(CONFIG.outputPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n📄 Snapshot → ${CONFIG.outputPath}`);
  if (snapshot.gsc) {
    const t = snapshot.gsc.totals;
    console.log(
      `GSC: ${t.clicks} clicks (${snapshot.gsc.deltas.clicksPct >= 0 ? '+' : ''}${snapshot.gsc.deltas.clicksPct}%), ` +
        `${t.impressions} impressions, pos ${t.position}, ${snapshot.gsc.quickWins.length} quick wins`
    );
  }
  if (snapshot.ga4) console.log(`GA4: ${snapshot.ga4.current.sessions} sessions (${snapshot.ga4.deltas.sessionsPct >= 0 ? '+' : ''}${snapshot.ga4.deltas.sessionsPct}%)`);
  if (snapshot.ai) console.log(`AI:  ${snapshot.ai.aiSessions} sessions (${snapshot.ai.sharePct}% of traffic)`);
  if (snapshot.siteHealth) {
    const h = snapshot.siteHealth;
    console.log(`Health: ${h.publishedEn} live / ${h.draftsEn} drafts, ${h.deadInternalLinks} dead internal links`);
  }
  if (snapshot.errors.length) console.log(`⚠️  ${snapshot.errors.length} section error(s)`);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
