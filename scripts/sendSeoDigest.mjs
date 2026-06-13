/**
 * Posts the generated SEO digest (temp-files/seo-digest.html) to the
 * send-seo-digest edge function, which emails it via Resend. See ADR-0018.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, optional SEO_DIGEST_RECIPIENT.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(__dirname, '../temp-files/seo-digest.html');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RECIPIENT = process.env.SEO_DIGEST_RECIPIENT || 'millerdjonathan@proton.me';

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  const html = readFileSync(HTML_PATH, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-seo-digest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: `📈 SEO/GEO digest — week ending ${today}`,
      html,
      to: RECIPIENT,
    }),
  });

  if (!res.ok) {
    console.error(`send-seo-digest failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log(`Digest emailed to ${RECIPIENT}`);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
