import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Feedback: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [mysteryTitle, setMysteryTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [starRating, setStarRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [didHostParty, setDidHostParty] = useState<string>("");
  const [attendeeCount, setAttendeeCount] = useState<string>("");
  const [bestPart, setBestPart] = useState("");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [testimonial, setTestimonial] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!conversationId) {
      setError("Invalid feedback link.");
      setLoading(false);
      return;
    }

    // Check for pre-filled rating from email
    const ratingParam = searchParams.get("rating");
    if (ratingParam) {
      const r = parseInt(ratingParam);
      if (r >= 1 && r <= 5) setStarRating(r);
    }

    // Handle unsubscribe
    if (searchParams.get("unsubscribe") === "true") {
      handleUnsubscribe();
      return;
    }

    loadMysteryData();
  }, [conversationId, searchParams]);

  const handleUnsubscribe = async () => {
    try {
      await supabase
        .from("conversations")
        .update({ unsubscribed_from_followups: true } as any)
        .eq("id", conversationId);

      // Skip any pending follow-up emails
      await supabase
        .from("followup_emails" as any)
        .update({ status: "skipped", skipped_reason: "unsubscribed" })
        .eq("conversation_id", conversationId)
        .eq("status", "pending");

      setUnsubscribed(true);
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setUnsubscribed(true); // Show confirmation anyway
    }
    setLoading(false);
  };

  const loadMysteryData = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("conversations")
        .select("title")
        .eq("id", conversationId)
        .eq("is_paid", true)
        .single();

      if (fetchError || !data) {
        setError("Mystery not found.");
        return;
      }

      setMysteryTitle(data.title || "Your Mystery");

      // Check if feedback already submitted
      const { data: existingFeedback } = await supabase
        .from("mystery_feedback" as any)
        .select("id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (existingFeedback) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Error loading mystery:", err);
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (starRating === 0) {
      return; // Require at least a star rating
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from("mystery_feedback" as any)
        .insert({
          conversation_id: conversationId,
          star_rating: starRating,
          did_host_party: didHostParty || null,
          attendee_count: attendeeCount ? parseInt(attendeeCount) : null,
          best_part: bestPart || null,
          nps_score: npsScore,
          testimonial: testimonial || null,
          is_public: isPublic,
          display_name: isPublic ? displayName || null : null,
        });

      if (insertError) {
        console.error("Feedback submission error:", insertError);
        // Check if it's a duplicate
        if (insertError.code === "23505") {
          setSubmitted(true);
          return;
        }
        throw insertError;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B1538]" />
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unsubscribed</h2>
            <p className="text-gray-600">
              You've been unsubscribed from follow-up emails. We won't send you any more.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your feedback for <strong>{mysteryTitle}</strong> has been recorded. We really appreciate it!
            </p>
            <Button
              onClick={() => navigate("/")}
              className="bg-[#8B1538] hover:bg-[#6B0F28] text-white"
            >
              Ready for Another Mystery?
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div
          className="text-center py-8 px-6 rounded-t-lg"
          style={{ background: "linear-gradient(135deg, #8B1538 0%, #6B0F28 100%)" }}
        >
          <h1 className="text-2xl font-bold text-white">How Did Your Mystery Go?</h1>
          <p className="text-white/80 mt-2">{mysteryTitle}</p>
        </div>

        <Card className="rounded-t-none border-t-0">
          <CardContent className="pt-6">
            {searchParams.get("rating") && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-center">
                <p className="text-green-800 text-sm">Thanks for the rating! Want to tell us more?</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div>
                <Label className="text-base font-semibold">Rate your experience *</Label>
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
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Did you host? */}
              <div>
                <Label className="text-base font-semibold">Did you host the party?</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: "yes", label: "Yes!" },
                    { value: "not_yet", label: "Not yet" },
                    { value: "changed_plans", label: "Changed plans" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDidHostParty(option.value)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        didHostParty === option.value
                          ? "bg-[#8B1538] text-white border-[#8B1538]"
                          : "bg-white text-gray-700 border-gray-300 hover:border-[#8B1538]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendee count (shown if hosted) */}
              {didHostParty === "yes" && (
                <div>
                  <Label htmlFor="attendees" className="text-base font-semibold">
                    How many people attended?
                  </Label>
                  <Input
                    id="attendees"
                    type="number"
                    min="2"
                    max="50"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    placeholder="e.g. 8"
                    className="mt-2 max-w-[120px]"
                  />
                </div>
              )}

              {/* Best part */}
              <div>
                <Label htmlFor="bestPart" className="text-base font-semibold">
                  What was the best part?
                </Label>
                <Textarea
                  id="bestPart"
                  value={bestPart}
                  onChange={(e) => setBestPart(e.target.value)}
                  placeholder="The reveal moment was incredible..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* NPS */}
              <div>
                <Label className="text-base font-semibold">
                  How likely are you to recommend Mystery Maker to a friend?
                </Label>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNpsScore(n)}
                      className={`w-9 h-9 rounded text-sm font-medium transition-colors ${
                        npsScore === n
                          ? "bg-[#8B1538] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>

              {/* Testimonial */}
              <div>
                <Label htmlFor="testimonial" className="text-base font-semibold">
                  Anything else you'd like to share?
                </Label>
                <Textarea
                  id="testimonial"
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                  placeholder="Optional: share your experience, suggestions, or a story from the party..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Public review opt-in */}
              <div className="bg-[#F7F3E9] border-l-4 border-[#8B1538] p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#8B1538] focus:ring-[#8B1538]"
                  />
                  <div>
                    <Label htmlFor="isPublic" className="text-sm font-medium cursor-pointer">
                      Show my feedback on the Mystery Maker website
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Help other hosts see what real customers think!
                    </p>
                  </div>
                </div>

                {isPublic && (
                  <div className="mt-3 ml-7">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name (e.g. Sarah M.)"
                      className="max-w-[200px]"
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={starRating === 0 || submitting}
                className="w-full bg-[#8B1538] hover:bg-[#6B0F28] text-white py-3 text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
