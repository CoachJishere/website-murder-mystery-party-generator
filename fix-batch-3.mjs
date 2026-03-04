import { readFileSync, writeFileSync } from 'fs';

// Read the escaped content
const escapedContent = readFileSync('german-batch-3-source-posts.json', 'utf-8');

// Parse it - it's a JSON-encoded string
const posts = JSON.parse(escapedContent);

// Write it properly
writeFileSync('german-batch-3-source-posts.json', JSON.stringify(posts, null, 2));

console.log(`Total posts: ${posts.length}`);
posts.forEach((post, idx) => {
  const num = idx + 21;
  const title = post.title.length > 60 ? post.title.substring(0, 60) + '...' : post.title;
  console.log(`${num}: ${title}`);
});
