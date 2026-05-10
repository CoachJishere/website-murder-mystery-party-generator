#!/usr/bin/env node
/**
 * Rot-signal gate for ko + zh-cn drafts.
 *
 * Why: the upstream MT pipeline produced systematically rotted output for
 * those two locales (calque H2 headers, brand-as-H2, length floors way
 * below the rest of the queue). The daily-publish workflow uses this
 * script to decide per-slug whether each of those two languages is safe
 * to flip from draft → published, instead of the previous blanket
 * exclusion.
 *
 * Usage:
 *   node scripts/check-rot-signals.mjs <slug>
 *
 * Output (stdout, single line of JSON):
 *   {
 *     "ko":    { "present": bool, "pass": bool, "length": n, "reasons": [...] },
 *     "zh-cn": { "present": bool, "pass": bool, "length": n, "reasons": [...] }
 *   }
 *
 * Exit codes: 0 always on a clean run (the workflow reads the JSON and
 * decides). Non-zero only on env/network errors.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const slug = process.argv[2];

if (!slug) {
  console.error('usage: check-rot-signals.mjs <slug>');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Length floors — well below any healthy translation, well above the rotted samples.
// EU langs run ~15,800 chars; ja-clean is ~6,800 (CJK density); zh-cn rotted samples
// were ~4,579. Floors are deliberately conservative — false positives (healthy draft
// held back) are recoverable; false negatives (rot shipped live) are the bug we are fixing.
const LENGTH_FLOORS = { ko: 7000, 'zh-cn': 5500 };

const url = `${SUPABASE_URL}/rest/v1/blog_posts`
  + `?slug=eq.${slug}`
  + `&language=in.(ko,zh-cn)`
  + `&select=language,content,status`;

const res = await fetch(url, {
  headers: {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  },
});
if (!res.ok) {
  console.error(`supabase fetch failed: HTTP ${res.status} ${res.statusText}`);
  process.exit(1);
}
const rows = await res.json();

function checkLanguage(lang, content) {
  const reasons = [];

  // 1. Length floor.
  if (content.length < LENGTH_FLOORS[lang]) {
    reasons.push(`length ${content.length} < floor ${LENGTH_FLOORS[lang]}`);
  }

  const h2s = content.split('\n').filter(line => /^##\s+/.test(line));

  for (const h2 of h2s) {
    // 2. Brand-as-H2 — the literal "## mysterymaker.party..." pattern.
    if (/mysterymaker\.party/i.test(h2)) {
      reasons.push(`brand-as-H2: ${h2.slice(0, 80).trim()}`);
      break;
    }
  }

  for (const h2 of h2s) {
    // 3. Generic URL-as-H2 — any domain literal in a header.
    if (/\b[a-z0-9-]+\.(party|com|net|org|io|co|app)\b/i.test(h2)
        && !/mysterymaker/i.test(h2)) {
      reasons.push(`url-as-H2: ${h2.slice(0, 80).trim()}`);
      break;
    }
  }

  // 4. Untranslated English run in H2 — 5+ consecutive Latin-alphabet words
  //    that aren't the brand. Catches MT failures that left source-language
  //    spans inside a translated header.
  for (const h2 of h2s) {
    const stripped = h2.replace(/mysterymaker\.party/gi, '');
    const m = stripped.match(/(?:[A-Za-z][A-Za-z'-]*\s+){4,}[A-Za-z][A-Za-z'-]*/);
    if (m) {
      reasons.push(`untranslated English in H2: ${m[0].slice(0, 60).trim()}`);
      break;
    }
  }

  // 5. KO-specific calque smells.
  if (lang === 'ko') {
    for (const h2 of h2s) {
      const headerText = h2.replace(/^##\s+/, '').trim();
      // Declarative sentence-final endings inside an H2 — healthy KO headers
      // use noun phrases or "~하는 법 / ~하는 방법", not "~합니다."
      if (/(합니다|입니다|있습니다|됩니다|습니다|합니까|입니까)$/.test(headerText)) {
        reasons.push(`ko calque H2 (sentence-final ending): ${headerText.slice(0, 80)}`);
        break;
      }
    }
    for (const h2 of h2s) {
      // English-style explicit pronouns — Korean drops these by default;
      // their presence signals literal MT from English. (No \b — JS word
      // boundaries don't fire between Hangul characters.)
      if (/(그들이|그것이|그것을|그들을|그들의|그것의)/.test(h2)) {
        reasons.push(`ko calque H2 (explicit pronoun): ${h2.slice(0, 80).trim()}`);
        break;
      }
    }
  }

  return {
    present: true,
    pass: reasons.length === 0,
    length: content.length,
    reasons,
  };
}

const out = {};
for (const lang of ['ko', 'zh-cn']) {
  const row = rows.find(r => r.language === lang);
  if (!row) {
    out[lang] = { present: false, pass: false, length: 0, reasons: ['no draft row'] };
    continue;
  }
  out[lang] = checkLanguage(lang, row.content || '');
}

console.log(JSON.stringify(out));
