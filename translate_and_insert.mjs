import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = [
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
  'ancient-egypt-murder-mystery-party-guide',
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder'
];

const spanishSlugs = {
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover': '5-temas-de-misterio-de-asesinato-de-thriller-de-espias-que-haran-que-tus-invitados-vayan-de-incognito',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue': '5-temas-de-misterio-de-asesinato-de-circo-vintage-entra-en-la-carpa-principal-de-la-intriga',
  'ancient-egypt-murder-mystery-party-guide': 'guia-de-fiesta-de-misterio-de-asesinato-del-antiguo-egipto',
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes': 'planificacion-de-fiesta-de-misterio-de-asesinato-en-galeria-de-arte-crear-crimenes-creativos-sofisticados',
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder': 'planificacion-de-fiesta-de-misterio-de-asesinato-en-libreria-pasa-la-pagina-sobre-el-asesinato-literario'
};

async function fetchPost(slug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();
  
  if (error) {
    console.error(`Error fetching ${slug}:`, error);
    return null;
  }
  return data;
}

async function translateContent(content, title) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `Translate this complete murder mystery blog post to Spanish. Maintain ALL formatting, bullets, lists, tables, and structure. Keep URLs, numbers, and stats intact. Use natural, engaging Spanish.

Title: ${title}

Content:
${content}

Provide ONLY the translated content, no explanations.`
    }]
  });
  
  return response.content[0].text;
}

async function translateMetadata(text) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Translate this to natural Spanish: ${text}`
    }]
  });
  
  return response.content[0].text;
}

async function insertTranslation(originalPost, translatedContent, translatedTitle, translatedDescription, spanishSlug) {
  const translatedPost = {
    slug: spanishSlug,
    language: 'es',
    title: translatedTitle,
    content: translatedContent,
    meta_description: translatedDescription,
    category: originalPost.category,
    published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(translatedPost);

  if (error) {
    console.error('Error inserting:', error);
    return false;
  }
  return true;
}

async function processPost(slug) {
  console.log(`\n📝 Processing: ${slug}`);
  
  const post = await fetchPost(slug);
  if (!post) {
    console.log(`❌ Could not fetch post`);
    return;
  }

  console.log(`🔄 Translating content (${post.content.length} chars)...`);
  const translatedContent = await translateContent(post.content, post.title);
  
  console.log(`🔄 Translating title...`);
  const translatedTitle = await translateMetadata(post.title);
  
  console.log(`🔄 Translating meta description...`);
  const translatedDescription = await translateMetadata(post.meta_description);
  
  console.log(`💾 Inserting into database...`);
  const success = await insertTranslation(
    post,
    translatedContent,
    translatedTitle,
    translatedDescription,
    spanishSlugs[slug]
  );
  
  if (success) {
    console.log(`✅ ${translatedTitle} - Done`);
  } else {
    console.log(`❌ Failed to insert`);
  }
}

async function main() {
  for (const slug of posts) {
    await processPost(slug);
  }
  console.log('\n🎉 All translations complete!');
}

main();
