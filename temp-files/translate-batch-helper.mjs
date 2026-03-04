import { readFileSync, writeFileSync } from 'fs';

// Read command line args for batch number
const batchNumber = parseInt(process.argv[2] || '1');
const batchSize = 5;

const startIdx = (batchNumber - 1) * batchSize;
const endIdx = startIdx + batchSize;

// Read source posts
const posts = JSON.parse(readFileSync('temp-files/posts-to-translate-spanish.json', 'utf-8'));
const batch = posts.slice(startIdx, endIdx);

console.log(`\n${'='.repeat(60)}`);
console.log(`BATCH ${batchNumber}: Posts ${startIdx + 1}-${Math.min(endIdx, posts.length)} of ${posts.length}`);
console.log(`${'='.repeat(60)}\n`);

batch.forEach((post, idx) => {
  const globalIdx = startIdx + idx + 1;
  console.log(`${globalIdx}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Meta: ${post.meta_description}`);
  console.log(`   Content: ${post.content.length} chars`);
  console.log('');
});

// Save batch to separate file for processing
writeFileSync(
  `temp-files/batch-${batchNumber}-to-translate.json`,
  JSON.stringify(batch, null, 2)
);

console.log(`✅ Batch saved to temp-files/batch-${batchNumber}-to-translate.json`);
console.log(`\nNext: Translate these ${batch.length} posts and save to batch-${batchNumber}-translated.json`);
console.log(`Then run: node temp-files/merge-batch.mjs ${batchNumber}\n`);
