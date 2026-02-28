import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, MessageSquare, CreditCard, Package, UserCheck, Star, TrendingUp, AlertTriangle, ArrowRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelMetrics {
  totalUsers: number;
  usersWithConversations: number;
  paidUsers: number;
  generatedPackages: number;
  assignedCharacters: number;
}

interface EngagementBucket {
  label: string;
  total: number;
  paid: number;
  convRate: number;
}

interface MonthlyRow {
  month: string;
  users: number;
  conversations: number;
  paid: number;
  convRate: number;
}

interface EngagementFunnel {
  created: number;
  engaged: number;
  paid: number;
  generated: number;
  assigned: number;
}

interface GenerationHealth {
  total: number;
  completed: number;
  failed: number;
  withHostGuide: number;
  withCharacters: number;
}

interface FeedbackRow {
  star_rating: number;
  nps_score: number | null;
  did_host_party: string | null;
  best_part: string | null;
  testimonial: string | null;
  display_name: string | null;
  is_public: boolean;
  created_at: string;
}

interface RecentConversation {
  id: string;
  title: string | null;
  theme: string | null;
  player_count: number | null;
  is_paid: boolean;
  created_at: string;
  is_test: boolean;
}

const AdminDashboard: React.FC = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [excludeTest, setExcludeTest] = useState(true);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [engagement, setEngagement] = useState<EngagementBucket[]>([]);
  const [engagementFunnel, setEngagementFunnel] = useState<EngagementFunnel | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyRow[]>([]);
  const [genHealth, setGenHealth] = useState<GenerationHealth | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentConversation[]>([]);

  // Check admin status directly from profiles
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate("/", { replace: true });
      return;
    }
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.is_admin) {
          setIsAdmin(true);
        } else {
          navigate("/", { replace: true });
        }
        setAdminChecked(true);
      });
  }, [authLoading, isAuthenticated, user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get test account IDs for filtering
      let testUserIds: string[] = [];
      if (excludeTest) {
        const { data: testProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_test_account", true);
        testUserIds = (testProfiles || []).map((p: any) => p.id);
      }

      // 1. Funnel Metrics
      const { data: allConversations } = await supabase
        .from("conversations")
        .select("id, user_id, is_paid");

      const conversations = excludeTest
        ? (allConversations || []).filter((c: any) => !testUserIds.includes(c.user_id))
        : allConversations || [];

      const uniqueUsers = new Set(conversations.map((c: any) => c.user_id).filter(Boolean));
      const paidConvs = conversations.filter((c: any) => c.is_paid);
      const paidUsers = new Set(paidConvs.map((c: any) => c.user_id).filter(Boolean));

      const { count: packageCount } = await supabase
        .from("mystery_packages")
        .select("id", { count: "exact", head: true });

      const { count: assignmentCount } = await supabase
        .from("character_assignments")
        .select("id", { count: "exact", head: true });

      setFunnel({
        totalUsers: uniqueUsers.size,
        usersWithConversations: uniqueUsers.size,
        paidUsers: paidUsers.size,
        generatedPackages: packageCount || 0,
        assignedCharacters: assignmentCount || 0,
      });

      // 2. Drop-off & Engagement Analysis
      // Fetch message counts per conversation
      const { data: allMessages } = await supabase
        .from("messages")
        .select("conversation_id");

      // Build message count map
      const msgCountMap = new Map<string, number>();
      for (const msg of allMessages || []) {
        const cid = (msg as any).conversation_id;
        msgCountMap.set(cid, (msgCountMap.get(cid) || 0) + 1);
      }

      // Build engagement buckets from filtered conversations
      const bucketDefs = [
        { label: "1-2 msgs", min: 1, max: 2 },
        { label: "3-5 msgs", min: 3, max: 5 },
        { label: "6-10 msgs", min: 6, max: 10 },
        { label: "11-20 msgs", min: 11, max: 20 },
        { label: "20+ msgs", min: 21, max: Infinity },
      ];

      const buckets: EngagementBucket[] = bucketDefs.map((def) => {
        const inBucket = conversations.filter((c: any) => {
          const count = msgCountMap.get(c.id) || 0;
          return count >= def.min && count <= def.max;
        });
        const paidInBucket = inBucket.filter((c: any) => c.is_paid);
        return {
          label: def.label,
          total: inBucket.length,
          paid: paidInBucket.length,
          convRate: inBucket.length > 0 ? (paidInBucket.length / inBucket.length) * 100 : 0,
        };
      });
      setEngagement(buckets);

      // Engagement funnel: Created → 6+ msgs → Paid → Generated → Assigned
      const engagedConvIds = conversations
        .filter((c: any) => (msgCountMap.get(c.id) || 0) >= 6)
        .map((c: any) => c.id);

      const paidConvIds = paidConvs.map((c: any) => c.id);

      // Count packages linked to these conversations
      const { data: pkgLinks } = await supabase
        .from("mystery_packages")
        .select("conversation_id");
      const pkgConvIds = new Set((pkgLinks || []).map((p: any) => p.conversation_id));
      const generatedFromFiltered = paidConvIds.filter((id: string) => pkgConvIds.has(id)).length;

      // Count assignments linked to these conversations
      const { data: assignLinks } = await supabase
        .from("character_assignments")
        .select("mystery_id");
      const assignConvIds = new Set((assignLinks || []).map((a: any) => a.mystery_id));
      const assignedFromFiltered = paidConvIds.filter((id: string) => assignConvIds.has(id)).length;

      setEngagementFunnel({
        created: conversations.length,
        engaged: engagedConvIds.length,
        paid: paidConvs.length,
        generated: generatedFromFiltered,
        assigned: assignedFromFiltered,
      });

      // Monthly Trends
      const monthMap = new Map<string, { users: Set<string>; conversations: number; paid: number }>();
      for (const c of conversations) {
        const month = (c as any).created_at?.substring(0, 7) || "unknown";
        const existing = monthMap.get(month) || { users: new Set<string>(), conversations: 0, paid: 0 };
        existing.conversations++;
        if ((c as any).user_id) existing.users.add((c as any).user_id);
        if ((c as any).is_paid) existing.paid++;
        monthMap.set(month, existing);
      }

      const monthly = Array.from(monthMap.entries())
        .map(([month, data]) => ({
          month,
          users: data.users.size,
          conversations: data.conversations,
          paid: data.paid,
          convRate: data.conversations > 0 ? (data.paid / data.conversations) * 100 : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
      setMonthlyTrends(monthly);

      // 3. Generation Health
      const { data: packages } = await supabase
        .from("mystery_packages")
        .select("generation_status, host_guide, detective_script, game_overview");

      const pkgs = packages || [];
      setGenHealth({
        total: pkgs.length,
        completed: pkgs.filter((p: any) => p.generation_status?.status === "completed").length,
        failed: pkgs.filter((p: any) => p.generation_status?.status === "failed").length,
        withHostGuide: pkgs.filter((p: any) => p.host_guide).length,
        withCharacters: pkgs.filter((p: any) => p.game_overview).length,
      });

      // 4. Feedback
      const { data: feedbackData } = await supabase
        .from("mystery_feedback" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      setFeedback((feedbackData as FeedbackRow[]) || []);

      // 5. Recent Activity
      const { data: recentData } = await supabase
        .from("conversations")
        .select("id, title, theme, player_count, is_paid, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(30);

      const recent = (recentData || []).map((c: any) => ({
        ...c,
        is_test: testUserIds.includes(c.user_id),
      }));

      setRecentActivity(recent);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  }, [excludeTest]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  if (authLoading || !adminChecked || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conversionPct = (num: number, denom: number) =>
    denom > 0 ? `${((num / denom) * 100).toFixed(1)}%` : "—";

  const avgStars =
    feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + f.star_rating, 0) / feedback.length).toFixed(1)
      : "—";

  const avgNps = (() => {
    const withNps = feedback.filter((f) => f.nps_score !== null);
    return withNps.length > 0
      ? (withNps.reduce((sum, f) => sum + (f.nps_score || 0), 0) / withNps.length).toFixed(1)
      : "—";
  })();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">MysteryMaker Analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={excludeTest}
                onChange={(e) => setExcludeTest(e.target.checked)}
                className="rounded border-gray-300"
              />
              Exclude test accounts
            </label>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* 1. Funnel Metrics */}
        {funnel && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Conversion Funnel</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard
                icon={<Users className="h-5 w-5" />}
                label="Users with Conversations"
                value={funnel.usersWithConversations}
              />
              <MetricCard
                icon={<CreditCard className="h-5 w-5" />}
                label="Paid Users"
                value={funnel.paidUsers}
                sub={conversionPct(funnel.paidUsers, funnel.usersWithConversations)}
              />
              <MetricCard
                icon={<Package className="h-5 w-5" />}
                label="Generated Packages"
                value={funnel.generatedPackages}
              />
              <MetricCard
                icon={<UserCheck className="h-5 w-5" />}
                label="Character Assignments"
                value={funnel.assignedCharacters}
              />
              <MetricCard
                icon={<Star className="h-5 w-5" />}
                label="Feedback Received"
                value={feedback.length}
              />
            </div>
          </section>
        )}

        {/* 2. Drop-off & Engagement Analysis */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Drop-off & Engagement</h2>

          {/* Engagement Funnel */}
          {engagementFunnel && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {[
                  { label: "Created", value: engagementFunnel.created },
                  { label: "6+ Messages", value: engagementFunnel.engaged },
                  { label: "Paid", value: engagementFunnel.paid },
                  { label: "Package Generated", value: engagementFunnel.generated },
                  { label: "Characters Assigned", value: engagementFunnel.assigned },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.label}>
                    <Card className="flex-1 min-w-[120px]">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold">{step.value}</div>
                        <div className="text-xs text-muted-foreground">{step.label}</div>
                        {i > 0 && arr[i - 1].value > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {((step.value / arr[i - 1].value) * 100).toFixed(0)}% of prev
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {i < arr.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Message Engagement → Conversion Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Message Count vs. Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Messages</th>
                      <th className="text-right p-3 font-medium">Conversations</th>
                      <th className="text-right p-3 font-medium">Paid</th>
                      <th className="text-right p-3 font-medium">Conv. Rate</th>
                      <th className="text-left p-3 font-medium w-[200px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagement.map((b, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3 font-medium">{b.label}</td>
                        <td className="p-3 text-right">{b.total}</td>
                        <td className="p-3 text-right">{b.paid}</td>
                        <td className="p-3 text-right font-medium">
                          <span className={b.convRate >= 15 ? "text-green-600" : b.convRate >= 5 ? "text-yellow-600" : "text-red-500"}>
                            {b.convRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full",
                                b.convRate >= 15 ? "bg-green-500" : b.convRate >= 5 ? "bg-yellow-500" : "bg-red-400"
                              )}
                              style={{ width: `${Math.min(b.convRate * 3, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {engagement.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Monthly Trends */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Monthly Trends</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Month</th>
                      <th className="text-right p-3 font-medium">Users</th>
                      <th className="text-right p-3 font-medium">Conversations</th>
                      <th className="text-right p-3 font-medium">Paid</th>
                      <th className="text-right p-3 font-medium">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTrends.map((m, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3 font-medium">{m.month}</td>
                        <td className="p-3 text-right">{m.users}</td>
                        <td className="p-3 text-right">{m.conversations}</td>
                        <td className="p-3 text-right">{m.paid}</td>
                        <td className="p-3 text-right">{m.convRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                    {monthlyTrends.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 4. Generation Health */}
        {genHealth && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Generation Health</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard label="Total Packages" value={genHealth.total} icon={<Package className="h-5 w-5" />} />
              <MetricCard
                label="Completed"
                value={genHealth.completed}
                sub={conversionPct(genHealth.completed, genHealth.total)}
                icon={<TrendingUp className="h-5 w-5 text-green-600" />}
              />
              <MetricCard
                label="Failed"
                value={genHealth.failed}
                sub={conversionPct(genHealth.failed, genHealth.total)}
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              />
              <MetricCard
                label="With Host Guide"
                value={genHealth.withHostGuide}
                sub={conversionPct(genHealth.withHostGuide, genHealth.total)}
              />
              <MetricCard
                label="With Game Overview"
                value={genHealth.withCharacters}
                sub={conversionPct(genHealth.withCharacters, genHealth.total)}
              />
            </div>
          </section>
        )}

        {/* 4. Feedback Summary */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Feedback</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <MetricCard label="Total Feedback" value={feedback.length} icon={<MessageSquare className="h-5 w-5" />} />
            <MetricCard label="Avg Stars" value={avgStars} icon={<Star className="h-5 w-5 text-yellow-500" />} />
            <MetricCard label="Avg NPS" value={avgNps} />
            <MetricCard
              label="Public Testimonials"
              value={feedback.filter((f) => f.is_public).length}
            />
          </div>
          {feedback.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-center p-3 font-medium">Stars</th>
                        <th className="text-center p-3 font-medium">NPS</th>
                        <th className="text-left p-3 font-medium">Hosted?</th>
                        <th className="text-left p-3 font-medium">Feedback</th>
                        <th className="text-center p-3 font-medium">Public</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedback.slice(0, 10).map((f, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-3 whitespace-nowrap">
                            {new Date(f.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-center">{"★".repeat(f.star_rating)}</td>
                          <td className="p-3 text-center">{f.nps_score ?? "—"}</td>
                          <td className="p-3">{f.did_host_party || "—"}</td>
                          <td className="p-3 truncate max-w-[300px]">
                            {f.testimonial || f.best_part || "—"}
                          </td>
                          <td className="p-3 text-center">{f.is_public ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
          {feedback.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No feedback yet. The feedback nudge in the package view will help collect this.
              </CardContent>
            </Card>
          )}
        </section>

        {/* 5. Recent Activity */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Title / Theme</th>
                      <th className="text-center p-3 font-medium">Players</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.slice(0, 20).map((c) => (
                      <tr key={c.id} className={cn("border-b last:border-0", c.is_test && "opacity-40")}>
                        <td className="p-3 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 truncate max-w-[250px]">
                          {c.title || c.theme || "Untitled"}
                          {c.is_test && (
                            <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded">test</span>
                          )}
                        </td>
                        <td className="p-3 text-center">{c.player_count || "—"}</td>
                        <td className="p-3 text-center">
                          {c.is_paid ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              Paid
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              Draft
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

// Simple metric card component
const MetricCard = ({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ReactNode;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </CardContent>
  </Card>
);

export default AdminDashboard;
