import { getCookieConsent } from "@/lib/cookieConsent";

export const GOALS = {
  PHONE_CLICK: "click_phone",
  MESSENGER_CLICK: "click_messenger",
  CONTACT_FORM_SUBMIT: "contact_form_submit",
  QUIZ_SUBMIT: "quiz_submit",
  PROJECT_OPEN: "project_open",
  PROJECT_CTA_CLICK: "project_cta_click",
};

const metrikaId = import.meta.env.VITE_YANDEX_METRIKA_ID;
let initialized = false;

function getCounterId() {
  if (!metrikaId) return null;
  const parsed = Number(metrikaId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function initAnalytics() {
  const counterId = getCounterId();
  if (
    !counterId ||
    initialized ||
    typeof window === "undefined" ||
    getCookieConsent() !== "accepted"
  ) {
    return false;
  }

  initialized = true;

  window.ym =
    window.ym ||
    function ymStub() {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
  window.ym.l = Number(new Date());

  if (!document.querySelector('script[data-yandex-metrika="true"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    script.dataset.yandexMetrika = "true";
    document.head.appendChild(script);
  }

  window.ym(counterId, "init", {
    accurateTrackBounce: true,
    clickmap: true,
    trackLinks: true,
    webvisor: false,
  });

  return true;
}

export function trackPageView(path) {
  const counterId = getCounterId();
  if (
    !counterId ||
    typeof window === "undefined" ||
    getCookieConsent() !== "accepted"
  ) {
    return;
  }
  initAnalytics();
  window.ym?.(counterId, "hit", path || window.location.href);
}

export function reachGoal(goal, params = {}) {
  const counterId = getCounterId();
  if (
    !counterId ||
    !goal ||
    typeof window === "undefined" ||
    getCookieConsent() !== "accepted"
  ) {
    return;
  }
  initAnalytics();
  window.ym?.(counterId, "reachGoal", goal, params);
}

