import { Link } from "react-router-dom";
import SeoHead from "@/components/common/SeoHead";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
      <SeoHead title="Страница не найдена" robots="noindex,nofollow" />
      <p className="text-sm uppercase tracking-[0.2em] text-brand">404</p>
      <h1 className="mt-4 font-play text-3xl font-bold text-white sm:text-4xl">
        Страница не найдена
      </h1>
      <p className="mt-4 text-gray-400">
        Возможно, ссылка устарела или проект больше недоступен.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-xl bg-brand px-6 py-3 font-semibold text-ink transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      >
        На главную
      </Link>
    </section>
  );
}
