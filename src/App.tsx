
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import LoadingBoundary from "@/components/LoadingBoundary";
import { useEffect } from "react";
import { initGA, trackPageView } from "@/lib/analytics";
import { captureLandingAttribution } from "@/lib/attribution";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { WelcomeDiscountRibbon } from "@/components/WelcomeDiscountRibbon";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CheckEmail from "./pages/CheckEmail";
import AccountSettings from "./pages/AccountSettings";
import MysteryCreation from "./pages/MysteryCreation";
import MysteryChatPage from "./pages/MysteryChat";
import MysteryPurchase from "./pages/MysteryPurchase";
import MysteryView from "./pages/MysteryView";
import Showcase from "./pages/Showcase";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import CharacterAccess from "./pages/CharacterAccess";
import HostAccess from "./pages/HostAccess";
import BlogIndex from "./pages/BlogIndex";
import BlogPost from "./pages/BlogPost";
import PaymentSuccess from "./pages/PaymentSuccess";
import Feedback from "./pages/Feedback";
import GuestFeedback from "./pages/GuestFeedback";
import BillingHistory from "./pages/BillingHistory";
import AdminDashboard from "./pages/AdminDashboard";
import DarkHomePreview from "./pages/DarkHomePreview";
import FontPreview from "./pages/FontPreview";
import HomeParallaxPreview from "./pages/HomeParallaxPreview";
import EmailPreview from "./pages/EmailPreview";
import MysteryRoomHero from "./components/MysteryRoomHero";
import EvidenceCardPreview from "./pages/EvidenceCardPreview";
import EvidenceCardPrint from "./pages/EvidenceCardPrint";
import React from "react";

const queryClient = new QueryClient();

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  return (
    <LoadingBoundary loading={loading}>
      {isAuthenticated ? (
        <>{children}</>
      ) : (
        <Navigate to="/sign-in" replace />
      )}
    </LoadingBoundary>
  );
};

// Track route changes
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA on first load
    initGA();
    // Capture UTM/referrer once per browser, before any signup
    captureLandingAttribution();
  }, []);

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
};

// Main App component with simplified structure
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteTracker />
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

const AppRoutes = () => {
  const { loading, isAuthenticated } = useAuth();

  return (
    <LoadingBoundary loading={loading}>
      <WelcomeDiscountRibbon />
      {isAuthenticated && <MobileBottomNav />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/contact" element={<Navigate to="/support" replace />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/dark-preview" element={<DarkHomePreview />} />
        <Route path="/font-preview" element={<FontPreview />} />
        <Route path="/home-parallax" element={<HomeParallaxPreview />} />
        <Route path="/email-preview" element={<EmailPreview />} />
        <Route path="/evidence-card-preview" element={<EvidenceCardPreview />} />
        <Route path="/evidence-card-print" element={<EvidenceCardPrint />} />
        <Route path="/mystery-hero" element={<div className="bg-[#1a0a1a]"><MysteryRoomHero /><div className="px-6 py-32 text-center"><p className="text-white/20 text-sm">Rest of homepage content would go below</p></div></div>} />
        
        {/* Character access route (public) */}
        <Route path="/character/:token" element={<CharacterAccess />} />
        {/* Host access route (public) */}
        <Route path="/host/:token" element={<HostAccess />} />
        {/* Feedback route (public, accessed from follow-up emails) */}
        <Route path="/feedback/:conversationId" element={<Feedback />} />

        {/* Guest feedback route (public, accessed from guest follow-up emails) */}
        <Route path="/guest-feedback/:token" element={<GuestFeedback />} />

        {/* Payment success and cancel routes */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-canceled" element={<Navigate to="/" replace />} />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mystery/create"
          element={
            <ProtectedRoute>
              <MysteryCreation />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/mystery/edit/:id" 
          element={
            <ProtectedRoute>
              <MysteryChatPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mystery/chat/:id" 
          element={
            <ProtectedRoute>
              <MysteryChatPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mystery/purchase/:id" 
          element={<MysteryPurchase />} 
        />
        <Route path="/mystery/:id" element={<MysteryView />} />
        <Route path="/:lang/blog" element={<BlogIndex />} />
        <Route path="/:lang/blog/:slug" element={<BlogPost />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </LoadingBoundary>
  );
};

export default App;
