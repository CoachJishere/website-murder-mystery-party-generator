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

async function generateSitemap() {
  console.log('Generating sitemap...');

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('slug, language, updated_at, post_date')
    .eq('status', 'published')
    .order('post_date', { ascending: false });

  if (error) {
    console.error('Error fetching blog posts:', error);
    process.exit(1);
  }

  console.log(`Found ${posts.length} published blog posts`);

  // Group by post_date to find language variants of the same article
  // (each translation shares the same post_date but has a different slug)
  const byDate = {};
  for (const p of posts) {
    if (!byDate[p.post_date]) byDate[p.post_date] = [];
    byDate[p.post_date].push(p);
  }

  const articleCount = Object.keys(byDate).length;
  console.log(`${articleCount} unique articles across ${posts.length} language variants`);

  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', freq: 'weekly' },
    { loc: '/showcase', priority: '0.8', freq: 'weekly' },
    { loc: '/blog', priority: '0.8', freq: 'daily' },
    { loc: '/support', priority: '0.5', freq: 'monthly' },
    { loc: '/privacy', priority: '0.3', freq: 'yearly' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '  xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Static pages
  for (const page of staticPages) {
    xml += `  <url>\n    <loc>${SITE}${page.loc}</loc>\n`;
    xml += `    <changefreq>${page.freq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n  </url>\n`;
  }

  // Blog posts with hreflang alternates
  for (const [postDate, variants] of Object.entries(byDate)) {
    for (const variant of variants) {
      const lang = variant.language;
      const loc = lang === 'en'
        ? `${SITE}/blog/${variant.slug}`
        : `${SITE}/${lang}/blog/${variant.slug}`;

      xml += `  <url>\n    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${variant.updated_at || variant.post_date}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;

      // hreflang alternates for all language variants of this article
      for (const alt of variants) {
        const altLang = alt.language === 'zh-CN' ? 'zh-Hans' : alt.language;
        const altLoc = alt.language === 'en'
          ? `${SITE}/blog/${alt.slug}`
          : `${SITE}/${alt.language}/blog/${alt.slug}`;
        xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${altLoc}" />\n`;
      }

      xml += `  </url>\n`;
    }
  }

  xml += '</urlset>';

  const outputPath = resolve(__dirname, '..', 'dist', 'sitemap.xml');
  writeFileSync(outputPath, xml, 'utf-8');
  console.log(`Sitemap written to ${outputPath}`);
  console.log(`Total URLs: ${staticPages.length + posts.length}`);

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
