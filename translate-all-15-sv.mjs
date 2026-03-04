import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Load all posts
const posts = JSON.parse(fs.readFileSync('sv-batch-all-posts.json', 'utf8'));

console.log(`Translating ${posts.length} posts to Swedish...\n`);

const translations = [];

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  
  console.log(`\n[${i + 1}/${posts.length}] Translating: ${post.title}`);
  console.log(`Slug: ${post.slug}`);
  console.log(`Content length: ${post.content.length} chars`);
  
  const prompt = `You are a professional translator specializing in Swedish. Translate this murder mystery party blog post from English to Swedish.

CRITICAL REQUIREMENTS:
- Use modern, natural Swedish that native speakers would use
- Preserve ALL E-E-A-T elements (expertise, authority, trustworthiness)
- Keep source titles in English in the Källor/Referenser section
- Maintain all markdown formatting exactly
- DO NOT translate URLs or links
- Use proper Swedish characters (å, ä, ö)
- Maintain the conversational, engaging tone
- Keep all HTML/markdown structure intact

English Post:
Title: ${post.title}
Meta Description: ${post.meta_description}

Content:
${post.content}

Provide the Swedish translation in this exact JSON format:
{
  "title": "Swedish title here",
  "slug": "swedish-slug-here",
  "meta_description": "Swedish meta description here",
  "content": "Full Swedish markdown content here"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const responseText = message.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('  ✗ Failed to extract JSON from response');
      continue;
    }
    
    const translation = JSON.parse(jsonMatch[0]);
    
    // Add original post data
    translation.original_id = post.id;
    translation.original_slug = post.slug;
    translation.language = 'sv';
    translation.status = 'published';
    translation.theme = post.theme;
    translation.author = post.author || 'MysteryMaster AI';
    translation.tags = post.tags;
    
    translations.push(translation);
    
    console.log(`  ✓ Translated successfully`);
    console.log(`  Title: ${translation.title}`);
    console.log(`  Slug: ${translation.slug}`);
    
    // Save individual file
    const filename = `sv-complete-post-${i + 1}.json`;
    fs.writeFileSync(filename, JSON.stringify(translation, null, 2));
    console.log(`  ✓ Saved to ${filename}`);
    
    // Rate limiting - wait 2 seconds between requests
    if (i < posts.length - 1) {
      console.log('  Waiting 2s...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error(`  ✗ Translation error: ${error.message}`);
  }
}

console.log(`\n✓ Completed ${translations.length} translations`);

// Save all translations
fs.writeFileSync('sv-all-translations.json', JSON.stringify(translations, null, 2));
console.log('✓ Saved all translations to sv-all-translations.json');

