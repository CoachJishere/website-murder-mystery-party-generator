// Script to translate posts 52-61 to Japanese
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1OTk0NzcsImV4cCI6MjAyNTE3NTQ3N30.oR8fF7RqVHlY2XhQa9J4f0x0q6bK_YqKZ4mL4Rv7LLk';

const supabase = createClient(supabaseUrl, supabaseKey);

// Post mappings
const postSlugs = {
  52: 'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
  53: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  54: 'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder',
  55: 'fix-guests-who-wont-participate-in-your-murder-mystery-party',
  56: 'fix-boring-murder-mystery-party-transform-forgettable-to-legendary',
  57: 'fix-unrealistic-murder-mystery-party-plots-complete-believability-guide',
  58: 'victorian-mansion-murder-mystery-party-planning',
  59: 'how-to-host-a-haunted-hotel-murder-mystery-check-in-to-danger',
  60: 'wild-west-murder-mystery-party-planning-saddle-up-for-frontier-crime',
  61: 'office-team-building-murder-mystery-corporate-event-planning'
};

console.log('Fetching English posts 52-61...');

for (const [postNum, slug] of Object.entries(postSlugs)) {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('title, content')
      .eq('language', 'en')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    
    if (data) {
      console.log(`Found post ${postNum}: ${data.title.substring(0, 50)}...`);
      writeFileSync(`en-source-post-${postNum}.json`, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(`Error fetching post ${postNum}:`, err.message);
  }
}

console.log('Complete! English sources saved.');
