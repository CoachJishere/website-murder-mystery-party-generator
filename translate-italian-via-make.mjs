import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Make.com webhook URL for translations
const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/uannnuc9hc79vorh1iyxwb9t5lp484n3";

console.log(`\n${'='.repeat(80)}`);
console.log(`ITALIAN TRANSLATION VIA MAKE.COM (Posts 20-29)`);
console.log(`${'='.repeat(80)}\n`);

// Fetch posts 20-29
const { data: allPosts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const posts = allPosts.filter(p => p.content?.includes('*Published: February 16, 2026'));
const batch = posts.slice(19, 29);

console.log(`Found ${batch.length} posts to translate\n`);

// Translation instructions for Make.com
const translationInstructions = `
Translate to Italian with these requirements:

1. **E-E-A-T Compliance**: Maintain all expertise markers, author credentials, and trust signals
2. **Formal Register**: Use formal "Lei" form throughout
3. **Proper Accents**: Include all Italian accents (è, é, à, ì, ò, ù)
4. **Date Format**: Change "*Published: February 16, 2026*" to "*Pubblicato: 16 febbraio 2026*"
5. **SEO Preservation**: Keep all markdown formatting, links, and structure intact
6. **Cultural Adaptation**: Adapt idioms and cultural references appropriately for Italian readers
7. **Technical Terms**: Use appropriate Italian translations for murder mystery terminology

Generate Italian slug by:
- Translating title to Italian
- Converting to lowercase
- Removing accents
- Replacing spaces with hyphens
- Removing special characters
`;

for (let i = 0; i < batch.length; i++) {
  const post = batch[i];
  const postNumber = i + 20;

  console.log(`\n[${i + 1}/10] Processing: ${post.title}`);
  console.log(`Post #${postNumber}`);
  console.log(`Slug: ${post.slug}`);

  try {
    // Send to Make.com webhook for translation
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'translate_blog_post',
        target_language: 'it',
        instructions: translationInstructions,
        post: {
          slug: post.slug,
          title: post.title,
          content: post.content,
          meta_description: post.meta_description,
          category: post.category,
          read_time: post.read_time
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Make.com webhook failed: ${response.statusText}`);
    }

    const result = await response.json();

    console.log(`  ✓ Translation received from Make.com`);
    console.log(`  ✓ Italian title: ${result.translated_title || 'Processing...'}`);
    console.log(`  ✓ Italian slug: ${result.translated_slug || 'Processing...'}`);

    // Save translation locally
    const translationData = {
      original_slug: post.slug,
      original_title: post.title,
      ...result
    };

    fs.writeFileSync(
      `italian-translation-${postNumber}.json`,
      JSON.stringify(translationData, null, 2)
    );

    console.log(`  ✓ Saved to italian-translation-${postNumber}.json`);

    // Small delay between requests
    if (i < batch.length - 1) {
      console.log(`  ⏳ Waiting 3 seconds before next translation...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

  } catch (error) {
    console.error(`  ✗ ERROR: ${error.message}`);

    // Save post data for manual translation
    fs.writeFileSync(
      `italian-post-${postNumber}-FAILED.json`,
      JSON.stringify({
        index: postNumber,
        slug: post.slug,
        title: post.title,
        meta_description: post.meta_description,
        content: post.content,
        category: post.category,
        read_time: post.read_time,
        error: error.message
      }, null, 2)
    );
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`TRANSLATION PROCESS COMPLETE`);
console.log(`${'='.repeat(80)}\n`);
console.log(`Next step: Review translations and insert into database using insert script\n`);
