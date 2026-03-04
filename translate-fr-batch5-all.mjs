import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('🔑 API Key check:', process.env.ANTHROPIC_API_KEY ? 'Loaded' : 'MISSING!');

// Batch 5 posts
const posts = [
  { num: 21, id: '7f38f1ae-fff5-4119-b6a1-1ea5a8fbbd02', name: 'Innocent Bystander' },
  { num: 22, id: '2fb18701-39ba-4152-8a82-bcbe0fea4e9b', name: 'Dinner Parties' },
  { num: 23, id: '6c030a19-7884-42fa-aecb-d97ef2b0bdac', name: 'Underwater' },
  { num: 24, id: 'b88413c5-7f5b-4dad-955f-aab433943b19', name: 'Villain' },
  { num: 25, id: 'fb39f18e-8b9f-4332-9502-dc88fa9345e9', name: 'Wild West' }
];

console.log('\n' + '='.repeat(60));
console.log('FINAL FRENCH TRANSLATION BATCH (Posts 21-25)');
console.log('='.repeat(60) + '\n');

for (const postInfo of posts) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`POST ${postInfo.num}/25: ${postInfo.name}`);
  console.log('='.repeat(60));
  
  // Fetch English post
  console.log(`\n[1/3] Fetching English post...`);
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postInfo.id)
    .eq('language', 'en')
    .single();
  
  if (error || !post) {
    console.error(`❌ Error fetching post:`, error);
    continue;
  }
  
  console.log(`✓ Fetched: ${post.title}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Content: ${post.content.length} chars`);
  
  // Translate with Claude
  console.log(`\n[2/3] Translating with Claude Opus 4...`);
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `You are a professional translator specializing in French localization for murder mystery party content.

Translate this blog post to French following these strict standards:

**Translation Requirements:**
- Use formal "vous" throughout
- Natural, engaging French (not literal translation)
- Preserve all E-E-A-T markers (expertise, authority, trust)
- Maintain SEO optimization and readability
- Keep markdown formatting exactly as is
- Keep HTML/JSX elements unchanged
- Keep source citations in English
- Preserve all links, metadata, and structure

**Title:** ${post.title}

**Meta Description:** ${post.meta_description}

**Content:**
${post.content}

**Instructions:**
Return ONLY a JSON object with this exact structure:
{
  "title": "French title",
  "meta_description": "French meta description",
  "content": "Full French content with all markdown preserved"
}

No other text, no explanations, just valid JSON.`
      }]
    });
    
    const translatedText = message.content[0].text;
    console.log(`✓ Translation received (${translatedText.length} chars)`);
    
    // Parse JSON
    let translated;
    try {
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translated = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error(`❌ JSON parse error:`, e.message);
      const rawFile = `./fr-post-${postInfo.num}-raw.txt`;
      fs.writeFileSync(rawFile, translatedText);
      console.log(`Raw response saved to: ${rawFile}`);
      continue;
    }
    
    // Save markdown file
    console.log(`\n[3/3] Saving markdown file...`);
    
    const markdown = `---
Title: ${translated.title}
Meta Description: ${translated.meta_description}
Slug: ${post.slug}
Original ID: ${post.id}
---

${translated.content}`;
    
    const filename = `./fr-complete-post-${postInfo.num}.md`;
    fs.writeFileSync(filename, markdown);
    
    console.log(`✅ Saved: ${filename}`);
    console.log(`\n📊 Translation Stats:`);
    console.log(`   Title: ${translated.title}`);
    console.log(`   Meta: ${translated.meta_description.substring(0, 70)}...`);
    console.log(`   Content: ${translated.content.length} chars`);
    
    // Brief pause between translations
    if (postInfo.num < 25) {
      console.log(`\n⏸️  Pausing 2 seconds before next translation...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error(`❌ Translation error:`, error.message);
    if (error.status === 401) {
      console.error(`🔑 Authentication failed - check API key`);
    }
    continue;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('🎉 FINAL FRENCH BATCH COMPLETE!');
console.log('='.repeat(60));
console.log('\n✅ All 5 posts translated and saved as:');
posts.forEach(p => {
  const filename = `./fr-complete-post-${p.num}.md`;
  const exists = fs.existsSync(filename);
  console.log(`   ${exists ? '✓' : '✗'} fr-complete-post-${p.num}.md (${p.name})`);
});
console.log('\n🏆 This completes ALL 25 missing French translations!\n');
