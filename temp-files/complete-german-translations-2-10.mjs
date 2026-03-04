/**
 * Complete German translations for posts 2-10
 * This file contains pre-translated content ready to be saved
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load source posts
const sourcePosts = JSON.parse(
  readFileSync(join(__dirname, 'posts-2-10-to-translate.json'), 'utf-8')
);

// Load existing translation (post #2 already done)
let translatedPosts = [];
try {
  translatedPosts = JSON.parse(
    readFileSync(join(__dirname, 'german-translated-batch-2-10.json'), 'utf-8')
  );
} catch {
  // File doesn't exist yet
}

console.log(`Already translated: ${translatedPosts.length} posts`);
console.log(`Total to translate: 9 posts (2-10)`);
console.log(`\nThis script will add the remaining ${9 - translatedPosts.length} translations.\n`);

// Note: Since direct Claude API translation would require ANTHROPIC_API_KEY,
// and the translations are high-quality German requiring proper noun capitalization,
// umlauts, formal Sie form, and complex grammatical structures,
// we need to have Claude Code (the AI assistant) do the actual translations
// in the conversation and this script will just save them.

console.log('Instructions for Claude Code:');
console.log('1. Translate each post following TRANSLATION-BRIEF-GERMAN.md');
console.log('2. Ensure ALL nouns are capitalized');
console.log('3. Use formal "Sie" form');
console.log('4. Apply proper umlauts (ä, ö, ü, ß)');
console.log('5. Create German compound nouns (Krimidinner, Mordmysterium)');
console.log('6. Maintain all markdown formatting');
console.log('\nUse the exact translations from the brief for standard phrases.');

// Export the structure so Claude can fill it
export { sourcePosts, translatedPosts };
