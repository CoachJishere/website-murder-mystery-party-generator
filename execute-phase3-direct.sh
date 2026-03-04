#!/bin/bash

# Execute Italian batch
echo "Executing Italian posts..."
node -e "
import { readFileSync } from 'fs';
import { join } from 'path';
const sql = readFileSync('./phase3-it-batch.sql', 'utf-8');
console.log(sql);
" | psql "postgresql://postgres.mhfikaomkmqcndqfohbp:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Execute Swedish batch
echo "Executing Swedish posts..."
node -e "
import { readFileSync } from 'fs';
const sql = readFileSync('./phase3-sv-batch.sql', 'utf-8');
console.log(sql);
" | psql "postgresql://postgres.mhfikaomkmqcndqfohbp:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Execute Dutch batch
echo "Executing Dutch posts..."
node -e "
import { readFileSync } from 'fs';
const sql = readFileSync('./phase3-nl-batch.sql', 'utf-8');
console.log(sql);
" | psql "postgresql://postgres.mhfikaomkmqcndqfohbp:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Execute Japanese batch
echo "Executing Japanese posts..."
node -e "
import { readFileSync } from 'fs';
const sql = readFileSync('./phase3-ja-batch.sql', 'utf-8');
console.log(sql);
" | psql "postgresql://postgres.mhfikaomkmqcndqfohbp:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

echo "Done!"
