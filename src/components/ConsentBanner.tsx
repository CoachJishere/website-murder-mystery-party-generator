import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cookie } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  acceptAll,
  rejectAll,
  saveConsent,
  getSavedConsent,
  hasStoredConsent,
  isLikelyEeaUkCh,
  onOpenConsentSettings,
  type ConsentValue,
} from "@/lib/consent";

export function ConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(true);
  const [adsOn, setAdsOn] = useState(true);

  useEffect(() => {
    if (!hasStoredConsent() && isLikelyEeaUkCh()) {
      setVisible(true);
    }
    return onOpenConsentSettings(() => {
      const saved = getSavedConsent();
      setAnalyticsOn(saved ? saved.analytics === "granted" : true);
      setAdsOn(saved ? saved.ads === "granted" : true);
      setCustomizing(true);
      setVisible(true);
    });
  }, []);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    setCustomizing(false);
  };

  const handleAcceptAll = () => {
    acceptAll();
    close();
  };

  const handleRejectAll = () => {
    rejectAll();
    close();
  };

  const handleSave = () => {
    const toValue = (on: boolean): ConsentValue => (on ? "granted" : "denied");
    saveConsent({ analytics: toValue(analyticsOn), ads: toValue(adsOn) });
    close();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4"
      role="dialog"
      aria-modal="false"
      aria-label={t("consent.ariaLabel", "Cookie consent")}
    >
      <div
        className="container mx-auto max-w-2xl rounded-lg p-5 sm:p-6"
        style={{
          backgroundColor: "var(--color-black)",
          border: "1px solid var(--color-cream-border)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-start gap-3">
          <Cookie
            className="h-5 w-5 flex-shrink-0 mt-0.5"
            style={{ color: "var(--color-red)" }}
          />
          <div className="flex-1 space-y-3">
            <div>
              <p
                className="text-sm sm:text-base font-semibold"
                style={{ color: "var(--color-cream)", fontFamily: "var(--font-body)" }}
              >
                {t("consent.title", "We value your privacy")}
              </p>
              <p
                className="text-xs sm:text-sm mt-1"
                style={{ color: "var(--color-cream-muted)", fontFamily: "var(--font-body)" }}
              >
                {t(
                  "consent.message",
                  "We use cookies to run this site and, with your consent, for analytics and advertising. You can change your choice anytime via \"Cookie Settings\" in the footer."
                )}
              </p>
            </div>

            {customizing && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-cream)", fontFamily: "var(--font-body)" }}
                    >
                      {t("consent.necessary.label", "Necessary")}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-cream-faint)", fontFamily: "var(--font-body)" }}
                    >
                      {t(
                        "consent.necessary.description",
                        "Required for the site to function. Always on."
                      )}
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-cream)", fontFamily: "var(--font-body)" }}
                    >
                      {t("consent.analytics.label", "Analytics")}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-cream-faint)", fontFamily: "var(--font-body)" }}
                    >
                      {t(
                        "consent.analytics.description",
                        "Helps us understand how the site is used."
                      )}
                    </p>
                  </div>
                  <Switch checked={analyticsOn} onCheckedChange={setAnalyticsOn} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-cream)", fontFamily: "var(--font-body)" }}
                    >
                      {t("consent.advertising.label", "Advertising")}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-cream-faint)", fontFamily: "var(--font-body)" }}
                    >
                      {t(
                        "consent.advertising.description",
                        "Used to measure and personalize ads."
                      )}
                    </p>
                  </div>
                  <Switch checked={adsOn} onCheckedChange={setAdsOn} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {customizing ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-xs sm:text-sm font-medium px-4 py-2 rounded-md"
                  style={{ backgroundColor: "var(--color-red)", color: "var(--color-cream)", fontFamily: "var(--font-body)" }}
                >
                  {t("consent.save", "Save preferences")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="text-xs sm:text-sm font-medium px-4 py-2 rounded-md"
                    style={{ backgroundColor: "var(--color-red)", color: "var(--color-cream)", fontFamily: "var(--font-body)" }}
                  >
                    {t("consent.acceptAll", "Accept All")}
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectAll}
                    className="text-xs sm:text-sm font-medium px-4 py-2 rounded-md"
                    style={{ backgroundColor: "transparent", color: "var(--color-cream)", border: "1px solid var(--color-cream-border)", fontFamily: "var(--font-body)" }}
                  >
                    {t("consent.rejectAll", "Reject All")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomizing(true)}
                    className="text-xs sm:text-sm font-medium px-4 py-2 rounded-md"
                    style={{ backgroundColor: "transparent", color: "var(--color-cream-muted)", fontFamily: "var(--font-body)" }}
                  >
                    {t("consent.customize", "Customize")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsentBanner;
