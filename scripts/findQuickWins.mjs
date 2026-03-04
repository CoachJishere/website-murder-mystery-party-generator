#!/usr/bin/env node

/**
 * Quick Wins Finder - Identify top SEO opportunities
 *
 * Finds blog posts with:
 * 1. High impressions but 0 clicks (CTR fix needed)
 * 2. Top 10 ranking but low CTR (title/description rewrite)
 * 3. Page 2 ranking with decent impressions (push to page 1)
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function getBlogPostMetrics(webmasters) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30);

  const response = await webmasters.searchanalytics.query({
    siteUrl: 'https://www.mysterymaker.party/',
    requestBody: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      dimensions: ['page'],
      dimensionFilterGroups: [{
        filters: [{
          dimension: 'page',
          operator: 'contains',
          expression: '/blog/'
        }]
      }],
      rowLimit: 1000
    }
  });

  return response.data.rows || [];
}

async function main() {
  console.log('🔍 Finding Quick Win Opportunities...\n');

  const webmasters = await getGSCClient();
  const blogPosts = await getBlogPostMetrics(webmasters);

  // Category 1: High impressions, 0 clicks (CTR disaster)
  const highImpressionsNoClicks = blogPosts
    .filter(post => post.impressions >= 10 && post.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  // Category 2: Page 1 (pos 1-10) but low CTR (<5%)
  const page1LowCTR = blogPosts
    .filter(post => post.position <= 10 && post.ctr < 0.05 && post.impressions >= 10)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10);

  // Category 3: Page 2 (pos 11-20) with decent impressions (push to page 1)
  const page2Pushable = blogPosts
    .filter(post => post.position > 10 && post.position <= 20 && post.impressions >= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  // Category 4: Best performers (high clicks, good CTR)
  const topPerformers = blogPosts
    .filter(post => post.clicks >= 3)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Print results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 QUICK WIN #1: High Impressions, Zero Clicks (Fix CTR)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Action: Rewrite title + meta description to improve CTR\n');

  if (highImpressionsNoClicks.length === 0) {
    console.log('✅ None found - all posts with impressions have at least 1 click!\n');
  } else {
    highImpressionsNoClicks.forEach((post, i) => {
      const url = new URL(post.keys[0]);
      console.log(`${i + 1}. ${url.pathname}`);
      console.log(`   Impressions: ${post.impressions} | Position: ${post.position.toFixed(1)} | CTR: 0.00%\n`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🥇 QUICK WIN #2: Page 1 Rankings with Low CTR');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Action: Rewrite title to be more click-worthy (you are already ranking!)\n');

  if (page1LowCTR.length === 0) {
    console.log('✅ None found - all page 1 posts have good CTR!\n');
  } else {
    page1LowCTR.forEach((post, i) => {
      const url = new URL(post.keys[0]);
      console.log(`${i + 1}. ${url.pathname}`);
      console.log(`   Position: ${post.position.toFixed(1)} | Impressions: ${post.impressions} | CTR: ${(post.ctr * 100).toFixed(2)}%\n`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 QUICK WIN #3: Page 2 Rankings (Push to Page 1)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Action: Apply Victorian optimization template to push into top 10\n');

  if (page2Pushable.length === 0) {
    console.log('⚠️  None found - not many posts ranking on page 2\n');
  } else {
    page2Pushable.forEach((post, i) => {
      const url = new URL(post.keys[0]);
      console.log(`${i + 1}. ${url.pathname}`);
      console.log(`   Position: ${post.position.toFixed(1)} | Impressions: ${post.impressions} | Clicks: ${post.clicks}\n`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('⭐ Top Performers (Already Working Well)');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (topPerformers.length === 0) {
    console.log('⚠️  No posts with 3+ clicks in the last 30 days\n');
  } else {
    topPerformers.forEach((post, i) => {
      const url = new URL(post.keys[0]);
      console.log(`${i + 1}. ${url.pathname}`);
      console.log(`   Clicks: ${post.clicks} | Impressions: ${post.impressions} | CTR: ${(post.ctr * 100).toFixed(2)}% | Position: ${post.position.toFixed(1)}\n`);
    });
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total blog posts in GSC: ${blogPosts.length}`);
  console.log(`High impressions, 0 clicks: ${highImpressionsNoClicks.length}`);
  console.log(`Page 1 low CTR: ${page1LowCTR.length}`);
  console.log(`Page 2 pushable: ${page2Pushable.length}`);
  console.log(`Top performers (3+ clicks): ${topPerformers.length}\n`);

  // Save to file
  const output = {
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    },
    summary: {
      totalPosts: blogPosts.length,
      highImpressionsNoClicks: highImpressionsNoClicks.length,
      page1LowCTR: page1LowCTR.length,
      page2Pushable: page2Pushable.length,
      topPerformers: topPerformers.length
    },
    opportunities: {
      highImpressionsNoClicks,
      page1LowCTR,
      page2Pushable,
      topPerformers
    }
  };

  const outputPath = path.join(__dirname, '../temp-files/quick-wins.json');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ Full data saved to: ${outputPath}\n`);
}

main().catch(console.error);
