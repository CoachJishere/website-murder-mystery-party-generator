// Consent Mode v2 — ADR-0105. Compliance-critical defaults (EEA/UK/CH `region`
// scoping) live in index.html and are Google's own IP-based region detection,
// not this file. Everything here is: (a) applying/persisting a user's actual
// choice, and (b) a best-effort, non-authoritative heuristic for whether to
// show the banner at all. Getting (b) wrong degrades UX, never compliance —
// see the ADR's Rationale.

export type ConsentValue = 'granted' | 'denied';

export interface ConsentState {
  analytics: ConsentValue;
  ads: ConsentValue;
}

const STORAGE_KEY = 'mm_consent_v1';
const REOPEN_EVENT = 'mm:open-consent-settings';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function getSavedConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.analytics && parsed?.ads) return parsed as ConsentState;
    return null;
  } catch {
    return null;
  }
}

export function applyConsent(state: ConsentState) {
  gtag('consent', 'update', {
    analytics_storage: state.analytics,
    ad_storage: state.ads,
    ad_user_data: state.ads,
    ad_personalization: state.ads,
  });
}

export function saveConsent(state: ConsentState) {
  applyConsent(state);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota) — consent still applied
    // for this page load via gtag, just won't persist across visits.
  }
}

export function acceptAll() {
  saveConsent({ analytics: 'granted', ads: 'granted' });
}

export function rejectAll() {
  saveConsent({ analytics: 'denied', ads: 'denied' });
}

export function hasStoredConsent(): boolean {
  return getSavedConsent() !== null;
}

export function openConsentSettings() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

export function onOpenConsentSettings(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(REOPEN_EVENT, handler);
  return () => window.removeEventListener(REOPEN_EVENT, handler);
}

// IANA timezones covering the EEA + UK + Switzerland (the same region list
// used for the `region` param in index.html). Best-effort location proxy,
// used only to decide whether to show the banner — see file header.
const EEA_UK_CH_TIMEZONES = new Set([
  'Europe/Vienna', 'Europe/Brussels', 'Europe/Sofia', 'Europe/Zagreb',
  'Asia/Nicosia', 'Europe/Nicosia', 'Europe/Prague', 'Europe/Copenhagen',
  'Europe/Tallinn', 'Europe/Helsinki', 'Europe/Mariehamn', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Busingen', 'Europe/Athens', 'Europe/Budapest',
  'Europe/Dublin', 'Europe/Rome', 'Europe/Riga', 'Europe/Vilnius',
  'Europe/Luxembourg', 'Europe/Malta', 'Europe/Amsterdam', 'Europe/Warsaw',
  'Atlantic/Azores', 'Atlantic/Madeira', 'Europe/Lisbon', 'Europe/Bucharest',
  'Europe/Bratislava', 'Europe/Ljubljana', 'Europe/Madrid', 'Atlantic/Canary',
  'Africa/Ceuta', 'Europe/Stockholm', 'Atlantic/Reykjavik',
  'Europe/Vaduz', 'Europe/Oslo', 'Europe/London', 'Europe/Zurich',
  'Europe/Gibraltar', 'Europe/Isle_of_Man', 'Europe/Guernsey', 'Europe/Jersey',
]);

export function isLikelyEeaUkCh(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return true; // detection unavailable — show banner (safe default)
    return EEA_UK_CH_TIMEZONES.has(tz);
  } catch {
    return true; // detection failed — show banner (safe default)
  }
}
