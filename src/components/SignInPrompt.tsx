
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SignInPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

const SignInPrompt = ({ isOpen, onClose }: SignInPromptProps) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { t } = useTranslation();

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        toast.error(`${t("auth.errors.googleSignInFailed")}: ${error.message}`);
        setGoogleLoading(false);
        return;
      }

      if (!data?.url) {
        toast.error(t("auth.errors.googleSignInInitFailed"));
        setGoogleLoading(false);
      }
    } catch (error: any) {
      toast.error(`${t("auth.errors.unexpected")}: ${error.message || t("auth.errors.unknownError")}`);
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: 'var(--color-black)', border: '1px solid var(--color-cream-border)' }}>
        <DialogHeader>
          <DialogTitle
            className="text-xl text-center uppercase"
            style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-display)' }}
          >
            {t("auth.signIn.title")}
          </DialogTitle>
          <DialogDescription
            className="text-center pt-2"
            style={{ color: 'var(--color-cream-muted)', fontFamily: 'var(--font-body)' }}
          >
            {t("auth.signInPrompt.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col pt-4" style={{ gap: '12px' }}>
          {/* Continue with Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 transition-colors"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#000000',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              padding: '12px 32px',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: '15px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <GoogleLogo />
            )}
            <span>{t("auth.signIn.googleButton")}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(245,240,232,0.15)' }} />
            <span style={{ color: 'rgba(245,240,232,0.4)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>{t("auth.signInPrompt.or")}</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(245,240,232,0.15)' }} />
          </div>

          {/* Sign Up (primary) */}
          <Link
            to="/sign-up"
            className="w-full no-underline flex items-center justify-center transition-colors"
            style={{
              backgroundColor: 'var(--color-red)',
              color: 'var(--color-cream)',
              borderRadius: '4px',
              padding: '12px 32px',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '15px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A01000')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-red)')}
          >
            {t("navigation.signUp")}
          </Link>

          {/* Sign In (secondary) */}
          <Link
            to="/sign-in"
            className="w-full no-underline flex items-center justify-center transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-cream)',
              border: '1px solid rgba(245,240,232,0.3)',
              borderRadius: '4px',
              padding: '12px 32px',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: '15px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-cream)';
              e.currentTarget.style.color = 'var(--color-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-cream)';
            }}
          >
            {t("navigation.signIn")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignInPrompt;
