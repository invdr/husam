import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Icon, Pagination } from "@/components/common";
import { SaleProjectCard, SaleProjectCardSkeleton } from "@/components/sale";
import SeoHead from "@/components/common/SeoHead";
import { BreadcrumbsJsonLd } from "@/components/common/JsonLd";
import { openMessenger } from "@/utils/messenger";
import { GOALS } from "@/lib/analytics";
import { useSaleProjects } from "@/hooks/useSaleProjects";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  toComparableNumber,
  FILTER_ANY,
  getFilterMaterialsFromProjects,
  getFilterAreaRangesFromProjects,
  getFilterFloorsFromProjects,
  getFilterRoomsFromProjects,
  getFilterPriceRangesFromProjects,
  matchAreaFilter,
  matchFloorsFilter,
  matchRoomsFilter,
  matchPriceFilter,
  matchMaterialFilter,
  compareSaleProjectPrice,
  SALE_PROJECT_CUSTOM_FIELDS_KEY,
  parseSaleProjectCustomFields,
} from "@/utils/saleProjectAttributes";

const ALL_FILTER = "Все";
const PAGE_SIZE = 12;
const PROJECT_SORT_VALUES = new Set([
  "default",
  "price-asc",
  "price-desc",
  "area-desc",
]);
const EMPTY_FACET_FILTERS = {
  material: FILTER_ANY,
  area: FILTER_ANY,
  floors: FILTER_ANY,
  rooms: FILTER_ANY,
  price: FILTER_ANY,
  garage: false,
  canopy: false,
  basement: false,
};

function filterByFacets(projects, filters, ignoredKey = "") {
  return projects.filter(
    (project) =>
      (ignoredKey === "material" || matchMaterialFilter(project, filters.material)) &&
      (ignoredKey === "area" || matchAreaFilter(project, filters.area)) &&
      (ignoredKey === "floors" || matchFloorsFilter(project, filters.floors)) &&
      (ignoredKey === "rooms" || matchRoomsFilter(project, filters.rooms)) &&
      (ignoredKey === "price" || matchPriceFilter(project, filters.price)) &&
      (ignoredKey === "garage" || !filters.garage || project.hasGarage) &&
      (ignoredKey === "canopy" || !filters.canopy || project.hasCanopy) &&
      (ignoredKey === "basement" || !filters.basement || project.hasBasement),
  );
}

function keepSelectedOption(options, selectedValue, fullOptions) {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) {
    return options;
  }
  const selected = fullOptions.find((option) => option.value === selectedValue);
  return selected ? [...options, selected] : options;
}

function hasUsefulProjectValues(projects, getter) {
  const values = new Set(projects.map(getter).filter((value) => value > 0));
  return values.size > 1;
}

function parseControlsFromSearchParams(searchParams) {
  const type = searchParams.get("type");
  const activeFilter = !type || type === "all" ? ALL_FILTER : type;
  const rawSort = searchParams.get("sort") || "default";
  const sortBy = PROJECT_SORT_VALUES.has(rawSort) ? rawSort : "default";
  return { activeFilter, sortBy };
}

function parseFacetFiltersFromSearchParams(searchParams) {
  return {
    material: searchParams.get("material") ?? FILTER_ANY,
    area: searchParams.get("area") ?? FILTER_ANY,
    floors: searchParams.get("floors") ?? FILTER_ANY,
    rooms: searchParams.get("rooms") ?? FILTER_ANY,
    price: searchParams.get("price") ?? FILTER_ANY,
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
  if (facetFilters.price) params.price = facetFilters.price;
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
  const {
    projects,
    types = [],
    loading,
    isAuthoritative = !loading,
    error,
  } = useSaleProjects();
  const { settings } = useSiteSettings();
  const customFieldDefs = parseSaleProjectCustomFields(settings[SALE_PROJECT_CUSTOM_FIELDS_KEY]);
  const [searchParams, setSearchParams] = useSearchParams();
  const lastWrittenSearchRef = useRef(searchParams.toString());
  const skipNextSearchWriteRef = useRef(false);
  const userSearchWriteRef = useRef(false);
  const markUserSearchChange = () => {
    userSearchWriteRef.current = true;
  };
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

    userSearchWriteRef.current = false;
    skipNextSearchWriteRef.current = true;
    setControls(parseControlsFromSearchParams(searchParams));
    setFacetFilters(parseFacetFiltersFromSearchParams(searchParams));
    setCurrentPage(parsePageParam(searchParams));
  }, [searchParams]);

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
    isAuthoritative,
  ]);

  const visibleTypes = useMemo(() => {
    return [...new Set(types.filter(Boolean))].filter((type) =>
      projects.some((project) => project.type === type),
    );
  }, [types, projects]);

  useEffect(() => {
    if (
      isAuthoritative &&
      activeFilter !== ALL_FILTER &&
      !visibleTypes.includes(activeFilter)
    ) {
      setControls((current) => ({ ...current, activeFilter: ALL_FILTER }));
      setFacetFilters(EMPTY_FACET_FILTERS);
      setCurrentPage(1);
    }
  }, [activeFilter, visibleTypes, isAuthoritative]);

  const typeFilteredProjects = useMemo(
    () =>
      activeFilter === ALL_FILTER
        ? projects
        : projects.filter((project) => project.type === activeFilter),
    [projects, activeFilter],
  );
  const sortOptions = useMemo(
    () => [
      { value: "default", label: "По умолчанию" },
      ...(hasUsefulProjectValues(typeFilteredProjects, (project) =>
        toComparableNumber(project.price),
      )
        ? [
            { value: "price-asc", label: "Сначала дешевле" },
            { value: "price-desc", label: "Сначала дороже" },
          ]
        : []),
      ...(hasUsefulProjectValues(typeFilteredProjects, (project) =>
        toComparableNumber(project.house_area ?? project.area),
      )
        ? [{ value: "area-desc", label: "По площади ↓" }]
        : []),
    ],
    [typeFilteredProjects],
  );

  useEffect(() => {
    if (
      isAuthoritative &&
      !sortOptions.some((option) => option.value === sortBy)
    ) {
      setControls((current) => ({ ...current, sortBy: "default" }));
      setCurrentPage(1);
    }
  }, [isAuthoritative, sortBy, sortOptions]);

  const fullFilterMaterials = useMemo(
    () => getFilterMaterialsFromProjects(typeFilteredProjects),
    [typeFilteredProjects],
  );
  const fullFilterAreaRanges = useMemo(
    () => getFilterAreaRangesFromProjects(typeFilteredProjects),
    [typeFilteredProjects],
  );
  const fullFilterFloorsOptions = useMemo(
    () => getFilterFloorsFromProjects(typeFilteredProjects),
    [typeFilteredProjects],
  );
  const fullFilterRoomsOptions = useMemo(
    () => getFilterRoomsFromProjects(typeFilteredProjects),
    [typeFilteredProjects],
  );
  const fullFilterPriceRanges = useMemo(
    () => getFilterPriceRangesFromProjects(typeFilteredProjects),
    [typeFilteredProjects],
  );

  useEffect(() => {
    if (!isAuthoritative) return;
    const validValue = (options, value) =>
      !value || options.some((option) => option.value === value);
    const sanitized = {
      material: validValue(fullFilterMaterials, facetFilters.material)
        ? facetFilters.material
        : FILTER_ANY,
      area: validValue(fullFilterAreaRanges, facetFilters.area)
        ? facetFilters.area
        : FILTER_ANY,
      floors: validValue(fullFilterFloorsOptions, facetFilters.floors)
        ? facetFilters.floors
        : FILTER_ANY,
      rooms: validValue(fullFilterRoomsOptions, facetFilters.rooms)
        ? facetFilters.rooms
        : FILTER_ANY,
      price: validValue(fullFilterPriceRanges, facetFilters.price)
        ? facetFilters.price
        : FILTER_ANY,
      garage:
        facetFilters.garage &&
        typeFilteredProjects.some((project) => project.hasGarage),
      canopy:
        facetFilters.canopy &&
        typeFilteredProjects.some((project) => project.hasCanopy),
      basement:
        facetFilters.basement &&
        typeFilteredProjects.some((project) => project.hasBasement),
    };
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
    fullFilterMaterials,
    fullFilterAreaRanges,
    fullFilterFloorsOptions,
    fullFilterRoomsOptions,
    fullFilterPriceRanges,
    typeFilteredProjects,
  ]);

  const filterMaterials = keepSelectedOption(
    getFilterMaterialsFromProjects(filterByFacets(typeFilteredProjects, facetFilters, "material")),
    facetFilters.material,
    fullFilterMaterials,
  );
  const filterAreaRanges = keepSelectedOption(
    getFilterAreaRangesFromProjects(filterByFacets(typeFilteredProjects, facetFilters, "area")),
    facetFilters.area,
    fullFilterAreaRanges,
  );
  const filterFloorsOptions = keepSelectedOption(
    getFilterFloorsFromProjects(filterByFacets(typeFilteredProjects, facetFilters, "floors")),
    facetFilters.floors,
    fullFilterFloorsOptions,
  );
  const filterRoomsOptions = keepSelectedOption(
    getFilterRoomsFromProjects(filterByFacets(typeFilteredProjects, facetFilters, "rooms")),
    facetFilters.rooms,
    fullFilterRoomsOptions,
  );
  const filterPriceRanges = keepSelectedOption(
    getFilterPriceRangesFromProjects(filterByFacets(typeFilteredProjects, facetFilters, "price")),
    facetFilters.price,
    fullFilterPriceRanges,
  );

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = filterByFacets(typeFilteredProjects, facetFilters);

    if (sortBy === "default") {
      filtered = [...filtered];
    } else if (sortBy === "price-asc") {
      filtered = [...filtered].sort((a, b) => compareSaleProjectPrice(a, b, "asc"));
    } else if (sortBy === "price-desc") {
      filtered = [...filtered].sort((a, b) => compareSaleProjectPrice(a, b, "desc"));
    } else if (sortBy === "area-desc") {
      filtered = [...filtered].sort(
        (a, b) =>
          toComparableNumber(b.house_area ?? b.area) -
          toComparableNumber(a.house_area ?? a.area),
      );
    }

    return filtered;
  }, [
    typeFilteredProjects,
    sortBy,
    facetFilters,
  ]);

  const activeFacetCount = Object.entries(facetFilters).filter(([, value]) =>
    typeof value === "boolean" ? value : value !== FILTER_ANY,
  ).length;
  const optionLabel = (options, value) =>
    options.find((option) => option.value === value)?.label || value;
  const activeFilterChips = [
    ...(activeFilter !== ALL_FILTER
      ? [{ key: "type", label: activeFilter }]
      : []),
    ...(facetFilters.price
      ? [{ key: "price", label: optionLabel(fullFilterPriceRanges, facetFilters.price) }]
      : []),
    ...(facetFilters.material
      ? [{ key: "material", label: facetFilters.material }]
      : []),
    ...(facetFilters.area
      ? [{ key: "area", label: optionLabel(fullFilterAreaRanges, facetFilters.area) }]
      : []),
    ...(facetFilters.floors
      ? [{ key: "floors", label: optionLabel(fullFilterFloorsOptions, facetFilters.floors) }]
      : []),
    ...(facetFilters.rooms
      ? [{ key: "rooms", label: `Спальни: ${optionLabel(fullFilterRoomsOptions, facetFilters.rooms)}` }]
      : []),
    ...(facetFilters.garage ? [{ key: "garage", label: "С гаражом" }] : []),
    ...(facetFilters.canopy ? [{ key: "canopy", label: "С навесом" }] : []),
    ...(facetFilters.basement ? [{ key: "basement", label: "С подвалом" }] : []),
  ];

  const resetAllFilters = () => {
    markUserSearchChange();
    setControls((current) => ({ ...current, activeFilter: ALL_FILTER }));
    setFacetFilters(EMPTY_FACET_FILTERS);
    setCurrentPage(1);
  };

  const removeFilterChip = (key) => {
    markUserSearchChange();
    if (key === "type") {
      setControls((current) => ({ ...current, activeFilter: ALL_FILTER }));
    } else {
      setFacetFilters((current) => ({
        ...current,
        [key]: typeof current[key] === "boolean" ? false : FILTER_ANY,
      }));
    }
    setCurrentPage(1);
  };
  const garageAvailable =
    facetFilters.garage ||
    filterByFacets(typeFilteredProjects, facetFilters, "garage").some(
      (project) => project.hasGarage,
    );
  const canopyAvailable =
    facetFilters.canopy ||
    filterByFacets(typeFilteredProjects, facetFilters, "canopy").some(
      (project) => project.hasCanopy,
    );
  const basementAvailable =
    facetFilters.basement ||
    filterByFacets(typeFilteredProjects, facetFilters, "basement").some(
      (project) => project.hasBasement,
    );
  const hasAvailableFacetFilters =
    filterPriceRanges.length > 1 ||
    filterMaterials.length > 1 ||
    filterAreaRanges.length > 1 ||
    filterFloorsOptions.length > 1 ||
    filterRoomsOptions.length > 1 ||
    garageAvailable ||
    canopyAvailable ||
    basementAvailable;

  const totalPages = Math.ceil(filteredAndSortedProjects.length / PAGE_SIZE);
  const currentPageSafe = isAuthoritative
    ? Math.min(currentPage, Math.max(totalPages, 1))
    : currentPage;
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
                        markUserSearchChange();
                        setControls((c) => ({ ...c, activeFilter: ALL_FILTER }));
                        setFacetFilters(EMPTY_FACET_FILTERS);
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
                    {visibleTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          markUserSearchChange();
                          setControls((c) => ({ ...c, activeFilter: type }));
                          setFacetFilters(EMPTY_FACET_FILTERS);
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
                          markUserSearchChange();
                          setControls((c) => ({
                            ...c,
                            sortBy: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="max-w-[11rem] cursor-pointer appearance-none rounded-lg border border-brand/35 bg-ink/90 py-1.5 pl-3 pr-8 text-xs font-medium text-white shadow-sm transition-colors hover:border-brand/55 hover:bg-brand/5 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:max-w-none"
                        aria-label="Сортировка списка проектов"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Icon
                        name="chevron-down"
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand/65"
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>

                {hasAvailableFacetFilters && <div className="border-t border-brand/20 pt-2.5">
                  <div className="md:hidden mb-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileAdvancedFiltersOpen((prev) => !prev)
                      }
                      className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border border-brand/35 bg-ink/90 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-brand/55 hover:bg-brand/5 hover:text-white"
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
                          ? `Скрыть фильтры · ${activeFacetCount}`
                          : `Фильтры · ${activeFacetCount}`}
                      </span>
                    </button>
                  </div>

                  <div
                    id="projects-advanced-filters"
                    onChangeCapture={markUserSearchChange}
                    className={mobileAdvancedFiltersOpen ? "block md:block" : "hidden md:block"}
                  >
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    {filterPriceRanges.length > 1 && <div>
                      <label htmlFor="projects-filter-price" className="mb-1 block text-xs text-gray-400">
                        Стоимость
                      </label>
                      <select
                        id="projects-filter-price"
                        value={facetFilters.price}
                        onChange={(e) => {
                          setFacetFilters((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-brand/30 bg-ink px-3 py-2 text-xs sm:text-sm text-white focus:border-brand focus:outline-none"
                      >
                        {filterPriceRanges.map(({ value, label }) => (
                          <option key={value || "any"} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>}
                    {filterMaterials.length > 1 && <div>
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
                    </div>}
                    {filterAreaRanges.length > 1 && <div>
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
                    </div>}
                    {filterFloorsOptions.length > 1 && <div>
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
                    </div>}
                    {filterRoomsOptions.length > 1 && <div>
                      <label htmlFor="projects-filter-rooms" className="mb-1 block text-xs text-gray-400">
                        Спальни
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
                    </div>}
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3 text-xs md:text-sm text-gray-300">
                    {garageAvailable && <label className="inline-flex items-center gap-2">
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
                    </label>}
                    {canopyAvailable && <label className="inline-flex items-center gap-2">
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
                    </label>}
                    {basementAvailable && <label className="inline-flex items-center gap-2">
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
                    </label>}
                  </div>
                  </div>
                </div>}
              </div>
            </div>
          )}

          {!loading && activeFilterChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Активные фильтры">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeFilterChip(chip.key)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/35 bg-brand/10 px-3 py-1 text-xs font-medium text-brand transition hover:border-brand hover:bg-brand/20"
                  aria-label={`Удалить фильтр ${chip.label}`}
                >
                  {chip.label}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-8 px-2 text-xs font-medium text-gray-400 transition hover:text-white"
              >
                Сбросить всё
              </button>
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
                      markUserSearchChange();
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
                  markUserSearchChange();
                  setControls((c) => ({
                    ...c,
                    activeFilter: ALL_FILTER,
                    sortBy: "default",
                  }));
                  setFacetFilters(EMPTY_FACET_FILTERS);
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
