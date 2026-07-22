
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import MysteryList from "@/components/dashboard/MysteryList";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, PlusCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HomeDashboard } from "@/components/dashboard/HomeDashboard";
import { ColdCaseOrder } from "@/components/dashboard/ColdCaseList";
import { useTranslation } from "react-i18next";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import AttributionSurvey from "@/components/AttributionSurvey";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [mysteries, setMysteries] = useState([]);
  const [coldCases, setColdCases] = useState<ColdCaseOrder[]>([]);
  const [isLoadingMysteries, setIsLoadingMysteries] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const { t } = useTranslation();

  // Declared before the effect (and in its deps) — previously it lived after
  // the effect, so the one-time auth listener captured the first-render
  // closure and the effect couldn't list it as a dependency.
  const fetchColdCases = useCallback(async () => {
    // RLS scopes to the signed-in owner. Party-only users get [] — they still see
    // the cold-case section (it always carries the free trial card, the deliberate
    // launch cross-sell; supersedes the earlier zero-change rule, ADR-0029 07-05).
    const { data, error } = await supabase
      .from("cold_case_orders")
      .select("id, case_title, status, delivery_token, created_at")
      .order("created_at", { ascending: false });
    if (!error) setColdCases((data as ColdCaseOrder[]) || []);
  }, []);

  const fetchMysteries = useCallback(async (userId: string) => {
    setIsLoadingMysteries(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages!fk_messages_conversation_id(id, content, created_at, is_ai, role)")
        .eq("user_id", userId)
        .neq("display_status", "refunded")
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      setMysteries(data || []);
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error(t("dashboard.errors.loadFailed"));
    } finally {
      setIsLoadingMysteries(false);
    }
  }, [t]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Dashboard session check error:", error);
          navigate("/sign-in", { replace: true });
          return;
        }

        if (!data.session) {
          console.log("Dashboard: No active session found");
          navigate("/sign-in", { replace: true });
          return;
        }

        setUser(data.session.user);
        console.log("Dashboard: Session found for user:", data.session.user.id);

        // Fetch user's mysteries + cold cases
        await fetchMysteries(data.session.user.id);
        await fetchColdCases();

        // Check if user needs attribution survey.
        // Defer the first ask until either (a) they have at least one mystery,
        // or (b) this is at least their second visit to the dashboard. This
        // avoids high-intent buyers blowing past the prompt right after signup.
        const { data: profile } = await supabase
          .from("profiles")
          .select("attribution_source, attribution_skip_count, attribution_surveyed_at")
          .eq("id", data.session.user.id)
          .single();

        if (profile) {
          const SECOND_VISIT_KEY = "mm_dashboard_visited_v1";
          const isSecondVisit = !!localStorage.getItem(SECOND_VISIT_KEY);
          if (!isSecondVisit) localStorage.setItem(SECOND_VISIT_KEY, "1");

          let userHasMystery = false;
          try {
            const { count } = await supabase
              .from("conversations")
              .select("id", { count: "exact", head: true })
              .eq("user_id", data.session.user.id);
            userHasMystery = (count ?? 0) > 0;
          } catch { /* ignore */ }

          const eligibleToAsk = isSecondVisit || userHasMystery;

          const neverAnswered = !profile.attribution_source;
          const skippedRecently = profile.attribution_source === "skipped";
          const skipCount = profile.attribution_skip_count ?? 0;
          const lastAt = profile.attribution_surveyed_at
            ? new Date(profile.attribution_surveyed_at).getTime()
            : 0;
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          const enoughTimeSinceSkip = Date.now() - lastAt > sevenDaysMs;

          const shouldShow =
            eligibleToAsk &&
            (neverAnswered ||
              (skippedRecently && skipCount < 2 && enoughTimeSinceSkip));

          if (shouldShow) setShowAttribution(true);
        }
      } catch (error) {
        console.error("Dashboard auth check error:", error);
        navigate("/sign-in", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Dashboard auth state changed:", event);
        if (event === "SIGNED_OUT") {
          navigate("/sign-in", { replace: true });
        } else if (session) {
          setUser(session.user);
          fetchMysteries(session.user.id);
          fetchColdCases();
        }
      }
    );

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, fetchMysteries, fetchColdCases]);

  const handleCreateNewMystery = () => {
    navigate("/mystery/create");
  };

  // Arrival from the gated free sample (/cold-case-files → sign in → OAuth → here).
  // The intent flag is set pre-auth on the landing page; read-and-clear once.
  const [searchParams, setSearchParams] = useSearchParams();
  const [sampleIntent] = useState(() => {
    try {
      const v = localStorage.getItem("ccf_sample_intent") === "1";
      localStorage.removeItem("ccf_sample_intent");
      return v;
    } catch {
      return false;
    }
  });
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const welcomeCase = !welcomeDismissed && (searchParams.get("welcome_case") === "1" || sampleIntent);
  const dismissWelcomeCase = () => {
    setWelcomeDismissed(true);
    if (searchParams.get("welcome_case")) {
      searchParams.delete("welcome_case");
      setSearchParams(searchParams, { replace: true });
    }
  };

  // The one transient moment a cold case outranks the party list.
  const generatingCase = coldCases.find((c) => c.status === "paid" || c.status === "generating");

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto py-8 px-4">
        <EmailVerificationBanner />
        {mysteries.length > 0 || coldCases.length > 0 || welcomeCase ? (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold">{t("nav.dashboard", "Dashboard")}</h1>
              <p className="text-muted-foreground mt-1">
                {t("dashboard.subtitle")}
              </p>
            </div>

            {/* A cold case actively being written outranks everything — transient banner
                instead of section reordering (parties stay first; see ADR-0029). */}
            {generatingCase && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 px-4 py-3 text-sm flex items-center justify-between gap-3">
                <span>
                  <Clock className="inline h-4 w-4 mr-2 animate-pulse" />
                  Your cold case is being written — usually within the hour.
                </span>
                <Link to={`/cold-case/${generatingCase.delivery_token}`} className="underline font-medium shrink-0">
                  View status
                </Link>
              </div>
            )}

            {/* Arrival from the gated free sample: point them at the trial card below. */}
            {welcomeCase && (
              <div className="rounded-lg border px-4 py-3 text-sm flex items-center justify-between gap-3" style={{ borderColor: "#c2a14a", backgroundColor: "rgba(194,161,74,0.08)" }}>
                <span>
                  <FileText className="inline h-4 w-4 mr-2" style={{ color: "#c2a14a" }} />
                  Your free cold case is waiting in Your Cold Cases below — on the house.
                </span>
                <button onClick={dismissWelcomeCase} className="underline font-medium shrink-0">
                  Got it
                </button>
              </div>
            )}

            {/* One unified grid (ADR-0029 v3): mysteries and cold cases interleaved by
                date, each card carrying a type label; the free trial card closes the
                grid. Two create buttons, one per product. */}
            <div className="flex flex-wrap gap-3 -mt-2">
              <Button size="sm" onClick={handleCreateNewMystery}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("common.buttons.createNew")}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/cold-case/create")}
                className="bg-[#c2a14a] hover:bg-[#d4b35c] text-[#1a1510] font-semibold"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New cold case
              </Button>
            </div>

            <MysteryList
              mysteries={mysteries}
              coldCases={coldCases}
              isLoading={isLoadingMysteries}
              onRefresh={() => user && fetchMysteries(user.id)}
            />
          </div>
        ) : (
          <HomeDashboard onCreateNew={handleCreateNewMystery} />
        )}
      </main>
      <Footer />

      {user && (
        <AttributionSurvey
          open={showAttribution}
          onComplete={() => setShowAttribution(false)}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
