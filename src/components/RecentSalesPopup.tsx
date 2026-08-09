import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { dismissRecentSalesPopup, useRecentSalesPopup } from "@/hooks/useRecentSalesPopup";

function relativeTime(isoDate: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000));
  if (minutes < 1) return t("recentSalesPopup.justNow", { defaultValue: "Just now" });
  if (minutes < 60) return t("recentSalesPopup.minutesAgo", { defaultValue: "{{count}}m ago", count: minutes });
  const hours = Math.floor(minutes / 60);
  return t("recentSalesPopup.hoursAgo", { defaultValue: "{{count}}h ago", count: hours });
}

// Route-gated per ADR-0071: mount only on the landing and purchase pages, not app-wide.
export function RecentSalesPopup({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const sale = useRecentSalesPopup(enabled);

  return (
    <div className="fixed bottom-4 left-4 z-40 pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {sale && (
          <motion.div
            key={`${sale.mystery_title}-${sale.purchased_at}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-card text-card-foreground shadow-lg p-3 pr-8 max-w-[300px] relative"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">
                {sale.purchaser_first_name
                  ? t("recentSalesPopup.namedPurchase", {
                      defaultValue: "{{name}} just purchased",
                      name: sale.purchaser_first_name,
                    })
                  : t("recentSalesPopup.anonymousPurchase", { defaultValue: "A customer just purchased" })}
              </p>
              <p className="text-sm text-muted-foreground truncate">{sale.mystery_title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(sale.purchased_at, t)}</p>
            </div>
            <button
              type="button"
              onClick={dismissRecentSalesPopup}
              aria-label={t("recentSalesPopup.dismissAriaLabel", { defaultValue: "Dismiss notification" })}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
