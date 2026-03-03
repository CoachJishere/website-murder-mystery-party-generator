import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare const gtag: any; // Will be available via the script in index.html

const GA_MEASUREMENT_ID = 'G-XGD48X4ZQS';
const isProduction = process.env.NODE_ENV === 'production';

// Debug: Log at module load time
console.log('📊 Analytics module loaded. isProduction:', isProduction, 'NODE_ENV:', process.env.NODE_ENV);

// Initialize GA4
export const initGA = () => {
  if (isProduction && typeof window !== 'undefined') {
    // dataLayer is initialized in index.html
    if (typeof gtag === 'function') {
      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // We'll handle page views manually for SPA
      });
    }
  }
};

// Track page views
export const trackPageView = (path: string) => {
  if (isProduction && typeof window !== 'undefined' && typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_path: path,
      send_to: GA_MEASUREMENT_ID,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, params: Record<string, any> = {}) => {
  console.log('🎯 trackEvent called:', action, params);
  console.log('🎯 isProduction (module const):', isProduction);
  console.log('🎯 typeof window:', typeof window);
  console.log('🎯 typeof gtag:', typeof gtag);

  if (isProduction && typeof window !== 'undefined' && typeof gtag === 'function') {
    console.log('✅ Calling gtag with:', action, params);
    gtag('event', action, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
    console.log('✅ gtag called successfully');
  } else {
    console.log('❌ Skipping gtag. isProduction:', isProduction, 'window:', typeof window, 'gtag:', typeof gtag);
  }
};

// Track sign up
export const trackSignUp = (method: string) => {
  console.log('🔍 trackSignUp called with method:', method);
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
  console.log('🔍 isProduction:', process.env.NODE_ENV === 'production');
  console.log('🔍 typeof gtag:', typeof gtag);
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
export const trackBeginCheckout = (mysteryId: string, theme?: string) => {
  trackEvent('begin_checkout', {
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

// Track purchase complete (user returns from Stripe successfully)
export const trackPurchaseComplete = (mysteryId: string, theme?: string) => {
  trackEvent('purchase', {
    transaction_id: mysteryId,
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
    if (isProduction) {
      trackPageView(location.pathname + location.search);
    }
  }, [location]);
};
