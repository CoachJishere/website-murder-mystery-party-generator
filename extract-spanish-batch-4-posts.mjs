import fs from 'fs';

const data = JSON.parse(fs.readFileSync('spanish-batch-4-source-posts.json', 'utf-8'));

// Extract each post individually
data.forEach((post, index) => {
  const postNumber = 31 + index;
  const outputFile = `spanish-batch-4-post-${postNumber}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(post, null, 2));
  console.log(`Extracted Post ${postNumber}: ${post.title}`);
});

console.log(`\nTotal posts extracted: ${data.length}`);
