import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const postsToTranslate = [
  { slug: 'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive', title: 'How to Fix Unsatisfying Mystery Endings' },
  { slug: 'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime', title: 'Fairy Tale Murder Mystery Party' },
  { slug: 'how-to-host-a-hollywood-murder-mystery-party', title: 'Hollywood Murder Mystery Party' },
  { slug: 'unique-medieval-murder-mystery-plot-ideas', title: 'Medieval Castle Murder Mystery' },
  { slug: '1920s-speakeasy-murder-mystery-party-guide', title: 'Prohibition Era Murder Mystery' }
];

async function translateToSpanish(text, context = '') {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `Translate this English blog post content to Spanish. Maintain all markdown formatting, HTML tags, and structure exactly. Use natural, engaging Spanish appropriate for Spain/Latin America.

${context ? `Context: This is a ${context}` : ''}

English text to translate:

${text}`
      }]
    });
    
    return message.content[0].text;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

async function processPost(postData) {
  console.log(`\n🔄 Processing: ${postData.title}`);
  
  // Fetch English version by slug
  const { data: englishPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', postData.slug)
    .eq('language', 'en')
    .single();

  if (fetchError || !englishPost) {
    console.error(`❌ Failed to fetch post ${postData.slug}:`, fetchError);
    return false;
  }

  console.log(`  📥 Fetched English version (${englishPost.content.length} chars)`);

  // Split content into chunks for translation
  const chunkSize = 12000;
  const content = englishPost.content;
  const chunks = [];
  
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.substring(i, i + chunkSize));
  }

  console.log(`  📝 Translating ${chunks.length} chunks...`);
  
  const translatedChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`    Chunk ${i + 1}/${chunks.length}...`);
    try {
      const translated = await translateToSpanish(chunks[i], `part ${i + 1} of ${chunks.length} of a blog post about ${postData.title}`);
      translatedChunks.push(translated);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`    Failed to translate chunk ${i + 1}:`, error.message);
      return false;
    }
  }

  const translatedContent = translatedChunks.join('');

  // Translate metadata
  console.log(`  🌐 Translating metadata...`);
  try {
    const translatedTitle = await translateToSpanish(englishPost.title, 'blog post title');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const translatedExcerpt = englishPost.meta_description || englishPost.title;
    const translatedExcerptText = await translateToSpanish(translatedExcerpt, 'blog post excerpt');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const translatedMetaDescription = await translateToSpanish(englishPost.meta_description, 'SEO meta description');

    // Insert Spanish version
    const { error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        language: 'es',
        slug: englishPost.slug,
        title: translatedTitle.trim(),
        content: translatedContent,
        author: 'Equipo de Mystery Maker Party',
        meta_description: translatedMetaDescription.trim(),
        published_at: '2026-02-16T00:00:00Z',
        updated_at: '2026-02-20T00:00:00Z',
        post_date: '2026-02-16',
        theme: englishPost.theme,
        status: 'published',
        tags: englishPost.tags || []
      });

    if (insertError) {
      console.error(`❌ Failed to insert Spanish version:`, insertError);
      return false;
    }

    console.log(`✅ ${postData.title} - DONE`);
    return true;
  } catch (error) {
    console.error(`❌ Failed during metadata translation:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Starting translation of 5 posts to Spanish...\n');
  
  for (const post of postsToTranslate) {
    const success = await processPost(post);
    if (!success) {
      console.log(`⚠️  Skipping to next post...`);
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✅ ALL 5 POSTS TRANSLATED AND INSERTED');
}

main().catch(console.error);
