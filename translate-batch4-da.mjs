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

const posts = JSON.parse(fs.readFileSync('batch4-da-posts.json', 'utf-8'));

const translateToDanish = async (content, title, slug) => {
  const prompt = `Translate this murder mystery party blog post to DANISH (da).

CRITICAL DANISH FORMAT REQUIREMENTS:
1. **E-E-A-T Metadata**: "*Udgivet: 16. februar 2026 | Opdateret: 20. februar 2026 | Forfatter: Mystery Maker Party Team | Næste gennemgang: 20. maj 2026*"
2. **Research Attribution**: "*Baseret på analyse af mere end 10.000 mordmysteriefester og forskning i [relevant tema]*"
3. **Reading Time**: "Læsetid: X minutter" (calculate based on Danish word count)
4. **Table Headers**: "| Statistik | Værdi | Kilde |" (Danish headers)
5. **Professional Danish**: Modern formal tone, natural phrasing, proper Danish characters (æ, ø, å)
6. **Danish Terminology**: Use proper Danish terms for murder mystery party concepts

TRANSLATION RULES:
- Translate ALL content including tables, lists, FAQs, statistics
- Maintain exact markdown structure and formatting
- Keep URLs and image paths unchanged
- Use Danish date format: "16. februar 2026"
- Use Danish number format: "10.000" (periods for thousands)
- Translate meta descriptions to Danish
- Keep reading time accurate for Danish text length

English Title: ${title}
English Slug: ${slug}

English Content:
${content}

Provide response as JSON:
{
  "title": "Danish title",
  "slug": "danish-slug-with-hyphens",
  "content": "Complete Danish markdown content",
  "meta_description": "Danish meta description (155 chars max)",
  "reading_time": X
}`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  
  return JSON.parse(jsonMatch[0]);
};

const insertPost = async (originalPost, translation, postNumber) => {
  const postData = {
    title: translation.title,
    slug: translation.slug,
    content: translation.content,
    meta_description: translation.meta_description,
    reading_time: translation.reading_time,
    language: 'da',
    category: originalPost.category,
    author: 'Mystery Maker Party Team',
    featured_image: originalPost.featured_image,
    tags: originalPost.tags,
    published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(postData)
    .select();

  if (error) throw error;
  
  console.log(`✅ ${postNumber}/20 - Inserted: ${translation.title}`);
  return data[0];
};

// Process all 5 posts
for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const postNumber = 16 + i;
  
  console.log(`\n🔄 Translating post ${postNumber}/20: ${post.title}`);
  
  try {
    const translation = await translateToDanish(post.content, post.title, post.slug);
    await insertPost(post, translation, postNumber);
    
    // Save translation for reference
    fs.writeFileSync(
      `da-post-${postNumber}.json`,
      JSON.stringify({ original: post, translation }, null, 2)
    );
    
    // Delay between posts
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error(`❌ Error on post ${postNumber}:`, error.message);
    throw error;
  }
}

console.log('\n🎉 All 5 Danish posts (16-20) completed!');
