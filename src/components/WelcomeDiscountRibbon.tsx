import { useNavigate } from "react-router-dom";
import { Clock, Tag } from "lucide-react";
import { useWelcomeDiscount } from "@/hooks/useWelcomeDiscount";
import { formatTimeRemaining, DISCOUNT_PERCENT, ORIGINAL_PRICE, DISCOUNTED_PRICE } from "@/lib/discountUtils";
import { useTranslation } from "react-i18next";

export function WelcomeDiscountRibbon() {
  const { isActive, timeRemaining } = useWelcomeDiscount();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isActive || !timeRemaining) return null;

  const timeStr = formatTimeRemaining(timeRemaining);

  return (
    <div
      className="w-full py-2 px-4 text-center cursor-pointer z-[60] relative"
      style={{
        background: 'linear-gradient(90deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
        borderBottom: '1px solid rgba(200, 20, 0, 0.3)',
      }}
      onClick={() => navigate("/dashboard")}
      role="banner"
      aria-label={t("welcomeDiscount.ribbon.ariaLabel", "Limited time welcome discount")}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 flex-wrap">
        <Tag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C81400' }} />
        <span
          className="text-xs sm:text-sm font-medium"
          style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)' }}
        >
          {t("welcomeDiscount.ribbon.message", {
            defaultValue: "Welcome! Get {{percent}}% off your first mystery — ${{discountedPrice}} instead of ${{originalPrice}}",
            percent: DISCOUNT_PERCENT,
            discountedPrice: DISCOUNTED_PRICE.toFixed(2),
            originalPrice: ORIGINAL_PRICE.toFixed(2),
          })}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(200, 20, 0, 0.2)', color: '#ff6b6b' }}
        >
          <Clock className="h-3 w-3" />
          {t("welcomeDiscount.ribbon.expires", {
            defaultValue: "Expires in {{time}}",
            time: timeStr,
          })}
        </span>
        <span className="sm:hidden inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: '#ff6b6b' }}
        >
          <Clock className="h-3 w-3" />
          {timeStr}
        </span>
      </div>
    </div>
  );
}
