import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-XGD48X4ZQS';
const isProduction = process.env.NODE_ENV === 'production';

// Initialize GA4 — send_page_view is already disabled in index.html; this is a safety net.
export const initGA = () => {
  if (isProduction && typeof window !== 'undefined') {
    if (typeof window.gtag === 'function') {
      window.gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false,
      });
    }
  }
};

// Track page views — include page_location so GA4 populates URL dimensions correctly for SPA navigations.
export const trackPageView = (path: string) => {
  if (isProduction && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, params: Record<string, any> = {}) => {
  if (isProduction && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: action,
        ...params
      });
    }
    window.gtag('event', action, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
  }
};

// Track sign up
export const trackSignUp = (method: string) => {
  trackEvent('sign_up', { method });
};

// Track login
export const trackLogin = (method: string) => {
  trackEvent('login', { method });
};

// Track form submissions
export const trackFormSubmission = (formName: string, data: Record<string, any> = {}) => {
  trackEvent('form_submission', {
    form_name: formName,
    ...data,
  });};

// Track mystery creation
export const trackMysteryCreation = (mysteryType: string, data: Record<string, any> = {}) => {
  trackEvent('mystery_created', {
    mystery_type: mysteryType,
    ...data,
  });
};

// Track purchase page view (user sees the buy page)
export const trackPurchasePageView = (mysteryId: string, theme?: string) => {
  trackEvent('view_item', {
    currency: 'USD',
    value: 24.99,
    items: [{
      item_id: mysteryId,
      item_name: 'Murder Mystery Package',
      item_category: theme || 'mystery',
      price: 24.99,
      quantity: 1,
    }],
  });
};

// Track checkout initiated (user clicks "Complete Purchase")
// `hasDiscount` records whether the welcome discount was actually offered to
// this customer at click time, so a full-price purchase can later be told
// apart from "discount was never surfaced" vs "customer had it and didn't use
// it" without re-deriving profiles/Stripe state by hand (see useWelcomeDiscount.ts).
export const trackBeginCheckout = (mysteryId: string, theme?: string, hasDiscount?: boolean) => {
  const price = hasDiscount ? 19.99 : 24.99;
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: price,
    has_discount: !!hasDiscount,
    items: [{
      item_id: mysteryId,
      item_name: 'Murder Mystery Package',
      item_category: theme || 'mystery',
      price,
      quantity: 1,
    }],
  });
};

// Track package generation completed
export const trackGenerationCompleted = (conversationId: string, params: Record<string, any> = {}) => {
  trackEvent('package_generation_completed', {
    conversation_id: conversationId,
    ...params,
  });
};

// Track package generation failed
export const trackGenerationFailed = (conversationId: string, params: Record<string, any> = {}) => {
  trackEvent('package_generation_failed', {
    conversation_id: conversationId,
    ...params,
  });
};

// Track package tab view (which sections users look at)
export const trackPackageTabViewed = (tabName: string, conversationId?: string) => {
  trackEvent('package_tab_viewed', {
    tab_name: tabName,
    ...(conversationId && { conversation_id: conversationId }),
  });
};

// Track character assignment started
export const trackCharacterAssignment = (conversationId: string, characterCount: number) => {
  trackEvent('character_assignment_started', {
    conversation_id: conversationId,
    character_count: characterCount,
  });
};

// Track feedback prompt shown
export const trackFeedbackPromptShown = (conversationId: string) => {
  trackEvent('feedback_prompt_shown', {
    conversation_id: conversationId,
  });
};

// Track feedback prompt clicked
export const trackFeedbackPromptClicked = (conversationId: string) => {
  trackEvent('feedback_prompt_clicked', {
    conversation_id: conversationId,
  });
};

// Hook to track page views on route changes
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
};
