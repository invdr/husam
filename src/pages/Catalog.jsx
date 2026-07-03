import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Icon, Pagination } from "@/components/common";
import { ProjectCard, ProjectCardSkeleton } from "@/components/catalog";
import SeoHead from "@/components/common/SeoHead";
import CatalogJsonLd, { BreadcrumbsJsonLd } from "@/components/common/JsonLd";
import { useProjects } from "@/hooks/useProjects";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import {
  normalizeCatalogSortParam,
  getCatalogSortComparator,
  CATALOG_SORT_DEFAULT,
} from "@/utils/catalogSort";

// Маппинг для обратной совместимости (старые проекты с type="Дизайн")
const TYPE_ALIASES = { Дизайн: "Дизайн проекты" };
// Подпись на кнопке фильтра (в UI показываем «Дизайн» вместо «Дизайн проекты»)
const TYPE_LABELS = { "Дизайн проекты": "Дизайн" };
const ALL_FILTER = "Все";
const PAGE_SIZE = 12;

// Разбор ?type= из URL с учётом legacy-алиасов: старые ссылки вида
// /catalog?type=Дизайн должны попадать в актуальную категорию, а не
// сбрасываться на «Все».
function resolveTypeParam(urlType) {
  if (!urlType || urlType === "all") return ALL_FILTER;
  return TYPE_ALIASES[urlType] ?? urlType;
}

// Компонент с ключом по фильтру/сортировке — при смене remount, currentPage сбрасывается в 1
function CatalogPaginatedList({
  filteredAndSortedProjects,
  pageSize,
  navigate,
  onPageReport,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredAndSortedProjects.length / pageSize);
  const currentPageSafe = Math.min(currentPage, Math.max(totalPages, 1));
  const paginatedProjects =
    totalPages > 1
      ? filteredAndSortedProjects.slice(
          (currentPageSafe - 1) * pageSize,
          currentPageSafe * pageSize
        )
      : filteredAndSortedProjects;

  useEffect(() => {
    if (currentPage !== currentPageSafe) setCurrentPage(currentPageSafe);
  }, [currentPage, currentPageSafe]);

  useEffect(() => {
    onPageReport?.(currentPageSafe);
  }, [currentPageSafe, onPageReport]);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedProjects.map((project) => (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/catalog/${project.id}`)}
            onKeyDown={(e) =>
              e.key === "Enter" && navigate(`/catalog/${project.id}`)
            }
            className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink rounded-2xl"
          >
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-10">
          <Pagination
            page={currentPageSafe}
            totalPages={totalPages}
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}
    </>
  );
}

export default function Catalog() {
  const navigate = useNavigate();
  const { projects, loading } = useProjects();
  const { types } = useProjectTypes();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState(() =>
    normalizeCatalogSortParam(searchParams.get("sort"))
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(() =>
    resolveTypeParam(searchParams.get("type"))
  );
  const [reportedPage, setReportedPage] = useState(1);

  // Синхронизация activeFilter при загрузке types (если URL содержит несуществующий тип)
  useEffect(() => {
    if (
      types.length > 0 &&
      activeFilter !== ALL_FILTER &&
      !types.includes(activeFilter)
    ) {
      const urlType = resolveTypeParam(searchParams.get("type"));
      setActiveFilter(types.includes(urlType) ? urlType : ALL_FILTER);
    }
  }, [types, activeFilter, searchParams]);

  // Сортировка из URL (назад/вперёд, внешняя ссылка)
  useEffect(() => {
    const urlSort = normalizeCatalogSortParam(searchParams.get("sort"));
    setSortBy((prev) => (prev === urlSort ? prev : urlSort));
  }, [searchParams]);

  // Синхронизация URL: type + sort (как на /projects), сохраняем ?project= для редиректа
  useEffect(() => {
    if (!activeFilter) return;
    const typeParam = activeFilter === ALL_FILTER ? "all" : activeFilter;
    const project = searchParams.get("project");
    const params = { type: typeParam };
    if (sortBy !== CATALOG_SORT_DEFAULT) params.sort = sortBy;
    if (project) params.project = project;
    setSearchParams(params, { replace: true });
    // searchParams намеренно не в deps: иначе цикл после setSearchParams (новый объект URLSearchParams).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, sortBy, setSearchParams]);

  // Редирект со старого URL ?project=ID на /catalog/ID
  useEffect(() => {
    if (loading || projects.length === 0) return;
    const projectId = searchParams.get("project");
    if (projectId && projects.some((p) => p.id === projectId)) {
      navigate(`/catalog/${projectId}`, { replace: true });
    }
  }, [loading, projects, searchParams, navigate]);

  // Скролл вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Отслеживаем состояние бургер-меню через класс на body
  useEffect(() => {
    const checkMenuState = () => {
      setIsMenuOpen(document.body.classList.contains("overflow-hidden"));
    };
    checkMenuState();
    const observer = new MutationObserver(checkMenuState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Фильтрация и сортировка проектов
  const filteredAndSortedProjects = useMemo(() => {
    let filtered =
      activeFilter === ALL_FILTER
        ? [...projects]
        : projects.filter((project) => {
            const t = project.type ?? "";
            return t === activeFilter || TYPE_ALIASES[t] === activeFilter;
          });

    const cmp = getCatalogSortComparator(sortBy);
    filtered = [...filtered].sort(cmp);

    return filtered;
  }, [projects, activeFilter, sortBy]);

  const totalPages = Math.ceil(
    filteredAndSortedProjects.length / PAGE_SIZE
  );
  const showPagination = totalPages > 1;

  return (
    <>
      <SeoHead
        title="Наши работы"
        description="Наши работы HUSAM STROY INVEST — строительство, ремонт и дизайн интерьеров. Реализованные объекты."
      />
      <BreadcrumbsJsonLd
        items={[
          { name: "Главная", path: "/" },
          { name: "Каталог", path: "/catalog" },
        ]}
      />
      <CatalogJsonLd projects={filteredAndSortedProjects} />
      <section className="min-h-screen bg-[#2A2A28]/30 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="container mx-auto px-6 md:px-10 lg:px-12">
          {/* Хлебные крошки */}
          <nav className="mb-6 md:mb-8" aria-label="Хлебные крошки">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <li>
                <Link to="/" className="transition-colors hover:text-brand">
                  Главная
                </Link>
              </li>
              <li aria-hidden="true">
                <Icon name="chevron-right" className="h-4 w-4 opacity-60" />
              </li>
              <li className="text-white font-medium">
                Каталог
              </li>
            </ol>
          </nav>

          {/* Заголовок */}
          {/* Убран блок "Портфолио" */}

          {/* Sticky фильтры и сортировка */}
          {!isMenuOpen && !loading && (
            <div className="md:sticky md:top-20 z-[60] mb-4 md:mb-8 rounded-lg md:rounded-xl border border-brand/20 bg-ink/95 backdrop-blur-lg p-2 md:p-4 shadow-lg">
              <div className="flex flex-col gap-2 md:gap-4 md:flex-row md:items-center md:justify-between">
                {/* Вкладки фильтров */}
                <div className="flex flex-wrap gap-1.5 md:gap-3">
                  <button
                    onClick={() => setActiveFilter(ALL_FILTER)}
                    className={
                      "rounded-lg md:rounded-xl px-2 py-1 md:px-4 md:py-2.5 text-xs md:text-sm font-medium transition-all " +
                      (activeFilter === ALL_FILTER
                        ? "bg-brand text-ink shadow-lg"
                        : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                    }
                  >
                    Все
                  </button>
                  {types.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={
                        "rounded-lg md:rounded-xl px-2 py-1 md:px-4 md:py-2.5 text-xs md:text-sm font-medium transition-all " +
                        (activeFilter === tab
                          ? "bg-brand text-ink shadow-lg"
                          : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                      }
                    >
                      {TYPE_LABELS[tab] ?? tab}
                    </button>
                  ))}
                </div>

                {/* Сортировка и счетчик */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="text-xs md:text-sm text-gray-400">
                    {showPagination ? (
                      <>
                        Показано{" "}
                        <span className="font-semibold text-brand">
                          {(reportedPage - 1) * PAGE_SIZE + 1}–
                          {Math.min(
                            reportedPage * PAGE_SIZE,
                            filteredAndSortedProjects.length
                          )}
                        </span>{" "}
                        из {filteredAndSortedProjects.length}
                      </>
                    ) : (
                      <>
                        Показано:{" "}
                        <span className="font-semibold text-brand">
                          {filteredAndSortedProjects.length}
                        </span>{" "}
                        <span className="hidden sm:inline">
                          {filteredAndSortedProjects.length === 1
                            ? "проект"
                            : filteredAndSortedProjects.length < 5
                            ? "проекта"
                            : "проектов"}
                        </span>
                      </>
                    )}
                  </div>
                  <label htmlFor="catalog-sort" className="sr-only">
                    Сортировка
                  </label>
                  <select
                    id="catalog-sort"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(normalizeCatalogSortParam(e.target.value))
                    }
                    className="rounded-lg md:rounded-xl border border-brand/30 bg-ink px-2 py-1.5 md:px-4 md:py-2.5 text-xs md:text-sm text-white focus:border-brand focus:outline-none"
                    aria-label="Сортировка каталога работ"
                  >
                    <option value={CATALOG_SORT_DEFAULT}>По умолчанию</option>
                    <option value="area-desc">По площади ↓</option>
                    <option value="area-asc">По площади ↑</option>
                    <option value="budget-desc">По бюджету ↓</option>
                    <option value="budget-asc">По бюджету ↑</option>
                    <option value="duration-desc">По сроку ↓</option>
                    <option value="duration-asc">По сроку ↑</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Сетка проектов */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProjectCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          ) : filteredAndSortedProjects.length > 0 ? (
            <CatalogPaginatedList
              key={`${activeFilter}-${sortBy}`}
              filteredAndSortedProjects={filteredAndSortedProjects}
              pageSize={PAGE_SIZE}
              navigate={navigate}
              onPageReport={setReportedPage}
            />
          ) : (
            <div className="py-16 text-center">
              <Icon
                name="folder-x"
                className="mx-auto mb-4 h-16 w-16 text-gray-500"
              />
              <p className="text-lg text-gray-400">
                Проекты в этой категории появятся скоро
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
