import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import {
  COOKIE_CONSENT_EVENT,
  getCookieConsent,
} from "@/lib/cookieConsent";

export default function AnalyticsBridge() {
  const location = useLocation();
  const [consent, setConsent] = useState(getCookieConsent);

  useEffect(() => {
    const handleConsentChange = () => setConsent(getCookieConsent());
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () =>
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;

    const initializedNow = initAnalytics();
    if (!initializedNow) {
      trackPageView(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [consent, location.hash, location.pathname, location.search]);

  return null;
}

