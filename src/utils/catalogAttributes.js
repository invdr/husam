/**
 * Атрибуты карточек каталога по типам категорий.
 * Используется в ProjectCard, ProjectModal и ProjectForm.
 */

import { toComparableNumber } from "./saleProjectAttributes.js";

export const CATALOG_TYPE_DESIGN = "Дизайн проекты";
export const CATALOG_TYPE_REPAIR = "Ремонт";
export const CATALOG_TYPE_BUILD = "Строительство";

/** Варианты "Тип объекта" для Дизайн */
export const DESIGN_OBJECT_TYPES = [
  "Студия",
  "1-к",
  "2-к",
  "3-к",
  "4-к и более",
  "Частный дом",
  "Офис",
  "Ресторан",
  "Другое",
];

/** Варианты "Стиль" для Дизайн */
export const DESIGN_STYLES = [
  "Современный",
  "Скандинавский",
  "Лофт",
  "Классика",
  "Минимализм",
  "Хай-тек",
  "Другое",
];

/** Диапазоны площади для Дизайн (фильтр/отображение) */
export const DESIGN_AREA_RANGES = [
  { value: "до 50", label: "до 50 м²" },
  { value: "50-100", label: "50–100 м²" },
  { value: "100+", label: "100+ м²" },
  { value: "Другое", label: "Другое" },
];

/** Тип недвижимости для Ремонт */
export const REPAIR_PROPERTY_TYPES = [
  "Новостройка (без отделки)",
  "Вторичное жилье",
  "Старый фонд (с особенностями перекрытий)",
];

/** Вид ремонта для Ремонт */
export const REPAIR_TYPES = [
  "Косметический (освежить)",
  "Капитальный (с заменой коммуникаций)",
  "Дизайнерский (по проекту)",
  "Другое",
];

/** Класс отделки для Ремонт */
export const REPAIR_FINISH_CLASSES = [
  "Бюджет",
  "Стандарт",
  "Премиум/Люкс",
];

/** Количество комнат для Ремонт */
export const REPAIR_ROOMS = [
  "Студия",
  "1-к",
  "2-к",
  "3-к+",
];

/**
 * Проверяет, является ли проект «дизайн» (по типу).
 * @param {string} type
 */
export function isDesignType(type) {
  return type === CATALOG_TYPE_DESIGN || type === "Дизайн";
}

/**
 * Проверяет, является ли проект «ремонт».
 */
export function isRepairType(type) {
  return type === CATALOG_TYPE_REPAIR;
}

/**
 * Проверяет, является ли проект «строительство».
 */
export function isBuildType(type) {
  return type === CATALOG_TYPE_BUILD;
}

/**
 * Число для сортировки каталога по площади: для дизайна — диапазон areaRange или текст;
 * для ремонта/строительства — площадь дома из attributes, иначе поле area.
 * @param {{ type?: string, attributes?: object, area?: string }} project
 */
export function getCatalogSortAreaComparable(project) {
  const type = project?.type ?? "";
  const att = project?.attributes ?? {};

  if (isDesignType(type)) {
    if (att.areaRange === "до 50") return 40;
    if (att.areaRange === "50-100") return 75;
    if (att.areaRange === "100+") return 125;
    if (att.areaRange === "Другое") {
      const n = toComparableNumber(att.areaRangeOther || project?.area || "");
      if (n > 0) return n;
    }
    const fromTop = toComparableNumber(project?.area || "");
    if (fromTop > 0) return fromTop;
    return 0;
  }

  return toComparableNumber(att.houseArea || project?.area || "");
}

/**
 * Бюджет для сортировки: в дизайне часто только attributes.budget.
 */
export function getCatalogSortBudgetComparable(project) {
  const att = project?.attributes ?? {};
  return toComparableNumber(att.budget ?? project?.budget ?? "");
}

/**
 * Срок для сортировки: в типовых формах — attributes.duration.
 */
export function getCatalogSortDurationComparable(project) {
  const att = project?.attributes ?? {};
  return toComparableNumber(att.duration ?? project?.duration ?? "");
}

/**
 * Возвращает человекочитаемую метку для диапазона площади (Дизайн).
 * @param {string} value - значение из DESIGN_AREA_RANGES[].value
 */
export function getDesignAreaRangeLabel(value) {
  if (value === "Другое") return "—";
  const found = DESIGN_AREA_RANGES.find((r) => r.value === value);
  return found ? found.label : value || "—";
}

/**
 * Извлекает поля для отображения на карточке/модалке по типу проекта.
 * Для старых проектов без attributes подставляются area, duration, budget, location.
 * @param {{ type?: string, attributes?: object, area?: string, duration?: string, budget?: string, location?: string }} project
 * @returns {Array<{ label: string, value: string }>}
 */
export function getDisplayFields(project) {
  const type = project?.type ?? "";
  const att = project?.attributes ?? {};
  const pickValue = (...values) => {
    for (const value of values) {
      const str = String(value ?? "").trim();
      if (str) return str;
    }
    return "—";
  };

  if (isDesignType(type)) {
    const objectType = att.objectType === "Другое" ? (att.objectTypeOther || "Другое") : att.objectType;
    const style = att.style === "Другое" ? (att.styleOther || "Другое") : att.style;
    const areaValue = att.areaRange === "Другое" ? (att.areaRangeOther || "Другое") : getDesignAreaRangeLabel(att.areaRange);
    return [
      { label: "Тип объекта", value: pickValue(objectType) },
      { label: "Стиль", value: pickValue(style) },
      { label: "Площадь", value: pickValue(areaValue === "—" ? "" : areaValue, project.area) },
      { label: "Бюджет", value: pickValue(att.budget, project.budget) },
      { label: "Площадь участка", value: pickValue(att.plotArea) },
      { label: "Площадь дома", value: pickValue(att.houseArea, project.area) },
      { label: "Полезная площадь", value: pickValue(att.usefulArea) },
      { label: "Срок реализации", value: pickValue(att.duration, project.duration) },
    ];
  }

  if (isRepairType(type)) {
    const repairType = att.repairType === "Другое" ? (att.repairTypeOther || "Другое") : att.repairType;
    return [
      { label: "Тип недвижимости", value: pickValue(att.propertyType) },
      { label: "Вид ремонта", value: pickValue(repairType) },
      { label: "Класс отделки", value: pickValue(att.finishClass) },
      { label: "Комнат", value: pickValue(att.rooms) },
      { label: "Площадь участка", value: pickValue(att.plotArea) },
      { label: "Площадь дома", value: pickValue(att.houseArea, project.area) },
      { label: "Полезная площадь", value: pickValue(att.usefulArea) },
      { label: "Срок реализации", value: pickValue(att.duration, project.duration) },
    ];
  }

  if (isBuildType(type)) {
    return [
      { label: "Площадь участка", value: pickValue(att.plotArea) },
      { label: "Площадь дома", value: pickValue(att.houseArea, project.area) },
      { label: "Полезная площадь", value: pickValue(att.usefulArea) },
      { label: "Срок реализации", value: pickValue(att.duration, project.duration) },
    ];
  }

  // Универсальный вариант (старые проекты или неизвестный тип)
  return [
    { label: "Площадь", value: pickValue(project.area) },
    { label: "Срок", value: pickValue(project.duration) },
    { label: "Бюджет", value: pickValue(project.budget) },
    { label: "Локация", value: pickValue(project.location) },
  ];
}

const CARD_EMPTY = "—";

function cardHasValue(value) {
  const s = String(value ?? "").trim();
  return s.length > 0 && s !== CARD_EMPTY;
}

/** Площадь для карточки каталога (тип «Дизайн»): диапазон / другое / поле area. */
function getDesignAreaCardValue(project) {
  const att = project?.attributes ?? {};
  if (att.areaRange === "Другое") {
    const other = String(att.areaRangeOther ?? "").trim();
    if (other) return other;
    const top = String(project?.area ?? "").trim();
    if (top) return top;
    return "Другое";
  }
  if (att.areaRange) {
    const label = getDesignAreaRangeLabel(att.areaRange);
    if (label && label !== "—") return label;
  }
  return String(project?.area ?? "").trim();
}

/** Стиль для карточки каталога (тип «Дизайн»). */
function getDesignStyleCardValue(project) {
  const att = project?.attributes ?? {};
  if (att.style === "Другое") {
    const other = String(att.styleOther ?? "").trim();
    return other || "Другое";
  }
  return String(att.style ?? "").trim();
}

/**
 * Поля под карточкой в каталоге: для «Дизайн» — Площадь, Стиль и при наличии участок/дом/полезная/срок;
 * для остальных типов — площадь участка, дома, полезная, срок (пустые не включаются).
 * На странице детального просмотра используйте getDisplayFields.
 * @param {{ type?: string, attributes?: object, area?: string, duration?: string }} project
 * @returns {Array<{ label: string, value: string }>}
 */
export function getCardDisplayFields(project) {
  const type = project?.type ?? "";
  const att = project?.attributes ?? {};
  const pickCardValue = (...values) => {
    for (const value of values) {
      const str = String(value ?? "").trim();
      if (str) return str;
    }
    return CARD_EMPTY;
  };

  const tailFields = [
    { label: "Площадь участка", value: pickCardValue(att.plotArea) },
    { label: "Площадь дома", value: pickCardValue(att.houseArea, project?.area) },
    { label: "Полезная площадь", value: pickCardValue(att.usefulArea) },
    {
      label: "Срок реализации",
      value: pickCardValue(att.duration, project?.duration),
    },
  ].filter((item) => cardHasValue(item.value));

  if (isDesignType(type)) {
    const head = [];
    const areaStr = getDesignAreaCardValue(project);
    if (cardHasValue(areaStr)) head.push({ label: "Площадь", value: areaStr });
    const styleStr = getDesignStyleCardValue(project);
    if (cardHasValue(styleStr)) head.push({ label: "Стиль", value: styleStr });
    return [...head, ...tailFields];
  }

  return tailFields;
}
