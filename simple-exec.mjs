#!/usr/bin/env node

/**
 * Simple executor - reads SQL file and prints it for manual execution
 */

import fs from 'fs/promises';

const file = process.argv[2] || 'batch-pt-1-5.sql';

console.log(`Reading ${file}...`);
const sql = await fs.readFile(file, 'utf-8');

console.log('\n=== SQL CONTENT ===');
console.log('Length:', sql.length, 'characters');
console.log('Size:', (sql.length / 1024).toFixed(2), 'KB');
console.log('\nFirst 500 chars:');
console.log(sql.substring(0, 500));
console.log('\nLast 500 chars:');
console.log(sql.substring(sql.length - 500));
console.log('\n=== READY FOR EXECUTION ===');
console.log('To execute via psql:\n');
console.log(`psql "postgresql://postgres:[YOUR_PASSWORD]@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres" -f ${file}`);
console.log('\nOr via Supabase SQL Editor:\n1. Open https://supabase.com/dashboard/project/mhfikaomkmqcndqfohbp/sql\n2. Paste the SQL content\n3. Run');
