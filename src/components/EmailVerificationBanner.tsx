import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function EmailVerificationBanner() {
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
        toast.error(`Failed to resend email: ${error.message}`);
      } else {
        toast.success("Verification email sent! Check your inbox.");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-blue-700 hover:text-blue-900"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Verify your email to unlock all features
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            You can explore and create mysteries now, but you'll need to verify your email to purchase and download mystery packages.
          </p>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={resending}
              className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
            >
              {resending ? (
                <>
                  <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
