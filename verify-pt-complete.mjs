import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Count Portuguese posts from this translation batch (updated since Feb 22)
const { count: recentCount } = await supabase
  .from('blog_posts')
  .select('*', { count: 'exact', head: true })
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00');

// Count all Portuguese posts
const { count: totalCount } = await supabase
  .from('blog_posts')
  .select('*', { count: 'exact', head: true })
  .eq('language', 'pt');

// Count English optimized posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00');

const optimizedCount = enPosts.filter(p => p.content && p.content.includes('*Published: February 16, 2026')).length;

console.log('PORTUGUESE TRANSLATION STATUS');
console.log('============================\n');
console.log(`Target English posts: ${optimizedCount}`);
console.log(`Portuguese posts (this batch): ${recentCount}`);
console.log(`Total Portuguese posts: ${totalCount}`);
console.log(`\nStatus: ${recentCount >= optimizedCount ? '✅ COMPLETE' : '⏳ IN PROGRESS'}`);
console.log(`Progress: ${recentCount}/${optimizedCount} (${Math.round(recentCount/optimizedCount*100)}%)`);
