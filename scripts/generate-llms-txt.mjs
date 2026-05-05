/**
 * Generate public/llms.txt from currently published blog posts in Supabase.
 * Posts are grouped by thematic cluster (from cross_link_map.json).
 *
 * Usage: node scripts/generate-llms-txt.mjs
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 *
 * Output: public/llms.txt (served at mysterymaker.party/llms.txt)
 */

import { createClient } from './_supabase-node.mjs';
import { readFileSync, writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITE_URL = 'https://www.mysterymaker.party';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const crossLinkMap = JSON.parse(readFileSync('cross_link_map.json', 'utf8'));

// Cluster display names + order
const CLUSTER_META = {
  pillar: { name: 'Pillar Guides', order: 1 },
  ai_generator: { name: 'AI Murder Mystery Generator', order: 2 },
  how_to_host: { name: 'How to Host a Murder Mystery (by Theme)', order: 3 },
  ideas_listicle: { name: 'Theme Ideas & Inspiration', order: 4 },
  theme_genre: { name: 'Themes by Genre', order: 5 },
  theme_period: { name: 'Themes by Time Period', order: 6 },
  theme_setting: { name: 'Themes by Setting', order: 7 },
  audience: { name: 'By Audience (Adults, Kids, Couples, Corporate)', order: 8 },
  group_size: { name: 'By Group Size', order: 9 },
  format: { name: 'By Format (Dinner, Cocktail, Virtual, Outdoor)', order: 10 },
  rules_planning: { name: 'Rules & Planning', order: 11 },
  logistics: { name: 'Logistics (Food, Costumes, Decor, Invitations)', order: 12 },
  character_role: { name: 'Character & Role Guides', order: 13 },
  how_to_fix: { name: 'Troubleshooting Common Problems', order: 14 },
  comparison: { name: 'Kits, Tools & Comparisons', order: 15 },
  adjacent: { name: 'Related Party Ideas', order: 16 }
};

async function main() {
  // Fetch all published EN posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('slug, title, meta_description')
    .eq('language', 'en')
    .eq('status', 'published')
    .order('slug');

  if (error) {
    console.error('Failed to fetch posts:', error.message);
    process.exit(1);
  }

  console.log(`Found ${posts.length} published EN posts`);

  // Group by cluster
  const byCluster = {};
  const uncategorized = [];

  for (const post of posts) {
    const entry = crossLinkMap[post.slug];
    let clusters = entry?.cluster;
    if (!clusters) {
      uncategorized.push(post);
      continue;
    }
    if (!Array.isArray(clusters)) clusters = [clusters];

    // Use the first cluster for primary grouping
    const primaryCluster = clusters[0];
    if (!byCluster[primaryCluster]) byCluster[primaryCluster] = [];
    byCluster[primaryCluster].push(post);
  }

  // Build llms.txt content
  let output = '';
  output += '# Mystery Maker — Murder Mystery Party Guides & Ideas\n\n';
  output += '> Mystery Maker is an AI-powered murder mystery party generator and comprehensive content resource. This site offers custom murder mystery party scripts, themes, hosting guides, and troubleshooting help for parties of any size, theme, or audience.\n\n';
  output += `This index organizes ${posts.length} published guides by topic cluster. All guides are available in 13 languages (EN, ES, FR, DE, IT, DA, FI, NL, SV, PT, KO, JA, ZH-CN) at \`/{lang}/blog/{slug}\` — the EN versions are listed below.\n\n`;
  output += `**Generator**: [Create a custom murder mystery party](${SITE_URL}/)\n`;
  output += `**Blog index**: [All published posts](${SITE_URL}/blog)\n\n`;

  // Sort clusters by defined order
  const sortedClusters = Object.keys(byCluster).sort((a, b) => {
    const orderA = CLUSTER_META[a]?.order ?? 99;
    const orderB = CLUSTER_META[b]?.order ?? 99;
    return orderA - orderB;
  });

  for (const cluster of sortedClusters) {
    const name = CLUSTER_META[cluster]?.name || cluster;
    const clusterPosts = byCluster[cluster];
    output += `## ${name}\n\n`;
    for (const post of clusterPosts) {
      const desc = (post.meta_description || '').trim().replace(/\s+/g, ' ').slice(0, 160);
      output += `- [${post.title}](${SITE_URL}/blog/${post.slug})`;
      if (desc) output += `: ${desc}`;
      output += '\n';
    }
    output += '\n';
  }

  if (uncategorized.length > 0) {
    output += `## Other Guides\n\n`;
    for (const post of uncategorized) {
      const desc = (post.meta_description || '').trim().replace(/\s+/g, ' ').slice(0, 160);
      output += `- [${post.title}](${SITE_URL}/blog/${post.slug})`;
      if (desc) output += `: ${desc}`;
      output += '\n';
    }
    output += '\n';
  }

  writeFileSync('public/llms.txt', output);
  console.log(`Wrote public/llms.txt (${output.length} chars, ${posts.length} posts across ${sortedClusters.length} clusters)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
