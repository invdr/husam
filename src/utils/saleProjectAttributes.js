export const SALE_STATUS_AVAILABLE = "available";
export const SALE_STATUS_ORDER = "order";

const SALE_STATUS_LABELS = {
  [SALE_STATUS_AVAILABLE]: "В наличии",
  [SALE_STATUS_ORDER]: "Под заказ",
};

/** Ключ в site_settings для списка доп. полей готовых проектов. Значение — JSON массив { key, label }[]. */
export const SALE_PROJECT_CUSTOM_FIELDS_KEY = "sale_project_custom_fields";

const SUPPRESSED_CUSTOM_FIELD_KEYS = new Set([
  "canopy_area",
  "garage_area",
  "material_summary",
  "persent_of_sale",
  "percent_of_sale",
  "source_photo_url",
  "style",
]);

const SUPPRESSED_CUSTOM_FIELD_LABELS = new Set([
  "материалы: общий",
  "материалы общий",
  "площадь гаража",
  "площадь навеса",
  "площадь отдельно стоящего навеса",
  "процент скидки",
  "ссылка на фотографии",
  "стиль",
]);

function normalizeCustomFieldText(value) {
  return asString(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export function isSuppressedSaleProjectCustomField(field) {
  const key = normalizeCustomFieldText(field?.key).replace(/\s+/g, "_");
  const label = normalizeCustomFieldText(field?.label);
  return (
    SUPPRESSED_CUSTOM_FIELD_KEYS.has(key) ||
    SUPPRESSED_CUSTOM_FIELD_LABELS.has(label)
  );
}

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
      }))
      .filter((item) => !isSuppressedSaleProjectCustomField(item));
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

export function getSaleProjectDiscountPercent(oldPrice, price) {
  const oldNumeric = toComparableNumber(oldPrice);
  const priceNumeric = toComparableNumber(price);
  if (!oldNumeric || !priceNumeric || oldNumeric <= priceNumeric) return 0;
  return Math.round(((oldNumeric - priceNumeric) / oldNumeric) * 100);
}

export function formatSaleProjectDiscount(oldPrice, price) {
  const percent = getSaleProjectDiscountPercent(oldPrice, price);
  return percent > 0 ? `${percent}%` : "";
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

export function getConstructionMaterialFields(project) {
  const legacyMaterials =
    project?.constructionMaterials &&
    typeof project.constructionMaterials === "object"
      ? project.constructionMaterials
      : project?.attributes?.constructionMaterials &&
          typeof project.attributes.constructionMaterials === "object"
        ? project.attributes.constructionMaterials
        : {};
  const materials = {
    foundation: project?.material_foundation ?? legacyMaterials.foundation,
    walls: project?.material_walls ?? legacyMaterials.walls ?? project?.material,
    roof: project?.material_roof ?? legacyMaterials.roof,
    facade: project?.material_facade ?? legacyMaterials.facade,
  };
  return [
    { label: "\u0424\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442", value: materials.foundation },
    { label: "\u0421\u0442\u0435\u043d\u044b", value: materials.walls ?? project?.material },
    { label: "\u041a\u0440\u043e\u0432\u043b\u044f", value: materials.roof },
    { label: "\u0424\u0430\u0441\u0430\u0434", value: materials.facade },
  ].filter((item) => hasValue(item.value));
}

export function getExplicationSections(project) {
  const legacyExplication =
    project?.explication && typeof project.explication === "object"
      ? project.explication
      : project?.attributes?.explication &&
          typeof project.attributes.explication === "object"
        ? project.attributes.explication
        : {};
  const explication = {
    basement: project?.explication_basement ?? legacyExplication.basement,
    floor_1: project?.explication_floor_1 ?? legacyExplication.floor_1,
    floor_2: project?.explication_floor_2 ?? legacyExplication.floor_2,
  };
  return [
    { title: "1 \u044d\u0442\u0430\u0436", text: explication.floor_1 },
    { title: "2 \u044d\u0442\u0430\u0436", text: explication.floor_2 },
    { title: "\u041f\u043e\u0434\u0432\u0430\u043b", text: explication.basement },
  ].filter((section) => hasValue(section.text));
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
  const discount = formatSaleProjectDiscount(
    project?.oldPrice ?? project?.old_price,
    project?.price,
  );
  const base = [
    { label: "\u0421\u0442\u0438\u043b\u044c", value: withPlaceholder(project.style ?? attrs.style) },
    { label: "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0441\u043f\u0430\u043b\u0435\u043d", value: withPlaceholder(project.bedrooms ?? attrs.bedrooms) },
    { label: "\u042d\u0442\u0430\u0436\u0435\u0439", value: withPlaceholder(project.floors) },
    { label: "\u0421\u0442\u0435\u043d\u044b", value: withPlaceholder(project.material_walls ?? project.material) },
    { label: "\u0413\u0430\u0440\u0430\u0436", value: withPlaceholder(project.garage ?? attrs.garage) },
    { label: "\u041d\u0430\u0432\u0435\u0441", value: withPlaceholder(project.canopy ?? attrs.canopy) },
    { label: "\u0422\u0435\u0440\u0440\u0430\u0441\u0430", value: withPlaceholder(project.terrace ?? attrs.terrace) },
    { label: "\u041f\u043e\u0434\u0432\u0430\u043b", value: withPlaceholder(project.basement ?? attrs.basement) },
    { label: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0443\u0447\u0430\u0441\u0442\u043a\u0430", value: withPlaceholder(project.plot_area) },
    { label: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0434\u043e\u043c\u0430", value: pickDisplayValue(project.house_area, project.area) },
    { label: "\u041f\u043e\u043b\u0435\u0437\u043d\u0430\u044f \u043f\u043b\u043e\u0449\u0430\u0434\u044c", value: withPlaceholder(project.usable_area) },
    { label: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0432\u0441\u0435\u0445 \u043f\u043e\u0441\u0442\u0440\u043e\u0435\u043a", value: withPlaceholder(project.total_built_area ?? attrs.total_built_area) },
    { label: "\u041e\u0431\u0449\u0438\u0435 \u0440\u0430\u0437\u043c\u0435\u0440\u044b \u0434\u043e\u043c\u0430", value: withPlaceholder(project.house_dimensions) },
    { label: "\u0421\u0440\u043e\u043a \u0440\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438", value: withPlaceholder(project.implementation_period) },
    { label: "\u0421\u043a\u0438\u0434\u043a\u0430", value: withPlaceholder(discount) },
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
  const materialFields = getConstructionMaterialFields(project);
  const wallMaterial = materialFields.find((item) => item.label === "\u0421\u0442\u0435\u043d\u044b")?.value ?? project.material;
  const base = [
    { label: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0434\u043e\u043c\u0430", value: withPlaceholder(project.house_area || project.area) },
    { label: "\u042d\u0442\u0430\u0436\u0435\u0439", value: withPlaceholder(project.floors) },
    { label: "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0441\u043f\u0430\u043b\u0435\u043d", value: withPlaceholder(project.bedrooms ?? attrs.bedrooms ?? project.rooms) },
    { label: "\u0421\u0442\u0435\u043d\u044b", value: withPlaceholder(wallMaterial) },
    { label: "\u0421\u0442\u0438\u043b\u044c", value: withPlaceholder(project.style ?? attrs.style) },
    { label: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0443\u0447\u0430\u0441\u0442\u043a\u0430", value: withPlaceholder(project.plot_area) },
  ];
  const custom = customFieldDefs.map((def) => ({
    label: def.label,
    value: withPlaceholder(attrs[def.key]),
  })).filter((item) => hasValue(item.value));
  const maxFields = 6;
  const customLimit = Math.min(custom.length, maxFields);
  const baseLimit = maxFields - customLimit;
  return [
    ...base.filter((item) => hasValue(item.value)).slice(0, baseLimit),
    ...custom.slice(0, customLimit),
  ];
}

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
    const m = asString(p.material_walls ?? p.material).trim();
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
      const area = p.house_area ?? p.area;
      if (!hasComparableNumber(area)) return false;
      const num = toComparableNumber(area);
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
      const rooms = p.bedrooms ?? p.rooms;
      if (!hasComparableNumber(rooms)) return false;
      const num = toComparableNumber(rooms);
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
  const area = project.house_area ?? project.area;
  if (!hasComparableNumber(area)) return false;
  const num = toComparableNumber(area);
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
  const rooms = project.bedrooms ?? project.rooms;
  if (!hasComparableNumber(rooms)) return false;
  const num = toComparableNumber(rooms);
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
  const m = asString(project.material_walls ?? project.material).trim().toLowerCase();
  const need = filterValue.toLowerCase();
  return m === need || m.includes(need);
}
