import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

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
}

const HostAccess: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
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
        .from("mystery_packages")
        .select(
          "title, game_overview, host_guide, materials, preparation_instructions, timeline, hosting_tips, detective_script, evidence_cards"
        )
        .eq("host_access_token", token)
        .single();

      if (fetchError) {
        console.error("Host package error:", fetchError);
        setError("Host materials not found or access denied.");
        return;
      }

      setPackageData(data);
    } catch (err: any) {
      console.error("Error loading host package:", err);
      setError(`Failed to load host materials: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const buildHostGuideContent = (): string => {
    if (!packageData) return "";
    let content = "";

    if (packageData.game_overview) {
      content += `${packageData.game_overview}\n\n`;
    }
    if (packageData.host_guide) {
      content += `${packageData.host_guide}\n\n`;
    }
    if (packageData.materials) {
      content += `${packageData.materials}\n\n`;
    }
    if (packageData.preparation_instructions) {
      content += `${packageData.preparation_instructions}\n\n`;
    }
    if (packageData.timeline) {
      content += `${packageData.timeline}\n\n`;
    }
    if (packageData.hosting_tips) {
      content += `${packageData.hosting_tips}\n\n`;
    }

    return content;
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
        </div>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6 h-auto p-1 bg-muted/80 border border-border rounded-lg">
            <TabsTrigger
              value="guide"
              className="gap-2 py-3 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border rounded-md transition-all"
            >
              <BookOpen className="h-4 w-4" />
              {t("hostAccess.tabs.guide")}
            </TabsTrigger>
            <TabsTrigger
              value="detective"
              className="gap-2 py-3 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border rounded-md transition-all"
            >
              <Search className="h-4 w-4" />
              {t("hostAccess.tabs.detective")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide">
            <Card>
              <CardContent className="p-6">
                <div className="mystery-content">
                  <ReactMarkdown components={markdownComponents}>
                    {buildHostGuideContent()}
                  </ReactMarkdown>
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
