import { readFileSync, writeFileSync } from 'fs';

const posts = JSON.parse(readFileSync('german-batch-2-posts-53-57.json', 'utf8'));

// Extract each post
posts.forEach((post, index) => {
  const postNum = 53 + index;
  console.log(`Post ${postNum}: ${post.title}`);
  writeFileSync(`post-${postNum}-en.json`, JSON.stringify(post, null, 2));
});

console.log('\nExtracted 5 posts successfully');
