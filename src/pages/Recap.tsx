import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RecapData {
  title: string | null;
  theme: string | null;
  player_count: number | null;
  hosted_at: string | null;
  character_names: string[] | null;
  top_guest_quote: string | null;
  top_guest_character: string | null;
  guest_review_count: number;
  guest_average_rating: number | null;
}

const SHARE_BASE = "https://www.mysterymaker.party";
const OG_FALLBACK_IMAGE = "https://www.mysterymaker.party/images/homepage-share-image.png";

const formatHostedAt = (iso: string | null): string => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
};

const buildHomeCta = (token: string | undefined): string => {
  const params = new URLSearchParams({
    utm_source: "share",
    utm_medium: "recap",
    utm_campaign: "recap_cta",
  });
  if (token) params.set("utm_content", `recap-${token}`);
  return `${SHARE_BASE}/?${params.toString()}`;
};

const Recap: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing recap token");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: rows, error: fetchError } = await supabase.rpc(
          "get_recap_data",
          { recap_token: token }
        );

        if (fetchError) throw fetchError;
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row || !row.title) {
          setError("Recap not found");
        } else {
          setData(row as RecapData);
        }
      } catch (err: any) {
        console.error("Recap load error:", err);
        setError("Could not load this recap");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <h1 className="text-xl font-semibold">Recap unavailable</h1>
            <p className="text-muted-foreground text-sm">
              {error || "This link may be incorrect or the recap may have been removed."}
            </p>
            <a
              href={buildHomeCta(undefined)}
              className="inline-flex items-center gap-2 text-primary underline mt-4"
            >
              Make your own mystery <ArrowRight className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const characterCount = data.character_names?.length ?? data.player_count ?? 0;
  const ogTitle = `${data.title} — a custom murder mystery`;
  const ogDescription = data.theme
    ? `${characterCount}-character mystery, ${data.theme}. Created on Mystery Maker.`
    : `A ${characterCount}-character custom murder mystery created on Mystery Maker.`;
  const homeCta = buildHomeCta(token);
  const hostedAt = formatHostedAt(data.hosted_at);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{ogTitle} | Mystery Maker</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_FALLBACK_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={OG_FALLBACK_IMAGE} />
      </Helmet>

      <main className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Mystery Maker recap
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-center mt-3 mb-6 leading-tight">
          {data.title}
        </h1>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-10">
          {data.theme && (
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> {data.theme}
            </span>
          )}
          {characterCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {characterCount} characters
            </span>
          )}
          {hostedAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Hosted {hostedAt}
            </span>
          )}
        </div>

        {data.character_names && data.character_names.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                The cast
              </p>
              <ul className="space-y-1.5 text-base">
                {data.character_names.map((name) => (
                  <li key={name} className="font-medium">
                    {name}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.top_guest_quote && (
          <Card className="mb-8 border-primary/30">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                What guests said
              </p>
              <blockquote className="text-lg italic leading-relaxed">
                "{data.top_guest_quote}"
              </blockquote>
              {data.top_guest_character && (
                <p className="text-sm text-muted-foreground mt-3">
                  — playing {data.top_guest_character}
                </p>
              )}
              {data.guest_review_count > 1 && data.guest_average_rating && (
                <p className="text-xs text-muted-foreground mt-2">
                  {data.guest_review_count} guests rated this mystery — average {data.guest_average_rating}/5
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-12 pt-8 border-t border-border/40">
          <p className="text-muted-foreground mb-4 text-sm">
            Every Mystery Maker game is generated from scratch. No two parties play the same one.
          </p>
          <a
            href={homeCta}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Make your own mystery <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-xs text-muted-foreground mt-4">
            <a href={SHARE_BASE} className="underline">
              mysterymaker.party
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Recap;
