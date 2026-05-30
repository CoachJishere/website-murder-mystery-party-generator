// One-off: upload an existing blog-hero crop to Supabase storage at a stable path.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createClient } from '../_supabase-node.mjs';

const [, , localPath, storageKey] = process.argv;
if (!localPath || !storageKey) {
  console.error('Usage: node upload-blog-hero.mjs <local-png> <bucket-key>');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const buf = await readFile(localPath);
const { error } = await supabase.storage
  .from('pinterest-pins')
  .upload(storageKey, buf, { contentType: 'image/png', upsert: true });
if (error) { console.error(error.message); process.exit(1); }

const { data } = supabase.storage.from('pinterest-pins').getPublicUrl(storageKey);
console.log(data.publicUrl);
