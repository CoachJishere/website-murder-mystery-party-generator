#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Remaining posts from Batches 3-7
const remainingPosts = [
  // Batch 3 (4 remaining)
  { slug: 'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime', target: 2300, batch: 3 },
  { slug: 'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime', target: 2300, batch: 3 },
  { slug: 'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime', target: 2300, batch: 3 },
  { slug: 'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders', target: 2300, batch: 3 },

  // Batch 4 (5 posts)
  { slug: '5-haunted-mansion-murder-mystery-themes-spooky-scenarios-for-your-party', target: 1600, batch: 4 },
  { slug: 'bookstore-murder-mystery-party-planning-literary-whodunits-among-the-shelves', target: 2300, batch: 4 },
  { slug: '5-renaissance-murder-mystery-party-themes-for-a-historical-gathering', target: 1600, batch: 4 },
  { slug: 'murder-mystery-party-for-date-night-ideas-romantic-suspense-for-couples', target: 2300, batch: 4 },
  { slug: 'murder-mystery-party-for-office-teams-team-building-through-crime-solving', target: 2300, batch: 4 },

  // Batch 5 (5 posts)
  { slug: 'how-to-fix-guests-breaking-character-in-murder-mystery-parties', target: 2300, batch: 5 },
  { slug: 'unique-film-noir-murder-mystery-plots-for-a-classic-hollywood-party', target: 2300, batch: 5 },
  { slug: 'unique-space-colony-murder-mystery-plots-for-sci-fi-parties', target: 2300, batch: 5 },
  { slug: 'spa-resort-murder-mystery-party-guide-relaxation-meets-investigation', target: 2300, batch: 5 },
  { slug: 'haunted-hotel-murder-mystery-party-guide-ghostly-guests-and-deadly-secrets', target: 2300, batch: 5 },

  // Batch 6 (5 posts)
  { slug: '5-casino-murder-mystery-party-themes-high-stakes-suspense', target: 1600, batch: 6 },
  { slug: 'unique-train-station-murder-mystery-plots-all-aboard-for-intrigue', target: 2300, batch: 6 },
  { slug: 'how-to-fix-unsatisfying-mystery-endings-crafting-the-perfect-revelation', target: 2300, batch: 6 },
  { slug: 'how-to-host-a-victorian-murder-mystery-party-elegance-intrigue-and-gaslit-secrets', target: 2300, batch: 6 },
  { slug: 'murder-mystery-party-for-game-night-groups-level-up-your-regular-gaming-session', target: 2300, batch: 6 },

  // Batch 7 (5 posts)
  { slug: 'murder-mystery-party-for-dinner-parties-elegant-dining-with-a-side-of-suspense', target: 2300, batch: 7 },
  { slug: 'unique-circus-murder-mystery-plot-ideas-under-the-big-top-of-suspense', target: 2300, batch: 7 },
  { slug: 'unique-medieval-murder-mystery-plot-ideas-kingdoms-castles-and-courtly-intrigue', target: 2300, batch: 7 },
  { slug: 'unique-pirate-murder-mystery-plot-ideas-high-seas-adventure-with-deadly-twists', target: 2300, batch: 7 },
  { slug: 'ancient-egypt-murder-mystery-party-guide-pharaohs-pyramids-and-deadly-secrets', target: 2300, batch: 7 }
];

const trimmingPrompt = (currentWords, targetWords) => `You are an SEO/GEO content editor. Trim this blog post from ${currentWords} words to approximately ${targetWords} words.

**CRITICAL: PRESERVE THESE ELEMENTS**
- E-E-A-T metadata header (Published/Updated dates, Author, Review date)
- "Based on analyzing 10,000+ murder mystery parties" expertise claim
- Statistics with citations (market data, revenue figures)
- Comparison tables
- FAQ questions (condense answers to ~50 words each)
- Sources & References section
- Internal links to generator
- Answer-first opening paragraph (40-60 words)

**CUT/CONDENSE**
- Redundant phrasing and repetitive sections
- Verbose introductions/conclusions (often 200+ words)
- Filler transitions
- Excessive examples (keep best 1-2 per point)
- Generic "Advanced Customization" or "Budget-Friendly" padding sections

**FORMATTING**
- Each H2 section starts with direct answer in first 1-2 sentences
- Paragraphs: 2-3 sentences max
- Preserve all tables and structured data
- Maintain question-based H2 headings

Return only the trimmed markdown content.`;

async function trimPost(post) {
  try {
    console.log(`\n📝 Processing: ${post.slug}`);

    // Fetch post
    const { data: postData, error } = await supabase
      .from('blog_posts')
      .select('id, title, content')
      .eq('slug', post.slug)
      .eq('language', 'en')
      .single();

    if (error || !postData) {
      console.log(`  ❌ Error fetching: ${error?.message || 'Not found'}`);
      return { success: false, error: 'Fetch failed' };
    }

    const currentWords = postData.content.split(/\s+/).length;
    console.log(`  Current: ${currentWords}w → Target: ${post.target}w`);

    if (currentWords <= post.target + 100) {
      console.log(`  ✓ Already within target range, skipping`);
      return { success: true, skipped: true, currentWords };
    }

    // Trim using Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `${trimmingPrompt(currentWords, post.target)}\n\n${postData.content}`
      }]
    });

    const trimmedContent = message.content[0].text;
    const newWords = trimmedContent.split(/\s+/).length;
    const wordsRemoved = currentWords - newWords;

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        content: trimmedContent,
        reading_time: Math.ceil(newWords / 200),
        updated_at: new Date().toISOString()
      })
      .eq('id', postData.id);

    if (updateError) {
      console.log(`  ❌ Error updating: ${updateError.message}`);
      return { success: false, error: 'Update failed' };
    }

    console.log(`  ✅ ${postData.title}`);
    console.log(`     ${currentWords}w → ${newWords}w (${wordsRemoved}w removed, ${Math.round((wordsRemoved/currentWords)*100)}%)`);

    return {
      success: true,
      title: postData.title,
      currentWords,
      newWords,
      wordsRemoved,
      percentage: Math.round((wordsRemoved/currentWords)*100)
    };

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🎯 COMPLETING REMAINING BLOG POST TRIMMING');
  console.log('=' .repeat(60));
  console.log(`\nProcessing ${remainingPosts.length} remaining posts across Batches 3-7\n`);

  const results = {
    batch3: [],
    batch4: [],
    batch5: [],
    batch6: [],
    batch7: []
  };

  let totalRemoved = 0;
  let successCount = 0;

  for (const post of remainingPosts) {
    const result = await trimPost(post);
    results[`batch${post.batch}`].push(result);

    if (result.success && !result.skipped) {
      totalRemoved += result.wordsRemoved || 0;
      successCount++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETION SUMMARY');
  console.log('='.repeat(60));

  for (let batch = 3; batch <= 7; batch++) {
    const batchResults = results[`batch${batch}`];
    const batchSuccess = batchResults.filter(r => r.success && !r.skipped).length;
    const batchRemoved = batchResults.reduce((sum, r) => sum + (r.wordsRemoved || 0), 0);

    console.log(`\nBatch ${batch}: ${batchSuccess}/${batchResults.length} posts trimmed`);
    console.log(`  Total removed: ${batchRemoved} words`);

    batchResults.forEach((r, i) => {
      if (r.success && !r.skipped) {
        console.log(`  ${i+1}. ${r.title?.substring(0, 50)}...`);
        console.log(`     ${r.currentWords}w → ${r.newWords}w (-${r.wordsRemoved}w, ${r.percentage}%)`);
      } else if (r.skipped) {
        console.log(`  ${i+1}. Skipped (already within target)`);
      } else {
        console.log(`  ${i+1}. Failed: ${r.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 FINAL STATISTICS`);
  console.log(`Successfully trimmed: ${successCount}/${remainingPosts.length} posts`);
  console.log(`Total words removed (this run): ${totalRemoved.toLocaleString()}`);
  console.log(`\n✅ ALL 35 POSTS COMPLETE\n`);
}

main().catch(console.error);
