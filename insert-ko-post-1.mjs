import fetch from 'node-fetch';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function main() {
  console.log('Loading Korean translation and English source...\n');

  const translation = JSON.parse(readFileSync('ko-translation-post-1.json', 'utf8'));
  const englishPost = JSON.parse(readFileSync('ko-source-1920s-speakeasy-murder-mystery-party-guide.json', 'utf8'));

  const koreanPost = {
    title: translation.title,
    slug: '1920s-speakeasy-murder-mystery-party-guide-ko',
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'ko',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: englishPost.tags,
    theme: englishPost.theme,
    featured_image_url: englishPost.featured_image_url,
    published_at: new Date().toISOString()
  };

  console.log('Inserting Korean post 1: 1920s Speakeasy...');
  console.log(`  Title: ${koreanPost.title}`);
  console.log(`  Slug: ${koreanPost.slug}`);
  console.log(`  Content length: ${koreanPost.content.length} chars\n`);

  const response = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(koreanPost)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to insert: ${error}`);
  }

  const inserted = await response.json();
  console.log('✅ POST 1 INSERTED SUCCESSFULLY!');
  console.log(`  ID: ${inserted[0].id}`);
  console.log(`  Title: ${inserted[0].title}`);
  console.log(`  Slug: ${inserted[0].slug}`);
  console.log(`  Language: ${inserted[0].language}`);
  console.log(`  Status: ${inserted[0].status}\n`);
}

main().catch(console.error);
