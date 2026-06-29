import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ko, es, fr, de, ja, zhCN, nl, da, sv, fi, it, pt } from 'date-fns/locale';

const dateLocales: Record<string, any> = {
  ko,
  es, 
  fr,
  de,
  ja,
  zh: zhCN,
  nl,
  da,
  sv,
  fi,
  it,
  pt
};
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  published_at: string;
  post_date: string;
  reading_time?: number;
  status: 'draft' | 'published';
  language: string;
  content?: string;
  theme?: string;
}

const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lang } = useParams<{ lang?: string }>();
  const { t, i18n }: any = useTranslation();
  // URL language takes precedence over i18n setting
  const currentLanguage = lang || i18n.language.split('-')[0];

  // Sync i18n if URL specifies a language
  useEffect(() => {
    if (lang && lang !== i18n.language.split('-')[0]) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('blog_posts')
          .select('id, slug, title, meta_description, published_at, post_date, reading_time, status, language, theme, content')
          .eq('status', 'published')
          .eq('language', currentLanguage)
          .order('post_date', { ascending: false, nullsFirst: false })
          .order('published_at', { ascending: false });

        if (fetchError) throw fetchError;

        setPosts(data ?? []);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
        setError('Failed to load blog posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentLanguage]);


  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000000]">
        <Header />
        <main className="flex-grow py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-[#C81400] mb-4">{t('blog.errorTitle')}</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-[#C81400] hover:bg-[#A01000] text-white"
              >
                {t('blog.tryAgain')}
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Header />
      <main className="flex-grow py-12 px-4">
        <Helmet>
          <title>Murder Mystery Party Ideas, Themes & Host Guides</title>
          <meta name="description" content="Free guides to hosting a murder mystery party — 40+ themes, character ideas, timing and decoration tips, plus printable kit comparisons. Plan a night they'll remember." />
          <link rel="canonical" href={`https://www.mysterymaker.party${lang ? `/${lang}` : ''}/blog`} />
          <meta property="og:title" content="Murder Mystery Party Ideas, Themes & Host Guides" />
          <meta property="og:description" content="Free guides to hosting a murder mystery party — 40+ themes, character ideas, timing tips, and printable kit comparisons." />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content={currentLanguage} />
        </Helmet>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button asChild variant="ghost" className="mb-4">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('blog.backToHome')}
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-[#C81400] mb-2">{t('blog.title')}</h1>
            <p className="text-muted-foreground">{t('blog.subtitle')}</p>
            <p className="text-muted-foreground mt-3">
              Want a game built around your own group?{' '}
              <Link to="/custom-murder-mystery-party" className="text-[#C81400] hover:underline font-medium">
                Create a custom murder mystery party
              </Link>
              , or planning for work? Try an{' '}
              <Link to="/office-murder-mystery-party" className="text-[#C81400] hover:underline font-medium">
                office murder mystery party
              </Link>
              {' '}or read our guide to{' '}
              <Link to="/blog/murder-mystery-party-for-corporate-events/" className="text-[#C81400] hover:underline font-medium">
                corporate &amp; office murder mystery parties
              </Link>
              .
            </p>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-card">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-8 w-32 mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => {
                const dateSource = post.post_date || post.published_at.split('T')[0];
                const formattedDate = format(parseISO(dateSource), 'MMMM d, yyyy', {
                  locale: dateLocales[currentLanguage] || undefined
                });
                const readingTime = post.reading_time || calculateReadingTime(post.content || '');
                const href = lang ? `/${lang}/blog/${post.slug}` : `/blog/${post.slug}`;

                return (
                  <Card key={post.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">
                        <Link to={href} className="hover:text-[#C81400] transition-colors">
                          {post.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{readingTime} {t('blog.minRead', { count: readingTime })}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground">{post.meta_description}</p>
                      <div className="mt-4">
                        <Link to={href} className="text-[#C81400] hover:underline font-medium">
                          {t('blog.readMore')}
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl text-foreground">No blog posts found.</h2>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
