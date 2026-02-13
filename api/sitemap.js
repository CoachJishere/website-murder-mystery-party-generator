// api/sitemap.js
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE = 'https://www.mysterymaker.party';

export default async function handler(req) {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('slug, language, updated_at, post_date')
    .eq('status', 'published')
    .order('post_date', { ascending: false });

  if (error) {
    console.error('Sitemap: error fetching blog posts:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }

  // Group by slug to find language variants
  const bySlug = {};
  for (const p of (posts || [])) {
    if (!bySlug[p.slug]) bySlug[p.slug] = [];
    bySlug[p.slug].push(p);
  }

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
  for (const [slug, variants] of Object.entries(bySlug)) {
    for (const variant of variants) {
      const lang = variant.language;
      const loc = lang === 'en'
        ? `${SITE}/blog/${slug}`
        : `${SITE}/${lang}/blog/${slug}`;

      xml += `  <url>\n    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${variant.updated_at || variant.post_date}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;

      // hreflang alternates for all available languages of this slug
      for (const alt of variants) {
        const altLang = alt.language === 'zh-CN' ? 'zh-Hans' : alt.language;
        const altLoc = alt.language === 'en'
          ? `${SITE}/blog/${slug}`
          : `${SITE}/${alt.language}/blog/${slug}`;
        xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${altLoc}" />\n`;
      }

      xml += `  </url>\n`;
    }
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
