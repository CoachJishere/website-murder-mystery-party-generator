import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const slugs = [
  'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
  'how-to-host-a-hollywood-murder-mystery-party',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement'
];

async function translateAndInsert() {
  for (const slug of slugs) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Processing: ${slug}`);
    console.log('='.repeat(80));

    // Fetch English post
    const { data: post, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('language', 'en')
      .single();

    if (fetchError || !post) {
      console.error(`Error fetching ${slug}:`, fetchError);
      continue;
    }

    console.log(`✓ Fetched: ${post.title}`);

    // Check if Spanish version exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', 'es')
      .single();

    if (existing) {
      console.log(`⚠ Spanish version already exists, skipping...`);
      continue;
    }

    // Prepare content for translation
    const contentToTranslate = {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      meta_description: post.meta_description
    };

    console.log('Translating to Spanish...');

    // Translate using Claude
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Translate this murder mystery party blog post to Spanish (Spain/Latin America neutral). Maintain all markdown formatting, HTML tags, and structure exactly.

CRITICAL RULES:
1. Keep ALL markdown formatting (##, -, *, etc.)
2. Keep ALL HTML tags intact
3. Preserve structure exactly
4. Use natural, engaging Spanish
5. Maintain SEO quality
6. Keep cultural references authentic to Spanish

Content:
${JSON.stringify(contentToTranslate, null, 2)}

Return ONLY a JSON object with these exact fields:
{
  "title": "translated title",
  "excerpt": "translated excerpt",
  "content": "translated full content with markdown",
  "meta_description": "translated meta description"
}`
      }]
    });

    const translatedText = message.content[0].text;
    let translated;
    
    try {
      // Extract JSON from response
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translated = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Error parsing translation:', e);
      console.log('Response:', translatedText.substring(0, 500));
      continue;
    }

    console.log('✓ Translation complete');

    // Insert Spanish version
    const spanishPost = {
      title: translated.title,
      slug: post.slug,
      excerpt: translated.excerpt,
      content: translated.content,
      author: post.author,
      published_date: post.published_date,
      updated_date: post.updated_date,
      featured_image: post.featured_image,
      category: post.category,
      tags: post.tags,
      meta_description: translated.meta_description,
      language: 'es',
      original_post_id: post.id,
      reading_time: post.reading_time
    };

    const { data: inserted, error: insertError } = await supabase
      .from('blog_posts')
      .insert([spanishPost])
      .select();

    if (insertError) {
      console.error('Error inserting:', insertError);
      continue;
    }

    console.log(`✅ INSERTED: ${translated.title}`);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('TRANSLATION COMPLETE');
  console.log('='.repeat(80));
}

translateAndInsert();
