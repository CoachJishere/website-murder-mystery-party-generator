import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const supabase = createClient(supabaseUrl, supabaseKey);

const missingPosts = [
  {
    "id": "47ecf1b0-7a33-4966-8939-755a6858bdfd",
    "title": "How to Fix Poor Mystery Pacing Issues: Master the Art of Murder Mystery Timing",
    "slug": "how-to-fix-poor-mystery-pacing-issues-master-the-art-of-murder-mystery-timing"
  },
  {
    "id": "f4678c7e-d6af-4e2a-8a16-452b5aeb102f",
    "title": "How to Fix Unrealistic Murder Mystery Plots: Create Believable Storylines That Captivate",
    "slug": "how-to-fix-unrealistic-murder-mystery-plots-create-believable-storylines-that-captivate"
  },
  {
    "id": "aa97dd47-7bcd-417f-a2b2-15832d4b3c78",
    "title": "How to Fix Unsatisfying Mystery Endings: Create Reveals That Actually Satisfy",
    "slug": "how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy"
  },
  {
    "id": "3cb1b819-7c13-4630-95ed-494ef515fd0a",
    "title": "How to Host a Space Station Murder Mystery",
    "slug": "how-to-host-a-space-station-murder-mystery"
  },
  {
    "id": "f9e5ae63-d483-42e0-845e-6c5ce69c3624",
    "title": "How to Host a Victorian Murder Mystery Party",
    "slug": "how-to-host-a-victorian-murder-mystery-party"
  }
];

async function fetchPosts() {
  const results = [];

  for (let i = 0; i < missingPosts.length; i++) {
    const post = missingPosts[i];
    console.log(`\n[${i + 1}/5] Fetching: ${post.title}`);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', post.id)
      .eq('language', 'en')
      .single();

    if (error) {
      console.error(`Error fetching ${post.slug}:`, error);
      continue;
    }

    if (data) {
      results.push({
        index: i + 16,
        ...data
      });
      console.log(`✓ Fetched successfully`);
    }
  }

  fs.writeFileSync(
    'fr-batch4-posts.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`\n✓ Saved ${results.length} posts to fr-batch4-posts.json`);
}

fetchPosts();
