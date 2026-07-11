import {
  CATALOG_TYPE_BUILD,
  CATALOG_TYPE_DESIGN,
  CATALOG_TYPE_REPAIR,
  getCatalogSortAreaComparable,
  isBuildType,
  isDesignType,
  isRepairType,
} from "./catalogAttributes.js";
import {
  hasComparableNumber,
  toComparableNumber,
  toDurationMonths,
} from "./saleProjectAttributes.js";

export { toDurationMonths } from "./saleProjectAttributes.js";

export const CATALOG_FILTER_ANY = "";

export const CATALOG_FILTER_PARAM_BY_KEY = {
  objectType: "object",
  style: "style",
  area: "area",
  propertyType: "property",
  repairType: "repair",
  finishClass: "finish",
  rooms: "rooms",
  houseArea: "houseArea",
  duration: "duration",
};

export const EMPTY_CATALOG_FILTERS = Object.freeze(
  Object.fromEntries(
    Object.keys(CATALOG_FILTER_PARAM_BY_KEY).map((key) => [key, CATALOG_FILTER_ANY]),
  ),
);

const AREA_RANGE_SPECS = [
  { value: "0-49", label: "до 50 м²", min: 0, max: 49.999 },
  { value: "50-99", label: "50 – 100 м²", min: 50, max: 99.999 },
  { value: "100-149", label: "100 – 150 м²", min: 100, max: 149.999 },
  { value: "150-199", label: "150 – 200 м²", min: 150, max: 199.999 },
  { value: "200-499", label: "200 – 500 м²", min: 200, max: 499.999 },
  { value: "500-999999", label: "500+ м²", min: 500, max: 999999 },
];

const DURATION_RANGE_SPECS = [
  { value: "0-3", label: "до 3 месяцев", min: 0, max: 3 },
  { value: "4-6", label: "4 – 6 месяцев", min: 4, max: 6 },
  { value: "7-12", label: "7 – 12 месяцев", min: 7, max: 12 },
  { value: "13-999", label: "более 12 месяцев", min: 13, max: 999 },
];

const FIELD_DEFINITIONS = {
  [CATALOG_TYPE_DESIGN]: [
    { key: "objectType", label: "Тип объекта", kind: "value", anyLabel: "Любой" },
    { key: "style", label: "Стиль", kind: "value", anyLabel: "Любой" },
    { key: "area", label: "Площадь", kind: "area", anyLabel: "Любая" },
  ],
  [CATALOG_TYPE_REPAIR]: [
    { key: "propertyType", label: "Тип недвижимости", kind: "value", anyLabel: "Любой" },
    { key: "repairType", label: "Вид ремонта", kind: "value", anyLabel: "Любой" },
    { key: "finishClass", label: "Класс отделки", kind: "value", anyLabel: "Любой" },
    { key: "rooms", label: "Комнаты", kind: "value", anyLabel: "Любые" },
  ],
  [CATALOG_TYPE_BUILD]: [
    { key: "houseArea", label: "Площадь дома", kind: "houseArea", anyLabel: "Любая" },
    { key: "duration", label: "Срок реализации", kind: "duration", anyLabel: "Любой" },
  ],
};

function normalizedType(type) {
  if (isDesignType(type)) return CATALOG_TYPE_DESIGN;
  if (isRepairType(type)) return CATALOG_TYPE_REPAIR;
  if (isBuildType(type)) return CATALOG_TYPE_BUILD;
  return type;
}

function otherValue(value, customValue) {
  if (value !== "Другое") return String(value ?? "").trim();
  return String(customValue ?? "").trim() || "Другое";
}

function firstNonEmpty(...values) {
  return values.find((value) => String(value ?? "").trim()) ?? "";
}

export function getCatalogFilterDefinitions(type) {
  return FIELD_DEFINITIONS[normalizedType(type)] || [];
}

export function getCatalogProjectFilterValue(project, key) {
  const attributes = project?.attributes ?? {};
  if (key === "objectType") {
    return otherValue(attributes.objectType, attributes.objectTypeOther);
  }
  if (key === "style") {
    return otherValue(attributes.style, attributes.styleOther);
  }
  if (key === "propertyType") return String(attributes.propertyType ?? "").trim();
  if (key === "repairType") {
    return otherValue(attributes.repairType, attributes.repairTypeOther);
  }
  if (key === "finishClass") return String(attributes.finishClass ?? "").trim();
  if (key === "rooms") return String(attributes.rooms ?? "").trim();
  if (key === "area") {
    const exactArea =
      attributes.areaRange === "Другое"
        ? firstNonEmpty(attributes.areaRangeOther, project?.area)
        : firstNonEmpty(project?.area);
    return hasComparableNumber(exactArea)
      ? toComparableNumber(exactArea)
      : getCatalogSortAreaComparable(project);
  }
  if (key === "houseArea") {
    return toComparableNumber(firstNonEmpty(attributes.houseArea, project?.area));
  }
  if (key === "duration") {
    return toDurationMonths(firstNonEmpty(attributes.duration, project?.duration));
  }
  return "";
}

function rangeSpecsForKind(kind) {
  return kind === "duration" ? DURATION_RANGE_SPECS : AREA_RANGE_SPECS;
}

function matchesDefinition(project, definition, selectedValue) {
  if (!selectedValue) return true;
  const value = getCatalogProjectFilterValue(project, definition.key);
  if (definition.kind === "value") return value === selectedValue;
  if (!hasComparableNumber(value) && !Number.isFinite(value)) return false;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return false;
  const spec = rangeSpecsForKind(definition.kind).find(
    (candidate) => candidate.value === selectedValue,
  );
  return Boolean(spec && numeric >= spec.min && numeric <= spec.max);
}

export function filterCatalogProjects(projects, type, filters, ignoredKey = "") {
  const definitions = getCatalogFilterDefinitions(type);
  return (projects || []).filter((project) =>
    definitions.every(
      (definition) =>
        definition.key === ignoredKey ||
        matchesDefinition(project, definition, filters[definition.key]),
    ),
  );
}

export function getCatalogFilterOptions(definition, projects) {
  const anyOption = { value: CATALOG_FILTER_ANY, label: definition.anyLabel };
  if (definition.kind === "value") {
    const values = [
      ...new Set(
        (projects || [])
          .map((project) => getCatalogProjectFilterValue(project, definition.key))
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, "ru"));
    return [anyOption, ...values.map((value) => ({ value, label: value }))];
  }

  const options = rangeSpecsForKind(definition.kind)
    .filter((spec) =>
      (projects || []).some((project) => {
        const value = Number(getCatalogProjectFilterValue(project, definition.key));
        return Number.isFinite(value) && value > 0 && value >= spec.min && value <= spec.max;
      }),
    )
    .map(({ value, label }) => ({ value, label }));
  return [anyOption, ...options];
}

export function parseCatalogFilters(searchParams) {
  return Object.fromEntries(
    Object.entries(CATALOG_FILTER_PARAM_BY_KEY).map(([key, param]) => [
      key,
      searchParams.get(param) ?? CATALOG_FILTER_ANY,
    ]),
  );
}

export function appendCatalogFilters(params, filters, type) {
  for (const definition of getCatalogFilterDefinitions(type)) {
    const value = filters[definition.key];
    if (value) params.set(CATALOG_FILTER_PARAM_BY_KEY[definition.key], value);
  }
  return params;
}
