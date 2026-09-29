import { useNavigate } from "react-router-dom";
import { Ghost, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getActiveSeasonalSale } from "@/lib/seasonalSaleConfig";
import { DISCOUNT_PERCENT, ORIGINAL_PRICE, DISCOUNTED_PRICE } from "@/lib/discountUtils";

const SALE_THEME = {
  halloween: { icon: Ghost, accentColor: "#D2691E", name: "Halloween", endLabel: "Ends October 31" },
  holiday: { icon: Gift, accentColor: "#1B5E3A", name: "Holiday", endLabel: "Ends December 31" },
} as const;

export function SeasonalSaleRibbon() {
  const sale = getActiveSeasonalSale();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (!sale) return null;

  const theme = SALE_THEME[sale.id];
  const Icon = theme.icon;

  return (
    <div
      className="w-full py-2 px-4 text-center cursor-pointer z-[60] relative"
      style={{
        background: '#F5F0E8',
        borderBottom: `2px solid ${theme.accentColor}`,
      }}
      onClick={() => navigate(isAuthenticated ? "/dashboard" : "/sign-up")}
      role="banner"
      aria-label={t(`seasonalSale.${sale.id}.ribbon.ariaLabel`, {
        defaultValue: `${theme.name} sale: ${DISCOUNT_PERCENT}% off all mysteries`,
        percent: DISCOUNT_PERCENT,
      })}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 flex-wrap">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: theme.accentColor }} />
        <span
          className="text-xs sm:text-sm font-medium"
          style={{ color: '#1a1a1a', fontFamily: 'var(--font-body)' }}
        >
          {t(`seasonalSale.${sale.id}.ribbon.message`, {
            defaultValue: `${theme.name} Sale: get {{percent}}% off all mysteries — \${{discountedPrice}} instead of \${{originalPrice}}. Code {{code}} auto-applied at checkout.`,
            percent: DISCOUNT_PERCENT,
            discountedPrice: DISCOUNTED_PRICE.toFixed(2),
            originalPrice: ORIGINAL_PRICE.toFixed(2),
            code: sale.promoCode,
          })}
        </span>
        <span
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: theme.accentColor, color: '#ffffff' }}
        >
          {t(`seasonalSale.${sale.id}.ribbon.endLabel`, { defaultValue: theme.endLabel })}
        </span>
      </div>
    </div>
  );
}
