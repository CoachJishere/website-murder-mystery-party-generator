#!/usr/bin/env node
/**
 * Rot-signal gate for ko + zh-cn blog `title` and `meta_description` columns.
 *
 * Why: the content-column gate at scripts/check-rot-signals.mjs cleared every
 * ko + zh-cn draft + published row by May 2026, but `title` and
 * `meta_description` were never audited. They came out of the same MT pipeline
 * that produced the content rot, so similar calque patterns are likely:
 * sentence-final declarative KO endings, English-syntax word order, brand-URL
 * dropped in as literal text, length-truncated ZH-CN.
 *
 * Heuristics here are adapted from check-rot-signals.mjs but applied to
 * single-line fields. The H2-anchor checks (line-prefix `## `) don't apply;
 * the underlying calque concepts do.
 *
 * Library use:
 *   import { checkTitle, checkMeta } from './check-title-rot.mjs';
 *   checkTitle('ko', title, enTitle);  // enTitle optional; enables ratio check
 *   checkMeta('ko', meta, enMeta);     // enMeta optional
 *
 * Each returns { pass: bool, length: n, reasons: [...] }.
 *
 * CLI use (single slug, all checks against live DB):
 *   node scripts/check-title-rot.mjs <slug>
 */

import { pathToFileURL } from 'node:url';

// SEO sweet spot vs. flagged extremes. The healthy band is a soft target;
// the flagged band is what we'll regenerate. CJK titles can read fine at the
// shorter end of the band but Google still truncates by pixel width, and the
// rotted samples we want to catch tend to either be one-word ports or 200-char
// run-on sentences from MT failures.
export const TITLE_HEALTHY = { min: 30, max: 70 };
export const TITLE_FAIL    = { min: 20, max: 70 };
export const META_HEALTHY  = { min: 120, max: 170 };
export const META_FAIL     = { min: 80, max: 170 };

// EN/target length ratio bounds. CJK is denser than English, so a healthy
// ko/zh-cn title is typically ~0.5–1.2× the EN char count. <0.4 = likely
// truncated; >1.8 = likely a literal back-translation that ran long.
export const RATIO_BOUNDS = { lo: 0.4, hi: 1.8 };

const BRAND_LITERAL = /mysterymaker\.party/i;

// Untranslated-English run: N+ consecutive Latin-alphabet words (excluding
// the brand). Threshold differs for title vs meta because metas have more
// room and benign English fragments (e.g. game names, "Q&A", "DIY") may
// legitimately appear.
function untranslatedEnglishRun(text, minWords) {
  const stripped = text.replace(/mysterymaker\.party/gi, '')
                       .replace(/Mystery Maker/gi, '');
  const re = new RegExp(`(?:[A-Za-z][A-Za-z'-]*\\s+){${minWords - 1},}[A-Za-z][A-Za-z'-]*`);
  return stripped.match(re);
}

// KO calque smells reused from H2 check. Same intuition: declarative
// sentence-final endings are wrong for any title-cased / headline field;
// healthy KO titles are noun phrases or "~하는 법 / ~하는 방법". The H2 check
// enumerated specific verb forms (합니다/입니다/됩니다/습니다/...) but for titles
// we use a broader rule: any title ending in the polite-formal -니다 or
// -니까 (with optional trailing punctuation) is rotted, since these are
// sentence enders and a title should never be a full sentence. Covers
// 합니다 / 됩니다 / 습니다 / 알려드립니다 / 보입니다 / etc. in one pattern.
const KO_CALQUE_ENDING = /(니다|니까)[.!?]?$/;
const KO_EXPLICIT_PRONOUN = /(그들이|그것이|그것을|그들을|그들의|그것의)/;

function ratioCheck(targetText, enText) {
  if (!enText || !enText.length) return null;
  const r = targetText.length / enText.length;
  if (r < RATIO_BOUNDS.lo) return `length ratio ${r.toFixed(2)} vs EN (<${RATIO_BOUNDS.lo})`;
  if (r > RATIO_BOUNDS.hi) return `length ratio ${r.toFixed(2)} vs EN (>${RATIO_BOUNDS.hi})`;
  return null;
}

export function checkTitle(lang, title, enTitle) {
  const reasons = [];
  const t = (title || '').trim();

  if (!t) {
    return { pass: false, length: 0, reasons: ['empty title'] };
  }

  if (t.length < TITLE_FAIL.min) {
    reasons.push(`title length ${t.length} < ${TITLE_FAIL.min}`);
  } else if (t.length > TITLE_FAIL.max) {
    reasons.push(`title length ${t.length} > ${TITLE_FAIL.max}`);
  }

  if (BRAND_LITERAL.test(t)) {
    reasons.push(`brand-as-text in title: mysterymaker.party literal`);
  }

  const m = untranslatedEnglishRun(t, 4);
  if (m) {
    reasons.push(`untranslated English in title: ${m[0].slice(0, 60).trim()}`);
  }

  if (lang === 'ko') {
    if (KO_CALQUE_ENDING.test(t)) {
      reasons.push(`ko calque title (sentence-final ending): ${t.slice(-12)}`);
    }
    if (KO_EXPLICIT_PRONOUN.test(t)) {
      reasons.push(`ko calque title (explicit pronoun)`);
    }
  }

  const ratio = ratioCheck(t, enTitle);
  if (ratio) reasons.push(ratio);

  return { pass: reasons.length === 0, length: t.length, reasons };
}

export function checkMeta(lang, meta, enMeta) {
  const reasons = [];
  const m = (meta || '').trim();

  if (!m) {
    return { pass: false, length: 0, reasons: ['empty meta'] };
  }

  if (m.length < META_FAIL.min) {
    reasons.push(`meta length ${m.length} < ${META_FAIL.min}`);
  } else if (m.length > META_FAIL.max) {
    reasons.push(`meta length ${m.length} > ${META_FAIL.max}`);
  }

  if (BRAND_LITERAL.test(m)) {
    reasons.push(`brand-as-text in meta: mysterymaker.party literal`);
  }

  const eng = untranslatedEnglishRun(m, 6);
  if (eng) {
    reasons.push(`untranslated English in meta: ${eng[0].slice(0, 60).trim()}`);
  }

  if (lang === 'ko') {
    // Metas may end on a declarative sentence — that's natural prose, unlike
    // a title. So we don't apply the sentence-final-ending check to metas.
    // We DO still flag explicit pronouns since those are MT-literal markers
    // regardless of register.
    if (KO_EXPLICIT_PRONOUN.test(m)) {
      reasons.push(`ko calque meta (explicit pronoun)`);
    }
  }

  const ratio = ratioCheck(m, enMeta);
  if (ratio) reasons.push(ratio);

  return { pass: reasons.length === 0, length: m.length, reasons };
}

// CLI entrypoint — fetches the EN + ko + zh-cn rows for one slug and prints
// the verdict for both columns in both languages.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const slug = process.argv[2];

  if (!slug) {
    console.error('usage: check-title-rot.mjs <slug>');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('missing SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const url = `${SUPABASE_URL}/rest/v1/blog_posts`
    + `?slug=eq.${slug}`
    + `&language=in.(en,ko,zh-cn)`
    + `&select=language,title,meta_description,status`;

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
  const en = rows.find(r => r.language === 'en');

  const out = {};
  for (const lang of ['ko', 'zh-cn']) {
    const row = rows.find(r => r.language === lang);
    if (!row) {
      out[lang] = { present: false };
      continue;
    }
    out[lang] = {
      present: true,
      status: row.status,
      title: checkTitle(lang, row.title || '', en?.title || ''),
      meta:  checkMeta(lang,  row.meta_description || '', en?.meta_description || ''),
    };
  }

  console.log(JSON.stringify(out, null, 2));
}
