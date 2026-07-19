import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, BookOpen, Search } from "lucide-react";
import "../styles/print.css";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import HostGuideTemplate from "@/components/HostGuideTemplate";
import { useIsMobile } from "@/hooks/use-mobile";

interface HostPackageData {
  title: string;
  game_overview: string;
  host_guide: string;
  materials: string;
  preparation_instructions: string;
  timeline: string;
  hosting_tips: string;
  detective_script: string;
  evidence_cards: any;
  // Mystery params (from conversations) — feed HostGuideTemplate so the shared
  // host guide renders identically to the dashboard (ADR-0037, single source of truth).
  mystery_type: string | null;
  mystery_style: string | null;
  has_accomplice: boolean | null;
  player_count: number | null;
}

const HostAccess: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const isMobile = useIsMobile();
  const [packageData, setPackageData] = useState<HostPackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadHostPackage();
    } else {
      setError("No access token provided");
      setLoading(false);
    }
  }, [token]);

  const loadHostPackage = async () => {
    if (!token) {
      setError("Access token is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .rpc("get_host_package", { access_token: token })
        .single();

      if (fetchError) {
        console.error("Host package error:", fetchError);
        setError(t("hostAccess.errors.notFound"));
        return;
      }

      setPackageData(data);
    } catch (err: any) {
      console.error("Error loading host package:", err);
      setError(`${t("hostAccess.errors.loadFailed")}: ${err.message || t("auth.errors.unknownError")}`);
    } finally {
      setLoading(false);
    }
  };

  const buildDetectiveKitContent = (): string => {
    if (!packageData) return "";
    let content = "";

    if (packageData.detective_script) {
      content += `${packageData.detective_script}\n\n`;
    }

    if (packageData.evidence_cards) {
      const cards = typeof packageData.evidence_cards === "string"
        ? packageData.evidence_cards
        : JSON.stringify(packageData.evidence_cards, null, 2);

      if (cards && cards !== "[]" && cards !== "null") {
        content += `## Evidence Cards\n\n${cards}\n\n`;
      }
    }

    return content;
  };

  const markdownComponents = {
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold mb-4 text-primary">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-semibold mb-3 text-secondary">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-medium mb-2">{children}</h3>
    ),
    p: ({ children }: any) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }: any) => <li className="ml-2">{children}</li>,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>{t("hostAccess.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !packageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              {t("hostAccess.accessDenied")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {error || t("hostAccess.notFound")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initialTab = window.location.hash === "#detective" ? "detective" : "guide";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">
            {packageData.title || t("hostAccess.title")}
          </h1>
          <p className="text-muted-foreground">{t("hostAccess.subtitle")}</p>
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="mt-3 gap-2 print:hidden"
          >
            <Download className="h-4 w-4" />
            {t('mysteryPackage.export.saveAsPdf')}
          </Button>
        </div>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6 h-auto p-1 rounded-lg" style={{ backgroundColor: 'var(--color-charcoal)', border: '1px solid var(--color-cream-border)' }}>
            <TabsTrigger
              value="guide"
              className="gap-2 py-3 text-sm font-semibold rounded-md transition-all data-[state=active]:shadow-md"
              style={{ color: 'var(--color-cream)' }}
            >
              <BookOpen className="h-4 w-4" />
              {t("hostAccess.tabs.guide")}
            </TabsTrigger>
            <TabsTrigger
              value="detective"
              className="gap-2 py-3 text-sm font-semibold rounded-md transition-all data-[state=active]:shadow-md"
              style={{ color: 'var(--color-cream)' }}
            >
              <Search className="h-4 w-4" />
              {t("hostAccess.tabs.detective")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide">
            <Card>
              <CardContent className="p-6">
                <div className="mystery-content">
                  {/* Same component the dashboard renders — keeps the host guide
                      (checklist, off-script note, two-round framing, big-circle tip)
                      identical across owner view and share link. Read-only: no
                      onPackageFieldUpdate passed. */}
                  <HostGuideTemplate
                    mysteryType={packageData.mystery_type}
                    mysteryStyle={packageData.mystery_style}
                    hasAccomplice={packageData.has_accomplice}
                    playerCount={packageData.player_count}
                    gameOverview={packageData.game_overview}
                    materials={packageData.materials}
                    hostingTips={packageData.hosting_tips}
                    isMobile={isMobile}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detective">
            <Card>
              <CardContent className="p-6">
                <div className="mystery-content">
                  <ReactMarkdown components={markdownComponents}>
                    {buildDetectiveKitContent()}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HostAccess;
