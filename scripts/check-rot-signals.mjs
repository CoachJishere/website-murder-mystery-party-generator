#!/usr/bin/env node
/**
 * Rot-signal gate for all 12 non-EN languages.
 *
 * Why: the upstream MT pipeline produced systematically rotted output across
 * the full translation queue. Originally only ko + zh-cn were gated (May 2026
 * diagnostic). A May 2026 audit of the other 10 languages found the same rot
 * patterns at varying rates (ja 23%, de 9.7%, es 9.3%, others 1–5%). After
 * regenerating all failing cells the gate was extended to cover every non-EN
 * language so future drafts get the same protection.
 *
 * Usage:
 *   node scripts/check-rot-signals.mjs <slug>
 *
 * Output (stdout, single line of JSON — one key per non-EN language):
 *   {
 *     "ko":    { "present": bool, "pass": bool, "length": n, "reasons": [...] },
 *     "zh-cn": { "present": bool, "pass": bool, "length": n, "reasons": [...] },
 *     "es":    { ... },
 *     ...
 *   }
 *
 * Library use:
 *   import { checkLanguage, LENGTH_FLOORS, LENGTH_FLOOR_MULT } from './check-rot-signals.mjs';
 *
 * Exit codes: 0 always on a clean run (the workflow reads the JSON and
 * decides). Non-zero only on env/network errors.
 */

import { pathToFileURL } from 'node:url';

// CJK langs: fixed absolute floors (chars). Conservative — false positives
// (healthy draft held back) are recoverable; false negatives (rot shipped
// live) are the bug we are fixing.
export const LENGTH_FLOORS = { ko: 7000, 'zh-cn': 5500 };

// Non-CJK langs: floor as a fraction of EN content length. Only applied when
// enLength is passed to checkLanguage — if EN length is unknown, the relative
// check is skipped (better to skip than to false-positive on a slug where EN
// is unusually short).
export const LENGTH_FLOOR_MULT = {
  es: 0.65, fr: 0.65, de: 0.65, it: 0.65, pt: 0.65,
  nl: 0.65, da: 0.65, sv: 0.65, fi: 0.65,
  ja: 0.30,
};

// Languages whose native script is not Latin-based. Heuristic 6 (English-only
// H2) only fires for these — a Romance/Germanic H2 with all-Latin text is normal.
const NON_LATIN_LANGS = new Set(['ja']);

// English function words that are unambiguously English across all 10 target
// languages. Deliberately excludes ambiguous overlaps (de "in/was", da "at",
// nl "of/is", etc.). Unicode-aware boundary so \b doesn't misfire on accented
// characters (e.g. matching "her" inside "heróis").
const EN_STOPWORDS = [
  'the', 'and', 'of', 'with', 'without', 'from', 'by', 'to', 'if', 'than',
  'then', 'but', 'this', 'that', 'these', 'those', 'your', 'our', 'their',
  'his', 'what', 'when', 'where', 'why', 'how', 'who', 'which', 'into',
  'onto', 'about',
];
const STOPWORD_RX = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${EN_STOPWORDS.join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
);

/**
 * Check a single (lang, content) cell against all rot signals.
 *
 * @param {string} lang      - ISO language code, e.g. 'ko', 'zh-cn', 'ja', 'es'
 * @param {string} content   - The cell's markdown content
 * @param {number} enLength  - Char length of the EN source (0 = unknown, skips relative floor)
 */
export function checkLanguage(lang, content, enLength = 0) {
  const reasons = [];

  // 1. Length floor.
  if (LENGTH_FLOORS[lang] !== undefined) {
    // CJK langs: fixed absolute floor.
    if (content.length < LENGTH_FLOORS[lang]) {
      reasons.push(`length ${content.length} < floor ${LENGTH_FLOORS[lang]}`);
    }
  } else if (LENGTH_FLOOR_MULT[lang] !== undefined && enLength > 0) {
    // Non-CJK langs: relative floor vs EN.
    const floor = Math.floor(enLength * LENGTH_FLOOR_MULT[lang]);
    if (content.length < floor) {
      reasons.push(
        `length ${content.length} < ${(LENGTH_FLOOR_MULT[lang] * 100).toFixed(0)}% of EN (${enLength}) = ${floor}`
      );
    }
  }

  const h2s = content.split('\n').filter(line => /^##\s+/.test(line));

  // 2. Brand-as-H2 — the literal "## mysterymaker.party..." pattern.
  for (const h2 of h2s) {
    if (/mysterymaker\.party/i.test(h2)) {
      reasons.push(`brand-as-H2: ${h2.slice(0, 80).trim()}`);
      break;
    }
  }

  // 3. Generic URL-as-H2 — any domain literal in a heading.
  for (const h2 of h2s) {
    if (/\b[a-z0-9-]+\.(party|com|net|org|io|co|app)\b/i.test(h2)
        && !/mysterymaker/i.test(h2)) {
      reasons.push(`url-as-H2: ${h2.slice(0, 80).trim()}`);
      break;
    }
  }

  // 4. CJK langs: untranslated English run in H2 (5+ consecutive Latin words).
  //    Not used for Latin-script languages — they share the Latin alphabet so
  //    a 5-word run is not a reliable calque signal (heuristic 5 covers them).
  if (lang === 'ko' || lang === 'zh-cn') {
    for (const h2 of h2s) {
      const stripped = h2.replace(/mysterymaker\.party/gi, '');
      const m = stripped.match(/(?:[A-Za-z][A-Za-z'-]*\s+){4,}[A-Za-z][A-Za-z'-]*/);
      if (m) {
        reasons.push(`untranslated English in H2: ${m[0].slice(0, 60).trim()}`);
        break;
      }
    }
  }

  // 5. KO-specific calque smells (kept from original gate).
  if (lang === 'ko') {
    for (const h2 of h2s) {
      const headerText = h2.replace(/^##\s+/, '').trim();
      if (/(합니다|입니다|있습니다|됩니다|습니다|합니까|입니까)$/.test(headerText)) {
        reasons.push(`ko calque H2 (sentence-final ending): ${headerText.slice(0, 80)}`);
        break;
      }
    }
    for (const h2 of h2s) {
      if (/(그들이|그것이|그것을|그들을|그들의|그것의)/.test(h2)) {
        reasons.push(`ko calque H2 (explicit pronoun): ${h2.slice(0, 80).trim()}`);
        break;
      }
    }
  }

  // 6. Non-CJK langs: English stopword cluster in H2. Two or more unambiguously
  //    English function words in a single heading means the heading was not
  //    translated. Threshold is 1 for ja (any English stopword in a Japanese
  //    heading is suspicious) and 2 for Latin-script languages.
  if (LENGTH_FLOOR_MULT[lang] !== undefined) {
    const threshold = NON_LATIN_LANGS.has(lang) ? 1 : 2;
    for (const h2 of h2s) {
      const headerText = h2.replace(/^##\s+/, '').trim();
      const uniq = new Set((headerText.match(STOPWORD_RX) || []).map(m => m.toLowerCase()));
      if (uniq.size >= threshold) {
        reasons.push(
          `English stopwords in H2 (${uniq.size}: ${[...uniq].join(',')}): ${headerText.slice(0, 80)}`
        );
        break;
      }
    }
  }

  // 7. English-only H2 (non-Latin-script langs only). A heading with zero
  //    non-Latin characters in a Japanese cell is an untranslated source line.
  if (NON_LATIN_LANGS.has(lang)) {
    for (const h2 of h2s) {
      const headerText = h2.replace(/^##\s+/, '').trim();
      if (!headerText) continue;
      if (!/[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}\p{M}]/u.test(headerText)) {
        reasons.push(`English-only H2: ${headerText.slice(0, 80)}`);
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

// CLI entrypoint — only runs when invoked directly, not when imported.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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

  const ALL_LANGS = ['ko', 'zh-cn', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'da', 'sv', 'fi', 'ja'];

  // Fetch EN + all 12 non-EN cells for this slug in one request.
  const url = `${SUPABASE_URL}/rest/v1/blog_posts`
    + `?slug=eq.${slug}`
    + `&language=in.(en,${ALL_LANGS.join(',')})`
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

  const enRow = rows.find(r => r.language === 'en');
  const enLength = enRow ? (enRow.content || '').length : 0;

  const out = {};
  for (const lang of ALL_LANGS) {
    const row = rows.find(r => r.language === lang);
    if (!row) {
      out[lang] = { present: false, pass: false, length: 0, reasons: ['no draft row'] };
      continue;
    }
    out[lang] = checkLanguage(lang, row.content || '', enLength);
  }

  console.log(JSON.stringify(out));
}
