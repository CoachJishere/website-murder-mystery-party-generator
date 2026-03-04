/**
 * Autonomous Google Search Console Data Fetcher
 *
 * This script pulls GSC metrics for the Victorian blog post and saves them
 * to a JSON file that Claude can read directly.
 *
 * Setup:
 * 1. Enable Google Search Console API in Google Cloud Console
 * 2. Create OAuth 2.0 credentials or service account
 * 3. Authorize the service account in GSC (Settings -> Users and permissions)
 * 4. Save credentials to .google-search-console-credentials.json
 * 5. Run: node scripts/fetchGSCMetrics.mjs
 */

import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  siteUrl: process.env.GSC_SITE_URL || 'https://mysterymaker.party',
  credentialsPath: join(__dirname, '../.google-search-console-credentials.json'),
  victorianPostUrl: 'https://mysterymaker.party/blog/en/how-to-host-a-victorian-murder-mystery-party',
  outputPath: join(__dirname, '../temp-files/gsc-metrics.json'),
  daysBack: 7
};

async function fetchGSCMetrics() {
  try {
    console.log('🔍 Fetching Google Search Console metrics...');

    // Authenticate with service account
    const auth = new google.auth.GoogleAuth({
      keyFile: CONFIG.credentialsPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const authClient = await auth.getClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - CONFIG.daysBack);

    // Query GSC for Victorian post metrics
    const response = await searchconsole.searchanalytics.query({
      siteUrl: CONFIG.siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['date', 'query'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'page',
            operator: 'equals',
            expression: CONFIG.victorianPostUrl
          }]
        }],
        rowLimit: 25000,
        aggregationType: 'auto'
      }
    });

    // Process results
    const metrics = {
      lastUpdated: new Date().toISOString(),
      postUrl: CONFIG.victorianPostUrl,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate)
      },
      dailyMetrics: {},
      topQueries: [],
      summary: {
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: 0,
        avgPosition: 0
      }
    };

    // Parse GSC response
    const rows = response.data.rows || [];

    rows.forEach(row => {
      const date = row.keys[0];
      const query = row.keys[1];
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      // Aggregate by date
      if (!metrics.dailyMetrics[date]) {
        metrics.dailyMetrics[date] = {
          date,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          position: 0,
          queryCount: 0
        };
      }

      metrics.dailyMetrics[date].impressions += impressions;
      metrics.dailyMetrics[date].clicks += clicks;
      metrics.dailyMetrics[date].ctr += ctr;
      metrics.dailyMetrics[date].position += position;
      metrics.dailyMetrics[date].queryCount += 1;

      // Track top queries
      metrics.topQueries.push({
        query,
        clicks,
        impressions,
        ctr: Math.round(ctr * 10000) / 100, // Convert to percentage
        position: Math.round(position * 10) / 10
      });

      // Update summary
      metrics.summary.totalImpressions += impressions;
      metrics.summary.totalClicks += clicks;
    });

    // Convert dailyMetrics object to array and calculate averages
    metrics.dailyMetrics = Object.values(metrics.dailyMetrics).map(day => ({
      date: day.date,
      impressions: day.impressions,
      clicks: day.clicks,
      ctr: Math.round((day.ctr / day.queryCount) * 10000) / 100,
      position: Math.round((day.position / day.queryCount) * 10) / 10
    }));

    // Sort top queries by impressions
    metrics.topQueries.sort((a, b) => b.impressions - a.impressions);
    metrics.topQueries = metrics.topQueries.slice(0, 10); // Keep top 10

    // Calculate summary averages
    const totalRows = rows.length || 1;
    metrics.summary.avgCTR = Math.round((metrics.summary.totalClicks / metrics.summary.totalImpressions) * 10000) / 100;
    metrics.summary.avgPosition = Math.round(
      (rows.reduce((sum, row) => sum + row.position, 0) / totalRows) * 10
    ) / 10;

    // Save to file
    writeFileSync(CONFIG.outputPath, JSON.stringify(metrics, null, 2));

    console.log('✅ GSC metrics saved to:', CONFIG.outputPath);
    console.log('\n📊 Summary:');
    console.log('Total Impressions:', metrics.summary.totalImpressions);
    console.log('Total Clicks:', metrics.summary.totalClicks);
    console.log('Avg CTR:', metrics.summary.avgCTR + '%');
    console.log('Avg Position:', metrics.summary.avgPosition);
    console.log('Top Query:', metrics.topQueries[0]?.query || 'N/A');

    return metrics;

  } catch (error) {
    console.error('❌ Error fetching GSC metrics:', error.message);

    // Create placeholder file
    const placeholderMetrics = {
      error: error.message,
      lastUpdated: new Date().toISOString(),
      postUrl: CONFIG.victorianPostUrl,
      note: 'Unable to fetch GSC metrics. Check credentials and configuration.',
      setup: {
        step1: 'Enable Google Search Console API in Google Cloud Console',
        step2: 'Create service account and download credentials JSON',
        step3: 'Add service account email to GSC property (Settings → Users)',
        step4: 'Save credentials to .google-search-console-credentials.json',
        step5: 'Set GSC_SITE_URL environment variable'
      }
    };

    writeFileSync(CONFIG.outputPath, JSON.stringify(placeholderMetrics, null, 2));
    throw error;
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchGSCMetrics()
    .then(() => {
      console.log('\n✨ Done! Claude can now read temp-files/gsc-metrics.json');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error.message);
      process.exit(1);
    });
}

export { fetchGSCMetrics };
