/**
 * This script will be run by Claude to generate remaining Portuguese translations
 * It processes posts 2-50 in batches
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const batchNum = parseInt(process.argv[2]) || 1;
const batchSize = 5;

console.log(`\n📦 Processing Batch #${batchNum} (posts ${(batchNum-1)*batchSize + 1}-${batchNum*batchSize})\n`);

const allPosts = JSON.parse(readFileSync('temp-files/posts-to-translate-pt.json', 'utf-8'));

// Get posts for this batch (skip first post since it's already done)
const startIdx = (batchNum - 1) * batchSize + (batchNum === 1 ? 1 : 0); // Skip post 1 in batch 1
const endIdx = Math.min(startIdx + batchSize, allPosts.length);
const batchPosts = allPosts.slice(startIdx, endIdx);

console.log(`Processing ${batchPosts.length} posts:\n`);
batchPosts.forEach((p, i) => {
  console.log(`${startIdx + i + 1}. ${p.slug}`);
});

console.log(`\n📄 Save translated JSON files to: temp-files/pt-translations/`);
console.log(`   Format: ${String(startIdx + 1).padStart(2, '0')}-translated.json\n`);

// Export batch details for Claude to process
writeFileSync(
  `temp-files/pt-batch-${batchNum}.json`,
  JSON.stringify(batchPosts, null, 2)
);

console.log(`✅ Batch ${batchNum} data saved to temp-files/pt-batch-${batchNum}.json`);
console.log(`\nNext: Translate these ${batchPosts.length} posts to Portuguese`);
