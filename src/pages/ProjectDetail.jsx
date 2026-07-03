import { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { useParams, Link } from "react-router-dom";
import Lightbox from "yet-another-react-lightbox";
import { Thumbnails, Zoom } from "yet-another-react-lightbox/plugins";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { Helmet } from "react-helmet-async";
import { Icon } from "@/components/common";
import SeoHead from "@/components/common/SeoHead";
import { BreadcrumbsJsonLd } from "@/components/common/JsonLd";
import { getDisplayFields } from "@/utils/catalogAttributes";
import { openMessenger } from "@/utils/messenger";
import { useProjects } from "@/hooks/useProjects";

function toAbsoluteImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = import.meta.env.BASE_URL || "/";
  const path = url.startsWith("/") ? url : `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  return `${origin}${path}`;
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { projects, loading } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const images = project?.images?.length ? project.images : [];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () =>
      images.length > 1 &&
      setCurrentImageIndex((prev) => (prev + 1) % images.length),
    onSwipedRight: () =>
      images.length > 1 &&
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length),
    delta: 50,
    trackTouch: true,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [projectId]);

  if (loading) {
    return (
      <section className="min-h-screen bg-[#2A2A28]/30 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="container mx-auto px-6 md:px-10 lg:px-12">
          <div className="flex min-h-[50vh] items-center justify-center">
            <Icon name="loader" className="h-12 w-12 animate-spin text-brand" />
          </div>
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="min-h-screen bg-[#2A2A28]/30 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="container mx-auto px-6 md:px-10 lg:px-12 text-center">
          <Icon name="folder-x" className="mx-auto mb-6 h-20 w-20 text-gray-500" />
          <h1 className="font-play text-2xl font-bold text-white md:text-3xl">
            Проект не найден
          </h1>
          <p className="mt-3 text-gray-400">
            Возможно, страница удалена или ссылка устарела.
          </p>
          <Link
            to="/catalog"
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-brand bg-transparent px-6 py-3 text-brand transition-colors hover:bg-brand hover:text-ink"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Вернуться в каталог
          </Link>
        </div>
      </section>
    );
  }

  const base = import.meta.env.BASE_URL || "/";
  const catalogPath = base === "/" ? "/catalog" : `${base.replace(/\/$/, "")}/catalog`;
  const shareUrl = `${window.location.origin}${catalogPath}/${project.id}`;
  const shareText = `Посмотрите проект "${project.title}" от HUSAM STROY INVEST`;

  const handleShare = (platform) => {
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(shareText);
    let link = "";
    if (platform === "messenger") link = `https://wa.me/?text=${text}%20${url}`;
    else if (platform === "telegram") link = `https://t.me/share/url?url=${url}&text=${text}`;
    else if (platform === "vkontakte") link = `https://vk.com/share.php?url=${url}&title=${text}`;
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  const displayFields = getDisplayFields(project);
  const visibleDisplayFields = displayFields.filter(
    ({ value }) => typeof value === "string" && value.trim() !== "" && value.trim() !== "—"
  );

  return (
    <>
      <SeoHead
        title={project.title}
        description={`${project.title} — ${project.type ?? ""}. ${[project.area, project.location].filter(Boolean).join(", ")}. HUSAM STROY INVEST.`}
        image={images[0] ?? null}
        url={shareUrl}
      />
      <BreadcrumbsJsonLd
        items={[
          { name: "Главная", path: "/" },
          { name: "Каталог", path: "/catalog" },
          { name: project.title, path: `/catalog/${project.id}` },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            description: [project.type, project.area, project.location].filter(Boolean).join(", "),
            ...(images[0] && { image: toAbsoluteImageUrl(images[0]) }),
            author: { "@type": "Organization", name: "HUSAM STROY INVEST" },
          })}
        </script>
      </Helmet>

      <section className="min-h-screen bg-[#2A2A28]/30 pt-6 pb-8 md:pt-10 md:pb-12">
        <div className="container mx-auto px-6 md:px-10 lg:px-12">
          {/* Хлебные крошки */}
          <nav className="mb-4" aria-label="Хлебные крошки">
            <ol className="flex min-w-0 items-center gap-2 text-sm text-gray-400">
              <li className="shrink-0">
                <Link to="/" className="transition-colors hover:text-brand">
                  Главная
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0">
                <Icon name="chevron-right" className="h-4 w-4 opacity-60" />
              </li>
              <li className="shrink-0">
                <Link
                  to="/catalog"
                  className="transition-colors hover:text-brand"
                >
                  Каталог
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0">
                <Icon name="chevron-right" className="h-4 w-4 opacity-60" />
              </li>
              <li
                className="min-w-0 flex-1 truncate whitespace-nowrap text-white font-medium md:flex-none md:max-w-none md:overflow-visible md:whitespace-normal"
                title={project.title}
              >
                {project.title}
              </li>
            </ol>
          </nav>

          {/* Галерея + правый сайдбар (гарантии, поделиться, CTA) */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:gap-6 md:mb-6 lg:grid-cols-[1fr_minmax(280px,360px)] lg:gap-8 lg:items-start">
            {/* Левая колонка: галерея */}
            <div className="min-w-0 order-1">
              <div
                {...swipeHandlers}
                className="relative aspect-[4/3] max-h-[480px] w-full overflow-hidden rounded-2xl bg-gray-800 cursor-pointer touch-pan-y"
                role="button"
                tabIndex={0}
                onClick={() => images.length > 0 && setLightboxOpen(true)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && images.length > 0) {
                    e.preventDefault();
                    setLightboxOpen(true);
                  }
                }}
              >
                {images[currentImageIndex] ? (
                  <img
                    src={images[currentImageIndex]}
                    alt={`${project.title} — фото ${currentImageIndex + 1}`}
                    className="h-full w-full object-cover transition-opacity"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500">
                    Нет изображения
                  </div>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 hover:bg-black/70 p-2.5 text-white transition-colors"
                      aria-label="Предыдущее фото"
                    >
                      <Icon name="chevron-left" className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => (prev + 1) % images.length);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 hover:bg-black/70 p-2.5 text-white transition-colors"
                      aria-label="Следующее фото"
                    >
                      <Icon name="chevron-right" className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {images.map((img, i) => (
                        <button
                          key={`dot-${img}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(i);
                          }}
                          className={`h-2 rounded-full transition-all ${
                            i === currentImageIndex ? "w-6 bg-brand" : "w-2 bg-white/50"
                          }`}
                          aria-label={`Фото ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="absolute top-4 right-4 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                    <div className="absolute top-4 left-4 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white flex items-center gap-1.5">
                      <Icon name="maximize-2" className="h-3.5 w-3.5" />
                      Полноэкранный просмотр
                    </div>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={img}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`flex-shrink-0 h-20 w-28 rounded-lg overflow-hidden border-2 transition-all ${
                        i === currentImageIndex ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Правая колонка: гарантии, поделиться, CTA (липкая на десктопе) */}
            <aside className="order-4 flex flex-col gap-8 lg:order-2 lg:sticky lg:top-24 lg:gap-6">
              {/* Гарантии */}
              <div className="rounded-2xl border border-brand/20 bg-ink/50 p-5 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Icon name="shield" className="h-5 w-5 text-brand flex-shrink-0" />
                  <h2 className="font-play text-lg font-bold text-white">
                    Гарантии качества
                  </h2>
                </div>
                <ul className="space-y-2.5 text-gray-300 text-sm">
                  {[
                    "Профессиональная команда с опытом работы",
                    "Строгое соблюдение сроков выполнения",
                    "Использование качественных материалов",
                    "Авторский надзор на всех этапах",
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-2">
                      <Icon name="check" className="h-4 w-4 text-brand flex-shrink-0 mt-0.5" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Поделиться */}
              <div className="rounded-2xl border border-brand/20 bg-ink/50 p-5 md:p-6">
                <h2 className="font-play text-lg font-bold text-white mb-3">
                  Поделиться
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleShare("messenger")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
                  >
                    <Icon name="message-circle" className="h-4 w-4" />
                    мессенджер
                  </button>
                  <button
                    onClick={() => handleShare("telegram")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0088cc] px-3 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
                  >
                    <Icon name="send" className="h-4 w-4" />
                    Telegram
                  </button>
                  <button
                    onClick={() => handleShare("vkontakte")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0077FF] px-3 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
                  >
                    <Icon name="share-2" className="h-4 w-4" />
                    VK
                  </button>
                </div>
              </div>

              {/* CTA: на десктопе в сайдбаре; на мобильной блок выше (после сетки характеристик) */}
              <div className="hidden flex-col gap-3 lg:flex">
                <button
                  onClick={() =>
                    openMessenger(`Интересует проект ${project.id} — "${project.title}"`)
                  }
                  className="w-full rounded-xl bg-brand px-5 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90"
                >
                  Хочу этот проект
                </button>
                <button
                  onClick={() =>
                    openMessenger(`Нужна консультация по проекту ${project.id}`)
                  }
                  className="w-full rounded-xl border-2 border-brand px-5 py-3.5 text-base font-medium text-brand transition-colors hover:bg-brand hover:text-ink"
                >
                  Задать вопрос
                </button>
              </div>
            </aside>

            {/* Тип и название: на мобильном сразу под галереей, на lg — только левая колонка */}
            <div className="order-2 lg:order-3 lg:col-span-1 lg:col-start-1 mb-4 md:mb-6">
              <p className="text-sm font-medium text-brand mb-2">{project.type}</p>
              <h1 className="font-play text-3xl font-bold text-white leading-tight md:text-4xl lg:text-5xl">
                {project.title}
              </h1>
            </div>

            {/* Характеристики: на мобильном под заголовком, на lg — только левая колонка */}
            {(visibleDisplayFields.length > 0 || project.id) && (
              <section className="order-3 mb-4 md:mb-6 lg:order-4 lg:col-span-1 lg:col-start-1">
                <h2 className="font-play text-xl font-bold text-white mb-4">
                  Характеристики
                </h2>
                <div className="rounded-2xl border border-brand/15 bg-ink/40 p-3 sm:p-4 md:p-5">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
                    {project.id && (
                      <div>
                        <dt className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                          Артикул
                        </dt>
                        <dd className="mt-0.5 font-semibold text-brand break-all">
                          {project.id}
                        </dd>
                      </div>
                    )}
                    {visibleDisplayFields.map(({ label, value }) => (
                      <div key={label} className="space-y-0.5">
                        <dt className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                          {label}
                        </dt>
                        <dd className="mt-0.5 font-medium text-white">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {/* CTA сразу после характеристик — только мобильная */}
                <div className="mt-6 flex flex-row gap-2 lg:hidden">
                  <button
                    onClick={() =>
                      openMessenger(`Интересует проект ${project.id} — "${project.title}"`)
                    }
                    className="flex-1 min-w-0 rounded-xl bg-brand px-3 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90"
                  >
                    Хочу этот проект
                  </button>
                  <button
                    onClick={() =>
                      openMessenger(`Нужна консультация по проекту ${project.id}`)
                    }
                    className="flex-1 min-w-0 rounded-xl border-2 border-brand px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-ink"
                  >
                    Задать вопрос
                  </button>
                </div>
              </section>
            )}

            {/* Описание проекта — простой текстовый блок */}
            {project.description && (
              <section className="order-4 mb-4 md:mb-6 lg:col-span-1 lg:col-start-1">
                <h2 className="font-play text-xl font-bold text-white mb-3">
                  Описание
                </h2>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {project.description}
                </p>
              </section>
            )}

            {/* Состав работ — в гриде, на lg только левая колонка */}
            {(project.scope?.length ?? 0) > 0 && (
              <section className="order-5 mb-4 md:mb-6 lg:col-span-1 lg:col-start-1">
                <h2 className="font-play text-xl font-bold text-white mb-4">
                  Состав работ
                </h2>
                <ul className="space-y-3 pl-5 text-gray-300 marker:text-brand">
                  {project.scope.map((item) => (
                    <li key={item} className="pl-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Назад в каталог — в гриде, на lg только левая колонка */}
            <div className="order-6 mt-4 pt-4 border-t border-brand/20 lg:col-span-1 lg:col-start-1">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-brand"
              >
                <Icon name="arrow-left" className="h-4 w-4" />
                Вернуться в каталог
              </Link>
            </div>
          </div>
        </div>
      </section>

      {images.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={currentImageIndex}
          slides={images.map((src) => ({ src }))}
          plugins={[Thumbnails, Zoom]}
          on={{ view: ({ index }) => setCurrentImageIndex(index) }}
        />
      )}
    </>
  );
}
