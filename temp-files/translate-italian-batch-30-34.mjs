import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Italian slug mapping
const slugMapping = {
  'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence': 'gioco-di-mistero-per-celebrazioni-di-laurea-misteri-accademici-con-eccellenza-educativa',
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue': 'gioco-di-mistero-per-riunioni-festive-divertimento-festivo-incontra-intrighi-familiari',
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation': 'gioco-di-mistero-per-team-aziendali-costruire-legami-attraverso-indagini-collaborative',
  'murder-mystery-party-for-small-groups-ideas': 'gioco-di-mistero-per-piccoli-gruppi-idee',
  'murder-mystery-party-for-teenagers-guide': 'gioco-di-mistero-per-adolescenti-guida'
};

async function translateToItalian(englishContent, title) {
  console.log(`\n🇮🇹 Translating: ${title}`);

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    temperature: 1,
    messages: [{
      role: 'user',
      content: `Translate this English murder mystery party blog post to Italian.

CRITICAL REQUIREMENTS:
1. E-E-A-T preservation: Change "*Published: February 16, 2026...*" to "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Mystery Maker Party Team | Prossima Revisione: 20 maggio 2026*"
2. Formal "Lei" form throughout
3. Proper Italian accents (è, à, ù, etc.)
4. Keep ALL markdown formatting, tables, links
5. Keep HTML exactly as-is (don't translate attributes)
6. Translate naturally - avoid word-for-word translation
7. Adapt cultural references appropriately for Italian audience
8. Keep numbers, statistics, and data exactly the same
9. Maintain professional, authoritative tone

English content:
${englishContent}

Return ONLY the translated Italian content, nothing else.`
    }]
  });

  return message.content[0].text;
}

async function processPost(post, index) {
  const postNumber = index + 30;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`POST ${postNumber + 1}/34: ${post.slug}`);
  console.log(`${'='.repeat(80)}`);

  try {
    // Translate content
    const italianContent = await translateToItalian(post.content, post.title);

    // Translate title
    console.log(`\n📝 Translating title...`);
    const titleMessage = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 200,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `Translate this title to Italian (formal Lei form, proper accents):
"${post.title}"

Return ONLY the Italian title, nothing else.`
      }]
    });

    const italianTitle = titleMessage.content[0].text.trim();

    // Translate meta description
    console.log(`\n📝 Translating meta description...`);
    const metaMessage = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 300,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `Translate this meta description to Italian (formal Lei form, proper accents):
"${post.meta_description}"

Return ONLY the Italian meta description, nothing else.`
      }]
    });

    const italianMeta = metaMessage.content[0].text.trim();

    const italianSlug = slugMapping[post.slug];

    console.log(`\n✅ Translation complete`);
    console.log(`   English slug: ${post.slug}`);
    console.log(`   Italian slug: ${italianSlug}`);
    console.log(`   Title: ${italianTitle}`);

    // Insert into database
    console.log(`\n💾 Inserting into database...`);
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug: italianSlug,
        language: 'it',
        title: italianTitle,
        content: italianContent,
        meta_description: italianMeta,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error(`❌ Database error for ${post.slug}:`, error);
      // Save to file as backup
      fs.writeFileSync(
        `temp-files/italian-backup-${postNumber}.json`,
        JSON.stringify({ slug: italianSlug, title: italianTitle, content: italianContent, meta_description: italianMeta }, null, 2)
      );
      console.log(`💾 Saved backup to temp-files/italian-backup-${postNumber}.json`);
      return { success: false, error };
    }

    console.log(`✅ Successfully inserted Italian post: ${italianSlug}`);
    return { success: true, data };

  } catch (error) {
    console.error(`❌ Error processing ${post.slug}:`, error);
    return { success: false, error };
  }
}

async function main() {
  console.log('🇮🇹 ITALIAN TRANSLATION BATCH 30-34 (5 posts)');
  console.log('='.repeat(80));

  const posts = JSON.parse(fs.readFileSync('temp-files/italian-posts-30-34.json', 'utf8'));

  console.log(`\nFound ${posts.length} posts to translate`);
  posts.forEach((p, i) => {
    console.log(`${i + 30}: ${p.slug}`);
  });

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const result = await processPost(posts[i], i);
    results.push({ post: posts[i].slug, ...result });

    // Small delay between posts
    if (i < posts.length - 1) {
      console.log(`\n⏳ Waiting 2 seconds before next post...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Successful: ${successful}/5`);
  console.log(`❌ Failed: ${failed}/5`);

  if (failed > 0) {
    console.log(`\n❌ Failed posts:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.post}`);
    });
  }

  // Save results
  fs.writeFileSync('temp-files/italian-batch-30-34-results.json', JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to temp-files/italian-batch-30-34-results.json`);
}

main().catch(console.error);
