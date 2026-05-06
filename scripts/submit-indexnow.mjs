/**
 * Submit URLs to IndexNow for fast indexing across Bing, Yandex, Seznam, and
 * Naver (Google does not currently consume IndexNow).
 *
 * Why: the daily-publish workflow flips a draft to published across all 13
 * languages at once — that's up to 13 fresh URLs needing crawl. Without
 * IndexNow, Bing's crawler can take days to discover a new URL via sitemap
 * polling. With IndexNow, Bing typically indexes within minutes.
 *
 * Usage modes:
 *   node scripts/submit-indexnow.mjs                       # all published URLs
 *   node scripts/submit-indexnow.mjs --slug=<slug>         # one slug, all langs
 *   node scripts/submit-indexnow.mjs --since=<ISO date>    # everything published-or-updated since that date
 *
 * The IndexNow protocol requires the API key file to be hosted at the site
 * root: https://www.mysterymaker.party/<key>.txt — already deployed via
 * `public/2f97a25b3da3a908fd3253c1f684c536.txt`.
 */

import { createClient } from './_supabase-node.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
const SITE_URL = 'https://www.mysterymaker.party';
const HOST = 'www.mysterymaker.party';
const INDEXNOW_KEY = '2f97a25b3da3a908fd3253c1f684c536';
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

// Bing's IndexNow endpoint. (api.indexnow.org also works and forwards to all
// participating engines, but Bing's endpoint is the fastest path for Bing
// itself, which is the primary consumer here.)
const ENDPOINT = 'https://www.bing.com/indexnow';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

function postUrl(lang, slug) {
  return lang === 'en' ? `${SITE_URL}/blog/${slug}` : `${SITE_URL}/${lang}/blog/${slug}`;
}

async function fetchUrls() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let q = supabase.from('blog_posts').select('language, slug, updated_at').eq('status', 'published');
  if (args.slug) q = q.eq('slug', args.slug);
  if (args.since) q = q.gte('updated_at', args.since);
  const all = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await q.order('id', { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all.map(r => postUrl(r.language, r.slug));
}

async function submitBatch(urls) {
  if (!urls.length) return { ok: true, skipped: true };
  const body = { host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList: urls };
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, statusText: r.statusText };
}

async function main() {
  const urls = await fetchUrls();
  console.log(`Submitting ${urls.length} URLs to IndexNow (${ENDPOINT})...`);

  // IndexNow accepts up to 10,000 URLs per request, but Bing recommends
  // batches of <=10,000 with each URL <=2,048 chars. We're well under that
  // ceiling but split into chunks of 1,000 to keep the request body small.
  const CHUNK = 1000;
  let okCount = 0, failCount = 0;
  for (let i = 0; i < urls.length; i += CHUNK) {
    const batch = urls.slice(i, i + CHUNK);
    const r = await submitBatch(batch);
    if (r.ok) {
      okCount += batch.length;
      console.log(`  batch ${i / CHUNK + 1}: ${batch.length} URLs accepted (HTTP ${r.status})`);
    } else {
      failCount += batch.length;
      console.error(`  batch ${i / CHUNK + 1}: FAILED (HTTP ${r.status} ${r.statusText})`);
    }
  }
  console.log(`Done: ${okCount} accepted, ${failCount} failed.`);
  if (failCount) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
