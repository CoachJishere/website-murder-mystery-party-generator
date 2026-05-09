/**
 * Autonomous Google Analytics Data Fetcher
 *
 * This script pulls GA4 metrics for the Victorian blog post and saves them
 * to a JSON file that Claude can read directly.
 *
 * Setup:
 * 1. Enable Google Analytics Data API in Google Cloud Console
 * 2. Create a service account and download credentials JSON
 * 3. Add service account email to GA4 property (Viewer role)
 * 4. Save credentials to .google-analytics-credentials.json
 * 5. Run: node scripts/fetchGAMetrics.mjs
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  propertyId: process.env.GA4_PROPERTY_ID || 'YOUR_GA4_PROPERTY_ID', // e.g., '123456789'
  credentialsPath: join(__dirname, '../.google-analytics-credentials.json'),
  victorianPostPath: '/blog/how-to-host-a-victorian-murder-mystery-party', // EN; non-EN would be /<lang>/blog/<slug>
  outputPath: join(__dirname, '../temp-files/ga-metrics.json'),
  daysBack: 7 // Pull last 7 days of data
};

async function fetchGAMetrics() {
  try {
    console.log('🔍 Fetching Google Analytics metrics...');

    // Initialize GA4 client with service account credentials
    const analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: CONFIG.credentialsPath
    });

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - CONFIG.daysBack);

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate: formatDate(startDate),
          endDate: formatDate(today),
        },
      ],
      dimensions: [
        { name: 'date' },
        { name: 'pagePath' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' }, // Adjust based on your conversion events
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'EXACT',
            value: CONFIG.victorianPostPath,
          },
        },
      },
    });

    // Process and format results
    const metrics = {
      lastUpdated: new Date().toISOString(),
      postPath: CONFIG.victorianPostPath,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(today)
      },
      dailyMetrics: [],
      summary: {
        totalPageviews: 0,
        avgTimeOnPage: 0,
        avgBounceRate: 0,
        totalConversions: 0
      }
    };

    // Parse GA4 response
    response.rows?.forEach(row => {
      const date = row.dimensionValues[0].value;
      const pageviews = parseInt(row.metricValues[0].value);
      const avgDuration = parseFloat(row.metricValues[1].value);
      const bounceRate = parseFloat(row.metricValues[2].value);
      const conversions = parseInt(row.metricValues[3].value);

      metrics.dailyMetrics.push({
        date,
        pageviews,
        avgTimeOnPage: Math.round(avgDuration),
        bounceRate: Math.round(bounceRate * 100) / 100,
        conversions
      });

      // Update summary
      metrics.summary.totalPageviews += pageviews;
      metrics.summary.avgTimeOnPage += avgDuration;
      metrics.summary.avgBounceRate += bounceRate;
      metrics.summary.totalConversions += conversions;
    });

    // Calculate averages
    const rowCount = metrics.dailyMetrics.length || 1;
    metrics.summary.avgTimeOnPage = Math.round(metrics.summary.avgTimeOnPage / rowCount);
    metrics.summary.avgBounceRate = Math.round((metrics.summary.avgBounceRate / rowCount) * 100) / 100;

    // Save to file
    writeFileSync(CONFIG.outputPath, JSON.stringify(metrics, null, 2));

    console.log('✅ GA metrics saved to:', CONFIG.outputPath);
    console.log('\n📊 Summary:');
    console.log('Total Pageviews:', metrics.summary.totalPageviews);
    console.log('Avg Time on Page:', metrics.summary.avgTimeOnPage, 'seconds');
    console.log('Avg Bounce Rate:', metrics.summary.avgBounceRate + '%');
    console.log('Total Conversions:', metrics.summary.totalConversions);

    return metrics;

  } catch (error) {
    console.error('❌ Error fetching GA metrics:', error.message);

    // Create placeholder file so Claude knows what to expect
    const placeholderMetrics = {
      error: error.message,
      lastUpdated: new Date().toISOString(),
      postPath: CONFIG.victorianPostPath,
      note: 'Unable to fetch GA metrics. Check credentials and configuration.',
      setup: {
        step1: 'Enable Google Analytics Data API in Google Cloud Console',
        step2: 'Create service account and download credentials JSON',
        step3: 'Add service account email to GA4 property with Viewer role',
        step4: 'Save credentials to .google-analytics-credentials.json',
        step5: 'Set GA4_PROPERTY_ID environment variable'
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
  fetchGAMetrics()
    .then(() => {
      console.log('\n✨ Done! Claude can now read temp-files/ga-metrics.json');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error.message);
      process.exit(1);
    });
}

export { fetchGAMetrics };
