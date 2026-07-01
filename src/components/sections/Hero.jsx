import { useState } from "react";
import { toast } from "sonner";
import { Badge, Icon, Modal } from "@/components/common";
import EditBlockButton from "./EditBlockButton";
import { usePageContent } from "@/hooks/usePageContent";
import heroImage from "@/assets/image.jpg";
import heroImageMobile from "@/assets/mobile/hero-img.webp";
import { HERO_DEFAULTS } from "@/data/pageContentDefaults";

export default function Hero() {
  const { content, loading, updateContent } = usePageContent();
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const c = loading ? HERO_DEFAULTS : content;

  const [form, setForm] = useState({
    hero_badge: c.hero_badge,
    hero_title_before: c.hero_title_before,
    hero_title_highlight: c.hero_title_highlight,
    hero_subtitle: c.hero_subtitle,
    hero_cta_primary: c.hero_cta_primary,
    hero_cta_secondary: c.hero_cta_secondary,
  });

  const openEdit = () => {
    setForm({
      hero_badge: c.hero_badge,
      hero_title_before: c.hero_title_before,
      hero_title_highlight: c.hero_title_highlight,
      hero_subtitle: c.hero_subtitle,
      hero_cta_primary: c.hero_cta_primary,
      hero_cta_secondary: c.hero_cta_secondary,
    });
    setShowEdit(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateContent(form);
      toast.success("Блок сохранен");
      setShowEdit(false);
    } catch (err) {
      toast.error(err?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const headerHeight = 80;
      const top = el.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const scrollButtonClass =
    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-brand/60 bg-transparent text-brand transition hover:border-brand hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink animate-float-down z-10";

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-5rem)] flex flex-col justify-between py-12 md:py-20 lg:py-32 will-reveal">
      <EditBlockButton onClick={openEdit} label="Изменить блок" />

      {/* Мобильное фоновое изображение */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: `url('${heroImageMobile}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Десктопное фоновое изображение */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage: `url('${heroImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent" />

      {/* Десктоп: кнопка внизу секции по центру (позиция относительно section) */}
      <button
        type="button"
        onClick={() => scrollToSection("advantages")}
        className={`hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 ${scrollButtonClass}`}
        aria-label="К следующей секции"
      >
        <Icon name="arrow-down" className="h-6 w-6" />
      </button>

      <div className="container relative z-10 mx-auto px-6 md:px-10 lg:px-12 w-full flex-1 flex flex-col justify-between md:flex md:flex-col md:justify-between md:items-end">
        <div className="max-w-4xl w-full flex flex-col justify-between flex-1 md:flex-none md:block md:text-right">
          <div className="min-h-0 flex-1 md:flex-initial">
            <Badge>{c.hero_badge}</Badge>
            <h1 className="mb-4 mt-4 font-play text-4xl font-bold leading-tight md:mb-6 md:mt-6 md:text-6xl lg:text-7xl">
              {c.hero_title_before}
              <span className="text-brand">{c.hero_title_highlight}</span>
            </h1>
            <p className="mb-6 max-w-3xl text-base text-gray-200 md:mb-8 md:text-lg lg:text-xl md:ml-auto">
              {c.hero_subtitle}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4 md:items-end md:justify-end">
            <button
              onClick={() => scrollToSection("calculator")}
              className="w-full rounded-xl bg-brand px-6 py-3 text-base text-ink transition hover:opacity-90 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              {c.hero_cta_primary}{" "}
              <Icon name="arrow-right" className="ml-2 inline h-5 w-5" />
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-brand px-6 py-3 text-base text-brand transition hover:bg-brand hover:text-ink sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              {c.hero_cta_secondary}
            </button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 h-1/2 w-1/2 rounded-full bg-brand/5 blur-3xl" />

      {showEdit && (
        <Modal title="Редактировать блок: Главный экран" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="hero-edit-badge" className="mb-1 block text-sm text-gray-400">Бейдж</label>
              <input
                id="hero-edit-badge"
                type="text"
                value={form.hero_badge}
                onChange={(e) => setForm((p) => ({ ...p, hero_badge: e.target.value }))}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="hero-edit-title-before" className="mb-1 block text-sm text-gray-400">Заголовок (до выделения)</label>
              <input
                id="hero-edit-title-before"
                type="text"
                value={form.hero_title_before}
                onChange={(e) => setForm((p) => ({ ...p, hero_title_before: e.target.value }))}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="hero-edit-title-highlight" className="mb-1 block text-sm text-gray-400">Заголовок (выделенная часть)</label>
              <input
                id="hero-edit-title-highlight"
                type="text"
                value={form.hero_title_highlight}
                onChange={(e) => setForm((p) => ({ ...p, hero_title_highlight: e.target.value }))}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="hero-edit-subtitle" className="mb-1 block text-sm text-gray-400">Подзаголовок</label>
              <textarea
                id="hero-edit-subtitle"
                value={form.hero_subtitle}
                onChange={(e) => setForm((p) => ({ ...p, hero_subtitle: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="hero-edit-cta-primary" className="mb-1 block text-sm text-gray-400">Кнопка основная</label>
              <input
                id="hero-edit-cta-primary"
                type="text"
                value={form.hero_cta_primary}
                onChange={(e) => setForm((p) => ({ ...p, hero_cta_primary: e.target.value }))}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="hero-edit-cta-secondary" className="mb-1 block text-sm text-gray-400">Кнопка вторичная</label>
              <input
                id="hero-edit-cta-secondary"
                type="text"
                value={form.hero_cta_secondary}
                onChange={(e) => setForm((p) => ({ ...p, hero_cta_secondary: e.target.value }))}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="rounded-xl border border-brand/20 px-4 py-2 text-gray-400 hover:bg-ink"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brand px-4 py-2 text-ink hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
