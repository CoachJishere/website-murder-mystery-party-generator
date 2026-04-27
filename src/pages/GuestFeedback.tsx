import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation, Trans } from "react-i18next";

const GuestFeedback: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assignment data
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [mysteryTitle, setMysteryTitle] = useState("");
  const [guestName, setGuestName] = useState("");

  // Form state
  const [starRating, setStarRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [bestPart, setBestPart] = useState("");

  useEffect(() => {
    if (!token) {
      setError(t("guestFeedback.errors.invalidLink"));
      setLoading(false);
      return;
    }

    const ratingParam = searchParams.get("rating");
    if (ratingParam) {
      const r = parseInt(ratingParam);
      if (r >= 1 && r <= 5) setStarRating(r);
    }

    loadAssignment();
  }, [token, searchParams]);

  const loadAssignment = async () => {
    try {
      // Look up the character assignment by access_token via RPC (bypasses RLS)
      const { data, error: fetchError } = await supabase
        .rpc("get_assignment_for_feedback", { access_token_param: token })
        .single();

      if (fetchError || !data) {
        setError(t("guestFeedback.errors.linkExpired"));
        return;
      }

      setAssignmentId(data.id);
      setGuestName(data.guest_name);
      setCharacterName(data.character_name);
      setMysteryTitle(data.mystery_title || t("guestFeedback.fallbackTitle"));

      // Check if feedback already submitted
      const { data: existingFeedback } = await supabase
        .from("guest_feedback" as any)
        .select("id")
        .eq("character_assignment_id", data.id)
        .maybeSingle();

      if (existingFeedback) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Error loading assignment:", err);
      setError(t("guestFeedback.errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (starRating === 0 || !assignmentId) return;

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("guest_feedback" as any)
        .insert({
          character_assignment_id: assignmentId,
          star_rating: starRating,
          best_part: bestPart || null,
          character_name: characterName,
          mystery_title: mysteryTitle,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          setSubmitted(true);
          return;
        }
        throw insertError;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError(t("guestFeedback.errors.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C81400]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <Card className="max-w-md w-full bg-[#111111] border-[#222]">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <Card className="max-w-md w-full bg-[#111111] border-[#222]">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-[#F5F0E8]">{t("guestFeedback.thankYou.title")}</h2>
            <p className="text-[#F5F0E8]/70 mb-8">
              <Trans
                i18nKey="guestFeedback.thankYou.body"
                values={{ title: mysteryTitle }}
                components={{ strong: <strong className="text-[#F5F0E8]" /> }}
              />
            </p>
            <div className="border-t border-[#222] pt-6">
              <p className="text-[#F5F0E8]/60 text-sm mb-4">{t("guestFeedback.thankYou.cta")}</p>
              <a
                href="https://www.mysterymaker.party"
                className="inline-block bg-[#C81400] text-[#F5F0E8] px-6 py-3 rounded-lg font-semibold hover:bg-[#A01000] transition-colors"
              >
                {t("guestFeedback.thankYou.browseButton")}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center py-8 px-6 rounded-t-lg bg-[#C81400]">
          <h1 className="text-2xl font-bold text-[#F5F0E8] tracking-wide uppercase">
            {t("guestFeedback.heading")}
          </h1>
          <p className="text-[#F5F0E8]/80 mt-2">{mysteryTitle}</p>
          {characterName && (
            <p className="text-[#F5F0E8]/60 text-sm mt-1">
              <Trans
                i18nKey="guestFeedback.youPlayed"
                values={{ character: characterName }}
                components={{ strong: <strong className="text-[#F5F0E8]/80" /> }}
              />
            </p>
          )}
        </div>

        <Card className="rounded-t-none border-t-0 bg-[#111111] border-[#222]">
          <CardContent className="pt-6">
            {searchParams.get("rating") && (
              <div className="bg-green-900/30 border border-green-800/50 rounded-lg p-3 mb-6 text-center">
                <p className="text-green-300 text-sm">{t("guestFeedback.thanksForRating")}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div>
                <Label className="text-base font-semibold text-[#F5F0E8]">
                  {t("guestFeedback.fields.rating")}
                </Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStarRating(n)}
                      onMouseEnter={() => setHoveredStar(n)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          n <= (hoveredStar || starRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-[#333]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Best part */}
              <div>
                <Label htmlFor="bestPart" className="text-base font-semibold text-[#F5F0E8]">
                  {t("guestFeedback.fields.highlight")}
                </Label>
                <Textarea
                  id="bestPart"
                  value={bestPart}
                  onChange={(e) => setBestPart(e.target.value)}
                  placeholder={t("guestFeedback.placeholders.highlight")}
                  className="mt-2 bg-[#0a0a0a] border-[#333] text-[#F5F0E8] placeholder:text-[#555]"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={starRating === 0 || submitting}
                className="w-full bg-[#C81400] hover:bg-[#A01000] text-[#F5F0E8] py-3 text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("guestFeedback.submitting")}
                  </>
                ) : (
                  t("guestFeedback.submit")
                )}
              </Button>
            </form>

            {/* One-time email notice */}
            <p className="text-[#F5F0E8]/30 text-xs text-center mt-6">
              {t("guestFeedback.oneTimeNotice")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestFeedback;
