/**
 * One-off: measure whether the 2026-06-30 homepage title/meta rewrite lifted CTR
 * on branded queries. Re-derives everything from GSC (read-only, free API).
 *
 * Page:    https://www.mysterymaker.party/
 * Queries: "mystery maker", "murder mystery maker", "mysterymaker"
 * Windows: BEFORE = 2026-06-09..2026-06-29 (21 days, pre-change)
 *          AFTER  = 2026-06-30..2026-08-08 (2nd read, widened to present; GSC lags ~2-3 days)
 *
 * Also pulls a per-day series per query so a ranking (position) shift can be told
 * apart from a genuine CTR win.
 */
import { google } from 'googleapis';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE = 'https://www.mysterymaker.party/';
const PAGE = 'https://www.mysterymaker.party/';
const QUERIES = ['mystery maker', 'murder mystery maker', 'mysterymaker'];
const BEFORE = { startDate: '2026-06-09', endDate: '2026-06-29' };
const AFTER = { startDate: '2026-06-30', endDate: '2026-08-08' };
const KEYFILE = join(__dirname, '../temp-files/mystery-maker-analytics-3e8af2760f57.json');

function auth() {
  return new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

// Aggregated metrics for one query over one window, filtered to the homepage.
async function queryWindow(wm, range, query) {
  const res = await wm.searchanalytics.query({
    siteUrl: SITE,
    requestBody: {
      ...range,
      dimensions: ['query'],
      dimensionFilterGroups: [{
        filters: [
          { dimension: 'page', operator: 'equals', expression: PAGE },
          { dimension: 'query', operator: 'equals', expression: query },
        ],
      }],
      rowLimit: 5,
    },
  });
  const r = (res.data.rows || [])[0];
  if (!r) return { clicks: 0, impressions: 0, ctr: 0, position: null };
  return {
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.impressions ? (r.clicks || 0) / r.impressions : 0,
    position: r.position ?? null,
  };
}

// Per-day rows for one query (homepage), across the full span, to spot shifts.
async function queryDaily(wm, query) {
  const res = await wm.searchanalytics.query({
    siteUrl: SITE,
    requestBody: {
      startDate: BEFORE.startDate,
      endDate: AFTER.endDate,
      dimensions: ['date'],
      dimensionFilterGroups: [{
        filters: [
          { dimension: 'page', operator: 'equals', expression: PAGE },
          { dimension: 'query', operator: 'equals', expression: query },
        ],
      }],
      rowLimit: 100,
    },
  });
  return (res.data.rows || []).map((r) => ({
    date: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.impressions ? (r.clicks || 0) / r.impressions : 0,
    position: r.position ?? null,
  }));
}

function fmt(m) {
  if (m.impressions === 0 && m.clicks === 0) return 'no data';
  const pos = m.position == null ? 'n/a' : m.position.toFixed(1);
  return `clicks=${m.clicks}  impr=${m.impressions}  CTR=${(m.ctr * 100).toFixed(1)}%  pos=${pos}`;
}

async function main() {
  const wm = google.webmasters({ version: 'v3', auth: auth() });
  const out = { site: SITE, page: PAGE, before: BEFORE, after: AFTER, byQuery: {} };

  for (const q of QUERIES) {
    const before = await queryWindow(wm, BEFORE, q);
    const after = await queryWindow(wm, AFTER, q);
    const daily = await queryDaily(wm, q);
    out.byQuery[q] = { before, after, daily };

    // per-window daily counts to expose the GSC lag tail
    console.log(`\n=== "${q}" ===`);
    console.log(`  BEFORE ${BEFORE.startDate}..${BEFORE.endDate}: ${fmt(before)}`);
    console.log(`  AFTER  ${AFTER.startDate}..${AFTER.endDate}: ${fmt(after)}`);
    if (before.impressions && after.impressions) {
      const ctrPts = (after.ctr - before.ctr) * 100;
      const posDelta = (after.position ?? 0) - (before.position ?? 0);
      console.log(`  Δ CTR = ${ctrPts >= 0 ? '+' : ''}${ctrPts.toFixed(1)} pts   Δ position = ${posDelta >= 0 ? '+' : ''}${posDelta.toFixed(1)}`);
    }
    const lastDates = daily.slice(-6).map((d) => `${d.date}(i${d.impressions})`).join(' ');
    console.log(`  last days: ${lastDates || 'none'}`);
  }

  // also an aggregate across all 3 branded queries (combined branded CTR)
  const agg = (win) => {
    let c = 0, i = 0, pw = 0;
    for (const q of QUERIES) {
      const m = out.byQuery[q][win];
      c += m.clicks; i += m.impressions; pw += (m.position || 0) * m.impressions;
    }
    return { clicks: c, impressions: i, ctr: i ? c / i : 0, position: i ? pw / i : null };
  };
  out.brandedCombined = { before: agg('before'), after: agg('after') };
  console.log(`\n=== BRANDED COMBINED (3 queries) ===`);
  console.log(`  BEFORE: ${fmt(out.brandedCombined.before)}`);
  console.log(`  AFTER:  ${fmt(out.brandedCombined.after)}`);

  const outPath = join(__dirname, '../temp-files/ctr-rewrite-analysis.json');
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n📄 → ${outPath}`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
