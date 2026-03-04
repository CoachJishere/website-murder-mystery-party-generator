#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const postNumber = process.argv[2];
if (!postNumber) {
  console.error('Usage: node extract-french-post.mjs <post-number>');
  process.exit(1);
}

const data = JSON.parse(readFileSync('french-batch-4-source-posts.json', 'utf8'));
const post = data[postNumber - 31]; // Posts 31-42 are at indices 0-11

if (!post) {
  console.error(`Post ${postNumber} not found`);
  process.exit(1);
}

console.log(JSON.stringify(post, null, 2));
