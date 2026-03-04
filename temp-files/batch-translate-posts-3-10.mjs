/**
 * Batch German translations for posts 3-10
 * Posts are ready to be inserted into Supabase
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load source posts and existing translation
const sourcePosts = JSON.parse(readFileSync(join(__dirname, 'posts-2-10-to-translate.json'), 'utf-8'));
const existingTranslations = JSON.parse(readFileSync(join(__dirname, 'german-translated-batch-2-10.json'), 'utf-8'));

console.log(`Source posts: ${sourcePosts.length}`);
console.log(`Existing translations: ${existingTranslations.length}`);
console.log(`\nPosts to translate: ${sourcePosts.length - existingTranslations.length}`);

// We need Claude Code to provide the actual translations
// This script will be used once translations are complete

console.log('\nStatus:');
sourcePosts.forEach((post, i) => {
  const postNum = i + 2;
  const isTranslated = existingTranslations.some(t => t.slug === post.slug);
  console.log(`Post ${postNum}: ${post.slug.substring(0, 40)}... ${isTranslated ? '✓' : '○'}`);
});

export { sourcePosts, existingTranslations };
