// scripts/generate-sitemap.mjs
// Generates a static sitemap.xml at build time by querying Supabase for all published blog posts.
// Also creates static HTML route files so GitHub Pages returns 200 (not 404) for blog URLs.
import { createClient } from './_supabase-node.mjs';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w'
);

const SITE = 'https://www.mysterymaker.party';

async function fetchAllPublishedPosts() {
  // Supabase REST defaults to a 1000-row cap. We have ~1,646 published rows
  // across all languages, so paginate via `.range()` to get them all.
  //
  // Pagination must use a STABLE order. The daily-publish pipeline batches
  // dozens of unrelated articles per post_date (~58/day), so ordering only
  // by post_date leaves PostgREST free to return tied rows in arbitrary
  // order across page boundaries — the same row can land in both pages,
  // producing duplicate <loc> entries (audit on 2026-05-30 found 91 dupes
  // concentrated in sv + zh-cn, the langs whose rows happened to straddle
  // the 1000-row boundary). Adding `id` as a secondary key makes the order
  // total and pagination deterministic.
  const PAGE_SIZE = 1000;
  let all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, language, updated_at, post_date')
      .eq('status', 'published')
      .order('post_date', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

async function generateSitemap() {
  console.log('Generating sitemap...');

  let posts;
  try {
    posts = await fetchAllPublishedPosts();
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    process.exit(1);
  }

  console.log(`Found ${posts.length} published blog posts`);

  // Group by SLUG (not post_date). All 13 translations of the same article
  // share the same slug; only the `language` column differs. Earlier the script
  // grouped by post_date — which is wrong because the daily-publish pipeline
  // batches multiple distinct articles on the same day (one date = up to 58
  // unrelated articles). That meant hreflang siblings were getting cross-
  // pollinated across unrelated articles, telling Google "the FR version of
  // /blog/foo is /fr/blog/bar" — broken international SEO at scale.
  const bySlug = {};
  for (const p of posts) {
    if (!bySlug[p.slug]) bySlug[p.slug] = [];
    bySlug[p.slug].push(p);
  }

  const articleCount = Object.keys(bySlug).length;
  console.log(`${articleCount} unique articles across ${posts.length} language variants`);

  // Static pages. Trailing slashes match GitHub Pages' canonical directory-
  // style URLs — without them GH Pages 301-redirects `/blog` -> `/blog/`,
  // and every <loc> in the sitemap becomes a redirect source. GSC's
  // "Page with redirect" bucket was 1,090 entries on 2026-05-30 due to this.
  // Root stays `/` (served at the apex, no slash to add).
  const staticPages = [
    { loc: '/', priority: '1.0', freq: 'weekly' },
    { loc: '/showcase/', priority: '0.8', freq: 'weekly' },
    { loc: '/blog/', priority: '0.8', freq: 'daily' },
    { loc: '/support/', priority: '0.5', freq: 'monthly' },
    { loc: '/privacy/', priority: '0.3', freq: 'yearly' },
  ];

  // Localized static landing pages: one <url> per language with reciprocal
  // hreflang alternates (mirrors the blog-post block below). Both landing pages
  // are fully translated into all 13 languages (custom-angle on /custom-…,
  // corporate-angle on /office-…, per ADR-0040); en lives at the un-prefixed
  // path, others at /<lang>/<path>/. zh-cn is emitted as the 'zh-Hans' hreflang
  // code (Google's canonical form), matching the blog logic. NOTE: the page
  // components (CustomMurderMysteryParty.tsx, OfficeMurderMysteryParty.tsx) emit
  // the same hreflang set in-page; keep the three LANGS lists in sync.
  const LOCALIZED_LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'da', 'sv', 'fi', 'ko', 'ja', 'zh-cn'];
  const localizedStaticPages = [
    { path: 'custom-murder-mystery-party', priority: '0.8', freq: 'monthly' },
    { path: 'office-murder-mystery-party', priority: '0.8', freq: 'monthly' },
  ];
  const hreflangOf = (l) => (l === 'zh-cn' ? 'zh-Hans' : l);
  const localizedLoc = (l, path) => (l === 'en' ? `${SITE}/${path}/` : `${SITE}/${l}/${path}/`);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '  xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Static pages
  for (const page of staticPages) {
    xml += `  <url>\n    <loc>${SITE}${page.loc}</loc>\n`;
    xml += `    <changefreq>${page.freq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n  </url>\n`;
  }

  // Localized static pages with hreflang alternates (en + 12 translations).
  for (const page of localizedStaticPages) {
    for (const lang of LOCALIZED_LANGS) {
      xml += `  <url>\n    <loc>${localizedLoc(lang, page.path)}</loc>\n`;
      xml += `    <changefreq>${page.freq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      for (const alt of LOCALIZED_LANGS) {
        xml += `    <xhtml:link rel="alternate" hreflang="${hreflangOf(alt)}" href="${localizedLoc(alt, page.path)}" />\n`;
      }
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${localizedLoc('en', page.path)}" />\n`;
      xml += `  </url>\n`;
    }
  }

  // Blog posts with hreflang alternates
  for (const [slug, variants] of Object.entries(bySlug)) {
    for (const variant of variants) {
      const lang = variant.language;
      // Trailing slash matches what GH Pages actually serves with 200.
      // Without it every blog URL in the sitemap is a 301 redirect (see
      // staticPages comment above for context).
      const loc = lang === 'en'
        ? `${SITE}/blog/${variant.slug}/`
        : `${SITE}/${lang}/blog/${variant.slug}/`;

      xml += `  <url>\n    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${variant.updated_at || variant.post_date}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;

      // hreflang alternates for all language variants of this article.
      // DB stores the language as lowercase 'zh-cn'; Google's canonical form
      // for Simplified Chinese is 'zh-Hans', so we map at sitemap-emit time.
      // Using lowercase compare so any future case drift in the DB still maps.
      for (const alt of variants) {
        const altLang = alt.language.toLowerCase() === 'zh-cn' ? 'zh-Hans' : alt.language;
        const altLoc = alt.language === 'en'
          ? `${SITE}/blog/${alt.slug}/`
          : `${SITE}/${alt.language}/blog/${alt.slug}/`;
        xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${altLoc}" />\n`;
      }

      // x-default: Google's recommendation is to point at the EN variant when
      // it exists (catches users for whom no other language hreflang matches).
      const enVariant = variants.find(v => v.language === 'en');
      if (enVariant) {
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/blog/${enVariant.slug}/" />\n`;
      }

      xml += `  </url>\n`;
    }
  }

  xml += '</urlset>';

  const outputPath = resolve(__dirname, '..', 'dist', 'sitemap.xml');
  writeFileSync(outputPath, xml, 'utf-8');
  console.log(`Sitemap written to ${outputPath}`);
  console.log(`Total URLs: ${staticPages.length + localizedStaticPages.length * LOCALIZED_LANGS.length + posts.length}`);

  // Generate static HTML route files so GitHub Pages returns 200 for blog URLs.
  // Each file is a copy of index.html — the SPA router handles rendering.
  const distDir = resolve(__dirname, '..', 'dist');
  const indexHtml = readFileSync(resolve(distDir, 'index.html'), 'utf-8');
  let routeCount = 0;

  // Create /blog/index.html for the blog index page
  const blogDir = resolve(distDir, 'blog');
  mkdirSync(blogDir, { recursive: true });
  writeFileSync(resolve(blogDir, 'index.html'), indexHtml, 'utf-8');
  routeCount++;

  // Create static-route fallback HTMLs for SPA pages that the sitemap lists
  // but that previously 404'd on GH Pages (no index.html, no SPA fallback).
  // Each gets a copy of the build's index.html — the SPA router takes over
  // client-side. These match real <Route> entries in src/App.tsx.
  for (const staticRoute of ['showcase', 'support', 'privacy', 'custom-murder-mystery-party', 'office-murder-mystery-party']) {
    const dir = resolve(distDir, staticRoute);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'index.html'), indexHtml, 'utf-8');
    routeCount++;
  }

  // Language-prefixed copies of the localized static pages (en is handled above
  // at the un-prefixed path). Without these, /<lang>/custom-murder-mystery-party/
  // 404s on GH Pages before the SPA router can take over.
  for (const page of localizedStaticPages) {
    for (const lang of LOCALIZED_LANGS.filter((l) => l !== 'en')) {
      const dir = resolve(distDir, lang, page.path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'index.html'), indexHtml, 'utf-8');
      routeCount++;
    }
  }

  // Create route files for each blog post
  for (const post of posts) {
    const lang = post.language;
    let routePath;
    if (lang === 'en') {
      routePath = resolve(distDir, 'blog', post.slug);
    } else {
      routePath = resolve(distDir, lang, 'blog', post.slug);
    }
    mkdirSync(routePath, { recursive: true });
    writeFileSync(resolve(routePath, 'index.html'), indexHtml, 'utf-8');
    routeCount++;
  }

  // Create language-specific blog index pages
  const languages = [...new Set(posts.map(p => p.language).filter(l => l !== 'en'))];
  for (const lang of languages) {
    const langBlogDir = resolve(distDir, lang, 'blog');
    mkdirSync(langBlogDir, { recursive: true });
    writeFileSync(resolve(langBlogDir, 'index.html'), indexHtml, 'utf-8');
    routeCount++;
  }

  console.log(`Generated ${routeCount} route files for GitHub Pages`);
}

generateSitemap().catch((err) => {
  console.error('Failed to generate sitemap:', err);
  process.exit(1);
});
