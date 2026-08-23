import { useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Debug URL parameters
  useEffect(() => {
    console.log('PaymentSuccess - Current URL:', window.location.href);
    console.log('PaymentSuccess - Location search:', location.search);
    console.log('PaymentSuccess - All search params:', Object.fromEntries(searchParams.entries()));
  }, [location.search, searchParams]);
  
  // Get and log conversation_id from URL or localStorage
  const conversationId = useMemo(() => {
    // First try to get from URL params
    const fromUrl = searchParams.get('conversation_id');
    if (fromUrl) {
      console.log('PaymentSuccess - Found conversation_id in URL:', fromUrl);
      return fromUrl;
    }

    // If not in URL, try to get from localStorage
    const fromStorage = localStorage.getItem('pendingConversationId');
    if (fromStorage) {
      console.log('PaymentSuccess - Recovered conversation_id from localStorage:', fromStorage);
      return fromStorage;
    }

    console.log('PaymentSuccess - No conversation_id found in URL or localStorage');
    return null;
  }, [searchParams]);

  // Fire the Google Ads purchase conversion exactly once, using the real
  // charged amount/currency/transaction_id the stripe-webhook function
  // already persisted into mystery_data.payment (not a guessed/hardcoded
  // value — this product has two real price points, full vs. the 7-day
  // welcome discount). GA4's purchase event is already sent accurately
  // server-side from the same webhook (Measurement Protocol), so it's
  // deliberately not duplicated here client-side.
  const tracked = useRef(false);
  useEffect(() => {
    if (!conversationId || tracked.current) return;
    tracked.current = true;

    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("mystery_data")
        .eq("id", conversationId)
        .single();

      if (error) {
        console.error("PaymentSuccess - couldn't read payment data for Ads conversion:", error);
        return;
      }

      const payment = (data?.mystery_data as { payment?: { amount_total?: number; currency?: string; payment_intent?: string } } | null)?.payment;
      if (!payment?.amount_total || !payment?.currency || !payment?.payment_intent) {
        console.warn("PaymentSuccess - payment data not yet available for Ads conversion (webhook may still be processing)");
        return;
      }

      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: "AW-18406526278/MxMoCN_-yeYcEMaa9chE",
          value: payment.amount_total / 100,
          currency: payment.currency.toUpperCase(),
          transaction_id: payment.payment_intent,
        });
      }
    })();
  }, [conversationId]);

  useEffect(() => {
    // Show success message immediately
    toast.success(t('payment.success.message'));
    
    const timer = setTimeout(() => {
      // Debug before navigation
      console.log('PaymentSuccess - Navigating with conversation_id:', conversationId);
      
      // Redirect based on whether we have a conversation_id
      if (conversationId) {
        const targetUrl = `/mystery/${conversationId}?purchase=success`;
        console.log('PaymentSuccess - Navigating to:', targetUrl);
        // Clear the stored ID before navigating
        localStorage.removeItem('pendingConversationId');
        navigate(targetUrl, { replace: true });
      } else {
        console.log('PaymentSuccess - No conversation_id, navigating to dashboard');
        // Clear any stored ID before navigating
        localStorage.removeItem('pendingConversationId');
        navigate('/dashboard', { replace: true });
      }
    }, 1500); // 1.5 second delay to show the toast

    return () => clearTimeout(timer);
  }, [conversationId, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
        <h1 className="text-2xl font-bold">{t('payment.success.verifying')}</h1>
        <p className="text-muted-foreground">
          {t('payment.success.redirecting')}
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
