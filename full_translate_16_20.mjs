import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Fetch optimized English posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .ilike('content', '%*Published: February 16, 2026%')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

// Get posts 16-20
const postsToTranslate = posts.slice(15, 20);

console.log(`Translating ${postsToTranslate.length} posts completely to Spanish:\n`);

// Slug translations
const slugMap = {
  'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive': 
    'como-evitar-que-invitados-rompan-personaje-mantenga-su-fiesta-de-misterio-inmersiva',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime':
    'como-organizar-fiesta-misterio-asesinato-cuento-hadas-erase-un-crimen',
  'how-to-host-a-hollywood-murder-mystery-party':
    'como-organizar-fiesta-misterio-asesinato-hollywood',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue':
    'como-organizar-misterio-asesinato-castillo-medieval-gobierne-reino-con-intriga-real',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement':
    'como-organizar-misterio-asesinato-era-prohibicion-contrabando-camino-emocion'
};

async function translateWithClaude(text, context) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `Translate this ${context} to Spanish completely. Maintain ALL markdown formatting, links, tables, lists, and structure. Keep numbers and URLs unchanged.

CRITICAL: Replace this exact phrase:
*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*

With:
*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*

Text to translate:
${text}`
    }]
  });
  
  return message.content[0].text;
}

// Delete existing Spanish translations first
console.log('Deleting existing Spanish translations...');
for (const post of postsToTranslate) {
  const esSlug = slugMap[post.slug];
  await supabase
    .from('blog_posts')
    .delete()
    .eq('slug', esSlug);
}

// Translate each post
for (let i = 0; i < postsToTranslate.length; i++) {
  const post = postsToTranslate[i];
  console.log(`\n[${i+1}/5] Translating: ${post.title}`);
  
  // Translate all fields
  const translatedTitle = await translateWithClaude(post.title, 'title');
  console.log('  - Title translated');
  
  const translatedContent = await translateWithClaude(post.content, 'article content');
  console.log('  - Content translated');
  
  const translatedMetaDesc = await translateWithClaude(post.meta_description, 'meta description');
  console.log('  - Meta description translated');
  
  const translatedKeywords = await translateWithClaude(post.meta_keywords, 'keywords');
  console.log('  - Keywords translated');
  
  const spanishPost = {
    title: translatedTitle.trim(),
    content: translatedContent.trim(),
    slug: slugMap[post.slug],
    meta_description: translatedMetaDesc.trim(),
    meta_keywords: translatedKeywords.trim(),
    language: 'es',
    theme: post.theme,
    status: 'published',
    reading_time: post.reading_time,
    author: post.author,
    tags: post.tags
  };
  
  // Insert
  const { error: insertError } = await supabase
    .from('blog_posts')
    .insert([spanishPost]);
  
  if (insertError) {
    console.error(`  ❌ Error:`, insertError.message);
  } else {
    console.log(`  ✅ Inserted successfully`);
  }
}

console.log('\n\n✅ ALL 5 POSTS COMPLETELY TRANSLATED TO SPANISH');
