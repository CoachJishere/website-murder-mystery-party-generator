/**
 * Site-Wide Analytics Metrics Fetcher
 *
 * This script pulls comprehensive site-wide metrics from both GA4 and GSC
 * to support data-driven blog optimization decisions.
 *
 * Fetches:
 * - GA4: Pageviews, users, sessions, conversions, traffic sources, top pages
 * - GSC: Impressions, clicks, CTR, position, top queries, top pages
 *
 * Run: node scripts/fetchSiteMetrics.mjs
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  propertyId: process.env.GA4_PROPERTY_ID || '504442584',
  siteUrl: process.env.GSC_SITE_URL || 'https://www.mysterymaker.party/',
  gaCredentialsPath: join(__dirname, '../.google-analytics-credentials.json'),
  gscCredentialsPath: join(__dirname, '../.google-search-console-credentials.json'),
  outputPath: join(__dirname, '../temp-files/site-metrics.json'),
  daysBack: 30
};

async function fetchSiteMetrics() {
  console.log('🔍 Fetching site-wide analytics metrics (last 30 days)...\n');

  const metrics = {
    lastUpdated: new Date().toISOString(),
    dateRange: {
      start: formatDate(getStartDate()),
      end: formatDate(new Date())
    },
    ga4: {},
    gsc: {},
    errors: []
  };

  try {
    // Fetch GA4 metrics
    console.log('📊 Fetching GA4 metrics...');
    metrics.ga4 = await fetchGA4Metrics();
    console.log('✅ GA4 metrics fetched successfully\n');
  } catch (error) {
    console.error('❌ GA4 fetch failed:', error.message);
    metrics.errors.push({ source: 'GA4', message: error.message });
    metrics.ga4 = { error: error.message };
  }

  try {
    // Fetch GSC metrics
    console.log('🔍 Fetching GSC metrics...');
    metrics.gsc = await fetchGSCMetrics();
    console.log('✅ GSC metrics fetched successfully\n');
  } catch (error) {
    console.error('❌ GSC fetch failed:', error.message);
    metrics.errors.push({ source: 'GSC', message: error.message });
    metrics.gsc = { error: error.message };
  }

  // Save to file
  writeFileSync(CONFIG.outputPath, JSON.stringify(metrics, null, 2));
  console.log('💾 Site metrics saved to:', CONFIG.outputPath);

  // Print summary
  printSummary(metrics);

  return metrics;
}

async function fetchGA4Metrics() {
  const analyticsDataClient = new BetaAnalyticsDataClient({
    keyFilename: CONFIG.gaCredentialsPath
  });

  const startDate = formatDate(getStartDate());
  const endDate = formatDate(new Date());

  // Fetch overall site metrics
  const [overallResponse] = await analyticsDataClient.runReport({
    property: `properties/${CONFIG.propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'conversions' }
    ]
  });

  const overall = overallResponse.rows?.[0];
  const overallMetrics = {
    totalPageviews: parseInt(overall?.metricValues[0].value || 0),
    totalUsers: parseInt(overall?.metricValues[1].value || 0),
    totalSessions: parseInt(overall?.metricValues[2].value || 0),
    avgSessionDuration: Math.round(parseFloat(overall?.metricValues[3].value || 0)),
    bounceRate: Math.round(parseFloat(overall?.metricValues[4].value || 0) * 100) / 100,
    totalConversions: parseInt(overall?.metricValues[5].value || 0)
  };

  // Fetch traffic sources
  const [sourcesResponse] = await analyticsDataClient.runReport({
    property: `properties/${CONFIG.propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [
      { name: 'sessions' },
      { name: 'screenPageViews' }
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
  });

  const trafficSources = (sourcesResponse.rows || []).map(row => ({
    channel: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value),
    pageviews: parseInt(row.metricValues[1].value)
  }));

  // Fetch top 20 blog posts by pageviews
  const [topPagesResponse] = await analyticsDataClient.runReport({
    property: `properties/${CONFIG.propertyId}`,
    dateRanges: [{ startDate, endDate }],
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
          matchType: 'CONTAINS',
          value: '/blog/'
        }
      }
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20
  });

  const topBlogPosts = (topPagesResponse.rows || []).map(row => ({
    path: row.dimensionValues[0].value,
    pageviews: parseInt(row.metricValues[0].value),
    avgTimeOnPage: Math.round(parseFloat(row.metricValues[1].value)),
    bounceRate: Math.round(parseFloat(row.metricValues[2].value) * 100) / 100,
    conversions: parseInt(row.metricValues[3].value)
  }));

  return {
    overall: overallMetrics,
    trafficSources,
    topBlogPosts
  };
}

async function fetchGSCMetrics() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CONFIG.gscCredentialsPath,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });

  const authClient = await auth.getClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  const startDate = formatDate(getStartDate());
  const endDate = formatDate(new Date());

  // Fetch overall site metrics
  const overallResponse = await searchconsole.searchanalytics.query({
    siteUrl: CONFIG.siteUrl,
    requestBody: {
      startDate,
      endDate,
      rowLimit: 1
    }
  });

  const overallMetrics = {
    totalImpressions: overallResponse.data.rows?.[0]?.impressions || 0,
    totalClicks: overallResponse.data.rows?.[0]?.clicks || 0,
    avgCTR: Math.round((overallResponse.data.rows?.[0]?.ctr || 0) * 10000) / 100,
    avgPosition: Math.round((overallResponse.data.rows?.[0]?.position || 0) * 10) / 10
  };

  // Fetch top 20 queries
  const queriesResponse = await searchconsole.searchanalytics.query({
    siteUrl: CONFIG.siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 20
    }
  });

  const topQueries = (queriesResponse.data.rows || []).map(row => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100,
    position: Math.round(row.position * 10) / 10
  }));

  // Fetch top 20 pages by clicks (filtered for blog posts)
  const pagesResponse = await searchconsole.searchanalytics.query({
    siteUrl: CONFIG.siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page'],
      dimensionFilterGroups: [{
        filters: [{
          dimension: 'page',
          operator: 'contains',
          expression: '/blog/'
        }]
      }],
      rowLimit: 20
    }
  });

  const topBlogPages = (pagesResponse.data.rows || []).map(row => ({
    url: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100,
    position: Math.round(row.position * 10) / 10
  }));

  return {
    overall: overallMetrics,
    topQueries,
    topBlogPages
  };
}

function getStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - CONFIG.daysBack);
  return date;
}

function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function printSummary(metrics) {
  console.log('\n📈 SITE-WIDE METRICS SUMMARY');
  console.log('═'.repeat(60));

  if (!metrics.ga4.error) {
    console.log('\n📊 Google Analytics 4:');
    console.log('  Total Pageviews:', metrics.ga4.overall.totalPageviews.toLocaleString());
    console.log('  Total Users:', metrics.ga4.overall.totalUsers.toLocaleString());
    console.log('  Total Sessions:', metrics.ga4.overall.totalSessions.toLocaleString());
    console.log('  Avg Session Duration:', metrics.ga4.overall.avgSessionDuration, 'seconds');
    console.log('  Bounce Rate:', metrics.ga4.overall.bounceRate + '%');
    console.log('  Total Conversions:', metrics.ga4.overall.totalConversions);
    console.log('\n  Top Traffic Sources:');
    metrics.ga4.trafficSources.slice(0, 5).forEach((source, i) => {
      console.log(`    ${i + 1}. ${source.channel}: ${source.sessions.toLocaleString()} sessions`);
    });
    console.log(`\n  Top Blog Posts: ${metrics.ga4.topBlogPosts.length} tracked`);
  } else {
    console.log('\n❌ GA4 Error:', metrics.ga4.error);
  }

  if (!metrics.gsc.error) {
    console.log('\n🔍 Google Search Console:');
    console.log('  Total Impressions:', metrics.gsc.overall.totalImpressions.toLocaleString());
    console.log('  Total Clicks:', metrics.gsc.overall.totalClicks.toLocaleString());
    console.log('  Avg CTR:', metrics.gsc.overall.avgCTR + '%');
    console.log('  Avg Position:', metrics.gsc.overall.avgPosition);
    console.log(`\n  Top Queries: ${metrics.gsc.topQueries.length} tracked`);
    console.log(`  Top Blog Pages: ${metrics.gsc.topBlogPages.length} tracked`);
  } else {
    console.log('\n❌ GSC Error:', metrics.gsc.error);
  }

  console.log('\n═'.repeat(60));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchSiteMetrics()
    .then(() => {
      console.log('\n✨ Done! Site metrics saved to temp-files/site-metrics.json');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error.message);
      process.exit(1);
    });
}

export { fetchSiteMetrics };
