import { readFileSync } from 'fs';

const postIndex = parseInt(process.argv[2]) || 0;
const batch = JSON.parse(readFileSync('temp-files/italian_batch2.json', 'utf-8'));
const post = batch[postIndex];

if (!post) {
  console.error(`Post ${postIndex} not found`);
  process.exit(1);
}

console.log(JSON.stringify({
  index: postIndex,
  slug: post.slug,
  title: post.title,
  meta_description: post.meta_description,
  excerpt: post.excerpt,
  content_length: post.content.length,
  author_id: post.author_id,
  featured_image: post.featured_image,
  category_id: post.category_id,
  tags: post.tags,
  published_at: post.published_at
}, null, 2));
