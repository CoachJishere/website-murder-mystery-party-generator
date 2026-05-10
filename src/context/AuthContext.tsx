
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

// Define the User type with additional fields
type AuthUser = User & {
  name?: string;
  avatar?: string;
};

// Define the context type
type AuthContextType = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: false,
  isAuthenticated: false,
  isAdmin: false,
  isPublic: false,
  setIsPublic: () => {},
  signIn: async () => {},
  signUp: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
});

// Create provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Simplified auth state handling with timeout protection
  useEffect(() => {
    let mounted = true;
    
    // Set loading timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 3000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          const userData = {
            ...currentSession.user,
            name: currentSession.user.user_metadata?.name ||
                  currentSession.user.email?.split("@")[0] ||
                  "User",
            avatar: currentSession.user.user_metadata?.avatar_url || null,
          };
          setUser(userData);

          // Check admin status from profiles (defer to avoid blocking auth)
          supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', currentSession.user.id)
            .single()
            .then(({ data }) => {
              if (mounted && data?.is_admin) {
                setIsAdmin(true);
              }
            });
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    );
    
    // Check for existing session with error handling
    const checkSession = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (mounted && !existingSession) {
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (mounted) {
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };
    
    checkSession();
    
    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Persist the user's UI language to profiles.language so transactional
  // email edge functions can render emails in the right locale. Runs on auth
  // changes and on i18n language changes.
  useEffect(() => {
    if (!user?.id || !i18n.language) return;

    const sync = async (lang: string) => {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .maybeSingle();
        if (existing?.language !== lang) {
          await supabase
            .from('profiles')
            .update({ language: lang })
            .eq('id', user.id);
        }
      } catch (err) {
        console.warn('Failed to sync profile language:', err);
      }
    };

    sync(i18n.language);
    const handler = (lng: string) => sync(lng);
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, [user?.id, i18n]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error("The email or password you entered is incorrect. Please try again.");
        } else {
          toast.error(`Failed to sign in: ${error.message}`);
        }
        throw error;
      }
      
      if (data?.user) {
        toast.success("Signed in successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Sign-in error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      
      if (!email.includes('@') || !email.includes('.')) {
        toast.error("Please enter a valid email address.");
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Try signing in instead.");
        } else {
          toast.error(`Failed to create account: ${error.message}`);
        }
        throw error;
      }
      
      // Allow users to access dashboard immediately, regardless of email confirmation
      if (data.user) {
        const hasSession = !!data.session;

        if (!hasSession) {
          // Email confirmation required by Supabase, but we'll let them explore anyway
          toast.success("Account created! Check your email to verify and unlock all features.");
          // Manual session creation not needed - Supabase handles this
          // Just navigate to dashboard and let them explore
          navigate("/dashboard");
        } else {
          // Instant confirmation (OAuth or disabled email confirmation)
          toast.success("Account created successfully! You're now logged in.");
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("Sign-up error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast.error(`Failed to reset password: ${error.message}`);
        throw error;
      }
      
      toast.success("Password reset instructions sent to your email.");
    } catch (error: any) {
      console.error("Password reset error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(`Failed to sign out: ${error.message}`);
        throw error;
      }
      
      navigate("/");
      toast.success("Signed out successfully.");
    } catch (error: any) {
      console.error("Sign-out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    isPublic,
    setIsPublic,
    signIn,
    signUp,
    resetPassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
