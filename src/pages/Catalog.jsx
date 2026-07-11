import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Icon, Pagination } from "@/components/common";
import { ProjectCard, ProjectCardSkeleton } from "@/components/catalog";
import SeoHead from "@/components/common/SeoHead";
import CatalogJsonLd, { BreadcrumbsJsonLd } from "@/components/common/JsonLd";
import { useProjects } from "@/hooks/useProjects";
import {
  normalizeCatalogSortParam,
  getCatalogSortComparator,
  CATALOG_SORT_DEFAULT,
} from "@/utils/catalogSort";
import {
  getCatalogSortAreaComparable,
  getCatalogSortBudgetComparable,
  getCatalogSortDurationComparable,
  normalizeCatalogProjectType,
} from "@/utils/catalogAttributes";
import {
  CATALOG_FILTER_ANY,
  EMPTY_CATALOG_FILTERS,
  appendCatalogFilters,
  filterCatalogProjects,
  getCatalogFilterDefinitions,
  getCatalogFilterOptions,
  parseCatalogFilters,
} from "@/utils/catalogFilters";

// Подпись на кнопке фильтра (в UI показываем «Дизайн» вместо «Дизайн проекты»)
const TYPE_LABELS = { "Дизайн проекты": "Дизайн" };
const ALL_FILTER = "Все";
const PAGE_SIZE = 12;

// Разбор ?type= из URL с учётом legacy-алиасов: старые ссылки вида
// /catalog?type=Дизайн должны попадать в актуальную категорию, а не
// сбрасываться на «Все».
function resolveTypeParam(urlType) {
  if (!urlType || urlType === "all") return ALL_FILTER;
  return normalizeCatalogProjectType(urlType);
}

function parsePageParam(searchParams) {
  const pageParam = searchParams.get("page");
  if (!pageParam || !/^\d+$/.test(pageParam)) return 1;

  const page = Number(pageParam);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function buildCatalogSearchParams({
  activeFilter,
  sortBy,
  page,
  project,
  facetFilters = EMPTY_CATALOG_FILTERS,
  filterType,
}) {
  const params = new URLSearchParams();
  params.set("type", activeFilter === ALL_FILTER ? "all" : activeFilter);
  if (sortBy !== CATALOG_SORT_DEFAULT) params.set("sort", sortBy);
  if (filterType) appendCatalogFilters(params, facetFilters, filterType);
  if (page > 1) params.set("page", String(page));
  if (project) params.set("project", project);
  return params;
}

function getSearchSuffix(params) {
  const search = params.toString();
  return search ? `?${search}` : "";
}

function keepSelectedCatalogOption(options, selectedValue, fullOptions) {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) {
    return options;
  }
  const selected = fullOptions.find((option) => option.value === selectedValue);
  return selected ? [...options, selected] : options;
}

function hasUsefulSortValues(projects, getter) {
  const values = new Set(
    projects.map(getter).filter((value) => Number.isFinite(value) && value > 0),
  );
  return values.size > 1;
}

function CatalogPaginatedList({
  filteredAndSortedProjects,
  pageSize,
  page,
  onPageChange,
  onPageReport,
  detailSearch,
}) {
  const totalPages = Math.ceil(filteredAndSortedProjects.length / pageSize);
  const currentPageSafe = Math.min(page, Math.max(totalPages, 1));
  const paginatedProjects =
    totalPages > 1
      ? filteredAndSortedProjects.slice(
          (currentPageSafe - 1) * pageSize,
          currentPageSafe * pageSize
        )
      : filteredAndSortedProjects;

  useEffect(() => {
    onPageReport?.(currentPageSafe);
  }, [currentPageSafe, onPageReport]);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedProjects.map((project) => (
          <div
            key={project.id}
            className="rounded-2xl"
          >
            <ProjectCard
              project={project}
              titleHref={`/catalog/${project.id}${detailSearch}`}
            />
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-10">
          <Pagination
            page={currentPageSafe}
            totalPages={totalPages}
            onPageChange={(p) => {
              onPageChange(p);
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
  const {
    projects,
    types = [],
    loading,
    isAuthoritative = !loading,
  } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastWrittenSearchRef = useRef(searchParams.toString());
  const skipNextSearchWriteRef = useRef(false);
  const userSearchWriteRef = useRef(false);
  const markUserSearchChange = () => {
    userSearchWriteRef.current = true;
  };
  const [sortBy, setSortBy] = useState(() =>
    normalizeCatalogSortParam(searchParams.get("sort"))
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(() =>
    resolveTypeParam(searchParams.get("type"))
  );
  const [facetFilters, setFacetFilters] = useState(() =>
    parseCatalogFilters(searchParams),
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() =>
    parsePageParam(searchParams)
  );
  const [reportedPage, setReportedPage] = useState(1);
  const visibleTypes = useMemo(() => {
    const ordered = types.map(normalizeCatalogProjectType).filter(Boolean);
    return [...new Set(ordered)].filter((type) =>
      projects.some(
        (project) => normalizeCatalogProjectType(project.type) === type,
      ),
    );
  }, [types, projects]);
  const filterType =
    activeFilter !== ALL_FILTER
      ? activeFilter
      : visibleTypes.length === 1
        ? visibleTypes[0]
        : "";
  const typeFilteredProjects = useMemo(
    () =>
      activeFilter === ALL_FILTER
        ? projects
        : projects.filter(
            (project) =>
              normalizeCatalogProjectType(project.type) === activeFilter,
          ),
    [projects, activeFilter],
  );
  const filterDefinitionsWithOptions = useMemo(
    () =>
      getCatalogFilterDefinitions(filterType).map((definition) => ({
        ...definition,
        fullOptions: getCatalogFilterOptions(definition, typeFilteredProjects),
      })),
    [filterType, typeFilteredProjects],
  );
  const catalogFilterFields = filterDefinitionsWithOptions
    .map((definition) => {
      const contextProjects = filterCatalogProjects(
        typeFilteredProjects,
        filterType,
        facetFilters,
        definition.key,
      );
      const options = keepSelectedCatalogOption(
        getCatalogFilterOptions(definition, contextProjects),
        facetFilters[definition.key],
        definition.fullOptions,
      );
      return { ...definition, options };
    })
    .filter((field) => field.options.length > 1 || facetFilters[field.key]);
  const activeCatalogChips = catalogFilterFields
    .filter((field) => facetFilters[field.key])
    .map((field) => ({
      key: field.key,
      label:
        field.fullOptions.find(
          (option) => option.value === facetFilters[field.key],
        )?.label || facetFilters[field.key],
    }));
  const activeCatalogFilterCount = activeCatalogChips.length;
  const sortOptions = useMemo(
    () => [
      { value: CATALOG_SORT_DEFAULT, label: "По умолчанию" },
      ...(hasUsefulSortValues(typeFilteredProjects, getCatalogSortAreaComparable)
        ? [
            { value: "area-desc", label: "По площади ↓" },
            { value: "area-asc", label: "По площади ↑" },
          ]
        : []),
      ...(hasUsefulSortValues(typeFilteredProjects, getCatalogSortBudgetComparable)
        ? [
            { value: "budget-desc", label: "По бюджету ↓" },
            { value: "budget-asc", label: "По бюджету ↑" },
          ]
        : []),
      ...(hasUsefulSortValues(typeFilteredProjects, getCatalogSortDurationComparable)
        ? [
            { value: "duration-desc", label: "По сроку ↓" },
            { value: "duration-asc", label: "По сроку ↑" },
          ]
        : []),
    ],
    [typeFilteredProjects],
  );

  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (currentSearch === lastWrittenSearchRef.current) return;
    userSearchWriteRef.current = false;
    skipNextSearchWriteRef.current = true;
    const urlType = resolveTypeParam(searchParams.get("type"));
    setActiveFilter((prev) => (prev === urlType ? prev : urlType));
    setCurrentPage((prev) => {
      const urlPage = parsePageParam(searchParams);
      return prev === urlPage ? prev : urlPage;
    });
    setFacetFilters(parseCatalogFilters(searchParams));
  }, [searchParams]);

  // Категории без опубликованных работ не показываем и не сохраняем активными.
  useEffect(() => {
    if (
      isAuthoritative &&
      activeFilter !== ALL_FILTER &&
      !visibleTypes.includes(activeFilter)
    ) {
      setActiveFilter(ALL_FILTER);
      setFacetFilters(EMPTY_CATALOG_FILTERS);
      setCurrentPage(1);
    }
  }, [activeFilter, visibleTypes, isAuthoritative]);

  // Сортировка из URL (назад/вперёд, внешняя ссылка)
  useEffect(() => {
    const urlSort = normalizeCatalogSortParam(searchParams.get("sort"));
    setSortBy((prev) => (prev === urlSort ? prev : urlSort));
  }, [searchParams]);

  useEffect(() => {
    if (
      isAuthoritative &&
      !sortOptions.some((option) => option.value === sortBy)
    ) {
      setSortBy(CATALOG_SORT_DEFAULT);
      setCurrentPage(1);
    }
  }, [isAuthoritative, sortBy, sortOptions]);

  useEffect(() => {
    if (!isAuthoritative) return;
    const sanitized = { ...EMPTY_CATALOG_FILTERS };
    for (const field of filterDefinitionsWithOptions) {
      const selectedValue = facetFilters[field.key];
      if (
        selectedValue &&
        field.fullOptions.some((option) => option.value === selectedValue)
      ) {
        sanitized[field.key] = selectedValue;
      }
    }
    const changed = Object.keys(sanitized).some(
      (key) => sanitized[key] !== facetFilters[key],
    );
    if (changed) {
      setFacetFilters(sanitized);
      setCurrentPage(1);
    }
  }, [
    isAuthoritative,
    facetFilters,
    filterDefinitionsWithOptions,
  ]);

  // Синхронизация URL: type + sort + page (как на /projects), сохраняем ?project= для редиректа
  useEffect(() => {
    const userInitiated = userSearchWriteRef.current;
    if (
      !activeFilter ||
      (!isAuthoritative && !userInitiated)
    ) return;
    userSearchWriteRef.current = false;
    if (skipNextSearchWriteRef.current && !userInitiated) {
      skipNextSearchWriteRef.current = false;
      lastWrittenSearchRef.current = searchParams.toString();
      return;
    }
    skipNextSearchWriteRef.current = false;
    const project = searchParams.get("project");
    const params = buildCatalogSearchParams({
      activeFilter,
      sortBy,
      page: currentPage,
      project,
      facetFilters,
      filterType,
    });
    if (searchParams.toString() === params.toString()) {
      lastWrittenSearchRef.current = params.toString();
      return;
    }
    lastWrittenSearchRef.current = params.toString();
    setSearchParams(params, { replace: true });
  }, [
    activeFilter,
    sortBy,
    currentPage,
    facetFilters,
    filterType,
    isAuthoritative,
    searchParams,
    setSearchParams,
  ]);

  // Редирект со старого URL ?project=ID на /catalog/ID
  useEffect(() => {
    if (!isAuthoritative || projects.length === 0) return;
    const projectId = searchParams.get("project");
    if (projectId && projects.some((p) => p.id === projectId)) {
      const params = new URLSearchParams(searchParams);
      params.delete("project");
      navigate(`/catalog/${projectId}${getSearchSuffix(params)}`, {
        replace: true,
      });
    }
  }, [isAuthoritative, projects, searchParams, navigate]);

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
    let filtered = filterType
      ? filterCatalogProjects(typeFilteredProjects, filterType, facetFilters)
      : typeFilteredProjects;

    const cmp = getCatalogSortComparator(sortBy);
    filtered = [...filtered].sort(cmp);

    return filtered;
  }, [typeFilteredProjects, filterType, facetFilters, sortBy]);

  const removeCatalogFilter = (key) => {
    markUserSearchChange();
    setFacetFilters((current) => ({ ...current, [key]: CATALOG_FILTER_ANY }));
    setCurrentPage(1);
  };

  const resetCatalogFilters = () => {
    markUserSearchChange();
    setFacetFilters(EMPTY_CATALOG_FILTERS);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(
    filteredAndSortedProjects.length / PAGE_SIZE
  );
  const showPagination = totalPages > 1;
  const currentPageSafe = isAuthoritative
    ? Math.min(currentPage, Math.max(totalPages, 1))
    : currentPage;
  useEffect(() => {
    if (currentPage !== currentPageSafe) setCurrentPage(currentPageSafe);
  }, [currentPage, currentPageSafe]);
  const detailSearch = getSearchSuffix(
    buildCatalogSearchParams({
      activeFilter,
      sortBy,
      page: currentPageSafe,
      facetFilters,
      filterType,
    })
  );

  return (
    <>
      <SeoHead
        title="Портфолио"
        description="Наши работы HUSAM — строительство, ремонт и дизайн интерьеров. Реализованные объекты."
      />
      <BreadcrumbsJsonLd
        items={[
          { name: "Главная", path: "/" },
          { name: "Портфолио", path: "/catalog" },
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
                Портфолио
              </li>
            </ol>
          </nav>

          {/* Заголовок */}
          {/* Убран блок "Портфолио" */}

          {/* Sticky фильтры и сортировка */}
          {!isMenuOpen && !loading && (
            <div className="md:sticky md:top-20 z-[60] mb-4 md:mb-8 rounded-lg md:rounded-xl border border-brand/20 bg-ink/95 backdrop-blur-lg p-2 md:p-4 shadow-lg">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:gap-4 md:flex-row md:items-center md:justify-between">
                {/* Вкладки фильтров */}
                <div className="flex flex-wrap gap-1.5 md:gap-3">
                  <button
                    onClick={() => {
                      markUserSearchChange();
                      setActiveFilter(ALL_FILTER);
                      setFacetFilters(EMPTY_CATALOG_FILTERS);
                      setCurrentPage(1);
                    }}
                    className={
                      "rounded-lg md:rounded-xl px-2 py-1 md:px-4 md:py-2.5 text-xs md:text-sm font-medium transition-all " +
                      (activeFilter === ALL_FILTER
                        ? "bg-brand text-ink shadow-lg"
                        : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                    }
                  >
                    Все
                  </button>
                  {visibleTypes.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        markUserSearchChange();
                        setActiveFilter(tab);
                        setFacetFilters(EMPTY_CATALOG_FILTERS);
                        setCurrentPage(1);
                      }}
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
                    onChange={(e) => {
                      markUserSearchChange();
                      setSortBy(normalizeCatalogSortParam(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg md:rounded-xl border border-brand/30 bg-ink px-2 py-1.5 md:px-4 md:py-2.5 text-xs md:text-sm text-white focus:border-brand focus:outline-none"
                    aria-label="Сортировка каталога работ"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                </div>

                {catalogFilterFields.length > 0 && (
                  <div className="border-t border-brand/20 pt-2.5">
                    <div className="mb-2 md:hidden">
                      <button
                        type="button"
                        onClick={() => setMobileFiltersOpen((open) => !open)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brand/35 bg-ink/90 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-brand/55 hover:bg-brand/5 hover:text-white"
                        aria-expanded={mobileFiltersOpen}
                        aria-controls="catalog-facet-filters"
                      >
                        <Icon
                          name={mobileFiltersOpen ? "chevron-up" : "sliders-horizontal"}
                          className="h-3.5 w-3.5 text-brand"
                          aria-hidden
                        />
                        {mobileFiltersOpen
                          ? `Скрыть фильтры · ${activeCatalogFilterCount}`
                          : `Фильтры · ${activeCatalogFilterCount}`}
                      </button>
                    </div>

                    <div
                      id="catalog-facet-filters"
                      onChangeCapture={markUserSearchChange}
                      className={`${mobileFiltersOpen ? "grid" : "hidden"} grid-cols-2 gap-2.5 md:grid md:grid-cols-3`}
                    >
                      {catalogFilterFields.map((field) => (
                        <div key={field.key}>
                          <label
                            htmlFor={`catalog-filter-${field.key}`}
                            className="mb-1 block text-xs text-gray-400"
                          >
                            {field.label}
                          </label>
                          <select
                            id={`catalog-filter-${field.key}`}
                            value={facetFilters[field.key]}
                            onChange={(event) => {
                              setFacetFilters((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }));
                              setCurrentPage(1);
                            }}
                            className="w-full rounded-lg border border-brand/30 bg-ink px-3 py-2 text-xs text-white focus:border-brand focus:outline-none sm:text-sm"
                          >
                            {field.options.map((option) => (
                              <option key={option.value || "any"} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && activeCatalogChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Активные фильтры портфолио">
              {activeCatalogChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeCatalogFilter(chip.key)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/35 bg-brand/10 px-3 py-1 text-xs font-medium text-brand transition hover:border-brand hover:bg-brand/20"
                  aria-label={`Удалить фильтр ${chip.label}`}
                >
                  {chip.label}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={resetCatalogFilters}
                className="min-h-8 px-2 text-xs font-medium text-gray-400 transition hover:text-white"
              >
                Сбросить всё
              </button>
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
              filteredAndSortedProjects={filteredAndSortedProjects}
              pageSize={PAGE_SIZE}
              page={currentPageSafe}
              onPageChange={(page) => {
                markUserSearchChange();
                setCurrentPage(page);
              }}
              onPageReport={setReportedPage}
              detailSearch={detailSearch}
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
