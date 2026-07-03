/**
 * Prerender every published blog post into static HTML at build time.
 *
 * Why: this site is a pure Vite SPA. Without prerendering, every blog URL
 * serves the same `index.html` shell (title "Murder Mystery Party Generator",
 * description "Lovable Generated Project", empty body). All schema, hreflang,
 * canonical, and og tags injected via react-helmet-async render *client-side*
 * only — invisible to ChatGPT browse, Perplexity bot, LLM training crawlers,
 * and even Google's first-pass index. This script generates per-post static
 * HTML at `dist/<lang>/blog/<slug>/index.html` (or `dist/blog/<slug>/index.html`
 * for EN) so crawlers see real metadata and content from the first byte. The
 * React app still hydrates on top for users.
 *
 * Strategy:
 *   1. Read `dist/index.html` (vite output) as the template, including its
 *      asset script tags.
 *   2. Pull every published row from `blog_posts` plus a per-slug map of
 *      sibling-language slugs for hreflang.
 *   3. For each row: render markdown → HTML via the same unified pipeline the
 *      React side uses (remark-parse, remark-rehype, rehype-slug, rehype-raw,
 *      rehype-stringify), compute SEO head (title, description, canonical,
 *      hreflang, og, twitter), compute every JSON-LD graph (BlogPosting,
 *      FAQPage, HowTo, ItemList, BreadcrumbList, Product comparison), and
 *      write the file.
 *   4. Vercel serves static files first, then falls through to its catch-all
 *      `/(.*) → /index.html` rewrite — so generated paths win automatically.
 *
 * Usage: node scripts/prerender-blog.mjs (run after `vite build`)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import GithubSlugger from 'github-slugger';
import { createClient } from './_supabase-node.mjs';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const TEMPLATE_PATH = join(DIST, 'index.html');
const SITE_URL = 'https://www.mysterymaker.party';
const FALLBACK_SHARE_IMAGE = `${SITE_URL}/images/homepage-share-image.png`;

// Supabase project URL + anon key (public; same as scripts/generate-sitemap.mjs).
// Hardcoded so the build doesn't depend on a Vercel-side env var being set.
// Env-var override is gated on `startsWith('http')` because the local .env
// ships with placeholder strings ("your-local-supabase-url") that would
// otherwise satisfy a `||` truthy check and break the build.
const ENV_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_URL = (typeof ENV_URL === 'string' && ENV_URL.startsWith('http'))
  ? ENV_URL
  : 'https://mhfikaomkmqcndqfohbp.supabase.co';
const ENV_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_KEY = (typeof ENV_KEY === 'string' && ENV_KEY.startsWith('ey'))
  ? ENV_KEY
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
if (!existsSync(TEMPLATE_PATH)) {
  console.error(`Template not found at ${TEMPLATE_PATH}. Run \`vite build\` first.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const template = readFileSync(TEMPLATE_PATH, 'utf8');

// Markdown → HTML pipeline. Mirrors the React-side ReactMarkdown config (remark-gfm
// + rehype-slug + rehype-raw) so anchor IDs match what the rendered React component
// produces and GFM tables render as real <table> elements in both.
const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeStringify, { allowDangerousHtml: true });

async function renderMarkdown(md) {
  const file = await markdownProcessor.process(md);
  return String(file);
}

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function postUrl(lang, slug) {
  return `${SITE_URL}${lang === 'en' ? '' : `/${lang}`}/blog/${slug}/`;
}

// Parse the GEO-optimized "1. **[name](#anchor)** — teaser" numbered block.
// Same regex as src/pages/BlogPost.tsx; kept in sync by hand for now.
function parseNumberedAnchorBlock(content) {
  const items = [];
  const re = /^\d+\.\s+\*\*\[([^\]]+)\]\(#([^)]+)\)\*\*\s*[—-]\s*(.+)$/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    items.push({
      name: m[1].trim(),
      anchor: m[2].trim(),
      teaser: m[3].trim().replace(/\*\*([^*]+)\*\*/g, '$1'),
    });
  }
  return items.length >= 2 ? items : null;
}

// FAQ extractor — mirrors React-side regex, returns null if no FAQ section.
function extractFaq(content) {
  const headingRe = /##\s*(?:Frequently Asked Questions|Questions People Actually Ask|FAQ|Preguntas [Ff]recuent\w*|Questions fréquemment posées|Foire aux questions|Häufig gestellte Fragen|Domande frequenti|Perguntas [Ff]requent\w*|Veelgestelde vragen|Ofte [Ss]tillede [Ss]pørgsmål|Ofta [Ss]tällda [Ff]rågor|Vanliga frågor|Usein kysytyt kysymykset|UKK|자주 묻는 질문|よくある質問|常见问题)[^\n]*\n([\s\S]*?)(?=\n## [^#]|$)/i;
  const m = content.match(headingRe);
  if (!m) return null;
  const section = m[1];
  const qa = [];
  // Pattern 1: ### Question? / answer. Accepts ASCII `?` or full-width `？`.
  for (const x of section.matchAll(/###\s*(.+?[?？])\s*\n([\s\S]*?)(?=\n###\s|\n## |$)/g)) {
    const q = x[1].trim();
    const a = x[2].trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, ' ').trim();
    if (q && a) qa.push({ question: q, answer: a });
  }
  // Pattern 2: **Q: …** \n A: … (some translations) — letter-prefixed bold.
  if (qa.length === 0) {
    for (const x of section.matchAll(/\*\*(?:Q|P|F|V|D|S|K):\s*(.+?[?？])\s*\*\*\s*\n+\s*(?:A|R|S|V|D|K):\s*([\s\S]*?)(?=\n\*\*(?:Q|P|F|V|D|S|K):|$)/gi)) {
      const q = x[1].trim();
      const a = x[2].trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, ' ').trim();
      if (q && a) qa.push({ question: q, answer: a });
    }
  }
  // Pattern 3: **Question?** Answer — no letter prefix. The most common
  // machine-translation output across non-EN locales: bold-question convention
  // preserved but the Q:/A: letter prefixes dropped. Terminator is [?？.] and
  // the answer may follow on the same line OR after a newline:
  //   - Some EN posts use "**What if I can't afford backup equipment.** You..."
  //     (period, inline answer)
  //   - Some non-EN posts use "**Question?**\n\nAnswer paragraph"
  // Both shapes need to work, so the separator is `\s+` not `\s*\n+\s*`.
  if (qa.length === 0) {
    for (const x of section.matchAll(/\*\*([^*\n]+[?？.])\*\*\s+([\s\S]*?)(?=\n\s*\*\*[^*\n]+[?？.]\*\*|\n## |$)/g)) {
      const q = x[1].trim();
      const a = x[2].trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, ' ').trim();
      if (q && a) qa.push({ question: q, answer: a });
    }
  }
  return qa.length ? qa : null;
}

function buildSchemas(post, langVariants) {
  const url = postUrl(post.language, post.slug);
  const schemas = [];

  // BlogPosting
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description,
    image: post.featured_image_url || FALLBACK_SHARE_IMAGE,
    author: { '@type': 'Person', name: post.author && post.author !== 'AI Assistant' ? post.author : 'Jonathan Miller', url: `${SITE_URL}/about` },
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    publisher: { '@type': 'Organization', name: 'Mystery Maker', logo: { '@type': 'ImageObject', url: FALLBACK_SHARE_IMAGE } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: post.language,
  });

  // BreadcrumbList — always emit
  const langPrefix = post.language === 'en' ? '' : `/${post.language}`;
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}${langPrefix}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}${langPrefix}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  });

  // FAQPage
  const faq = extractFaq(post.content);
  if (faq) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(qa => ({ '@type': 'Question', name: qa.question, acceptedAnswer: { '@type': 'Answer', text: qa.answer } })),
    });
  }

  // HowTo — slug/title how-to-shaped, OR content has a `## Step N` / `## How To`
  // section WITHOUT a numbered-anchor TOC block. The content clause mirrors
  // src/pages/BlogPost.tsx, but is gated on "no anchor TOC" so posts that already
  // emit ItemList from their TOC keep doing so (narrow blast radius); only the
  // `## Step N:`-style guides (no TOC) newly emit HowTo to match the client.
  const anchorToc = parseNumberedAnchorBlock(post.content);
  const hasAnchorToc = anchorToc && anchorToc.length >= 3;
  const isHowTo = /^how-to/i.test(post.slug) || /^how[\s-]to/i.test(post.title) || /^(Sådan|Kuinka|So |Wie du|Comment|Cómo|Como|Come |Hoe |Hur man|Hvordan)/i.test(post.title) || /方法/.test(post.title) || (/## (?:step\s*\d|how to)/i.test(post.content) && !hasAnchorToc);
  if (isHowTo) {
    // Pattern 0 (preferred): numbered linked-anchor TOC block → steps with anchors.
    const linked = anchorToc;
    let steps = [];
    if (linked && linked.length >= 3) {
      steps = linked.map((it, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: it.name,
        text: it.teaser.substring(0, 500),
        url: `${url}#${it.anchor}`,
      }));
    } else {
      // Pattern 1: `## Step N: Title` headings → steps without anchors.
      for (const sm of post.content.matchAll(/##\s*(?:Step\s*\d+[:.]\s*)(.+?)\n([\s\S]*?)(?=\n## |$)/gi)) {
        const name = sm[1].trim();
        const text = sm[2].trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, ' ').substring(0, 500);
        if (name && text) steps.push({ '@type': 'HowToStep', position: steps.length + 1, name, text });
      }
    }
    if (steps.length >= 2) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: post.title,
        description: post.meta_description,
        step: steps,
      });
    }
  }

  // ItemList for any post that has a numbered linked-anchor block at the top
  // and isn't a how-to (how-to gets HowTo schema instead). This catches the
  // 5-X-themes listicles AND every P5 post that got a "What's in this guide"
  // TOC via apply-p5-tocs.mjs — both share the same numbered-anchor structure.
  if (!isHowTo) {
    const items = parseNumberedAnchorBlock(post.content);
    if (items && items.length >= 3) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: post.title,
        description: post.meta_description,
        numberOfItems: items.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: items.map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.name,
          url: `${url}#${it.anchor}`,
          description: it.teaser.substring(0, 300),
        })),
      });
    }
  }

  // Comparison Product list — single-slug case
  if (post.slug === 'best-murder-mystery-party-games-review') {
    const products = [
      { name: 'MysteryMaker', url: `${SITE_URL}/` },
      { name: 'MysteryShaper', url: 'https://mysteryshaper.com/' },
      { name: 'Murder Mystery Game AI', url: 'https://murdermysterygameai.com/' },
      { name: 'Night of Mystery', url: 'https://www.nightofmystery.com/' },
      { name: 'Broadway Murder Mysteries', url: 'https://www.broadwaymurdermysteries.com/' },
      { name: 'Playing With Murder', url: 'https://www.playingwithmurder.com/' },
      { name: 'Masters of Mystery', url: 'https://www.mastersofmystery.com/' },
      { name: 'Hunt A Killer', url: 'https://www.huntakiller.com/' },
      { name: 'Deadbolt Mystery Society', url: 'https://www.deadboltmysterysociety.com/' },
      { name: 'The Dinner Detective', url: 'https://www.thedinnerdetective.com/' },
    ];
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: post.title,
      description: post.meta_description,
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'Product', name: p.name, url: p.url, category: 'Murder Mystery Party Games' },
      })),
    });
  }

  return schemas;
}

function buildHead(post, langVariants, schemas, articleHtml) {
  const url = postUrl(post.language, post.slug);
  const desc = post.meta_description || '';
  const og = post.featured_image_url || FALLBACK_SHARE_IMAGE;
  const titleFull = `${post.title} | Mystery Maker`;
  const lines = [];
  lines.push(`<title>${htmlEscape(titleFull)}</title>`);
  if (desc) lines.push(`<meta name="description" content="${htmlEscape(desc)}" />`);
  lines.push(`<link rel="canonical" href="${url}" />`);
  for (const v of langVariants) {
    const hreflang = v.language === 'zh-cn' ? 'zh-Hans' : v.language;
    const href = postUrl(v.language, v.slug);
    lines.push(`<link rel="alternate" hreflang="${hreflang}" href="${href}" />`);
  }
  if (langVariants.some(v => v.language === 'en')) {
    const enVariant = langVariants.find(v => v.language === 'en');
    lines.push(`<link rel="alternate" hreflang="x-default" href="${postUrl('en', enVariant.slug)}" />`);
  }
  lines.push(`<meta property="og:title" content="${htmlEscape(post.title)}" />`);
  lines.push(`<meta property="og:description" content="${htmlEscape(desc)}" />`);
  lines.push(`<meta property="og:type" content="article" />`);
  lines.push(`<meta property="og:locale" content="${post.language}" />`);
  lines.push(`<meta property="og:url" content="${url}" />`);
  lines.push(`<meta property="og:image" content="${og}" />`);
  lines.push(`<meta name="twitter:card" content="summary_large_image" />`);
  lines.push(`<meta name="twitter:title" content="${htmlEscape(post.title)}" />`);
  lines.push(`<meta name="twitter:description" content="${htmlEscape(desc)}" />`);
  lines.push(`<meta name="twitter:image" content="${og}" />`);
  for (const s of schemas) {
    lines.push(`<script type="application/ld+json">${JSON.stringify(s)}</script>`);
  }
  return lines.join('\n    ');
}

function injectIntoTemplate(post, headTags, articleHtml) {
  // Replace placeholder <title> and <meta name="description"> with the per-post
  // versions, then append the rest of the head tags before </head>.
  let html = template;
  // Override <html lang="en"> with the post's language. The Vite template ships
  // with lang="en" hardcoded; without this rewrite every Swedish/German/Japanese
  // prerendered page tells Google "this is English content," contradicting the
  // hreflang/canonical signals. Map zh-cn → zh-Hans to match the hreflang form.
  const htmlLang = post.language.toLowerCase() === 'zh-cn' ? 'zh-Hans' : post.language;
  html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${htmlLang}"`);
  html = html.replace(/<title>[^<]*<\/title>/, '');
  html = html.replace(/<meta\s+name="description"[^>]*>/, '');
  html = html.replace(/<meta\s+name="author"[^>]*>/, ''); // strip Lovable author placeholder
  // Strip placeholder og:title / og:description (the React app re-injects these client-side
  // and we want server-side ones to win uncontested in raw HTML).
  html = html.replace(/<meta\s+property="og:title"[^>]*>/, '');
  html = html.replace(/<meta\s+property="og:description"[^>]*>/, '');
  html = html.replace(/<meta\s+property="og:image"[^>]*>/, '');
  html = html.replace(/<meta\s+property="og:type"[^>]*>/, '');
  html = html.replace(/<meta\s+property="og:url"[^>]*>/, '');
  html = html.replace(/<meta\s+name="twitter:card"[^>]*>/, '');
  html = html.replace(/<meta\s+name="twitter:image"[^>]*>/, '');
  html = html.replace(/<meta\s+name="twitter:title"[^>]*>/, '');
  html = html.replace(/<meta\s+name="twitter:description"[^>]*>/, '');
  // Strip the homepage canonical + JSON-LD so the per-post canonical/schema win
  // uncontested. buildHead() re-injects post-specific versions below. (The
  // homepage og:site_name is universally correct, so it's intentionally kept.)
  html = html.replace(/<link\s+rel="canonical"[^>]*>/, '');
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');

  // Inject per-post head tags right before </head>
  html = html.replace(/<\/head>/, `    ${headTags}\n  </head>`);

  // Inject pre-rendered article HTML into <div id="root"> as a hydration target.
  // React will replace this on mount; bots that don't run JS see the full content.
  // Wrap in <article> with class so it has at least minimal styling without CSS.
  const prerenderedBody = `<article data-prerendered="true" style="max-width:48rem;margin:0 auto;padding:3rem 1rem;color:#fff;background:#000;font-family:Inter,system-ui,sans-serif;">
      <h1>${htmlEscape(post.title)}</h1>
      ${post.meta_description ? `<p style="color:#ccc;font-style:italic;">${htmlEscape(post.meta_description)}</p>` : ''}
      ${articleHtml}
    </article>`;
  html = html.replace(/<div id="root"><\/div>/, `<div id="root">${prerenderedBody}</div>`);

  return html;
}

async function fetchAllPosts() {
  // Page size kept small because the `content` markdown column is large (multi-KB
  // per row × 1.4k+ rows). A 500-row fetch trips PostgREST's 8s statement_timeout
  // on the public role; 100 stays well under it.
  const all = [];
  const pageSize = 100;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, language, slug, title, content, meta_description, featured_image_url, author, published_at, updated_at, status')
      .eq('status', 'published')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

async function main() {
  console.log('Fetching published blog posts...');
  const posts = await fetchAllPosts();
  console.log(`  ${posts.length} cells to prerender.`);

  // Build a slug → variants map for hreflang
  const variantsBySlug = new Map();
  for (const p of posts) {
    if (!variantsBySlug.has(p.slug)) variantsBySlug.set(p.slug, []);
    variantsBySlug.get(p.slug).push({ language: p.language, slug: p.slug });
  }

  // Hero images are only generated for the EN row of each slug. Translated rows
  // share the slug 1:1, so fall back to the EN sibling's image before the global
  // homepage placeholder — otherwise ~1.5k non-EN pages emit the same generic OG/
  // schema image, weakening per-page citation signals to AI platforms.
  const enImagesBySlug = new Map();
  for (const p of posts) {
    if (p.language === 'en' && p.featured_image_url) {
      enImagesBySlug.set(p.slug, p.featured_image_url);
    }
  }

  let written = 0;
  let skipped = 0;
  for (const post of posts) {
    try {
      if (!post.featured_image_url) {
        post.featured_image_url = enImagesBySlug.get(post.slug) || '';
      }
      const variants = variantsBySlug.get(post.slug) || [];
      const articleHtml = await renderMarkdown(post.content || '');
      const schemas = buildSchemas(post, variants);
      const headTags = buildHead(post, variants, schemas, articleHtml);
      const html = injectIntoTemplate(post, headTags, articleHtml);

      const langSegment = post.language === 'en' ? '' : `/${post.language}`;
      const outDir = join(DIST, `${langSegment}/blog/${post.slug}`.replace(/^\//, ''));
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'index.html'), html, 'utf8');
      written++;
    } catch (err) {
      console.error(`  Failed: [${post.language}] ${post.slug} — ${err.message}`);
      skipped++;
    }
  }

  console.log(`Prerender complete: ${written} written, ${skipped} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
