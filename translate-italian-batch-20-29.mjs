import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: 'sk-ant-api03-2_NmBwqKMi4hqI_HL-LXTnAhZFzS-9bA64Ysb17QRh2MsOA5oH0hAjNQcyE9YwKxNq-CY_2jk0pSdHWOIGGO_g-5HiYSQAA' });
const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch posts 20-29
const { data: allPosts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const posts = allPosts.filter(p => p.content?.includes('*Published: February 16, 2026'));
const batch = posts.slice(19, 29);

console.log(`\n${'='.repeat(80)}`);
console.log(`TRANSLATING ${batch.length} POSTS TO ITALIAN (Posts 20-29)`);
console.log(`${'='.repeat(80)}\n`);

const translationPrompt = `You are a professional translator specializing in Italian localization for murder mystery party content.

Translate the following blog post to Italian with these requirements:

1. **E-E-A-T Compliance**: Maintain all expertise markers, author credentials, and trust signals
2. **Formal Register**: Use formal "Lei" form throughout
3. **Proper Accents**: Include all Italian accents (è, é, à, ì, ò, ù)
4. **Date Format**: Change "*Published: February 16, 2026*" to "*Pubblicato: 16 febbraio 2026*"
5. **SEO Preservation**: Keep all markdown formatting, links, and structure intact
6. **Cultural Adaptation**: Adapt idioms and cultural references appropriately for Italian readers
7. **Technical Terms**: Use appropriate Italian translations for murder mystery terminology

Return ONLY the translated markdown content with no explanatory text.`;

for (let i = 0; i < batch.length; i++) {
  const post = batch[i];
  console.log(`\n[${i + 1}/${batch.length}] Translating: ${post.title}`);
  console.log(`Slug: ${post.slug}`);

  try {
    // Translate content
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `${translationPrompt}\n\nPost to translate:\n\n${post.content}`
      }]
    });

    const translatedContent = message.content[0].text;

    // Translate title
    const titleMessage = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Translate this title to Italian (formal, with proper accents): "${post.title}"`
      }]
    });

    const translatedTitle = titleMessage.content[0].text.replace(/^["']|["']$/g, '').trim();

    // Translate meta description
    const metaMessage = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Translate this meta description to Italian (formal, with proper accents, keep under 160 characters): "${post.meta_description}"`
      }]
    });

    const translatedMeta = metaMessage.content[0].text.replace(/^["']|["']$/g, '').trim();

    // Generate Italian slug
    const italianSlug = translatedTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    console.log(`  ✓ Translated title: ${translatedTitle}`);
    console.log(`  ✓ Italian slug: ${italianSlug}`);
    console.log(`  ✓ Content length: ${translatedContent.length} chars`);

    // Insert into database
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug: italianSlug,
        title: translatedTitle,
        content: translatedContent,
        meta_description: translatedMeta,
        language: 'it',
        category: post.category,
        read_time: post.read_time,
        published: true
      })
      .select();

    if (error) {
      console.error(`  ✗ ERROR inserting post:`, error.message);
      continue;
    }

    console.log(`  ✓ Successfully inserted into database`);

    // Small delay to avoid rate limits
    if (i < batch.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error(`  ✗ ERROR translating post:`, error.message);
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`TRANSLATION COMPLETE`);
console.log(`${'='.repeat(80)}\n`);
