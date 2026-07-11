export const COOKIE_CONSENT_KEY = "husam_cookie_consent_v1";
export const COOKIE_CONSENT_EVENT = "husam-cookie-consent-change";
let transientConsent = null;

export function getCookieConsent() {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === "accepted" || value === "rejected") return value;
  } catch {
    // Fall through to the in-memory decision for this page.
  }

  return transientConsent;
}

export function setCookieConsent(value) {
  if (value !== "accepted" && value !== "rejected") return;
  transientConsent = value;

  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // Consent still applies for this page when persistent storage is blocked.
  }

  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}
