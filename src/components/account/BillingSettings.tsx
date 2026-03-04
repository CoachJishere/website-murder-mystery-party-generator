import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Purchase {
  id: string;
  mystery_title: string;
  created_at: string;
  amount: number;
  conversation_id: string;
}

const BillingSettings = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseHistory();
  }, [user]);

  const fetchPurchaseHistory = async () => {
    if (!user) return;

    try {
      // Fetch paid conversations (purchases)
      const { data, error } = await supabase
        .from('conversations')
        .select('id, mystery_title, created_at, is_paid')
        .eq('user_id', user.id)
        .eq('is_paid', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to purchase format
      const purchaseData: Purchase[] = (data || []).map((conv) => ({
        id: conv.id,
        mystery_title: conv.mystery_title || 'Mystery Package',
        created_at: conv.created_at,
        amount: 24.99, // Fixed price
        conversation_id: conv.id
      }));

      setPurchases(purchaseData);
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMystery = (conversationId: string) => {
    window.location.href = `/mystery/${conversationId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing & Purchase History</CardTitle>
          <CardDescription>Loading your purchase history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Purchase History</CardTitle>
        <CardDescription>
          View your past purchases and download receipts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              You haven't purchased any mystery packages yet.
            </p>
            <Button asChild>
              <a href="/mystery/create">Create Your First Mystery</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1 mb-4 md:mb-0">
                  <h3 className="font-semibold">{purchase.mystery_title}</h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm text-muted-foreground">
                    <span>{format(new Date(purchase.created_at), 'MMM d, yyyy')}</span>
                    <span className="hidden md:inline">•</span>
                    <span className="font-medium text-foreground">
                      ${purchase.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMystery(purchase.conversation_id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Package
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://billing.stripe.com/p/login/YOUR_STRIPE_PORTAL_ID`, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Receipt
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {purchases.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <h4 className="font-semibold mb-2">Need help with billing?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              For refund requests or billing questions, please contact support.
            </p>
            <Button variant="outline" asChild>
              <a href="/support">Contact Support</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingSettings;
