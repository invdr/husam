import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCookieConsent,
  setCookieConsent,
} from "@/lib/cookieConsent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  const chooseConsent = (value) => {
    setCookieConsent(value);
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
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => chooseConsent("accepted")}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
