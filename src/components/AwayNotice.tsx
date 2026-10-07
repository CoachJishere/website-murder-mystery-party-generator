import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isAwayNoticeActive } from "@/lib/awayNotice";

// Temporary away notice for paid mysteries (Oct 8-13, 2026). See src/lib/awayNotice.ts.
export function AwayNotice({ className }: { className?: string }) {
  const { t } = useTranslation();

  if (!isAwayNoticeActive()) return null;

  return (
    <div
      role="note"
      className={`flex gap-3 rounded-md border border-amber-400/60 bg-amber-50/50 p-3 text-sm dark:bg-amber-950/20 ${className ?? ""}`}
    >
      <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-amber-900 dark:text-amber-200">
        {t("awayNotice.message", {
          defaultValue:
            "I'm away from October 8 to 13, so replies will be slower than usual. If anything in your mystery looks off, email support@mysterymaker.party and I'll take care of it within a day or two of getting back (by October 15 at the latest). If your event is before then, tell me the date and I'll refund you in full.",
        })}
        <span className="mt-1 block text-xs opacity-80">
          {t("awayNotice.signoff", { defaultValue: "Jonathan, Mystery Maker" })}
        </span>
      </p>
    </div>
  );
}
