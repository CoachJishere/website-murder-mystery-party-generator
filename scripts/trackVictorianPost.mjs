#!/usr/bin/env node

/**
 * Victorian Post Tracking Script
 * Tracks daily metrics for the optimized Victorian murder mystery post
 * Run daily during the 7-day tracking window (Feb 16-23, 2026)
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VICTORIAN_POST_URL = 'https://www.mysterymaker.party/blog/how-to-host-a-victorian-murder-mystery-party';
const VICTORIAN_POST_PATH = '/blog/how-to-host-a-victorian-murder-mystery-party';
const TRACKING_FILE = path.join(__dirname, '../temp-files/victorian-post-tracking.json');

// Target queries to monitor
const TARGET_QUERIES = [
  'how to host a victorian murder mystery party',
  'victorian murder mystery party planning',
  'victorian murder mystery ideas',
  '1800s murder mystery party',
  'victorian party themes'
];

async function getGSCClient() {
  const credPath = path.join(__dirname, '../.google-search-console-credentials.json');
  const credentials = JSON.parse(await fs.readFile(credPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const client = await auth.getClient();
  return google.webmasters({ version: 'v3', auth: client });
}

async function getGA4Client() {
  const credPath = path.join(__dirname, '../.google-analytics-credentials.json');
  const credentials = JSON.parse(await fs.readFile(credPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const client = await auth.getClient();
  return google.analyticsdata({ version: 'v1beta', auth: client });
}

async function getGSCMetrics(webmasters) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);

  try {
    // Overall metrics for the Victorian post URL
    const urlResponse = await webmasters.searchanalytics.query({
      siteUrl: 'https://www.mysterymaker.party/',
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        dimensions: ['page'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'page',
            expression: VICTORIAN_POST_URL,
          }]
        }],
        rowLimit: 1
      }
    });

    const urlMetrics = urlResponse.data.rows?.[0] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: null
    };

    // Query-specific metrics
    const queryResponse = await webmasters.searchanalytics.query({
      siteUrl: 'https://www.mysterymaker.party/',
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        dimensions: ['query', 'page'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'page',
            expression: VICTORIAN_POST_URL,
          }]
        }],
        rowLimit: 25
      }
    });

    const queries = queryResponse.data.rows?.map(row => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: (row.ctr * 100).toFixed(2),
      position: row.position.toFixed(1)
    })) || [];

    return {
      url: VICTORIAN_POST_URL,
      clicks: urlMetrics.clicks,
      impressions: urlMetrics.impressions,
      ctr: (urlMetrics.ctr * 100).toFixed(2),
      avgPosition: urlMetrics.position?.toFixed(1) || null,
      queries: queries,
      targetQueryFound: queries.some(q =>
        TARGET_QUERIES.some(target => q.query.toLowerCase().includes(target.toLowerCase()))
      )
    };
  } catch (error) {
    console.error('GSC API Error:', error.message);
    return {
      url: VICTORIAN_POST_URL,
      clicks: 0,
      impressions: 0,
      ctr: '0.00',
      avgPosition: null,
      queries: [],
      targetQueryFound: false,
      error: error.message
    };
  }
}

async function getGA4Metrics(analyticsData) {
  const propertyId = '367892196';
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);

  try {
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'conversions' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'EXACT',
              value: VICTORIAN_POST_PATH
            }
          }
        }
      }
    });

    const row = response.data.rows?.[0];

    if (row) {
      return {
        pageviews: parseInt(row.metricValues[0].value),
        avgTimeOnPage: Math.round(parseFloat(row.metricValues[1].value)),
        bounceRate: (parseFloat(row.metricValues[2].value) * 100).toFixed(1),
        conversions: parseInt(row.metricValues[3].value)
      };
    }

    return {
      pageviews: 0,
      avgTimeOnPage: 0,
      bounceRate: '0.0',
      conversions: 0
    };
  } catch (error) {
    console.error('GA4 API Error:', error.message);
    return {
      pageviews: 0,
      avgTimeOnPage: 0,
      bounceRate: '0.0',
      conversions: 0,
      error: error.message
    };
  }
}

async function loadTrackingHistory() {
  try {
    const data = await fs.readFile(TRACKING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {
      postUrl: VICTORIAN_POST_URL,
      optimizationDate: '2026-02-16',
      trackingStartDate: '2026-02-16',
      targetQueries: TARGET_QUERIES,
      dailySnapshots: []
    };
  }
}

async function saveTrackingData(data) {
  await fs.writeFile(TRACKING_FILE, JSON.stringify(data, null, 2));
}

async function main() {
  console.log('🔍 Tracking Victorian Post Metrics...\n');

  const webmasters = await getGSCClient();
  const analyticsData = await getGA4Client();

  const [gscMetrics, ga4Metrics] = await Promise.all([
    getGSCMetrics(webmasters),
    getGA4Metrics(analyticsData)
  ]);

  const snapshot = {
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    gsc: gscMetrics,
    ga4: ga4Metrics
  };

  const trackingData = await loadTrackingHistory();
  trackingData.dailySnapshots.push(snapshot);
  trackingData.lastUpdated = snapshot.timestamp;

  await saveTrackingData(trackingData);

  // Print summary
  console.log('📊 Victorian Post Metrics (Last 7 Days)\n');
  console.log('Google Search Console:');
  console.log(`  Impressions: ${gscMetrics.impressions}`);
  console.log(`  Clicks: ${gscMetrics.clicks}`);
  console.log(`  CTR: ${gscMetrics.ctr}%`);
  console.log(`  Avg Position: ${gscMetrics.avgPosition || 'Not ranked'}`);
  console.log(`  Target Query Found: ${gscMetrics.targetQueryFound ? '✅' : '❌'}`);

  if (gscMetrics.queries.length > 0) {
    console.log('\n  Top Queries:');
    gscMetrics.queries.slice(0, 5).forEach(q => {
      console.log(`    - "${q.query}" (pos: ${q.position}, imp: ${q.impressions})`);
    });
  }

  console.log('\nGoogle Analytics:');
  console.log(`  Pageviews: ${ga4Metrics.pageviews}`);
  console.log(`  Avg Time: ${Math.floor(ga4Metrics.avgTimeOnPage / 60)}m ${ga4Metrics.avgTimeOnPage % 60}s`);
  console.log(`  Bounce Rate: ${ga4Metrics.bounceRate}%`);
  console.log(`  Conversions: ${ga4Metrics.conversions}`);

  console.log(`\n✅ Data saved to: ${TRACKING_FILE}`);
  console.log(`📅 Total snapshots: ${trackingData.dailySnapshots.length}`);

  // Assessment
  const dayNumber = trackingData.dailySnapshots.length;
  console.log(`\n📈 Day ${dayNumber}/7 Assessment:`);

  if (gscMetrics.impressions === 0) {
    console.log('⏳ No impressions yet - normal for days 1-4');
    console.log('💡 Consider requesting manual indexing in GSC');
  } else if (gscMetrics.impressions < 50) {
    console.log('🟡 Low impressions - monitoring');
  } else if (gscMetrics.impressions >= 50 && parseFloat(gscMetrics.ctr) >= 2) {
    console.log('✅ Minimum success criteria met!');
  }

  if (gscMetrics.avgPosition && parseFloat(gscMetrics.avgPosition) <= 10) {
    console.log('🎉 Page 1 ranking achieved!');
  }
}

main().catch(console.error);
