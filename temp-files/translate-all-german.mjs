import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🇩🇪 GERMAN TRANSLATION - ALL 47 POSTS');
console.log('='.repeat(70));

const posts = JSON.parse(readFileSync('./posts-to-translate-de.json', 'utf8'));
console.log(`\n📝 Total posts to translate: ${posts.length}`);
console.log(`📊 Processing in batches of 10\n`);

const batches = [
  { start: 0, end: 10, name: 'Batch 1' },
  { start: 10, end: 20, name: 'Batch 2' },
  { start: 20, end: 30, name: 'Batch 3' },
  { start: 30, end: 40, name: 'Batch 4' },
  { start: 40, end: 47, name: 'Batch 5 (final 7)' }
];

let totalInserted = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const batch of batches) {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀 ${batch.name}: Processing posts ${batch.start + 1} to ${batch.end}`);
  console.log('='.repeat(70));

  try {
    const output = execSync(
      `node translate-german-batch.mjs ${batch.start} ${batch.end}`,
      {
        encoding: 'utf8',
        stdio: 'inherit'
      }
    );

    console.log(`\n✅ ${batch.name} completed`);

  } catch (error) {
    console.error(`\n❌ ${batch.name} failed: ${error.message}`);
    totalErrors++;
  }

  // Delay between batches
  if (batch !== batches[batches.length - 1]) {
    console.log('\n⏸️  Waiting 5 seconds before next batch...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

console.log('\n' + '='.repeat(70));
console.log('🎉 ALL BATCHES COMPLETE');
console.log('='.repeat(70));
console.log(`\n📊 Check individual batch summaries above for details`);
console.log(`📁 Translation files saved as: translations-de-batch-*.json\n`);
