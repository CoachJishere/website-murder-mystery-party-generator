#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const batchFiles = [
  { file: 'batch-pt-1-5.sql', desc: 'Portuguese posts 1-5' },
  { file: 'batch-pt-6-10.sql', desc: 'Portuguese posts 6-10' },
  { file: 'batch-ko-1-5.sql', desc: 'Korean posts 1-5' },
  { file: 'batch-ko-6-9.sql', desc: 'Korean posts 6-9' },
  { file: 'batch-zh-6-9.sql', desc: 'Chinese posts 6-9' },
  { file: 'batch-zh-10-12.sql', desc: 'Chinese posts 10-12' }
];

async function executeSQLFile(filepath, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Executing: ${description}`);
  console.log(`   File: ${filepath}`);
  console.log('='.repeat(80));

  try {
    const sqlContent = await fs.readFile(filepath, 'utf-8');
    console.log(`   Size: ${(sqlContent.length / 1024).toFixed(2)} KB`);

    // Use the REST API to execute raw SQL via Supabase
    // We need to execute this as a raw query
    const { data, error } = await supabase.rpc('exec_raw_sql', {
      query: sqlContent
    });

    if (error) {
      console.error(`❌ Error executing ${filepath}:`, error);
      return { success: false, error };
    }

    console.log(`✅ Successfully executed ${filepath}`);
    return { success: true, data };

  } catch (err) {
    console.error(`❌ Exception executing ${filepath}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function verifyInsertions() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 VERIFYING INSERTIONS');
  console.log('='.repeat(80));

  const languages = [
    { code: 'pt', name: 'Portuguese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-cn', name: 'Chinese (Simplified)' }
  ];

  for (const { code, name } of languages) {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('language', code)
      .eq('status', 'published');

    if (error) {
      console.error(`❌ Error counting ${name} posts:`, error.message);
    } else {
      console.log(`   ${name} (${code}): ${count} posts`);
    }
  }
}

async function main() {
  console.log('\n🚀 Phase 2 Batch Execution Starting...');
  console.log(`   Time: ${new Date().toISOString()}`);

  let successCount = 0;
  const results = [];

  for (const { file, desc } of batchFiles) {
    const result = await executeSQLFile(file, desc);
    results.push({ file, desc, ...result });

    if (result.success) {
      successCount++;
    }

    // Wait a bit between executions to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Successful: ${successCount}/${batchFiles.length}`);
  console.log(`   Failed: ${batchFiles.length - successCount}/${batchFiles.length}`);

  if (successCount < batchFiles.length) {
    console.log('\n❌ Failed files:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.file}: ${r.error?.message || r.error}`);
    });
  }

  // Verify final counts
  await verifyInsertions();

  console.log(`\n${'='.repeat(80)}`);
  console.log('✨ Phase 2 Execution Complete');
  console.log('='.repeat(80)\n);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
