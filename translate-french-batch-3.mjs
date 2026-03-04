import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Read source posts
const sourcePosts = JSON.parse(
  fs.readFileSync('./french-batch-3-source-posts.json', 'utf-8')
);

console.log(`Found ${sourcePosts.length} posts to translate\n`);

// Translation prompt template
const getTranslationPrompt = (post, postNumber) => `You are a professional translator specializing in French content localization for murder mystery party guides.

**Task**: Translate this English blog post (#${postNumber}) to French with exceptional quality.

**CRITICAL REQUIREMENTS:**

1. **Formal "vous" form** throughout (never "tu")
2. **Natural, fluent French** - not word-for-word translation
3. **Professional but engaging tone**
4. **Cultural adaptation** where needed
5. **Preserve ALL Markdown formatting** exactly

**E-E-A-T Translation Standards:**
- Metadata header: "*Publié : 16 février 2026 | Mis à jour : 28 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 28 mai 2026*"
- Expertise claim: "*Basé sur l'analyse de plus de 10 000 soirées murder mystery...*" (adapt to match English content)
- Statistics tables: Translate content but **keep source names in English**
- References section: **Keep source titles in English**, translate section heading

**DO NOT Translate:**
- Source names (Statista, Box Office Mojo, IBISWorld, etc.)
- Source titles in References section
- Internal link destinations (keep as #)

**DO Translate:**
- All headings and body text
- Link text (but not URLs)
- Table content (except source names)
- All author attributions except the name itself

**Standard Translations:**
- "murder mystery party" → "soirée murder mystery"
- "Mystery Maker Party Team" → "Équipe Mystery Maker Party"
- "Published" → "Publié"
- "Updated" → "Mis à jour"
- "Author" → "Auteur"
- "Next Review" → "Prochaine révision"
- "Sources & References" → "Sources et Références"

**English Post:**

Title: ${post.title}
Slug: ${post.slug}

${post.content}

**Your response should contain ONLY the translated French content** (no explanations, no meta-commentary). Start with the metadata header.`;

// Translate single post
async function translatePost(post, index) {
  const postNumber = 21 + index;
  console.log(`\n🔄 Translating Post ${postNumber}: ${post.title}...`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: getTranslationPrompt(post, postNumber)
      }]
    });

    const translation = message.content[0].text;

    // Save to file
    const filename = `./fr-batch-3-post-${postNumber}.md`;
    fs.writeFileSync(filename, translation, 'utf-8');

    console.log(`✅ Post ${postNumber} saved to ${filename}`);
    console.log(`   Words: ~${translation.split(/\s+/).length}`);

    return { success: true, postNumber, title: post.title };
  } catch (error) {
    console.error(`❌ Error translating Post ${postNumber}:`, error.message);
    return { success: false, postNumber, title: post.title, error: error.message };
  }
}

// Main execution
async function translateAllPosts() {
  console.log('Starting French Batch 3 Translation (Posts 21-30)\n');
  console.log('='.repeat(60));

  const results = [];

  for (let i = 0; i < sourcePosts.length; i++) {
    const result = await translatePost(sourcePosts[i], i);
    results.push(result);

    // Brief pause between translations
    if (i < sourcePosts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TRANSLATION SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   Post ${r.postNumber}: ${r.title}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   Post ${r.postNumber}: ${r.title} - ${r.error}`);
    });
  }

  console.log('\n✨ Translation complete!\n');
}

translateAllPosts().catch(console.error);
