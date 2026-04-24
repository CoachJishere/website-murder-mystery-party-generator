import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string;
const POSTHOG_HOST = 'https://us.i.posthog.com';
const isProduction = import.meta.env.PROD;

export const initPostHog = () => {
  if (!isProduction || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We handle pageviews manually
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  });
};

export const capturePageView = (path: string) => {
  if (!isProduction || !posthog.__loaded) return;
  posthog.capture('$pageview', { $current_url: window.location.origin + path });
};

export const capture = (event: string, properties?: Record<string, unknown>) => {
  if (!isProduction || !posthog.__loaded) return;
  posthog.capture(event, properties);
};

export default posthog;
