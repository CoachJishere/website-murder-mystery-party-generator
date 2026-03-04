import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = JSON.parse(readFileSync('posts-to-translate.json', 'utf-8'));

const GERMAN_TRANSLATION_PROMPT = `You are a professional German translator specializing in murder mystery party content. 

CRITICAL GERMAN RULES:
- Use formal "Sie" form throughout
- Capitalize ALL nouns (Mord, Party, Mysterium, Gast, etc.)
- Use proper umlauts: ä, ö, ü, ß
- Create proper German compound nouns: Krimidinner, Mordmysterium, Detektivspiel
- Maintain natural German sentence structure

STANDARD TRANSLATIONS:
- "Market Trends & Popularity" → "Markttrends und Popularität"
- "What 10,000+ Mystery Parties Have Taught Us" → "Was uns über 10.000 Krimi-Partys gelehrt haben"
- "Sources & References" → "Quellen und Referenzen"
- "FAQ" → "Häufig gestellte Fragen"
- "Reading time: X minutes" → "Lesezeit: X Minuten"
- Table header: "| Statistik | Wert | Quelle |"

E-E-A-T BYLINE (use this exact format):
*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*

TRANSLATION REQUIREMENTS:
1. Translate ALL content naturally to German
2. Keep all markdown formatting intact
3. Preserve all links exactly as they are
4. Maintain the structure and flow
5. Use culturally appropriate German examples and references
6. Keep technical terms in English where appropriate (e.g., "Mystery Maker")

Translate the following blog post to German:`;

async function translatePost(post, index) {
  console.log(`\n[${index + 1}/5] Translating: ${post.title}`);
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `${GERMAN_TRANSLATION_PROMPT}

TITLE: ${post.title}
SLUG: ${post.slug}
META DESCRIPTION: ${post.meta_description}

CONTENT:
${post.content}`
      }]
    });

    const translatedContent = message.content[0].text;

    // Extract title from translated content (first line after any asterisks)
    const titleMatch = translatedContent.match(/^[*]*\s*(.+?)(?:\n|$)/);
    const translatedTitle = titleMatch ? titleMatch[1].replace(/^#+\s*/, '').trim() : post.title;

    // Translate meta description separately for better quality
    const metaMessage = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Translate this meta description to German (formal "Sie" form, capitalize nouns, max 155 characters):

${post.meta_description}

Provide ONLY the translation, nothing else.`
      }]
    });

    const translatedMetaDescription = metaMessage.content[0].text.trim();

    // Create German slug
    const germanSlug = post.slug + '-de';

    // Insert into database
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: translatedTitle,
        slug: germanSlug,
        content: translatedContent,
        meta_description: translatedMetaDescription,
        language: 'de',
        published_at: post.published_at,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting ${post.slug}:`, error);
      return { success: false, title: post.title, error };
    }

    console.log(`✅ ${translatedTitle}`);
    return { success: true, title: translatedTitle, slug: germanSlug };

  } catch (error) {
    console.error(`❌ Error translating ${post.slug}:`, error.message);
    return { success: false, title: post.title, error: error.message };
  }
}

// Translate all 5 posts
console.log('Starting translation of 5 posts to German...\n');
const results = [];

for (let i = 0; i < posts.length; i++) {
  const result = await translatePost(posts[i], i);
  results.push(result);
  
  // Small delay between translations to avoid rate limits
  if (i < posts.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Print summary
console.log('\n\n=== TRANSLATION COMPLETE ===\n');
results.forEach((result, i) => {
  if (result.success) {
    console.log(`✅ ${result.title}`);
  } else {
    console.log(`❌ ${result.title} - ${result.error}`);
  }
});

const successCount = results.filter(r => r.success).length;
console.log(`\n${successCount}/5 posts successfully translated and inserted.`);
