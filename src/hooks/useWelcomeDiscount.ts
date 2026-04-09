import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { isDiscountActive, getTimeRemaining, type TimeRemaining, type DiscountInfo } from "@/lib/discountUtils";

export function useWelcomeDiscount() {
  const { isAuthenticated, user } = useAuth();
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    const fetchDiscount = async () => {
      try {
        // Fetch promo info and purchase status in parallel
        const [profileResult, purchaseResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("welcome_promo_code, welcome_promo_expires_at")
            .eq("id", user.id)
            .single(),
          supabase
            .from("conversations")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_paid", true)
            .limit(1),
        ]);

        if (purchaseResult.data && purchaseResult.data.length > 0) {
          setHasPurchased(true);
          setLoading(false);
          return;
        }

        const profile = profileResult.data;
        if (profile?.welcome_promo_code && profile?.welcome_promo_expires_at) {
          if (isDiscountActive(profile.welcome_promo_expires_at)) {
            setDiscountInfo({
              promoCode: profile.welcome_promo_code,
              expiresAt: profile.welcome_promo_expires_at,
            });
            setTimeRemaining(getTimeRemaining(profile.welcome_promo_expires_at));
          }
        }
      } catch (error) {
        console.error("Error fetching welcome discount:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscount();
  }, [isAuthenticated, user?.id]);

  // Update countdown every minute
  useEffect(() => {
    if (!discountInfo) return;

    const interval = setInterval(() => {
      const remaining = getTimeRemaining(discountInfo.expiresAt);
      setTimeRemaining(remaining);

      if (remaining.expired) {
        setDiscountInfo(null);
        setTimeRemaining(null);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [discountInfo]);

  return {
    discountInfo,
    timeRemaining,
    loading,
    hasPurchased,
    isActive: !!discountInfo && !hasPurchased,
  };
}
