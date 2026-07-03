import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { ArrowRight, Clock, Users, BookOpen, ChevronRight, Copy, Check } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import i18n from 'i18next'; // Import i18n directly to avoid type issues
import { useTranslation } from 'react-i18next';

const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  reading_time?: number;
  language: string;
  content?: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  meta_description: string;
  published_at: string;
  updated_at: string;
  reading_time: number;
  featured_image_url?: string;
  author?: string;
  related_posts?: RelatedPost[];
  status?: string;
  language: string;
  post_date: string;
  theme?: string;
}

const FALLBACK_SHARE_IMAGE = 'https://www.mysterymaker.party/images/homepage-share-image.png';

const CTA_SECTION = ({ theme = 'light' as 'light' | 'dark' } = {}) => {
  return (
    <div className="rounded-xl p-8 my-12 text-center" style={{ backgroundColor: 'var(--color-charcoal)', border: '1px solid var(--color-cream-border)' }}>
      <h3 className="text-2xl font-bold mb-4 text-[#C81400]">
        Ready to create your own murder mystery?
      </h3>
      <p className="mb-6 text-muted-foreground">
        Create a unique and engaging murder mystery party with our easy-to-use tools.
      </p>
      <Button 
        asChild 
        className="bg-[#C81400] hover:bg-[#A01000] text-white py-6 px-8 text-lg font-medium transition-colors mx-auto"
      >
        <Link to="/mystery/create">
          Create Your Mystery
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  );
};

export default function BlogPost() {
  const { t } = useTranslation();
  const { slug, lang } = useParams<{ slug: string; lang?: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [langVariants, setLangVariants] = useState<{ language: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingTime, setViewingTime] = useState(0);
  const [showStickyCTA, setShowStickyCTA] = useState(true);
  const [copiedForAI, setCopiedForAI] = useState(false);

  const handleCopyForAI = async () => {
    if (!post) return;
    const url = `${window.location.origin}${lang ? `/${lang}` : ''}/blog/${post.slug}`;
    const markdown = `# ${post.title}\n\n${post.meta_description ? `> ${post.meta_description}\n\n` : ''}Source: ${url}\n\n---\n\n${post.content}`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedForAI(true);
      setTimeout(() => setCopiedForAI(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  // URL language takes precedence over i18n setting
  const effectiveLanguage = lang || i18n.language.split('-')[0];

  // Sync i18n if URL specifies a language
  useEffect(() => {
    if (lang && lang !== i18n.language.split('-')[0]) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  // Track time on page for conversion optimization
  useEffect(() => {
    const timer = setInterval(() => {
      setViewingTime(prev => prev + 5);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Set up Intersection Observer for CTA visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Hide sticky CTA when article CTA is visible
          setShowStickyCTA(!entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    if (ctaSectionRef.current) {
      observer.observe(ctaSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Show CTA after 30 seconds or when scrolled to bottom
  useEffect(() => {
    if (viewingTime >= 30) {
      // Track engagement in analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'blog_engagement', {
          'event_category': 'engagement',
          'event_label': `Read for ${viewingTime}s`,
          'value': Math.floor(viewingTime / 10)
        });
      }
    }
  }, [viewingTime]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        
        // Get all posts with this slug to handle multiple languages
        const { data: allPosts, error: fetchError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .eq('language', effectiveLanguage);

        if (fetchError) throw fetchError;
        if (!allPosts || allPosts.length === 0) throw new Error('Post not found');

        // Fetch available language variants for hreflang tags
        // All translations share the same slug, differentiated by language
        const { data: variants } = await supabase
          .from('blog_posts')
          .select('language, slug')
          .eq('slug', slug)
          .eq('status', 'published');
        setLangVariants(variants || []);

        // Since we're already filtering by language, just use the first result
        const selectedPost = allPosts[0];

        const RELATED_POSTS_LIMIT = 3;

        // Primary signal: same theme (real topical relevance)
        const { data: themeRelated } = await supabase
          .from('blog_posts')
          .select('id, slug, title, reading_time, language, content')
          .eq('theme', selectedPost.theme)
          .eq('language', effectiveLanguage)
          .neq('id', selectedPost.id)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(RELATED_POSTS_LIMIT);

        let related = [...(themeRelated || [])];

        // Secondary fill: same publish-date cluster (batch-published siblings)
        if (related.length < RELATED_POSTS_LIMIT) {
          const { data: sameDate } = await supabase
            .from('blog_posts')
            .select('id, slug, title, reading_time, language, content')
            .eq('post_date', selectedPost.post_date)
            .eq('language', effectiveLanguage)
            .neq('id', selectedPost.id)
            .eq('status', 'published')
            .limit(RELATED_POSTS_LIMIT);

          if (sameDate) {
            const uniqueSameDate = sameDate.filter(
              p => !related.some(rp => rp.id === p.id)
            );
            related = [...related, ...uniqueSameDate.slice(0, RELATED_POSTS_LIMIT - related.length)];
          }
        }

        // Last-resort fill: most recent posts in same language
        if (related.length < RELATED_POSTS_LIMIT) {
          const { data: recentPosts } = await supabase
            .from('blog_posts')
            .select('id, slug, title, reading_time, language, content')
            .eq('language', effectiveLanguage)
            .neq('id', selectedPost.id)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(RELATED_POSTS_LIMIT);

          if (recentPosts) {
            const uniqueRecent = recentPosts.filter(
              p => !related.some(rp => rp.id === p.id)
            );
            related = [...related, ...uniqueRecent.slice(0, RELATED_POSTS_LIMIT - related.length)];
          }
        }

        related = related.slice(0, RELATED_POSTS_LIMIT);

        const postData = { ...selectedPost, related_posts: related || [] };
        setPost(postData);
        
        // Debug logging
        console.log('Blog post data:', postData);
        console.log('Selected language:', effectiveLanguage);
      } catch (err) {
        console.error('Error fetching blog post:', err);
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, effectiveLanguage]); // Add effectiveLanguage to dependencies

  if (error) {
    // Slug doesn't exist in this language. Most of these are orphaned URLs from
    // a prior publishing pipeline that Google still has indexed. Send users to
    // the locale's blog index instead of a dead-end "Post not found" screen,
    // and emit noindex so Google deindexes the orphan over time. High-impact
    // exact-match orphans are handled with proper 301s in vercel.json; this is
    // the catch-all for everything else.
    const blogIndexPath = lang ? `/${lang}/blog` : '/blog';
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <Navigate to={blogIndexPath} replace />
      </>
    );
  }

  if (loading || !post) {
    return (
      <div className="min-h-screen bg-[#000000] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-3/4 mb-6" />
          <div className="flex items-center space-x-4 mb-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-96 w-full mb-8" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className={`h-4 w-${i % 2 ? 'full' : '5/6'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generate JSON-LD structured data
  const shareImage = post.featured_image_url || FALLBACK_SHARE_IMAGE;
  const authorName = post.author && post.author !== 'AI Assistant' ? post.author : 'Jonathan Miller';
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.meta_description,
    "image": shareImage,
    "author": {
      "@type": "Person",
      "name": authorName,
      "url": "https://www.mysterymaker.party/about"
    },
    "datePublished": post.published_at,
    "dateModified": post.updated_at || post.published_at,
    "publisher": {
      "@type": "Organization",
      "name": "Mystery Maker",
      "logo": {
        "@type": "ImageObject",
        "url": FALLBACK_SHARE_IMAGE
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.mysterymaker.party${lang ? `/${lang}` : ''}/blog/${post.slug}`
    },
    "inLanguage": effectiveLanguage,
    "timeRequired": `PT${post.reading_time || calculateReadingTime(post.content || '')}M`,
    "wordCount": ['ja', 'ko', 'zh-cn'].includes(effectiveLanguage)
      ? post.content.replace(/\s+/g, '').length  // CJK: count characters (no word boundaries)
      : post.content.split(/\s+/).filter(w => w.length > 0).length
  };

  // Generate FAQPage schema from FAQ sections in the content
  const generateFaqSchema = (content: string) => {
    // Match FAQ section in any supported language
    // EN, ES, FR, DE, IT, PT, NL, DA, SV, FI, KO, JA, ZH-CN
    const faqHeadingPattern = /##\s*(?:Frequently Asked Questions|Questions People Actually Ask|FAQ|Preguntas [Ff]recuent\w*|Questions fréquemment posées|Foire aux questions|Häufig gestellte Fragen|Domande frequenti|Perguntas [Ff]requent\w*|Veelgestelde vragen|Ofte [Ss]tillede [Ss]pørgsmål|Ofta [Ss]tällda [Ff]rågor|Vanliga frågor|Usein kysytyt kysymykset|UKK|자주 묻는 질문|よくある質問|常见问题)[^\n]*\n([\s\S]*?)(?=\n## [^#]|$)/i;
    const faqSectionMatch = content.match(faqHeadingPattern);
    if (!faqSectionMatch) return null;

    const faqSection = faqSectionMatch[1];
    const qaItems: { question: string; answer: string }[] = [];

    // Pattern 1: ### Question? followed by answer text. Accepts either ASCII `?`
    // or full-width `？` (used in JA/ZH-CN — same character semantically).
    const qaPairsH3 = faqSection.matchAll(/###\s*(.+?[?？])\s*\n([\s\S]*?)(?=\n###\s|\n## |$)/g);
    for (const match of qaPairsH3) {
      const question = match[1].trim();
      const answer = match[2].trim()
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n+/g, ' ')
        .trim();
      if (question && answer) {
        qaItems.push({ question, answer });
      }
    }

    // Pattern 2: **Q: Question?** / A: Answer format (used in some translations).
    // Letter prefix is one of Q/P/F/V/D/S/K (covers EN/PT/FR/NL/IT/ES/DE/FI/SV/DA).
    if (qaItems.length === 0) {
      const qaPairsBold = faqSection.matchAll(/\*\*(?:Q|P|F|V|D|S|K):\s*(.+?[?？])\s*\*\*\s*\n+\s*(?:A|R|S|V|D|K):\s*([\s\S]*?)(?=\n\*\*(?:Q|P|F|V|D|S|K):|$)/gi);
      for (const match of qaPairsBold) {
        const question = match[1].trim();
        const answer = match[2].trim()
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\n+/g, ' ')
          .trim();
        if (question && answer) {
          qaItems.push({ question, answer });
        }
      }
    }

    // Pattern 3: **Question?** with no letter prefix, followed by an answer paragraph.
    // This is the most common machine-translation output across non-EN locales —
    // the translator preserved the bold-question convention but dropped the
    // English Q:/A: letter prefixes. ~437 cells across the blog use this format.
    // Terminator accepts [?？.] because some EN posts end FAQ questions with a
    // period instead of "?". Separator is `\s+` (not `\s*\n+\s*`) because some
    // posts run the answer inline on the same line as the bold question.
    if (qaItems.length === 0) {
      const qaPairsBoldPlain = faqSection.matchAll(/\*\*([^*\n]+[?？.])\*\*\s+([\s\S]*?)(?=\n\s*\*\*[^*\n]+[?？.]\*\*|\n## |$)/g);
      for (const match of qaPairsBoldPlain) {
        const question = match[1].trim();
        const answer = match[2].trim()
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\n+/g, ' ')
          .trim();
        if (question && answer) {
          qaItems.push({ question, answer });
        }
      }
    }

    if (qaItems.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": qaItems.map(qa => ({
        "@type": "Question",
        "name": qa.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": qa.answer
        }
      }))
    };
  };

  // Detect the "numbered linked-anchor block" — the structural pattern used by the
  // GEO-optimized "Fix X in N Steps" / "Setup Checklist" / "5 X Themes" TOC blocks.
  // Returns the parsed list items if found, in document order, or null.
  const parseNumberedAnchorBlock = (content: string): { name: string; anchor: string; teaser: string }[] | null => {
    const items: { name: string; anchor: string; teaser: string }[] = [];
    // Match lines like: `1. **[Step name](#anchor-id)** — teaser text`
    // The `**[...](#...)**` shape is what distinguishes this from any other numbered list.
    const itemRegex = /^\d+\.\s+\*\*\[([^\]]+)\]\(#([^)]+)\)\*\*\s*[—-]\s*(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(content)) !== null) {
      const name = m[1].trim();
      const anchor = m[2].trim();
      const teaser = m[3].trim().replace(/\*\*([^*]+)\*\*/g, '$1');
      if (name && anchor && teaser) items.push({ name, anchor, teaser });
    }
    if (items.length < 2) return null;
    return items;
  };

  const pageUrl = `https://www.mysterymaker.party${lang ? `/${lang}` : ''}/blog/${post.slug}`;

  // Generate HowTo schema from step-by-step tutorial content
  const generateHowToSchema = (content: string, title: string, postSlug: string) => {
    // Detect tutorial/how-to posts by slug (always English), title patterns, or content patterns
    // Slug check covers all languages since slugs remain in English
    const isHowTo = /^how-to/i.test(postSlug) || /^how[\s-]to/i.test(title) || /^(Sådan|Kuinka|So |Wie du|Comment|Cómo|Como|Come |Hoe |Hur man|Hvordan)/i.test(title) || /方法/.test(title) || /## (?:step\s*\d|how to)/i.test(content);
    if (!isHowTo) return null;

    const steps: { name: string; text: string; url?: string }[] = [];

    // Pattern 0 (preferred): the numbered linked-anchor block at the top of every
    // GEO-optimized fix/host post. Each item maps 1:1 to a HowToStep with a stable
    // anchor URL into the elaborating H2 section.
    const linkedItems = parseNumberedAnchorBlock(content);
    if (linkedItems && linkedItems.length >= 3) {
      for (const item of linkedItems) {
        steps.push({
          name: item.name,
          text: item.teaser.substring(0, 500),
          url: `${pageUrl}#${item.anchor}`,
        });
      }
    }

    // Pattern 1: ## Step N: Title / content
    if (steps.length === 0) {
      const stepMatches = content.matchAll(/##\s*(?:Step\s*\d+[:.]\s*)(.+?)\n([\s\S]*?)(?=\n## |$)/gi);
      for (const match of stepMatches) {
        const name = match[1].trim();
        const text = match[2].trim()
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\n+/g, ' ')
          .substring(0, 500);
        if (name && text) {
          steps.push({ name, text });
        }
      }
    }

    // Pattern 2: ## H2 sections in how-to posts that read as sequential instructions
    // Only use if no explicit Step N pattern was found
    if (steps.length === 0) {
      const h2Matches = content.matchAll(/## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g);
      const allH2s: { name: string; text: string }[] = [];
      for (const match of h2Matches) {
        const name = match[1].trim();
        // Skip FAQ sections and non-instructional headings
        if (/FAQ|UKK|Frequently Asked|Questions People|Questions fréquemment|Foire aux|Häufig gestellte|Domande frequenti|Preguntas|Perguntas|Veelgestelde|Ofte .tillede|Ofta .tällda|Vanliga frågor|Usein kysytyt|자주 묻는|よくある質問|常见问题|질문|Related|Conclusion|Sources/i.test(name)) continue;
        const text = match[2].trim()
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/###[^\n]+\n/g, '')
          .replace(/\n+/g, ' ')
          .substring(0, 500);
        if (name && text) {
          allH2s.push({ name, text });
        }
      }
      // Only use H2-based steps if we have 3+ sections (indicates a real guide)
      if (allH2s.length >= 3) {
        steps.push(...allH2s);
      }
    }

    if (steps.length < 2) return null;

    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": title,
      "description": post.meta_description,
      "step": steps.map((s, i) => {
        const step: Record<string, unknown> = {
          "@type": "HowToStep",
          "position": i + 1,
          "name": s.name,
          "text": s.text,
        };
        if (s.url) step.url = s.url;
        return step;
      })
    };
  };

  // Generate ItemList schema for any post that has a numbered linked-anchor
  // block at the top and isn't a how-to (how-to gets HowTo schema instead).
  // This catches the 5-X-themes listicles AND every P5 post that got a
  // "What's in this guide" TOC via apply-p5-tocs.mjs — both share the same
  // numbered-anchor structure.
  const generateItemListSchema = (content: string, postSlug: string) => {
    if (/^how-to/i.test(postSlug)) return null;

    const items = parseNumberedAnchorBlock(content);
    if (!items || items.length < 3) return null;

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": post.title,
      "description": post.meta_description,
      "numberOfItems": items.length,
      "itemListOrder": "https://schema.org/ItemListOrderAscending",
      "itemListElement": items.map((item, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": item.name,
        "url": `${pageUrl}#${item.anchor}`,
        "description": item.teaser.substring(0, 300),
      }))
    };
  };

  // Generate BreadcrumbList schema (Home > Blog > Post). Locale-aware via lang prefix.
  // Breadcrumb labels stay in English because schema.org consumers are language-agnostic
  // for taxonomy and breadcrumb display is rendered from URL structure anyway.
  const generateBreadcrumbSchema = () => {
    const homeUrl = `https://www.mysterymaker.party${lang ? `/${lang}` : ''}/`;
    const blogUrl = `https://www.mysterymaker.party${lang ? `/${lang}` : ''}/blog`;
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": homeUrl },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": blogUrl },
        { "@type": "ListItem", "position": 3, "name": post.title, "item": pageUrl },
      ]
    };
  };

  // Generate ItemList schema for the games-comparison post. Each row in the
  // "At-a-Glance Comparison" table is a SoftwareApplication (or Product) item.
  // Detection by slug — this is one specific post per language.
  const generateComparisonSchema = (postSlug: string) => {
    if (postSlug !== 'best-murder-mystery-party-games-review') return null;

    // The 9 products listed in the comparison table — fixed roster, locale-independent
    // brand names. Descriptions stay short and factual; the per-locale "Best for" cell
    // already lives in post.content for human readers.
    const products = [
      { name: 'MysteryMaker', url: 'https://www.mysterymaker.party/' },
      { name: 'Night of Mystery', url: 'https://www.nightofmystery.com/' },
      { name: 'Broadway Murder Mysteries', url: 'https://www.broadwaymurdermysteries.com/' },
      { name: 'Playing With Murder', url: 'https://www.playingwithmurder.com/' },
      { name: 'Masters of Mystery', url: 'https://www.mastersofmystery.com/' },
      { name: 'Hunt A Killer', url: 'https://www.huntakiller.com/' },
      { name: 'Deadbolt Mystery Society', url: 'https://www.deadboltmysterysociety.com/' },
      { name: 'The Dinner Detective', url: 'https://www.thedinnerdetective.com/' },
    ];

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": post.title,
      "description": post.meta_description,
      "numberOfItems": products.length,
      "itemListElement": products.map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "Product",
          "name": p.name,
          "url": p.url,
          "category": "Murder Mystery Party Games",
        }
      }))
    };
  };

  const faqSchema = generateFaqSchema(post.content);
  const howToSchema = generateHowToSchema(post.content, post.title, post.slug);
  const itemListSchema = generateItemListSchema(post.content, post.slug);
  const breadcrumbSchema = generateBreadcrumbSchema();
  const comparisonSchema = generateComparisonSchema(post.slug);

  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Header />
      <main className={`flex-grow pt-12 px-4 ${showStickyCTA ? 'pb-40 sm:pb-32' : 'pb-12'}`}>
        <Helmet>
          <title>{post?.title || 'Loading...'} | Mystery Maker</title>
          {post?.meta_description && (
            <meta name="description" content={post.meta_description} />
          )}
          <link rel="canonical" href={`https://www.mysterymaker.party${lang ? `/${lang}` : ''}/blog/${slug}/`} />
          {langVariants.map(v => (
            <link
              key={v.language}
              rel="alternate"
              hrefLang={v.language === 'zh-cn' ? 'zh-Hans' : v.language}
              href={v.language === 'en'
                ? `https://www.mysterymaker.party/blog/${v.slug}/`
                : `https://www.mysterymaker.party/${v.language}/blog/${v.slug}/`}
            />
          ))}
          {langVariants.some(v => v.language === 'en') && (
            <link
              rel="alternate"
              hrefLang="x-default"
              href={`https://www.mysterymaker.party/blog/${slug}/`}
            />
          )}
          <meta property="og:title" content={post?.title || 'Blog Post'} />
          <meta property="og:description" content={post?.meta_description || ''} />
          <meta property="og:type" content="article" />
          <meta property="og:locale" content={effectiveLanguage} />
          <meta property="og:image" content={shareImage} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:image" content={shareImage} />
          {post?.author && (
            <meta name="author" content={authorName} />
          )}
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
          {faqSchema && (
            <script type="application/ld+json">
              {JSON.stringify(faqSchema)}
            </script>
          )}
          {howToSchema && (
            <script type="application/ld+json">
              {JSON.stringify(howToSchema)}
            </script>
          )}
          {itemListSchema && (
            <script type="application/ld+json">
              {JSON.stringify(itemListSchema)}
            </script>
          )}
          {comparisonSchema && (
            <script type="application/ld+json">
              {JSON.stringify(comparisonSchema)}
            </script>
          )}
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbSchema)}
          </script>
        </Helmet>
        <article className="max-w-4xl mx-auto">
          <header className="mb-12">
            <Link
              to={lang ? `/${lang}/blog` : '/blog'}
              className="inline-flex items-center text-[#C81400] hover:underline mb-4"
            >
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
              Back to Blog
            </Link>
            
            <h1 className="text-4xl md:text-5xl font-bold text-[#C81400] mb-6">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center text-muted-foreground text-sm gap-4 mb-6">
              <div className="flex items-center">
                By&nbsp;
                <Link to={lang ? `/${lang}/about` : '/about'} className="text-[#C81400] hover:underline">
                  {authorName}
                </Link>
              </div>
              {(post.updated_at || post.published_at) && (
                <div className="flex items-center">
                  <span className="text-muted-foreground/70">Updated&nbsp;</span>
                  <time dateTime={post.updated_at || post.published_at}>
                    {format(new Date(post.updated_at || post.published_at), 'MMM d, yyyy')}
                  </time>
                </div>
              )}
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-[#C81400]" />
                {post.reading_time || calculateReadingTime(post.content || '')} min read
              </div>
              <button
                type="button"
                onClick={handleCopyForAI}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#C81400]/30 hover:bg-[#C81400]/10 transition-colors text-[#C81400] text-xs font-medium"
                title={t('blog.copyForAITooltip')}
                aria-label={t('blog.copyForAITooltip')}
              >
                {copiedForAI ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t('blog.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {t('blog.copyForAI')}
                  </>
                )}
              </button>
            </div>
            
            {post.featured_image_url && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
          </header>

          <div className="prose prose-lg max-w-none mb-12">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug]}
              components={{
                h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-[#C81400] mt-8 mb-4 scroll-mt-20" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-[#C81400] mt-6 mb-3 scroll-mt-20" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-4 space-y-2" {...props} />,
                li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-[#C81400]" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 text-foreground leading-relaxed" {...props} />,
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse text-sm" {...props} />
                  </div>
                ),
                th: ({node, ...props}) => <th className="border border-border bg-muted px-3 py-2 text-left font-semibold" {...props} />,
                td: ({node, ...props}) => <td className="border border-border px-3 py-2 align-top" {...props} />,
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          <div ref={ctaSectionRef}>
            <CTA_SECTION />
          </div>

          {post.related_posts && post.related_posts.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-[#C81400] mb-6">
                You might also like
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {post.related_posts.map((related) => (
                  <Card key={related.id} className="border-2 border-[#C81400] hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-2 text-[#C81400]">
                        <Link to={lang ? `/${lang}/blog/${related.slug}` : `/blog/${related.slug}`} className="hover:underline">
                          {related.title}
                        </Link>
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <Clock className="h-3 w-3 mr-1" />
                        {related.reading_time || calculateReadingTime(related.content || '')} min read
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

        </article>
      </main>
      
      {/* Bottom CTA for scrollers */}
      {showStickyCTA && (
        <div className="fixed bottom-0 left-0 right-0 p-4" style={{ backgroundColor: 'var(--color-red)', borderTop: '1px solid rgba(0, 0, 0, 0.25)' }}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-bold" style={{ color: 'var(--color-cream)' }}>
                Ready to create your own mystery?
              </h3>
              <p className="text-sm" style={{ color: 'rgba(245, 240, 232, 0.85)' }}>
                Get started today and create an unforgettable experience for your friends and family.
              </p>
            </div>
            <Button
              asChild
              className="py-2 px-6 font-medium transition-colors shrink-0"
              style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-red)' }}
            >
              <Link to="/mystery/create">
                Start Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
