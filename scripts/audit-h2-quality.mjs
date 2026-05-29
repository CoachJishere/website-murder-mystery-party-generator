#!/usr/bin/env node
/**
 * LLM-assisted H2 quality audit for non-EN blog posts.
 *
 * The brand-leak sweeps (2026-05-10 / 11) cleaned regex-tractable rot but
 * left a residual ~50 cells where translated H2 headings are linguistically
 * awkward — wrong word order, broken case/particle agreement, English words
 * mixed into non-EN headings, etc. Those are translation-quality issues, not
 * pattern-matchable rot, so a regex sweep won't surface them.
 *
 * This script asks Claude Opus 4.7 to scan H2 headings per language and
 * flag the broken ones. It does NOT mutate the database — output is a JSON
 * report you eyeball before deciding what to fix.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/audit-h2-quality.mjs            # all 12 non-EN langs
 *   node scripts/audit-h2-quality.mjs --language ko                            # one language
 *   node scripts/audit-h2-quality.mjs --language ko --limit 30                 # cap H2 count
 *   node scripts/audit-h2-quality.mjs --model claude-haiku-4-5                 # override model
 *   node scripts/audit-h2-quality.mjs --output ./h2-audit-2026-05-11.json
 *
 * Cost: Opus 4.7 across ~1,000 H2s costs roughly $1–3. Haiku 4.5 is ~10× cheaper.
 * Prompt caching reuses the per-language system prompt across batches.
 */
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { createClient } from './_supabase-node.mjs';

// Lightweight .env loader — keeps the script runnable on a fresh checkout
// without adding `dotenv` as a dep. Existing process.env wins.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, raw] = m;
    if (process.env[k]) continue;
    process.env[k] = raw.replace(/^['"]|['"]$/g, '');
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
    return acc;
  }, [])
);

// Accept either the bare names or the VITE-prefixed / ROLE-suffixed ones
// the rest of the project uses, whichever the user has set.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = args.model || 'claude-opus-4-7';
const BATCH_SIZE = 25;
const OUTPUT_PATH = args.output || `./h2-audit-${new Date().toISOString().slice(0, 10)}.json`;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const LANGUAGE_NAMES = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  da: 'Danish', fi: 'Finnish', nl: 'Dutch', sv: 'Swedish', pt: 'Portuguese',
  ko: 'Korean', ja: 'Japanese', 'zh-cn': 'Simplified Chinese',
};

const ALL_LANGS = args.language ? [args.language] : Object.keys(LANGUAGE_NAMES);

function systemPromptFor(language) {
  return `You are reviewing markdown H2 headings (lines starting with "## ") from a blog about murder mystery party planning. The blog publishes in 13 languages; you are reviewing the ${LANGUAGE_NAMES[language]} translations.

The brand is "MysteryMaker" — keep that English spelling. Common loanwords (AI, VR, RSVP, BBQ, app, hotel, etc.) are acceptable in ${LANGUAGE_NAMES[language]}.

Flag a heading as PROBLEMATIC only when it has a real linguistic defect:
- Wrong word order or case/particle agreement that a native speaker would not write
- Untranslated English words (other than the brand and common loanwords)
- Mid-sentence translation cut off, missing connector, or syntactic salad
- Literal MT calque that reads as broken — not just stylistically rough

Do NOT flag:
- Stylistically plain but grammatical headings
- Headings that read fine but could be punchier
- Headings that include the English brand "MysteryMaker"

For each problematic heading, propose a fix: idiomatic ${LANGUAGE_NAMES[language]}, same meaning, brand kept as "MysteryMaker".`;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: '0-based index of the heading in the input list' },
          severity: { type: 'string', enum: ['broken', 'awkward'] },
          issue: { type: 'string', description: 'One sentence describing what is wrong.' },
          suggested_replacement: { type: 'string', description: 'The whole H2 line including the "## " prefix.' },
        },
        required: ['index', 'severity', 'issue', 'suggested_replacement'],
        additionalProperties: false,
      },
    },
  },
  required: ['findings'],
  additionalProperties: false,
};

async function fetchH2sForLanguage(language) {
  // Pull rows + extract H2s in JS (Supabase JS client doesn't expose regex matching cleanly).
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, status, content')
    .eq('language', language);
  if (error) throw error;
  const items = [];
  for (const row of data) {
    if (!row.content) continue;
    const matches = row.content.match(/^##\s+[^\n]+/gm) || [];
    for (const h2 of matches) {
      if (!/[A-Za-z]/.test(h2) && language === 'en') continue;
      items.push({ row_id: row.id, slug: row.slug, status: row.status, h2: h2.trim() });
    }
  }
  return items;
}

async function auditBatch(language, batch) {
  const numbered = batch.map((b, i) => `${i}. ${b.h2}`).join('\n');
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [
      { type: 'text', text: systemPromptFor(language), cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      { role: 'user', content: `Review these ${batch.length} ${LANGUAGE_NAMES[language]} H2 headings. Flag only the problematic ones.\n\n${numbered}` },
    ],
    output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
  });
  const text = response.content.find(b => b.type === 'text')?.text ?? '{"findings":[]}';
  const parsed = JSON.parse(text);
  return { findings: parsed.findings, usage: response.usage };
}

async function auditLanguage(language, limit) {
  console.log(`\n=== ${LANGUAGE_NAMES[language]} (${language}) ===`);
  const allItems = await fetchH2sForLanguage(language);
  // Dedup by h2 text to keep batches small (same headline often repeats across languages-of-same-slug variants is N/A here, but exact dupes within a language do exist)
  const seen = new Set();
  const items = [];
  for (const it of allItems) {
    if (seen.has(it.h2)) continue;
    seen.add(it.h2);
    items.push(it);
  }
  const trimmed = limit ? items.slice(0, limit) : items;
  console.log(`  ${items.length} unique H2s (${allItems.length} occurrences); auditing ${trimmed.length}`);

  const findings = [];
  let cacheReads = 0, cacheWrites = 0, inputTokens = 0, outputTokens = 0;

  for (let i = 0; i < trimmed.length; i += BATCH_SIZE) {
    const batch = trimmed.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(trimmed.length / BATCH_SIZE)}... `);
    try {
      const { findings: batchFindings, usage } = await auditBatch(language, batch);
      cacheReads += usage.cache_read_input_tokens ?? 0;
      cacheWrites += usage.cache_creation_input_tokens ?? 0;
      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;
      for (const f of batchFindings) {
        const item = batch[f.index];
        if (!item) continue;
        findings.push({
          language,
          slug: item.slug,
          status: item.status,
          row_id: item.row_id,
          original: item.h2,
          severity: f.severity,
          issue: f.issue,
          suggested_replacement: f.suggested_replacement,
        });
      }
      console.log(`${batchFindings.length} flagged`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  console.log(`  total flagged: ${findings.length}`);
  console.log(`  tokens: in=${inputTokens} out=${outputTokens} cache_read=${cacheReads} cache_write=${cacheWrites}`);
  return findings;
}

async function main() {
  console.log(`Model: ${MODEL}`);
  console.log(`Languages: ${ALL_LANGS.join(', ')}`);
  const limit = args.limit ? parseInt(args.limit, 10) : null;
  const allFindings = [];
  for (const lang of ALL_LANGS) {
    if (!LANGUAGE_NAMES[lang]) { console.error(`Unknown language: ${lang}`); continue; }
    const findings = await auditLanguage(lang, limit);
    allFindings.push(...findings);
  }
  writeFileSync(OUTPUT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    model: MODEL,
    languages: ALL_LANGS,
    total_findings: allFindings.length,
    findings: allFindings,
  }, null, 2));
  console.log(`\nWrote ${allFindings.length} findings to ${OUTPUT_PATH}`);
  console.log('Review the file, then apply fixes manually or via a follow-up SQL UPDATE keyed by row_id + original.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
