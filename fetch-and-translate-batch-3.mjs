import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MDY4MTgsImV4cCI6MjA1MTQ4MjgxOH0.C9TiFujovFgDBywZpRDY-aXvJ5nk2i4R44FRUkf5MbE'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const postIds = [
  { id: 'bd829048-623b-467a-94e2-c7676bdf8ef2', num: 21, slug: 'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival' },
  { id: '17325502-e5ad-4b92-bde3-0857f82a9254', num: 22, slug: 'medical-examiner-murder-mystery-themes-forensic-investigations' },
  { id: 'e69f4207-ddbd-48fa-bbcc-7c08a16ed49b', num: 23, slug: 'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes' },
  { id: '9016f13f-eebd-4300-984a-e7fd4066b465', num: 24, slug: 'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable' },
  { id: '6c030a19-7884-42fa-aecb-d97ef2b0bdac', num: 25, slug: 'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party' },
  { id: '4662e124-df40-455b-852d-2d8f2e13515e', num: 26, slug: 'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive' },
  { id: '92cc7ea6-11d3-4263-8b06-84058d4de32a', num: 27, slug: '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover' },
  { id: '2aaee48f-eb45-4183-8340-f92616812fe2', num: 28, slug: 'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime' },
  { id: 'cea7e6f4-77b7-448d-aeab-daa6ccff7593', num: 29, slug: 'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue' },
  { id: 'a25bacd6-e0e9-4906-84cf-eb50500ee473', num: 30, slug: 'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas' }
];

async function fetchAndTranslate() {
  console.log('=== FETCHING AND TRANSLATING GERMAN BATCH 3 (Posts 21-30) ===\n');

  const results = [];

  for (const post of postIds) {
    console.log(`Fetching Post ${post.num}...`);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, content, meta_description')
      .eq('id', post.id)
      .single();

    if (error) {
      console.error(`Error fetching post ${post.num}:`, error.message);
      continue;
    }

    console.log(`✓ Fetched: ${data.title.substring(0, 60)}...`);
    console.log(`  Content length: ${data.content.length} chars`);
    console.log(`  Translating to German...`);

    // Translate to German using Claude
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `You are a professional German translator specializing in E-E-A-T optimized content for murder mystery party planning.

Translate this English blog post to German with these requirements:

1. **E-E-A-T Quality**: Maintain all Experience, Expertise, Authority, and Trust signals
2. **German SEO**: Translate title and meta description for German search intent
3. **Format Preservation**: Keep all markdown formatting, headers, lists, tables, bold, italic exactly as shown
4. **Readability**: Natural, engaging German (not machine-translated)
5. **Statistics**: Keep all numbers, percentages, dates, sources in English as shown
6. **Cultural Adaptation**: Adapt idioms and expressions to sound natural in German
7. **Completeness**: Translate EVERY section including all headers and content

Here is the post to translate:

**Title:** ${data.title}

**Meta Description:** ${data.meta_description}

**Content:**
${data.content}

---

Please provide the translation in this exact format:

**TITLE:**
[German title translation]

**META_DESCRIPTION:**
[German meta description translation]

**CONTENT:**
[Full German content translation with all markdown formatting preserved]`
      }]
    });

    const translatedText = message.content[0].text;

    // Parse the response
    const titleMatch = translatedText.match(/\*\*TITLE:\*\*\s*\n(.+)/);
    const metaMatch = translatedText.match(/\*\*META_DESCRIPTION:\*\*\s*\n(.+)/);
    const contentMatch = translatedText.match(/\*\*CONTENT:\*\*\s*\n([\s\S]+)$/);

    const germanTitle = titleMatch ? titleMatch[1].trim() : '';
    const germanMeta = metaMatch ? metaMatch[1].trim() : '';
    const germanContent = contentMatch ? contentMatch[1].trim() : translatedText;

    // Save individual markdown file
    const filename = `de-batch-3-post-${post.num}.md`;
    const markdownContent = `# ${germanTitle}

${germanContent}`;

    writeFileSync(filename, markdownContent);

    // Count words
    const wordCount = germanContent.split(/\s+/).length;

    results.push({
      num: post.num,
      slug: post.slug,
      title: data.title,
      germanTitle,
      germanMeta,
      wordCount,
      filename
    });

    console.log(`✓ Translated Post ${post.num}: ${wordCount.toLocaleString()} words`);
    console.log(`  Saved to: ${filename}\n`);
  }

  // Save summary
  const summary = `# German Batch 3 Translation Summary (Posts 21-30)

**Completed:** ${new Date().toISOString().split('T')[0]}

## Translation Results

${results.map(r => `### Post ${r.num}
- **English Title:** ${r.title}
- **German Title:** ${r.germanTitle}
- **German Meta:** ${r.germanMeta}
- **Word Count:** ${r.wordCount.toLocaleString()}
- **File:** ${r.filename}
`).join('\n')}

## Statistics
- **Total Posts:** ${results.length}
- **Total Words:** ${results.reduce((sum, r) => sum + r.wordCount, 0).toLocaleString()}
- **Average Words per Post:** ${Math.round(results.reduce((sum, r) => sum + r.wordCount, 0) / results.length).toLocaleString()}

## Files Created
${results.map(r => `- ${r.filename}`).join('\n')}
`;

  writeFileSync('german-batch-3-translation-summary.md', summary);
  console.log('\n✓ Summary saved to: german-batch-3-translation-summary.md');
  console.log(`\nTotal translated: ${results.length} posts, ${results.reduce((sum, r) => sum + r.wordCount, 0).toLocaleString()} words`);
}

fetchAndTranslate().catch(console.error);
