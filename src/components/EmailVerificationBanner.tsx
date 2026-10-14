import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export function EmailVerificationBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  // Check if email is verified
  const isVerified = user?.email_confirmed_at || user?.confirmed_at;

  // Don't show if verified or dismissed
  if (isVerified || dismissed) return null;

  const handleResendEmail = async () => {
    if (!user?.email) return;

    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        toast.error(t("emailVerification.resendFailed", { message: error.message }));
      } else {
        toast.success(t("emailVerification.resendSent"));
      }
    } catch (error: any) {
      toast.error(t("emailVerification.unexpected"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-blue-700 hover:text-blue-900"
        aria-label={t("emailVerification.dismiss")}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            {t("emailVerification.title")}
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            {t("emailVerification.body")}
          </p>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={resending}
              className="bg-muted hover:bg-muted/80 border-border text-foreground"
            >
              {resending ? (
                <>
                  <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {t("emailVerification.sending")}
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3 mr-2" />
                  {t("emailVerification.resend")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
