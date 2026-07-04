import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const COOKIE_CONSENT_KEY = "husam_cookie_consent_v1";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(COOKIE_CONSENT_KEY) !== "accepted");
    } catch {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    } catch {
      // Если localStorage недоступен, просто скрываем плашку на текущей странице.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-lg border border-white/10 bg-ink/95 p-4 shadow-2xl shadow-black/30 backdrop-blur md:flex-row md:items-center md:justify-between md:gap-6">
        <p className="text-sm leading-6 text-gray-200">
          Мы используем cookie-файлы для корректной работы сайта и аналитики.
          Продолжая пользоваться сайтом, вы соглашаетесь с{" "}
          <Link to="/privacy" className="font-semibold text-brand hover:underline">
            политикой обработки персональных данных
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={acceptCookies}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          ОК
        </button>
      </div>
    </div>
  );
}
