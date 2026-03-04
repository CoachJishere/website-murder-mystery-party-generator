import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const italianSlugMap = {
  'unique-medieval-murder-mystery-plot-ideas': 'idee-uniche-trame-misteri-medievali',
  'unique-pirate-murder-mystery-plot-ideas': 'idee-uniche-trame-misteri-pirati',
  'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets': 'trame-uniche-misteri-riunione-scolastica-segreti-sepolti',
  'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime': 'trame-uniche-misteri-colonia-spaziale-esplora-frontiera-finale-crimine',
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue': 'trame-uniche-misteri-stazione-treni-pericolo-intrigo'
};

async function translateToItalian(post) {
  console.log(`\n🇮🇹 Translating: ${post.title}`);
  
  const prompt = `Translate this English murder mystery blog post to Italian using formal "Lei" form.

REQUIREMENTS:
- Use formal "Lei" throughout (not "tu")
- E-E-A-T format: "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Mystery Maker Party Team | Prossima Revisione: 20 maggio 2026*"
- Keep all statistics, citations, and table formatting
- Maintain professional, trustworthy tone
- Use proper Italian accents (è, à, ì, ò, ù, etc.)
- Keep all markdown formatting exactly
- Translate "Reading time: X minutes" to "Tempo di lettura: X minuti"

ENGLISH POST:
Title: ${post.title}
Meta Description: ${post.meta_description}
Keywords: ${post.meta_keywords}

${post.content}

Provide ONLY the translated content in this JSON format:
{
  "title": "Italian title",
  "meta_description": "Italian meta description (max 160 chars)",
  "meta_keywords": "Italian keywords",
  "content": "Full Italian content with E-E-A-T header..."
}`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in translation response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  // Fetch posts 40-44
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
  const batch = posts.slice(39, 44);

  console.log(`\n📚 Found ${batch.length} posts to translate (40-44):\n`);
  batch.forEach((p, i) => {
    console.log(`${i + 40}. ${p.title}`);
  });

  for (let i = 0; i < batch.length; i++) {
    const post = batch[i];
    const postNum = i + 40;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`POST ${postNum}: ${post.title}`);
    console.log('='.repeat(60));

    try {
      // Translate
      const translation = await translateToItalian(post);
      
      // Generate Italian slug
      const italianSlug = italianSlugMap[post.slug] || 
        post.slug.replace(/unique-/g, 'unici-')
                .replace(/murder-mystery/g, 'mistero')
                .replace(/plot/g, 'trama')
                .replace(/ideas/g, 'idee');

      // Insert into database
      const { error } = await supabase
        .from('blog_posts')
        .insert({
          title: translation.title,
          content: translation.content,
          slug: italianSlug,
          meta_description: translation.meta_description,
          meta_keywords: translation.meta_keywords,
          language: 'it',
          theme: post.theme,
          status: 'published',
          reading_time: post.reading_time,
          author: post.author,
          tags: post.tags,
          published_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ Error inserting post ${postNum}:`, error.message);
      } else {
        console.log(`✅ POST ${postNum} COMPLETED`);
        console.log(`   Slug: ${italianSlug}`);
        console.log(`   Title: ${translation.title.substring(0, 60)}...`);
      }

      // Rate limiting
      if (i < batch.length - 1) {
        console.log('\n⏳ Waiting 5 seconds before next translation...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error(`❌ Error translating post ${postNum}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL 5 ITALIAN TRANSLATIONS COMPLETE!');
  console.log('='.repeat(60));
}

main().catch(console.error);
