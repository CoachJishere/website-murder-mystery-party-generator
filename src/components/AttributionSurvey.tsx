import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import { Search, Youtube, Music2, Instagram, MessageCircle, Users, BookOpen, HelpCircle } from "lucide-react";

const ATTRIBUTION_SOURCES = [
  { id: "google", icon: Search, color: "#4285F4" },
  { id: "youtube", icon: Youtube, color: "#FF0000" },
  { id: "tiktok", icon: Music2, color: "#00F2EA" },
  { id: "instagram", icon: Instagram, color: "#E4405F" },
  { id: "reddit", icon: MessageCircle, color: "#FF4500" },
  { id: "friend", icon: Users, color: "#10B981" },
  { id: "blog", icon: BookOpen, color: "#8B5CF6" },
  { id: "other", icon: HelpCircle, color: "#6B7280" },
] as const;

type AttributionSourceId = typeof ATTRIBUTION_SOURCES[number]["id"];

interface AttributionSurveyProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

export default function AttributionSurvey({ open, onComplete, userId }: AttributionSurveyProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AttributionSourceId | null>(null);
  const [otherText, setOtherText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSelect = (sourceId: AttributionSourceId) => {
    setSelected(sourceId);
    if (sourceId !== "other") {
      submitAttribution(sourceId);
    }
  };

  const submitAttribution = async (source: string, otherDetail?: string) => {
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          attribution_source: source,
          attribution_source_other: otherDetail || null,
          attribution_surveyed_at: new Date().toISOString(),
        })
        .eq("id", userId);

      trackEvent("attribution_survey_completed", {
        attribution_source: source,
        attribution_source_other: otherDetail || undefined,
      });
    } catch (error) {
      console.error("Failed to save attribution:", error);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          attribution_source: "skipped",
          attribution_surveyed_at: new Date().toISOString(),
        })
        .eq("id", userId);

      trackEvent("attribution_survey_skipped");
    } catch (error) {
      console.error("Failed to save attribution skip:", error);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      submitAttribution("other", otherText.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button:last-child]:hidden"
        style={{
          backgroundColor: "var(--color-charcoal)",
          border: "1px solid rgba(245,240,232,0.15)",
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle
            className="text-xl font-bold"
            style={{ color: "var(--color-cream)" }}
          >
            {t("attribution.title")}
          </DialogTitle>
          <DialogDescription
            className="text-sm mt-1"
            style={{ color: "var(--color-cream-muted)" }}
          >
            {t("attribution.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {ATTRIBUTION_SOURCES.map(({ id, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              disabled={saving}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor:
                  selected === id
                    ? "rgba(245,240,232,0.12)"
                    : "rgba(245,240,232,0.05)",
                border:
                  selected === id
                    ? `1.5px solid ${color}`
                    : "1.5px solid rgba(245,240,232,0.08)",
                color: "var(--color-cream)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-lg w-9 h-9 shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-sm font-medium">
                {t(`attribution.sources.${id}`)}
              </span>
            </button>
          ))}
        </div>

        {/* "Other" text input */}
        {selected === "other" && (
          <div className="flex gap-2 mt-2">
            <Input
              placeholder={t("attribution.otherPlaceholder")}
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOtherSubmit();
              }}
              autoFocus
              className="flex-1 text-sm"
              style={{
                backgroundColor: "rgba(245,240,232,0.05)",
                border: "1px solid rgba(245,240,232,0.15)",
                color: "var(--color-cream)",
              }}
            />
            <Button
              onClick={handleOtherSubmit}
              disabled={!otherText.trim() || saving}
              size="sm"
              className="shrink-0"
              style={{
                backgroundColor: "var(--color-red)",
                color: "var(--color-cream)",
              }}
            >
              {t("attribution.submit")}
            </Button>
          </div>
        )}

        {/* Skip button */}
        <div className="flex justify-center mt-2">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-xs transition-colors hover:underline"
            style={{ color: "var(--color-cream-muted)" }}
          >
            {t("attribution.skip")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
