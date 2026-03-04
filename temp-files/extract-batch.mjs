import { readFileSync, writeFileSync } from 'fs';

const posts = JSON.parse(readFileSync('temp-files/posts-to-translate-de.json', 'utf8'));

const startIndex = parseInt(process.argv[2]) - 1; // 1-based to 0-based
const count = parseInt(process.argv[3]) || 5;

const batch = posts.slice(startIndex, startIndex + count);

console.log(`Extracting posts ${startIndex + 1} to ${startIndex + batch.length}:`);
batch.forEach((p, i) => {
  console.log(`  ${startIndex + i + 1}. ${p.slug}`);
});

const outputFile = `temp-files/batch-de-${startIndex + 1}-to-${startIndex + batch.length}.json`;
writeFileSync(outputFile, JSON.stringify(batch, null, 2));

console.log(`\n✅ Saved to ${outputFile}`);
