/**
 * Apply Priority 5 TOCs to all P5 blog cells (theme/setting/character/event
 * posts that don't have a TOC yet). Generates and applies in one pass —
 * idempotent (skips cells that already have the locale TOC heading).
 *
 * Why: the cross-link Related-guides backfill in the prior commit added
 * sibling links for thin cells (220 → 11 healthy). This script does the
 * other half of the GEO work: a numbered TOC at the top of every P5 post
 * so AI engines can extract a clean numbered list of sections.
 *
 * Usage: SUPABASE_SERVICE_KEY=<service-role-key> node scripts/apply-p5-tocs.mjs
 *
 * The anon key in scripts/_supabase-node.mjs gets blocked by RLS on
 * blog_posts UPDATE, so a service-role key is required. The Vercel
 * deployment has it; locally, paste from `mcp supabase get_project_url` +
 * service key in Supabase dashboard.
 *
 * Idempotent: safe to re-run. Cells with the locale TOC heading already
 * present are skipped.
 */

import GithubSlugger from 'github-slugger';
import { createClient } from './_supabase-node.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY env var (anon key cannot UPDATE under RLS).');
  process.exit(1);
}

const TOC_HEADING = {
  en: "What's in this guide", es: 'Qué hay en esta guía', fr: 'Ce que contient ce guide',
  de: 'Was diese Anleitung enthält', it: "Cosa c'è in questa guida", pt: 'O que tem neste guia',
  nl: 'Wat staat er in deze gids', da: 'Hvad guiden indeholder', sv: 'Vad guiden innehåller',
  fi: 'Mitä tämä opas sisältää', ko: '이 가이드에 담긴 내용', ja: 'このガイドの内容', 'zh-cn': '本指南内容一览',
};

// Skip headings that aren't substantive sections (FAQ, related, last-updated,
// closing CTAs). Locale-aware patterns mirror what the daily-publish pipeline
// uses elsewhere.
const SKIP_PATTERN = /^(FAQ|UKK|Frequently Asked|Questions People|Questions fréquemment|Foire aux|Häufig gestellte|Domande frequenti|Preguntas|Perguntas|Veelgestelde|Ofte .tillede|Ofta .tällda|Vanliga frågor|Usein kysytyt|자주 묻는|よくある質問|常见问题|질문|Related guides|Guías relacionadas|Guides associés|Verwandte Guides|Guide correlate|Gerelateerde gidsen|Guias relacionados|Relaterede guides|Relaterade guider|Aiheeseen liittyvät|関連ガイド|관련 가이드|相关指南|Conclusion|Sources|Final Thoughts|Last updated|Sist opdateret|Senast uppdaterad|Última actualización|Última atualização|Dernière mise à jour|Ultimo aggiornamento|Laatst bijgewerkt|Zuletzt aktualisiert|Viimeksi päivitetty|最終更新|最后更新|마지막 업데이트|Ready to|Klaar om|Bereit zu|¿Listo para|Prêt à|Pronto a|Pronto per|Pronto para|준비됐|準備はで|准备好)/i;

const MIN_BODY_CHARS = 80; // skip H2s with bodies shorter than this — usually closing CTAs

function isP5(slug) {
  return !/^5-/.test(slug) && !/^best-/.test(slug) && !/^how-to-fix-/.test(slug) && !/^how-to-host-/.test(slug);
}

// Manual H2 splitter — avoids the `(?=\n## |$)` regex-with-m-flag pitfall
// where `$` matches at every line end, making lookaheads fire too early.
function splitH2Sections(content) {
  const lines = content.split('\n');
  const sections = [];
  let heading = null;
  let body = [];
  for (const line of lines) {
    const m = line.match(/^## (.+)$/);
    if (m) {
      if (heading !== null) sections.push({ heading, body: body.join('\n').trim() });
      heading = m[1].trim();
      body = [];
    } else if (heading !== null) {
      body.push(line);
    }
  }
  if (heading !== null) sections.push({ heading, body: body.join('\n').trim() });
  return sections;
}

function extractTeaser(body) {
  if (!body) return '';
  let clean = body.replace(/^###\s+[^\n]+\n+/, '');
  clean = clean.replace(/^>[^\n]+\n+/, '');
  while (clean.match(/^[-*]\s+/) || clean.match(/^\d+\.\s+/)) {
    const idx = clean.indexOf('\n');
    if (idx === -1) break;
    clean = clean.substring(idx + 1).trim();
    if (!clean) break;
  }
  const sentence = clean.split(/[.!?](?:\s|$)/)[0]
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  if (sentence.length < 15) return '';
  return sentence.substring(0, 110);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fetchAllP5() {
  const all = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id,slug,language,content')
      .eq('status', 'published')
      .order('id', { ascending: true })
      .range(from, from + 499);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 500) break;
  }
  return all.filter(c => isP5(c.slug));
}

async function main() {
  const cells = await fetchAllP5();
  console.log(`P5 cells fetched: ${cells.length}`);

  let applied = 0, alreadyHas = 0, skipped = 0, failed = 0;
  for (const cell of cells) {
    const tocHeading = TOC_HEADING[cell.language] || TOC_HEADING.en;
    if (cell.content.includes('## ' + tocHeading)) { alreadyHas++; continue; }

    const sections = splitH2Sections(cell.content);
    if (sections.length < 4) { skipped++; continue; }

    const slugger = new GithubSlugger();
    const items = [];
    for (const sec of sections) {
      if (SKIP_PATTERN.test(sec.heading)) { slugger.slug(sec.heading); continue; }
      if ((sec.body || '').length < MIN_BODY_CHARS) { slugger.slug(sec.heading); continue; }
      const teaser = extractTeaser(sec.body);
      if (!teaser) { slugger.slug(sec.heading); continue; }
      const anchor = slugger.slug(sec.heading);
      items.push({ heading: sec.heading, anchor, teaser });
      if (items.length >= 5) break;
    }
    if (items.length < 4) { skipped++; continue; }

    const tocBlock = '## ' + tocHeading + '\n\n' +
      items.map((it, i) => `${i + 1}. **[${it.heading}](#${it.anchor})** — ${it.teaser}`).join('\n');

    const firstH2Match = cell.content.match(/^## (.+)$/m);
    if (!firstH2Match) { skipped++; continue; }

    const newContent = cell.content.replace(
      firstH2Match[0],
      `${tocBlock}\n\n${firstH2Match[0]}`
    );

    const { error } = await supabase
      .from('blog_posts')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', cell.id);
    if (error) {
      console.error(`  FAIL ${cell.language}/${cell.slug}: ${error.message}`);
      failed++;
    } else {
      applied++;
      if (applied % 50 === 0) console.log(`  applied ${applied}...`);
    }
  }

  console.log(`\nDone: ${applied} applied, ${alreadyHas} already had TOC, ${skipped} skipped (insufficient structure), ${failed} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
