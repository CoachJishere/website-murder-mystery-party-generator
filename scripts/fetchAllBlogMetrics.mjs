/**
 * All Blog Posts Analytics Fetcher
 *
 * This script fetches GA4 and GSC metrics for ALL blog posts in the database.
 * It queries Supabase for published posts, then pulls analytics for each one.
 *
 * WARNING: This makes many API calls and may take several minutes to complete.
 * Rate limiting and batching strategies are used to avoid API quotas.
 *
 * Run: node scripts/fetchAllBlogMetrics.mjs
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { createClient } from './_supabase-node.mjs';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  propertyId: process.env.GA4_PROPERTY_ID || '504442584',
  siteUrl: process.env.GSC_SITE_URL || 'https://www.mysterymaker.party/',
  supabaseUrl: 'https://mhfikaomkmqcndqfohbp.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w',
  gaCredentialsPath: join(__dirname, '../.google-analytics-credentials.json'),
  gscCredentialsPath: join(__dirname, '../.google-search-console-credentials.json'),
  outputPath: join(__dirname, '../temp-files/all-blog-metrics.json'),
  daysBack: 30,
  batchSize: 10, // Process posts in batches
  delayBetweenBatches: 2000, // 2 seconds delay between batches
  delayBetweenRequests: 100 // 100ms delay between individual requests
};

async function fetchAllBlogMetrics() {
  console.log('🚀 Starting comprehensive blog analytics fetch...\n');
  console.log('⚠️  This will take several minutes due to API rate limiting.\n');

  const startTime = Date.now();

  // Initialize clients
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  const analyticsDataClient = new BetaAnalyticsDataClient({
    keyFilename: CONFIG.gaCredentialsPath
  });
  const auth = new google.auth.GoogleAuth({
    keyFile: CONFIG.gscCredentialsPath,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });
  const authClient = await auth.getClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  try {
    // Step 1: Fetch all blog posts from Supabase
    console.log('📚 Fetching blog posts from Supabase...');
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, title, language, post_date, status')
      .eq('status', 'published')
      .order('post_date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Found ${posts.length} published blog posts\n`);

    // Step 2: Process posts in batches
    const results = {
      lastUpdated: new Date().toISOString(),
      dateRange: {
        start: formatDate(getStartDate()),
        end: formatDate(new Date())
      },
      totalPosts: posts.length,
      postsWithTraffic: 0,
      postsWithConversions: 0,
      posts: [],
      summary: {
        totalPageviews: 0,
        totalUsers: 0,
        totalConversions: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgPosition: 0
      },
      errors: []
    };

    let processed = 0;
    const batches = Math.ceil(posts.length / CONFIG.batchSize);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStart = batchIndex * CONFIG.batchSize;
      const batchEnd = Math.min(batchStart + CONFIG.batchSize, posts.length);
      const batch = posts.slice(batchStart, batchEnd);

      console.log(`📊 Processing batch ${batchIndex + 1}/${batches} (posts ${batchStart + 1}-${batchEnd})...`);

      for (const post of batch) {
        try {
          const isEnglish = post.language === 'en';
          const postUrl = isEnglish
            ? `${CONFIG.siteUrl}blog/${post.slug}`
            : `${CONFIG.siteUrl}${post.language}/blog/${post.slug}`;
          const pagePath = isEnglish
            ? `/blog/${post.slug}`
            : `/${post.language}/blog/${post.slug}`;

          // Fetch GA4 metrics
          const ga4Metrics = await fetchGA4MetricsForPost(analyticsDataClient, pagePath);
          await sleep(CONFIG.delayBetweenRequests);

          // Fetch GSC metrics
          const gscMetrics = await fetchGSCMetricsForPost(searchconsole, postUrl);
          await sleep(CONFIG.delayBetweenRequests);

          // Calculate priority score
          const conversionRate = ga4Metrics.pageviews > 0
            ? (ga4Metrics.conversions / ga4Metrics.pageviews) * 100
            : 0;
          const positionScore = 100 - Math.min(gscMetrics.position, 100);
          const priorityScore = (ga4Metrics.pageviews * (1 + conversionRate)) * (positionScore / 100);

          const postMetrics = {
            slug: post.slug,
            title: post.title,
            language: post.language,
            postDate: post.post_date,
            url: postUrl,
            ga4: ga4Metrics,
            gsc: gscMetrics,
            priorityScore: Math.round(priorityScore * 100) / 100
          };

          results.posts.push(postMetrics);

          // Update summary stats
          if (ga4Metrics.pageviews > 0) results.postsWithTraffic++;
          if (ga4Metrics.conversions > 0) results.postsWithConversions++;
          results.summary.totalPageviews += ga4Metrics.pageviews;
          results.summary.totalConversions += ga4Metrics.conversions;
          results.summary.totalImpressions += gscMetrics.impressions;
          results.summary.totalClicks += gscMetrics.clicks;

          processed++;
          process.stdout.write(`  ✓ ${processed}/${posts.length} posts processed\r`);

        } catch (error) {
          console.error(`\n  ❌ Error processing ${post.slug}:`, error.message);
          results.errors.push({
            slug: post.slug,
            error: error.message
          });
        }
      }

      // Delay between batches
      if (batchIndex < batches - 1) {
        console.log(`\n  ⏳ Waiting ${CONFIG.delayBetweenBatches}ms before next batch...\n`);
        await sleep(CONFIG.delayBetweenBatches);
      }
    }

    console.log(`\n\n✅ Processed all ${processed} posts`);

    // Calculate average position
    const postsWithPosition = results.posts.filter(p => p.gsc.position > 0);
    results.summary.avgPosition = postsWithPosition.length > 0
      ? Math.round((postsWithPosition.reduce((sum, p) => sum + p.gsc.position, 0) / postsWithPosition.length) * 10) / 10
      : 0;

    // Sort posts by priority score (descending)
    results.posts.sort((a, b) => b.priorityScore - a.priorityScore);

    // Save to file
    writeFileSync(CONFIG.outputPath, JSON.stringify(results, null, 2));

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n💾 All blog metrics saved to: ${CONFIG.outputPath}`);
    console.log(`⏱️  Total time: ${duration} seconds`);

    // Print summary
    printSummary(results);

    return results;

  } catch (error) {
    console.error('❌ Fatal error:', error.message);

    // Create placeholder file
    const placeholder = {
      error: error.message,
      lastUpdated: new Date().toISOString(),
      note: 'Unable to fetch blog metrics. Check credentials and configuration.'
    };

    writeFileSync(CONFIG.outputPath, JSON.stringify(placeholder, null, 2));
    throw error;
  }
}

async function fetchGA4MetricsForPost(client, pagePath) {
  const startDate = formatDate(getStartDate());
  const endDate = formatDate(new Date());

  try {
    const [response] = await client.runReport({
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
            matchType: 'BEGINS_WITH',
            value: pagePath
          }
        }
      }
    });

    const rows = response.rows || [];
    if (rows.length === 0) {
      return {
        pageviews: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
        conversions: 0
      };
    }

    // Aggregate across path variants (with/without trailing slash)
    let totalPageviews = 0;
    let totalConversions = 0;
    let weightedTime = 0;
    let weightedBounce = 0;
    for (const row of rows) {
      const pv = parseInt(row.metricValues[0].value || 0);
      totalPageviews += pv;
      weightedTime += parseFloat(row.metricValues[1].value || 0) * pv;
      weightedBounce += parseFloat(row.metricValues[2].value || 0) * pv;
      totalConversions += parseInt(row.metricValues[3].value || 0);
    }

    return {
      pageviews: totalPageviews,
      avgTimeOnPage: totalPageviews > 0 ? Math.round(weightedTime / totalPageviews) : 0,
      bounceRate: totalPageviews > 0 ? Math.round((weightedBounce / totalPageviews) * 100) / 100 : 0,
      conversions: totalConversions
    };
  } catch (error) {
    console.error(`GA4 error for ${pagePath}:`, error.message);
    return { pageviews: 0, avgTimeOnPage: 0, bounceRate: 0, conversions: 0 };
  }
}

async function fetchGSCMetricsForPost(searchconsole, postUrl) {
  const startDate = formatDate(getStartDate());
  const endDate = formatDate(new Date());

  try {
    // Try both with and without trailing slash
    const urls = [postUrl, postUrl.endsWith('/') ? postUrl.slice(0, -1) : postUrl + '/'];
    let totalImpressions = 0, totalClicks = 0, weightedPos = 0, weightedCtr = 0;

    for (const url of urls) {
      const response = await searchconsole.searchanalytics.query({
        siteUrl: CONFIG.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'page',
              operator: 'equals',
              expression: url
            }]
          }],
          rowLimit: 1
        }
      });

      const row = response.data.rows?.[0];
      if (row) {
        totalImpressions += row.impressions || 0;
        totalClicks += row.clicks || 0;
        weightedPos += (row.position || 0) * (row.impressions || 0);
        weightedCtr += (row.ctr || 0) * (row.impressions || 0);
      }
      await sleep(CONFIG.delayBetweenRequests);
    }

    if (totalImpressions === 0) {
      return {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        position: 0
      };
    }

    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Math.round((weightedCtr / totalImpressions) * 10000) / 100,
      position: Math.round((weightedPos / totalImpressions) * 10) / 10
    };
  } catch (error) {
    console.error(`GSC error for ${postUrl}:`, error.message);
    return { impressions: 0, clicks: 0, ctr: 0, position: 0 };
  }
}

function getStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - CONFIG.daysBack);
  return date;
}

function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printSummary(results) {
  console.log('\n📈 ALL BLOG POSTS ANALYTICS SUMMARY');
  console.log('═'.repeat(60));
  console.log('\n📊 Overall Statistics:');
  console.log('  Total Posts Analyzed:', results.totalPosts);
  console.log('  Posts with Traffic:', results.postsWithTraffic);
  console.log('  Posts with Conversions:', results.postsWithConversions);
  console.log('  Errors Encountered:', results.errors.length);

  console.log('\n📈 Aggregate Metrics:');
  console.log('  Total Pageviews:', results.summary.totalPageviews.toLocaleString());
  console.log('  Total Conversions:', results.summary.totalConversions.toLocaleString());
  console.log('  Total Impressions:', results.summary.totalImpressions.toLocaleString());
  console.log('  Total Clicks:', results.summary.totalClicks.toLocaleString());
  console.log('  Avg Position:', results.summary.avgPosition);

  console.log('\n🏆 Top 10 Posts by Priority Score:');
  results.posts.slice(0, 10).forEach((post, i) => {
    console.log(`  ${i + 1}. [${post.language}] ${post.title.substring(0, 50)}...`);
    console.log(`     Priority: ${post.priorityScore} | Views: ${post.ga4.pageviews} | Pos: ${post.gsc.position}`);
  });

  console.log('\n═'.repeat(60));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllBlogMetrics()
    .then(() => {
      console.log('\n✨ Done! All blog metrics saved to temp-files/all-blog-metrics.json');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error.message);
      process.exit(1);
    });
}

export { fetchAllBlogMetrics };
