#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function translatePost21() {
  console.log('=== Translating Post 21: Zombie Apocalypse ===\n');

  const englishContent = readFileSync('post-21-en-content.txt', 'utf-8');
  const title = 'How to Host a Zombie Apocalypse Murder Mystery That Will Have Your Guests Fighting for Survival';
  const meta = 'Create engaging zombie apocalypse murder mystery parties combining survival horror with detective work. Balanced tension, resource management, and investigation.';

  console.log('Calling Claude Opus 4 for translation...\n');

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are a professional German translator specializing in E-E-A-T optimized content for murder mystery party planning.

Translate this English blog post to German with these STRICT requirements:

1. **E-E-A-T Quality**: Maintain all Experience, Expertise, Authority, and Trust signals
2. **German SEO**: Translate title and meta description for German search intent
3. **Format Preservation**: Keep ALL markdown formatting EXACTLY - headers (##), lists (- and 1.), tables (|), bold (**), italic (*), links ([text](url))
4. **Readability**: Natural, engaging German prose (not machine-translated sounding)
5. **Statistics**: Keep all numbers, percentages, dates, company names, and citations in English (e.g., "(AMC Networks, 2024)" stays exactly as is)
6. **Cultural Adaptation**: Adapt idioms and expressions to sound natural in German while keeping the meaning
7. **Completeness**: Translate EVERY section including all headers, content, examples, and references
8. **Terminology**: Use standard German murder mystery party terms (e.g., "Mordgeheimnis-Party" for murder mystery party)

**TITLE:**
${title}

**META_DESCRIPTION:**
${meta}

**CONTENT:**
${englishContent}

---

Provide the translation in this EXACT format:

**GERMAN_TITLE:**
[German title translation - natural and SEO-friendly]

**GERMAN_META:**
[German meta description translation - compelling and SEO-optimized]

**GERMAN_CONTENT:**
[Full German content translation with ALL markdown formatting preserved exactly as shown above]`
    }]
  });

  const response = message.content[0].text;

  // Parse response
  const titleMatch = response.match(/\*\*GERMAN_TITLE:\*\*\s*\n(.+)/);
  const metaMatch = response.match(/\*\*GERMAN_META:\*\*\s*\n(.+)/);
  const contentMatch = response.match(/\*\*GERMAN_CONTENT:\*\*\s*\n([\s\S]+)$/);

  if (!titleMatch || !metaMatch || !contentMatch) {
    console.error('Failed to parse response properly');
    writeFileSync('post-21-translation-raw.txt', response);
    console.log('Raw response saved to post-21-translation-raw.txt');
    return;
  }

  const germanTitle = titleMatch[1].trim();
  const germanMeta = metaMatch[1].trim();
  const germanContent = contentMatch[1].trim();

  // Create markdown file
  const markdown = `${germanContent}`;
  writeFileSync('de-batch-3-post-21.md', markdown);

  // Count words
  const wordCount = germanContent.split(/\s+/).length;

  console.log('✓ Translation Complete!\n');
  console.log(`German Title: ${germanTitle}`);
  console.log(`German Meta: ${germanMeta}`);
  console.log(`Word Count: ${wordCount.toLocaleString()}`);
  console.log(`\nSaved to: de-batch-3-post-21.md`);

  // Save metadata
  const metadata = {
    postNumber: 21,
    englishTitle: title,
    germanTitle,
    englishMeta: meta,
    germanMeta,
    wordCount,
    translatedDate: new Date().toISOString()
  };

  writeFileSync('post-21-metadata.json', JSON.stringify(metadata, null, 2));
  console.log('Metadata saved to: post-21-metadata.json');
}

translatePost21().catch(console.error);
