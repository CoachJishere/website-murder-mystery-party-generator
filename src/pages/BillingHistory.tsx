import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Download, Eye, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface Purchase {
  id: string;
  conversation_id: string;
  created_at: string;
  amount: number;
  status: string;
  mystery_title?: string;
}

const BillingHistory = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/sign-in");
      return;
    }
    fetchPurchases();
  }, [isAuthenticated, navigate]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);

      // Fetch purchased conversations
      const { data, error } = await supabase
        .from("conversations")
        .select("id, created_at, title, purchased, purchase_date, theme")
        .eq("user_id", user?.id)
        .eq("purchased", true)
        .order("purchase_date", { ascending: false });

      if (error) throw error;

      // Transform to purchase format
      const purchaseData: Purchase[] = (data || []).map((conv) => ({
        id: conv.id,
        conversation_id: conv.id,
        created_at: conv.purchase_date || conv.created_at,
        amount: 24.99, // Fixed price for now
        status: "completed",
        mystery_title: conv.title || conv.theme || t("billing.fallbackTitle"),
      }));

      setPurchases(purchaseData);
    } catch (error: any) {
      console.error("Error fetching purchases:", error);
      toast.error(t("billing.toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleViewMystery = (conversationId: string) => {
    navigate(`/mystery/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">{t("billing.title")}</h1>

          {/* Summary Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t("billing.summary.title")}
              </CardTitle>
              <CardDescription>
                {t("billing.summary.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">{t("billing.summary.totalPurchased")}</p>
                  <p className="text-2xl font-bold">{purchases.length}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">{t("billing.summary.totalSpent")}</p>
                  <p className="text-2xl font-bold">${(purchases.length * 24.99).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("billing.recent.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("billing.empty.title")}</h3>
                  <p className="text-muted-foreground mb-6">
                    {t("billing.empty.body")}
                  </p>
                  <Button onClick={() => navigate("/dashboard")}>
                    {t("billing.empty.browseButton")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 mb-3 md:mb-0">
                        <h4 className="font-semibold mb-1">{purchase.mystery_title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(purchase.created_at), "MMM d, yyyy")}
                          </span>
                          <span className="font-medium text-foreground">
                            ${purchase.amount.toFixed(2)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t("billing.status.completed")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMystery(purchase.conversation_id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("billing.actions.view")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/mystery/${purchase.conversation_id}`)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t("billing.actions.download")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BillingHistory;
