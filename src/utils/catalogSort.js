import {
  getCatalogSortAreaComparable,
  getCatalogSortBudgetComparable,
  getCatalogSortDurationComparable,
} from "./catalogAttributes.js";

export const CATALOG_SORT_DEFAULT = "default";

/** Значения `?sort=` и `<select>` (в духе страницы Projects). */
export const CATALOG_SORT_VALUES = [
  CATALOG_SORT_DEFAULT,
  "area-desc",
  "area-asc",
  "budget-desc",
  "budget-asc",
  "duration-desc",
  "duration-asc",
];

const LEGACY_SORT = {
  area: "area-desc",
  budget: "budget-desc",
  duration: "duration-asc",
};

/**
 * Нормализует параметр сортировки из URL (в т.ч. старые значения area/budget/duration).
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function normalizeCatalogSortParam(raw) {
  if (raw == null || raw === "" || raw === CATALOG_SORT_DEFAULT) {
    return CATALOG_SORT_DEFAULT;
  }
  if (typeof raw === "string" && raw in LEGACY_SORT) {
    return LEGACY_SORT[raw];
  }
  return CATALOG_SORT_VALUES.includes(raw) ? raw : CATALOG_SORT_DEFAULT;
}

/**
 * Компаратор для Array.sort по выбранному режиму каталога.
 * @param {string} sortBy
 * @returns {(a: object, b: object) => number}
 */
export function getCatalogSortComparator(sortBy) {
  if (sortBy === CATALOG_SORT_DEFAULT) {
    return () => 0;
  }
  if (sortBy === "area-desc") {
    return (a, b) =>
      getCatalogSortAreaComparable(b) - getCatalogSortAreaComparable(a);
  }
  if (sortBy === "area-asc") {
    return (a, b) =>
      getCatalogSortAreaComparable(a) - getCatalogSortAreaComparable(b);
  }
  if (sortBy === "budget-desc") {
    return (a, b) =>
      getCatalogSortBudgetComparable(b) - getCatalogSortBudgetComparable(a);
  }
  if (sortBy === "budget-asc") {
    return (a, b) =>
      getCatalogSortBudgetComparable(a) - getCatalogSortBudgetComparable(b);
  }
  if (sortBy === "duration-desc") {
    return (a, b) =>
      getCatalogSortDurationComparable(b) - getCatalogSortDurationComparable(a);
  }
  if (sortBy === "duration-asc") {
    return (a, b) =>
      getCatalogSortDurationComparable(a) - getCatalogSortDurationComparable(b);
  }
  return getCatalogSortComparator(CATALOG_SORT_DEFAULT);
}
