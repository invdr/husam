import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Icon, Pagination } from "@/components/common";
import { SaleProjectCard, SaleProjectCardSkeleton } from "@/components/sale";
import SeoHead from "@/components/common/SeoHead";
import { BreadcrumbsJsonLd } from "@/components/common/JsonLd";
import { openMessenger } from "@/utils/messenger";
import { GOALS } from "@/lib/analytics";
import { useSaleProjects } from "@/hooks/useSaleProjects";
import { useSaleProjectTypes } from "@/hooks/useSaleProjectTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  toComparableNumber,
  FILTER_ANY,
  getFilterMaterialsFromProjects,
  getFilterAreaRangesFromProjects,
  getFilterFloorsFromProjects,
  getFilterRoomsFromProjects,
  matchAreaFilter,
  matchFloorsFilter,
  matchRoomsFilter,
  matchMaterialFilter,
  compareSaleProjectPrice,
  SALE_PROJECT_CUSTOM_FIELDS_KEY,
  parseSaleProjectCustomFields,
} from "@/utils/saleProjectAttributes";

const ALL_FILTER = "Все";
const PAGE_SIZE = 12;

function parseControlsFromSearchParams(searchParams) {
  const type = searchParams.get("type");
  const activeFilter = !type || type === "all" ? ALL_FILTER : type;
  const sortBy = searchParams.get("sort") || "default";
  return { activeFilter, sortBy };
}

function parseFacetFiltersFromSearchParams(searchParams) {
  return {
    material: searchParams.get("material") ?? FILTER_ANY,
    area: searchParams.get("area") ?? FILTER_ANY,
    floors: searchParams.get("floors") ?? FILTER_ANY,
    rooms: searchParams.get("rooms") ?? FILTER_ANY,
    garage: searchParams.get("garage") === "1",
    canopy: searchParams.get("canopy") === "1",
    basement: searchParams.get("basement") === "1",
  };
}

function parsePageParam(searchParams) {
  const pageParam = searchParams.get("page");
  if (!pageParam || !/^\d+$/.test(pageParam)) return 1;

  const page = Number(pageParam);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function buildProjectsSearchParams(controls, facetFilters, page = 1) {
  const params = {
    type: controls.activeFilter === ALL_FILTER ? "all" : controls.activeFilter,
    sort: controls.sortBy,
  };
  if (facetFilters.material) params.material = facetFilters.material;
  if (facetFilters.area) params.area = facetFilters.area;
  if (facetFilters.floors) params.floors = facetFilters.floors;
  if (facetFilters.rooms) params.rooms = facetFilters.rooms;
  if (facetFilters.garage) params.garage = "1";
  if (facetFilters.canopy) params.canopy = "1";
  if (facetFilters.basement) params.basement = "1";
  if (page > 1) params.page = String(page);
  return params;
}

function paramsToString(params) {
  return new URLSearchParams(params).toString();
}

export default function Projects() {
  const { projects, loading, error } = useSaleProjects();
  const { types } = useSaleProjectTypes();
  const { settings } = useSiteSettings();
  const customFieldDefs = parseSaleProjectCustomFields(settings[SALE_PROJECT_CUSTOM_FIELDS_KEY]);
  const [searchParams, setSearchParams] = useSearchParams();
  const lastWrittenSearchRef = useRef(searchParams.toString());
  const skipNextSearchWriteRef = useRef(false);
  const [controls, setControls] = useState(() =>
    parseControlsFromSearchParams(searchParams)
  );
  const { activeFilter, sortBy } = controls;
  const [facetFilters, setFacetFilters] = useState(() =>
    parseFacetFiltersFromSearchParams(searchParams)
  );
  const [mobileAdvancedFiltersOpen, setMobileAdvancedFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() =>
    parsePageParam(searchParams)
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const current = searchParams.toString();
    if (current === lastWrittenSearchRef.current) return;

    skipNextSearchWriteRef.current = true;
    setControls(parseControlsFromSearchParams(searchParams));
    setFacetFilters(parseFacetFiltersFromSearchParams(searchParams));
    setCurrentPage(parsePageParam(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (!activeFilter) return;
    if (skipNextSearchWriteRef.current) {
      skipNextSearchWriteRef.current = false;
      lastWrittenSearchRef.current = searchParams.toString();
      return;
    }

    const params = buildProjectsSearchParams(
      controls,
      facetFilters,
      currentPage,
    );
    const nextSearch = paramsToString(params);
    if (searchParams.toString() === nextSearch) {
      lastWrittenSearchRef.current = nextSearch;
      return;
    }
    lastWrittenSearchRef.current = nextSearch;
    setSearchParams(params, { replace: true });
  }, [
    controls,
    activeFilter,
    facetFilters,
    currentPage,
    searchParams,
    setSearchParams,
  ]);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered =
      activeFilter === ALL_FILTER
        ? [...projects]
        : projects.filter((project) => project.type === activeFilter);

    filtered = filtered.filter(
      (p) =>
        matchMaterialFilter(p, facetFilters.material) &&
        matchAreaFilter(p, facetFilters.area) &&
        matchFloorsFilter(p, facetFilters.floors) &&
        matchRoomsFilter(p, facetFilters.rooms) &&
        (!facetFilters.garage || p.hasGarage) &&
        (!facetFilters.canopy || p.hasCanopy) &&
        (!facetFilters.basement || p.hasBasement),
    );

    if (sortBy === "default") {
      filtered = [...filtered];
    } else if (sortBy === "price-asc") {
      filtered = [...filtered].sort((a, b) => compareSaleProjectPrice(a, b, "asc"));
    } else if (sortBy === "price-desc") {
      filtered = [...filtered].sort((a, b) => compareSaleProjectPrice(a, b, "desc"));
    } else if (sortBy === "area-desc") {
      filtered = [...filtered].sort(
        (a, b) => toComparableNumber(b.area) - toComparableNumber(a.area),
      );
    }

    return filtered;
  }, [
    projects,
    activeFilter,
    sortBy,
    facetFilters,
  ]);

  const filterMaterials = useMemo(
    () => getFilterMaterialsFromProjects(projects),
    [projects],
  );
  const filterAreaRanges = useMemo(
    () => getFilterAreaRangesFromProjects(projects),
    [projects],
  );
  const filterFloorsOptions = useMemo(
    () => getFilterFloorsFromProjects(projects),
    [projects],
  );
  const filterRoomsOptions = useMemo(
    () => getFilterRoomsFromProjects(projects),
    [projects],
  );
  const hasActiveAdvancedFilters =
    facetFilters.material !== FILTER_ANY ||
    facetFilters.area !== FILTER_ANY ||
    facetFilters.floors !== FILTER_ANY ||
    facetFilters.rooms !== FILTER_ANY ||
    facetFilters.garage ||
    facetFilters.canopy ||
    facetFilters.basement;

  const totalPages = Math.ceil(filteredAndSortedProjects.length / PAGE_SIZE);
  const currentPageSafe = Math.min(currentPage, Math.max(totalPages, 1));
  const showPagination = totalPages > 1;
  const paginatedProjects = showPagination
    ? filteredAndSortedProjects.slice(
        (currentPageSafe - 1) * PAGE_SIZE,
        currentPageSafe * PAGE_SIZE,
      )
    : filteredAndSortedProjects;
  const detailSearch = paramsToString(
    buildProjectsSearchParams(controls, facetFilters, currentPageSafe),
  );
  const detailSearchSuffix = detailSearch ? `?${detailSearch}` : "";

  useEffect(() => {
    if (currentPage !== currentPageSafe) setCurrentPage(currentPageSafe);
  }, [currentPage, currentPageSafe]);

  return (
    <>
      <SeoHead
        title="Готовые проекты на продажу"
        description="Каталог готовых проектов HUSAM: с фильтрами, ценами и быстрым запросом на консультацию."
      />
      <BreadcrumbsJsonLd
        items={[
          { name: "Главная", path: "/" },
          { name: "Проекты", path: "/projects" },
        ]}
      />

      <section className="min-h-screen bg-[#2A2A28]/30 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="container mx-auto px-6 md:px-10 lg:px-12">
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
              <li className="text-white font-medium">Проекты</li>
            </ol>
          </nav>

          <div className="mb-10 text-center md:mb-12">
            <Badge>Готовые проекты</Badge>
            <h1 className="mt-4 font-play text-3xl font-bold text-white md:text-4xl">
              Готовые проекты на продажу
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-400 md:text-base">
              Выбирайте проект по площади, бюджету и типу. Подскажем
              комплектацию и сроки реализации под ваш участок.
            </p>
          </div>

          {!loading && (
            <div className="z-[60] mb-3 md:mb-6 rounded-lg border border-brand/20 bg-ink/95 backdrop-blur-lg p-2 md:p-3 shadow-lg">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5 md:gap-3 md:flex-row md:items-center md:justify-between">
                  <div
                    className="-mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x md:mx-0 md:flex-wrap md:gap-2.5 md:overflow-visible md:px-0 md:pb-0 md:snap-none md:touch-auto"
                    role="group"
                    aria-label="Тип проекта"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setControls((c) => ({ ...c, activeFilter: ALL_FILTER }));
                        setCurrentPage(1);
                      }}
                      className={
                        "shrink-0 snap-start rounded-lg px-2 py-1 md:px-4 md:py-2.5 text-xs md:text-sm font-medium transition-all " +
                        (activeFilter === ALL_FILTER
                          ? "bg-brand text-ink shadow-lg"
                          : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                      }
                    >
                      Все
                    </button>
                    {types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setControls((c) => ({ ...c, activeFilter: type }));
                          setCurrentPage(1);
                        }}
                        className={
                          "shrink-0 snap-start rounded-lg px-2 py-1 md:px-4 md:py-2.5 text-xs md:text-sm font-medium transition-all " +
                          (activeFilter === type
                            ? "bg-brand text-ink shadow-lg"
                            : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                        }
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
                    <div className="relative shrink-0">
                      <label htmlFor="projects-sort" className="sr-only">
                        Сортировка
                      </label>
                      <select
                        id="projects-sort"
                        value={sortBy}
                        onChange={(e) => {
                          setControls((c) => ({
                            ...c,
                            sortBy: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="max-w-[11rem] cursor-pointer appearance-none rounded-lg border border-brand/35 bg-ink/90 py-1.5 pl-3 pr-8 text-xs font-medium text-white shadow-sm transition-colors hover:border-brand/55 hover:bg-brand/5 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:max-w-none"
                        aria-label="Сортировка списка проектов"
                      >
                        <option value="default">По умолчанию</option>
                        <option value="price-asc">Сначала дешевле</option>
                        <option value="price-desc">Сначала дороже</option>
                        <option value="area-desc">По площади ↓</option>
                      </select>
                      <Icon
                        name="chevron-down"
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand/65"
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-brand/20 pt-2.5">
                  <div className="md:hidden mb-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileAdvancedFiltersOpen((prev) => !prev)
                      }
                      className="inline-flex max-w-full items-center gap-1 rounded-lg border border-brand/25 bg-ink/90 py-0.5 pl-2 pr-1.5 text-[11px] font-medium leading-tight text-gray-300 transition-colors hover:border-brand/45 hover:bg-brand/5 hover:text-white"
                      aria-expanded={mobileAdvancedFiltersOpen}
                      aria-controls="projects-advanced-filters"
                    >
                      <Icon
                        name={
                          mobileAdvancedFiltersOpen
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        className="h-3 w-3 shrink-0 text-brand/70"
                        aria-hidden
                      />
                      <span>
                        {mobileAdvancedFiltersOpen
                          ? "Скрыть"
                          : "Ещё фильтры"}
                      </span>
                      {hasActiveAdvancedFilters && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                          title="Есть активные доп. фильтры"
                        />
                      )}
                    </button>
                  </div>

                  <div
                    id="projects-advanced-filters"
                    className={mobileAdvancedFiltersOpen ? "block md:block" : "hidden md:block"}
                  >
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div>
                      <label htmlFor="projects-filter-material" className="mb-1 block text-xs text-gray-400">
                        Стеновой материал
                      </label>
                      <select
                        id="projects-filter-material"
                        value={facetFilters.material}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            material: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-brand/30 bg-ink px-3 py-2 text-xs sm:text-sm text-white focus:border-brand focus:outline-none"
                      >
                        {filterMaterials.map(({ value, label }) => (
                          <option key={value || "any"} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="projects-filter-area" className="mb-1 block text-xs text-gray-400">
                        Площадь
                      </label>
                      <select
                        id="projects-filter-area"
                        value={facetFilters.area}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            area: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-brand/30 bg-ink px-3 py-2 text-xs sm:text-sm text-white focus:border-brand focus:outline-none"
                      >
                        {filterAreaRanges.map(({ value, label }) => (
                          <option key={value || "any"} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="projects-filter-floors" className="mb-1 block text-xs text-gray-400">
                        Этажи
                      </label>
                      <select
                        id="projects-filter-floors"
                        value={facetFilters.floors}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            floors: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-brand/30 bg-ink px-3 py-2 text-xs sm:text-sm text-white focus:border-brand focus:outline-none"
                      >
                        {filterFloorsOptions.map(({ value, label }) => (
                          <option key={value || "any"} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="projects-filter-rooms" className="mb-1 block text-xs text-gray-400">
                        Комнаты
                      </label>
                      <select
                        id="projects-filter-rooms"
                        value={facetFilters.rooms}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            rooms: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-brand/30 bg-ink px-3 py-2 text-xs sm:text-sm text-white focus:border-brand focus:outline-none"
                      >
                        {filterRoomsOptions.map(({ value, label }) => (
                          <option key={value || "any"} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3 text-xs md:text-sm text-gray-300">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={facetFilters.garage}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            garage: e.target.checked,
                          }));
                          setCurrentPage(1);
                        }}
                        className="h-4 w-4 rounded border-brand/40 bg-ink text-brand focus:ring-brand/40"
                      />
                      <span>С гаражом</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={facetFilters.canopy}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            canopy: e.target.checked,
                          }));
                          setCurrentPage(1);
                        }}
                        className="h-4 w-4 rounded border-brand/40 bg-ink text-brand focus:ring-brand/40"
                      />
                      <span>С навесом</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={facetFilters.basement}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            basement: e.target.checked,
                          }));
                          setCurrentPage(1);
                        }}
                        className="h-4 w-4 rounded border-brand/40 bg-ink text-brand focus:ring-brand/40"
                      />
                      <span>С подвалом</span>
                    </label>
                  </div>

                  {hasActiveAdvancedFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setFacetFilters({
                          material: FILTER_ANY,
                          area: FILTER_ANY,
                          floors: FILTER_ANY,
                          rooms: FILTER_ANY,
                          garage: false,
                          canopy: false,
                          basement: false,
                        });
                        setCurrentPage(1);
                      }}
                      className="mt-2.5 text-xs text-gray-400 hover:text-brand transition-colors"
                    >
                      Сбросить фильтры
                    </button>
                  )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && !loading ? (
            <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Не удалось загрузить данные готовых проектов. Проверьте коллекцию
              `sale_projects` в PocketBase.
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SaleProjectCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          ) : filteredAndSortedProjects.length > 0 ? (
            <>
              <div className="mb-4 text-xs text-gray-400 md:text-sm">
                Найдено:{" "}
                <span className="font-semibold text-brand">
                  {filteredAndSortedProjects.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-2xl"
                  >
                    <SaleProjectCard
                      project={project}
                      titleHref={`/projects/${project.id}${detailSearchSuffix}`}
                      customFieldDefs={customFieldDefs}
                      onRequestClick={(selectedProject) =>
                        openMessenger(
                          `Интересует готовый проект ${selectedProject.id} — "${selectedProject.title}"`,
                          undefined,
                          {
                            goal: GOALS.PROJECT_CTA_CLICK,
                            context: {
                              form: "Карточка готового проекта",
                              projectId: selectedProject.id,
                              projectTitle: selectedProject.title,
                              service: selectedProject.type,
                            },
                          },
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              {showPagination && (
                <div className="mt-10">
                  <Pagination
                    page={currentPageSafe}
                    totalPages={totalPages}
                    onPageChange={(nextPage) => {
                      setCurrentPage(nextPage);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <Icon
                name="folder-x"
                className="mx-auto mb-4 h-16 w-16 text-gray-500"
              />
              <p className="text-lg text-gray-300">
                По выбранным параметрам проектов не найдено
              </p>
              <button
                type="button"
                onClick={() => {
                  setControls((c) => ({
                    ...c,
                    activeFilter: ALL_FILTER,
                    sortBy: "default",
                  }));
                  setFacetFilters({
                    material: FILTER_ANY,
                    area: FILTER_ANY,
                    floors: FILTER_ANY,
                    rooms: FILTER_ANY,
                    garage: false,
                    canopy: false,
                    basement: false,
                  });
                  setCurrentPage(1);
                }}
                className="mt-4 rounded-xl border border-brand px-4 py-2 text-sm text-brand transition-colors hover:bg-brand hover:text-ink"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
