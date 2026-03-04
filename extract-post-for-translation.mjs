import { readFileSync, writeFileSync } from 'fs';

const sourceFile = process.argv[2];
const postIndex = parseInt(process.argv[3]);
const outputFile = process.argv[4];

const posts = JSON.parse(readFileSync(sourceFile, 'utf-8'));
const post = posts[postIndex];

if (!post) {
  console.error(`Post at index ${postIndex} not found`);
  process.exit(1);
}

writeFileSync(outputFile, JSON.stringify(post, null, 2));
console.log(`Extracted post ${postIndex}: ${post.title}`);
