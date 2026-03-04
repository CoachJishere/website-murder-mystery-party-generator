import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('french-batch-2-source-posts.json', 'utf-8'));

// Extract each post individually
data.forEach((post, index) => {
  const postNumber = index + 11; // Posts 11-20
  writeFileSync(`french-batch-2-post-${postNumber}-source.json`, JSON.stringify(post, null, 2));
  console.log(`Extracted post ${postNumber}: ${post.title || 'Unknown'}`);
});

console.log(`\nTotal posts extracted: ${data.length}`);
