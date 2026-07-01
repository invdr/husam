export const SALE_STATUS_AVAILABLE = "available";
export const SALE_STATUS_ORDER = "order";

const SALE_STATUS_LABELS = {
  [SALE_STATUS_AVAILABLE]: "В наличии",
  [SALE_STATUS_ORDER]: "Под заказ",
};

/** Ключ в site_settings для списка доп. полей готовых проектов. Значение — JSON массив { key, label }[]. */
export const SALE_PROJECT_CUSTOM_FIELDS_KEY = "sale_project_custom_fields";

/**
 * Парсит список доп. полей из значения site_settings.
 * @param {string} [raw]
 * @returns {{ key: string, label: string }[]}
 */
export function parseSaleProjectCustomFields(raw) {
  if (raw == null || typeof raw !== "string" || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item && typeof item.key === "string" && item.key.trim())
      .map((item) => ({
        key: String(item.key).trim().replace(/\s+/g, "_"),
        label: typeof item.label === "string" ? item.label.trim() || item.key : String(item.key),
      }));
  } catch {
    return [];
  }
}

function asString(value) {
  return typeof value === "string" ? value : value?.toString?.() ?? "";
}

const EMPTY_PLACEHOLDER = "—";
const EMPTY_CUSTOM_FIELD_DEFS = [];

function hasValue(value) {
  const s = asString(value).trim();
  return s.length > 0 && s !== EMPTY_PLACEHOLDER;
}

export function hasComparableNumber(value) {
  return /[\d]/.test(asString(value));
}

/**
 * Приводит строковые значения вида "5 900 000 ₽" или "120 м²"
 * к числу для фильтрации/сортировки.
 */
export function toComparableNumber(value) {
  const raw = asString(value).trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\s+/g, "").replace(",", ".");
  const match = normalized.match(/[\d.]+/);
  if (!match) return 0;
  const numeric = Number.parseFloat(match[0]);
  if (!Number.isFinite(numeric)) return 0;
  const lower = raw.toLowerCase();
  if (/\bmln\b|\bmillion\b|млн|миллион/.test(lower)) return numeric * 1_000_000;
  if (/\btys\b|\bthousand\b|тыс|тысяч/.test(lower)) return numeric * 1_000;
  return numeric;
}

export function formatPrice(value) {
  const numeric = toComparableNumber(value);
  if (!numeric) return "Стоимость по запросу";
  return `${new Intl.NumberFormat("ru-RU").format(numeric)} ₽`;
}

export function formatConstructionPrice(value) {
  const raw = asString(value).trim();
  if (!raw) return "";
  const numeric = toComparableNumber(raw);
  if (!numeric) return raw;
  return `${new Intl.NumberFormat("ru-RU").format(numeric)} ₽`;
}

export function compareSaleProjectPrice(a, b, direction = "asc") {
  const aHasPrice = hasComparableNumber(a?.price);
  const bHasPrice = hasComparableNumber(b?.price);
  if (aHasPrice && !bHasPrice) return -1;
  if (!aHasPrice && bHasPrice) return 1;
  if (!aHasPrice && !bHasPrice) return 0;

  const diff = toComparableNumber(a.price) - toComparableNumber(b.price);
  return direction === "desc" ? -diff : diff;
}

export function getSaleStatusLabel(status) {
  return SALE_STATUS_LABELS[status] ?? "Под заказ";
}

export function getSaleStatusClassName(status) {
  if (status === SALE_STATUS_AVAILABLE) {
    return "border-emerald-400/40 bg-emerald-500/20 text-emerald-300";
  }
  return "border-amber-400/40 bg-amber-500/20 text-amber-300";
}

/** Все поля для страницы проекта (включая площадь участка, дома, полезную, срок реализации и доп. поля). Пустые не включаются. */
export function getSaleDisplayFields(project, customFieldDefs = EMPTY_CUSTOM_FIELD_DEFS) {
  const withPlaceholder = (value) => asString(value).trim() || EMPTY_PLACEHOLDER;
  const pickDisplayValue = (...values) => {
    for (const value of values) {
      const str = asString(value).trim();
      if (str) return str;
    }
    return EMPTY_PLACEHOLDER;
  };
  const attrs = project?.attributes && typeof project.attributes === "object" ? project.attributes : {};
  const base = [
    { label: "Комнаты", value: withPlaceholder(project.rooms) },
    { label: "Этажей", value: withPlaceholder(project.floors) },
    { label: "Материал", value: withPlaceholder(project.material) },
    { label: "Площадь участка", value: withPlaceholder(project.plot_area) },
    { label: "Площадь дома", value: pickDisplayValue(project.area, project.house_area) },
    { label: "Полезная площадь", value: withPlaceholder(project.usable_area) },
    { label: "Общие размеры дома", value: withPlaceholder(project.house_dimensions) },
    { label: "Срок реализации", value: withPlaceholder(project.implementation_period) },
  ];
  const custom = customFieldDefs.map((def) => ({
    label: def.label,
    value: withPlaceholder(attrs[def.key]),
  }));
  return [...base, ...custom].filter((item) => hasValue(item.value));
}

/** Поля для карточки «Готовые проекты на продажу»: площадь участка, дома, полезная, срок и доп. поля. Пустые не включаются. */
export function getSaleCardDisplayFields(project, customFieldDefs = EMPTY_CUSTOM_FIELD_DEFS) {
  const withPlaceholder = (value) => asString(value).trim() || EMPTY_PLACEHOLDER;
  const attrs = project?.attributes && typeof project.attributes === "object" ? project.attributes : {};
  const base = [
    { label: "Площадь участка", value: withPlaceholder(project.plot_area) },
    { label: "Площадь дома", value: withPlaceholder(project.house_area) },
    { label: "Полезная площадь", value: withPlaceholder(project.usable_area) },
    { label: "Общие размеры дома", value: withPlaceholder(project.house_dimensions) },
    { label: "Срок реализации", value: withPlaceholder(project.implementation_period) },
  ];
  const custom = customFieldDefs.map((def) => ({
    label: def.label,
    value: withPlaceholder(attrs[def.key]),
  }));
  return [...base, ...custom].filter((item) => hasValue(item.value));
}

// --- Варианты для фильтров каталога готовых проектов (из данных карточек) ---

/** Значение «любой/не важно» для селектов */
export const FILTER_ANY = "";

/** Фиксированные диапазоны площади для проверки «есть ли проекты в диапазоне» */
const AREA_RANGE_SPECS = [
  { value: "0-50", label: "до 50 м²", min: 0, max: 50 },
  { value: "50-100", label: "50 – 100 м²", min: 50, max: 100 },
  { value: "100-150", label: "100 – 150 м²", min: 100, max: 150 },
  { value: "150-200", label: "150 – 200 м²", min: 150, max: 200 },
  { value: "200-500", label: "200 – 500 м²", min: 200, max: 500 },
  { value: "500-9999", label: "500+ м²", min: 500, max: 9999 },
];

/** Фиксированные диапазоны комнат */
const ROOMS_RANGE_SPECS = [
  { value: "0-1", label: "до 1", min: 0, max: 1 },
  { value: "2-3", label: "2 – 3", min: 2, max: 3 },
  { value: "4-5", label: "4 – 5", min: 4, max: 5 },
  { value: "6-99", label: "6+", min: 6, max: 99 },
];

/**
 * Варианты материала для фильтра из опубликованных проектов.
 * @param {Array<{ material?: string }>} projects
 * @returns {Array<{ value: string, label: string }>}
 */
export function getFilterMaterialsFromProjects(projects) {
  const set = new Set();
  for (const p of projects || []) {
    const m = asString(p.material).trim();
    if (m) set.add(m);
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  return [{ value: FILTER_ANY, label: "Любой" }, ...sorted.map((v) => ({ value: v, label: v }))];
}

/**
 * Варианты площади для фильтра: только те диапазоны, в которых есть хотя бы один проект.
 * @param {Array<{ area?: string }>} projects
 * @returns {Array<{ value: string, label: string }>}
 */
export function getFilterAreaRangesFromProjects(projects) {
  const list = [{ value: FILTER_ANY, label: "Любая" }];
  for (const spec of AREA_RANGE_SPECS) {
    const hasProject = (projects || []).some((p) => {
      if (!hasComparableNumber(p.area)) return false;
      const num = toComparableNumber(p.area);
      return num >= spec.min && (spec.max >= 9999 || num <= spec.max);
    });
    if (hasProject) list.push({ value: spec.value, label: spec.label });
  }
  return list;
}

/**
 * Варианты этажей для фильтра из данных проектов (уникальные значения).
 * @param {Array<{ floors?: string }>} projects
 * @returns {Array<{ value: string, label: string }>}
 */
export function getFilterFloorsFromProjects(projects) {
  const set = new Set();
  for (const p of projects || []) {
    const f = asString(p.floors).trim();
    if (f) set.add(f);
  }
  const byNum = (v) => toComparableNumber(v);
  const sorted = Array.from(set).sort((a, b) => byNum(a) - byNum(b));
  const labels = { "1": "1 этаж", "2": "2 этажа", "1-2": "1 – 2", "3": "3 и более" };
  return [
    { value: FILTER_ANY, label: "Любое" },
    ...sorted.map((v) => ({ value: v, label: labels[v] || v })),
  ];
}

/**
 * Варианты комнат для фильтра: только те диапазоны, в которых есть проекты.
 * @param {Array<{ rooms?: string }>} projects
 * @returns {Array<{ value: string, label: string }>}
 */
export function getFilterRoomsFromProjects(projects) {
  const list = [{ value: FILTER_ANY, label: "Любое" }];
  for (const spec of ROOMS_RANGE_SPECS) {
    const hasProject = (projects || []).some((p) => {
      if (!hasComparableNumber(p.rooms)) return false;
      const num = toComparableNumber(p.rooms);
      return num >= spec.min && num <= spec.max;
    });
    if (hasProject) list.push({ value: spec.value, label: spec.label });
  }
  return list;
}

/**
 * Проверяет, подходит ли проект под фильтр по площади (value вида "min-max" или "").
 * @param {{ area?: string }} project
 * @param {string} rangeValue
 */
export function matchAreaFilter(project, rangeValue) {
  if (!rangeValue) return true;
  if (!hasComparableNumber(project.area)) return false;
  const num = toComparableNumber(project.area);
  const [min, max] = rangeValue.split("-").map(Number);
  if (min != null && num < min) return false;
  if (max != null && num > max) return false;
  return true;
}

/**
 * Проверяет фильтр по этажам. filterValue — значение из каталога ("1", "2", "1-2", "3" или "3 этажа").
 * @param {{ floors?: string }} project
 * @param {string} filterValue
 */
export function matchFloorsFilter(project, filterValue) {
  if (!filterValue) return true;
  const projectFloors = asString(project.floors).trim();
  if (!projectFloors) return false;
  const projectNum = toComparableNumber(project.floors);
  const filterNum = toComparableNumber(filterValue);
  if (filterValue.includes("-")) {
    const [min, max] = filterValue.split("-").map((s) => toComparableNumber(s));
    return projectNum >= (min ?? 0) && projectNum <= (max ?? 99);
  }
  if (filterNum >= 3) return projectNum >= 3;
  if (filterNum >= 2) return projectNum >= 2 && projectNum < 3;
  if (filterNum >= 1) return projectNum >= 1 && projectNum < 2;
  return projectNum === filterNum;
}

/**
 * Проверяет фильтр по комнатам (диапазон "min-max").
 * @param {{ rooms?: string }} project
 * @param {string} rangeValue
 */
export function matchRoomsFilter(project, rangeValue) {
  if (!rangeValue) return true;
  if (!hasComparableNumber(project.rooms)) return false;
  const num = toComparableNumber(project.rooms);
  const [min, max] = rangeValue.split("-").map(Number);
  if (min != null && num < min) return false;
  if (max != null && num > max) return false;
  return true;
}

/**
 * Проверяет фильтр по материалу (точное совпадение или по подстроке для «Дерево»/«Брус»).
 * @param {{ material?: string }} project
 * @param {string} filterValue
 */
export function matchMaterialFilter(project, filterValue) {
  if (!filterValue) return true;
  const m = asString(project.material).trim().toLowerCase();
  const need = filterValue.toLowerCase();
  return m === need || m.includes(need);
}
