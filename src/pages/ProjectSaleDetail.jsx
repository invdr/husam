import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Lightbox from "yet-another-react-lightbox";
import { Thumbnails, Zoom } from "yet-another-react-lightbox/plugins";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { Icon } from "@/components/common";
import SeoHead from "@/components/common/SeoHead";
import { BreadcrumbsJsonLd } from "@/components/common/JsonLd";
import { openMessenger } from "@/utils/messenger";
import { useSaleProjects } from "@/hooks/useSaleProjects";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  formatPrice,
  getSaleDisplayFields,
  SALE_PROJECT_CUSTOM_FIELDS_KEY,
  parseSaleProjectCustomFields,
  formatConstructionPrice,
  getConstructionMaterialFields,
  getExplicationSections,
} from "@/utils/saleProjectAttributes";

function ProjectGallery({ images, projectTitle }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <>
      <div
        className="relative aspect-[4/3] max-h-[520px] w-full overflow-hidden rounded-2xl bg-gray-800 cursor-pointer"
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
            alt={`${projectTitle} — фото ${currentImageIndex + 1}`}
            className="h-full w-full object-cover"
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
                setCurrentImageIndex(
                  (prev) => (prev - 1 + images.length) % images.length
                );
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
          {images.map((image, index) => (
            <button
              key={image + index}
              type="button"
              onClick={() => setCurrentImageIndex(index)}
              className={`h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                index === currentImageIndex
                  ? "border-brand"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

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

export default function ProjectSaleDetail() {
  const { projectId } = useParams();
  const { projects, loading } = useSaleProjects();
  const { settings } = useSiteSettings();
  const customFieldDefs = parseSaleProjectCustomFields(settings[SALE_PROJECT_CUSTOM_FIELDS_KEY]);
  const project = projects.find((item) => item.id === projectId);
  const images = project?.images?.length ? project.images : [];

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
            Возможно, карточка удалена или ссылка устарела.
          </p>
          <Link
            to="/projects"
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-brand bg-transparent px-6 py-3 text-brand transition-colors hover:bg-brand hover:text-ink"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Вернуться к проектам
          </Link>
        </div>
      </section>
    );
  }

  const title = `${project.title} — готовый проект`;
  const description = [project.type, project.area, project.material]
    .filter(Boolean)
    .join(", ");
  const saleDisplayFields = getSaleDisplayFields(project, customFieldDefs);
  const visibleSaleFields = saleDisplayFields.filter(
    ({ value }) => typeof value === "string" && value.trim() !== "" && value.trim() !== "—"
  );
  const explicationSections = getExplicationSections(project);
  const constructionMaterialFields = getConstructionMaterialFields(project);

  return (
    <>
      <SeoHead
        title={title}
        description={
          description
            ? `${description}. Купить готовый проект от HUSAM STROY INVEST.`
            : "Готовый проект на продажу от HUSAM STROY INVEST."
        }
        image={images[0] ?? null}
      />
      <BreadcrumbsJsonLd
        items={[
          { name: "Главная", path: "/" },
          { name: "Проекты", path: "/projects" },
          { name: project.title, path: `/projects/${project.id}` },
        ]}
      />

      <section className="min-h-screen bg-[#2A2A28]/30 pt-6 pb-16 md:pt-10 md:pb-24">
        <div className="container mx-auto px-6 md:px-10 lg:px-12">
          <nav className="mb-8" aria-label="Хлебные крошки">
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
                <Link to="/projects" className="transition-colors hover:text-brand">
                  Проекты
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

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(280px,360px)] lg:gap-10 lg:items-start">
            <div className="min-w-0">
              <ProjectGallery
                key={projectId}
                images={images}
                projectTitle={project.title}
              />

              <div className="mt-8">
                <h1 className="font-play text-3xl font-bold text-white leading-tight md:text-4xl">
                  {project.title}
                </h1>
                <p className="mt-2 text-sm text-brand">{project.type || "Проект"}</p>
              </div>

              {project.description && project.description.trim() && (
                <section className="mt-6">
                  <h2 className="font-play text-xl font-bold text-white mb-3">
                    Описание проекта
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-line">
                    {project.description}
                  </p>
                </section>
              )}

              {explicationSections.length > 0 && (
                <section className="mt-6">
                  <h2 className="font-play text-xl font-bold text-white mb-3">
                    Экспликация по этажам
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {explicationSections.map((section) => (
                      <div
                        key={section.title}
                        className="rounded-2xl border border-brand/15 bg-ink/40 p-4"
                      >
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand">
                          {section.title}
                        </h3>
                        <div className="space-y-1.5 text-sm leading-relaxed text-gray-200">
                          {section.text
                            .split(/\r?\n/)
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => (
                              <div
                                key={`${section.title}-${line}`}
                                className="border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0"
                              >
                                {line}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {explicationSections.length === 0 && project.roomExplanation && project.roomExplanation.trim() && (
                <section className="mt-6">
                  <h2 className="font-play text-xl font-bold text-white mb-3">
                    Экспликация проекта
                  </h2>
                  <dl className="rounded-2xl border border-brand/15 bg-ink/40 p-3 sm:p-4 md:p-5 text-xs sm:text-sm">
                    {project.roomExplanation
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line) => {
                        const [name, area] = line.split(/[-–—]/, 2);
                        return (
                          <div
                            key={line}
                            className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0"
                          >
                            <dt className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                              {name?.trim()}
                            </dt>
                            <dd className="mt-0.5 font-medium text-white text-right">
                              {area ? area.trim() : ""}
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                </section>
              )}

              {constructionMaterialFields.length > 0 && (
                <section className="mt-8">
                  <h2 className="font-play text-xl font-bold text-white mb-4">
                    Конструктив и материалы
                  </h2>
                  <div className="rounded-2xl border border-brand/15 bg-ink/40 p-3 sm:p-4 md:p-5">
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      {constructionMaterialFields.map(({ label, value }) => (
                        <div key={label}>
                          <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                            {label}
                          </dt>
                          <dd className="mt-1 font-medium text-white">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </section>
              )}

              {(visibleSaleFields.length > 0 || project.id) && (
                <section className="mt-8">
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
                      {visibleSaleFields.map(({ label, value }) => (
                        <div
                          key={label}
                          className="space-y-0.5"
                        >
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
                </section>
              )}
            </div>

            <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-brand/20 bg-ink/50 p-5 md:p-6">
                <div className="mb-3 flex items-center justify-end gap-3">
                  <span className="text-xs text-gray-500">ID: {project.id}</span>
                </div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Стоимость
                </div>
                <div className="mt-1 font-play text-3xl text-white">
                  {formatPrice(project.price)}
                </div>
                {project.oldPrice ? (
                  <div className="mt-1 text-sm text-gray-500 line-through">
                    {formatPrice(project.oldPrice)}
                  </div>
                ) : null}
                {project.constructionPriceFrom && (
                  <div className="mt-3 text-xs text-gray-300">
                    Стоимость строительства от{" "}
                    <span className="font-medium text-white">
                      {formatConstructionPrice(project.constructionPriceFrom)}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-brand/20 bg-ink/50 p-5 md:p-6">
                <h2 className="font-play text-lg font-bold text-white mb-3">
                  Что делать после покупки проекта
                </h2>
                <ul className="space-y-2.5 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <Icon name="check" className="h-4 w-4 text-brand mt-0.5" />
                    Обсудить варианты сотрудничества
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="check" className="h-4 w-4 text-brand mt-0.5" />
                    Посчитать смету на дом
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="check" className="h-4 w-4 text-brand mt-0.5" />
                    Заключить договор и начать строительство
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() =>
                    openMessenger(
                      `Хочу купить готовый проект ${project.id} — "${project.title}"`
                    )
                  }
                  className="w-full rounded-xl bg-brand px-5 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90"
                >
                  Хочу этот проект
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openMessenger(`Нужна консультация по проекту ${project.id}`)
                  }
                  className="w-full rounded-xl border-2 border-brand px-5 py-3.5 text-base font-medium text-brand transition-colors hover:bg-brand hover:text-ink"
                >
                  Задать вопрос
                </button>
                <Link
                  to="/projects"
                  className="inline-flex items-center justify-center gap-2 text-sm text-gray-400 transition-colors hover:text-brand"
                >
                  <Icon name="arrow-left" className="h-4 w-4" />
                  Вернуться к списку проектов
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
