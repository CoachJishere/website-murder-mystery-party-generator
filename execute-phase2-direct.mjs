#!/usr/bin/env node

/**
 * Execute Phase 2 batch SQL files directly using Supabase client
 * This script reads each SQL file and executes it via the Supabase Postgres connection
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const batchFiles = [
  'batch-pt-1-5.sql',
  'batch-pt-6-10.sql',
  'batch-ko-1-5.sql',
  'batch-ko-6-9.sql',
  'batch-zh-6-9.sql',
  'batch-zh-10-12.sql'
];

async function executeSQLFile(filename) {
  const filePath = join(__dirname, filename);
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Executing: ${filename}`);

  try {
    const sqlContent = await fs.readFile(filePath, 'utf-8');
    console.log(`   Size: ${(sqlContent.length / 1024).toFixed(2)} KB`);

    // Execute the SQL using raw query
    // Note: Supabase JS client doesn't support raw SQL directly,
    // so we need to use the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql_query: sqlContent })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log(`✅ Successfully executed ${filename}`);
    return true;

  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error.message);
    return false;
  }
}

async function verifyCount(language, languageName) {
  const { count, error } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('language', language)
    .eq('status', 'published');

  if (error) {
    console.error(`   Error counting ${languageName}:`, error.message);
    return 0;
  }

  console.log(`   ${languageName}: ${count} posts`);
  return count;
}

async function main() {
  console.log('\n🚀 Phase 2: Direct SQL Execution');
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));

  let successCount = 0;

  for (const file of batchFiles) {
    const success = await executeSQLFile(file);
    if (success) successCount++;

    // Small delay between executions
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Successful: ${successCount}/${batchFiles.length}`);
  console.log(`   Failed: ${batchFiles.length - successCount}`);

  console.log(`\n🔍 Verifying post counts...`);
  const ptCount = await verifyCount('pt', 'Portuguese (pt)');
  const koCount = await verifyCount('ko', 'Korean (ko)');
  const zhCount = await verifyCount('zh-cn', 'Chinese (zh-cn)');

  console.log(`\n${'='.repeat(80)}`);
  console.log('✨ Phase 2 Complete');
  console.log(`⏰ Finished: ${new Date().toLocaleString()}`);
  console.log(`📈 Total posts inserted: ${ptCount + koCount + zhCount}`);
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
