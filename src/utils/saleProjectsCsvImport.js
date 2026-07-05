import {
  normalizePlotAreaField,
  normalizeSquareField,
} from "@/utils/saleProjectFieldNormalize";
import {
  SALE_STATUS_AVAILABLE,
  SALE_STATUS_ORDER,
} from "@/utils/saleProjectAttributes";
import {
  buildStructuredRoomExplanation,
  normalizeAttachmentChoice,
  normalizeYesNoChoice,
  splitSaleProjectRoomExplanation,
} from "@/utils/saleProjectFieldStructure";

export const LIMITS = {
  id: 30,
  title: 80,
  area: 20,
  rooms: 15,
  floors: 15,
  material: 50,
  description: 2000,
  room_explanation: 3000,
};

const STATUS_ALIASES = new Map([
  ["available", SALE_STATUS_AVAILABLE],
  ["в наличии", SALE_STATUS_AVAILABLE],
  ["наличие", SALE_STATUS_AVAILABLE],
  ["есть", SALE_STATUS_AVAILABLE],

  ["order", SALE_STATUS_ORDER],
  ["под заказ", SALE_STATUS_ORDER],
  ["заказ", SALE_STATUS_ORDER],
  ["reserved", SALE_STATUS_ORDER],
  ["бронь", SALE_STATUS_ORDER],
  ["sold", SALE_STATUS_ORDER],
  ["продан", SALE_STATUS_ORDER],
  ["продано", SALE_STATUS_ORDER],
  ["pending", SALE_STATUS_ORDER],
  ["уточняется", SALE_STATUS_ORDER],
]);

/** Колонки CSV совпадают с полями формы создания готового проекта (SaleProjectForm). */
export const HEADER_MAP = new Map(
  [
    ["id", ["id", "Артикул", "Артикул (ID)", "Код", "SKU"]],
    ["title", ["title", "Название", "Имя", "Наименование"]],
    ["description", ["description", "Описание", "Описание проекта"]],
    ["room_explanation", ["room_explanation", "Экспликация", "Экспликация проекта", "Поэтажка"]],
    ["garage", ["garage", "Гараж", "Есть гараж"]],
    ["canopy", ["canopy", "Навес", "Есть навес"]],
    ["garage_area", ["garage_area", "Площадь гаража"]],
    ["canopy_area", ["canopy_area", "Площадь навеса"]],
    ["basement", ["basement", "Подвал", "Есть подвал", "Цоколь"]],
    ["type", ["type", "Категория", "Тип", "Раздел"]],
    ["area", ["area", "Площадь"]],
    ["floors", ["floors", "Этажей", "Этажи", "Кол-во этажей", "Количество этажей"]],
    ["style", ["style", "Стиль"]],
    ["terrace", ["terrace", "Терраса"]],
    [
      "bedrooms",
      [
        "bedrooms",
        "Кол-во спален",
        "Количество спален",
        "Спальных комнат",
        "Комнаты",
        "Кол-во комнат",
        "Количество комнат",
      ],
    ],
    [
      "explication_basement",
      [
        "Экспликация: подвал",
        "Экспликация подвал",
        "Экспликация/Подвал",
        "Подвал экспликация",
        "Подвал (экспликация)",
      ],
    ],
    ["explication_floor_1", ["Экспликация: 1 этаж", "Экспликация 1й этаж", "Экспликация 1 этаж", "1й этаж", "1 этаж", "Первый этаж"]],
    ["explication_floor_2", ["Экспликация: 2 этаж", "Экспликация 2й этаж", "Экспликация 2 этаж", "2й этаж", "2 этаж", "Второй этаж"]],
    ["material_foundation", ["Тип фундамента", "Фундамент"]],
    ["material_walls", ["Стены", "Материал", "Материал стен", "Стеновой материал"]],
    ["material_roof", ["Кровля", "Материал кровли"]],
    ["material_facade", ["Облицовка фасада", "Фасад", "Материал фасада"]],
    ["total_built_area", ["Площадь всех построек", "Площадь всех построек для расчета стоимости проекта"]],
    ["note", ["Примечание", "Комментарий"]],
    ["price", ["price", "Цена", "Стоимость проекта", "Цена со скидкой"]],
    ["old_price", ["old_price", "oldprice", "old price", "Старая цена", "Старая_цена", "Старая стоимость"]],
    [
      "construction_price_from",
      ["construction_price_from", "Стоимость строительства от", "Строительство от", "Цена строительства"],
    ],
    ["status", ["status", "Статус"]],
    ["published", ["published", "Опубликован", "Публикация", "Видимость", "Перенесен на сайт", "Статус сайта"]],
    ["featured", ["featured", "На главной", "Главная", "В избранном"]],
    ["images", ["images", "image", "Изображения", "Картинки", "Фото", "URLs", "URL"]],
    ["plot_area", ["plot_area", "Площадь участка", "Участок"]],
    ["house_area", ["house_area", "Площадь дома", "Дом", "Общая площадь дома"]],
    ["usable_area", ["usable_area", "Полезная площадь"]],
    ["implementation_period", ["implementation_period", "Срок реализации", "Срок", "Период реализации"]],
    [
      "house_dimensions",
      ["house_dimensions", "Общие размеры", "Общие размеры дома", "Размеры дома", "Размеры", "Габариты"],
    ],
  ].flatMap(([key, aliases]) => aliases.map((a) => [normalizeKey(a), key])),
);

export function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/[_-]+/g, " ");
}

export function asTrimmedString(value) {
  return typeof value === "string"
    ? value.trim()
    : (value ?? "").toString().trim();
}

function parseBoolean(value) {
  const raw = normalizeKey(value);
  if (!raw) return undefined;
  if (["1", "true", "yes", "y", "\u0434\u0430", "on", "\u0432\u043a\u043b", "\u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d"].includes(raw)) return true;
  if (["0", "false", "no", "n", "\u043d\u0435\u0442", "off", "\u0432\u044b\u043a\u043b", "\u0436\u0434\u0435\u0442 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438", "\u0436\u0434\u0451\u0442 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438"].includes(raw)) {
    return false;
  }
  return undefined;
}

function splitImages(value) {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  const parts = raw
    .split(/[|;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

function buildStructuredExplication(mappedRow) {
  const parsed = splitSaleProjectRoomExplanation(mappedRow.room_explanation);
  const sections = {
    basement: asTrimmedString(mappedRow.explication_basement) || parsed.basement || null,
    floor_1: asTrimmedString(mappedRow.explication_floor_1) || parsed.floor_1 || null,
    floor_2: asTrimmedString(mappedRow.explication_floor_2) || parsed.floor_2 || null,
  };
  return Object.values(sections).some(Boolean) ? sections : null;
}

function buildRoomExplanation(mappedRow) {
  const explication = buildStructuredExplication(mappedRow);
  return explication ? buildStructuredRoomExplanation({
    explication_basement: explication.basement,
    explication_floor_1: explication.floor_1,
    explication_floor_2: explication.floor_2,
  }) : "";
}

function buildMaterials(mappedRow) {
  const materials = {
    foundation: asTrimmedString(mappedRow.material_foundation) || null,
    walls: asTrimmedString(mappedRow.material_walls) || null,
    roof: asTrimmedString(mappedRow.material_roof) || null,
    facade: asTrimmedString(mappedRow.material_facade) || null,
  };
  return Object.values(materials).some(Boolean) ? materials : null;
}

function formatSquareNumber(value) {
  const numeric = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(numeric)) return "";
  return String(numeric)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function extractNamedSquareArea(labelPattern, ...texts) {
  const values = [];
  for (const text of texts) {
    const lines = asTrimmedString(text).split(/\r?\n/);
    for (const line of lines) {
      if (!labelPattern.test(line)) continue;
      labelPattern.lastIndex = 0;
      const withUnit = line.match(
        /(?:[-–—:]|\s)(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м\.?|м2|м²)/i,
      );
      const withoutUnit = line.match(/[-–—:]\s*(\d+(?:[,.]\d+)?)(?:\s|;|$)/);
      const raw = withUnit?.[1] ?? withoutUnit?.[1];
      const formatted = raw ? formatSquareNumber(raw) : "";
      if (formatted) values.push(Number.parseFloat(formatted));
    }
  }
  if (values.length === 0) return "";
  const total = values.reduce((sum, value) => sum + value, 0);
  return normalizeSquareField(formatSquareNumber(total));
}

function toComparableFloorCount(value) {
  const match = asTrimmedString(value).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function normalizeStatus(value) {
  const raw = normalizeKey(value);
  if (!raw) return "";
  return STATUS_ALIASES.get(raw) ?? raw;
}

export const CSV_RU_HEADERS = [
  "Артикул",
  "Название",
  "Стиль",
  "Описание",
  "Общие размеры дома",
  "Экспликация: подвал",
  "Экспликация: 1 этаж",
  "Экспликация: 2 этаж",
  "Гараж",
  "Навес",
  "Площадь гаража",
  "Площадь навеса",
  "Терраса",
  "Подвал",
  "Кол-во спален",
  "Кол-во этажей",
  "Тип фундамента",
  "Стены",
  "Кровля",
  "Облицовка фасада",
  "Площадь участка",
  "Полезная площадь",
  "Общая площадь дома",
  "Площадь всех построек",
  "Стоимость проекта",
  "Старая стоимость",
  "Опубликован",
  "На главной",
  "Изображения",
  "Примечание",
];

export const CSV_RU_HINTS = [
  "Уникальный код проекта, например V-117-N",
  "Название проекта",
  "Архитектурный стиль",
  "Краткое описание",
  "Например 19,5х11 м",
  "Помещения подвала, можно несколько строк",
  "Помещения 1 этажа, можно несколько строк",
  "Помещения 2 этажа, если есть",
  "Нет / Пристроенный / Отдельностоящий",
  "Нет / Пристроенный / Отдельностоящий",
  "Только число или значение с м²",
  "Только число или значение с м²",
  "Да / Нет",
  "Да / Нет",
  "Количество спален",
  "Количество этажей",
  "Например Ленточный",
  "Материал стен, используется как основной материал/фильтр",
  "Например Металлочерепица",
  "Например Облицовочный кирпич",
  "Например 6 или 6 соток",
  "Только число или значение с м²",
  "Только число или значение с м²",
  "Площадь всех построек для расчета стоимости",
  "Текущая цена на сайте",
  "Старая цена для автоматического расчета скидки",
  "Да / Нет",
  "Да / Нет",
  "Ссылки через | или ;",
  "Внутренний комментарий",
];

export const CSV_EXAMPLE_ROW = [
  "V-117-N",
  "Дом площадью: 117м2 в стиле современная классика",
  "Современная классика",
  "Одноэтажный дом с навесом",
  "19,5х11 м",
  "",
  "1. Спальня - 15,20 кв.м.;\n2. Ванная - 4,60 кв.м.;",
  "",
  "Нет",
  "Пристроенный",
  "",
  "31,72",
  "Нет",
  "Нет",
  "2",
  "1",
  "Ж/Б плита",
  "Газобетонные блоки",
  "Металлопрофиль",
  "Декоративная штукатурка",
  "-",
  "117",
  "149",
  "149",
  "31 500₽",
  "59 600₽",
  "Да",
  "Нет",
  "https://example.com/1.jpg|https://example.com/2.jpg",
  "",
];

export function buildCsvTemplate() {
  const escape = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const delimiter = ";";
  const lines = [
    CSV_RU_HEADERS.map(escape).join(delimiter),
    CSV_RU_HINTS.map(escape).join(delimiter),
    CSV_EXAMPLE_ROW.map(escape).join(delimiter),
  ];
  return "\ufeff" + lines.join("\n");
}

/** Строка считается подсказкой (не данными), если в колонке «артикул» типичный текст подсказки */
export function isHintRow(mappedRow) {
  const id = asTrimmedString(mappedRow?.id ?? "");
  if (!id) return true;
  if (/^[(\s—-]/.test(id)) return true;
  if (
    /например|уникальный код|код проекта|название объекта|не заполнять|подсказка/i.test(
      id,
    )
  ) {
    return true;
  }
  return false;
}

export function mapRowKeys(rawRow) {
  const out = {};
  const normalizedEntries = Object.entries(rawRow || {}).map(([k, v]) => [
    normalizeKey(k),
    v,
  ]);
  const hasLegacyDiscountedPrice = normalizedEntries.some(
    ([key]) => key === normalizeKey("Цена со скидкой"),
  );
  const hasExplicitOldPrice = normalizedEntries.some(([key]) =>
    ["Старая стоимость", "Старая цена", "old_price", "oldprice", "old price"]
      .map(normalizeKey)
      .includes(key),
  );

  for (const [key, v] of normalizedEntries) {
    if (
      hasLegacyDiscountedPrice &&
      !hasExplicitOldPrice &&
      key === normalizeKey("Стоимость проекта")
    ) {
      out.old_price = v;
      continue;
    }
    const mapped = HEADER_MAP.get(key);
    if (!mapped) continue;
    out[mapped] = v;
  }
  return out;
}

export function validateRow(mappedRow, rowIndex1, seenIds) {
  const errors = [];

  const id = asTrimmedString(mappedRow.id);
  if (!id) errors.push("ID обязателен");
  else if (id.length > LIMITS.id) errors.push(`ID не длиннее ${LIMITS.id}`);
  else if (seenIds.has(id.toLowerCase())) errors.push("Дубликат ID в файле");
  else seenIds.add(id.toLowerCase());

  const title = asTrimmedString(mappedRow.title);
  if (!title) errors.push("Название обязательно");
  else if (title.length > LIMITS.title)
    errors.push(`Название не длиннее ${LIMITS.title}`);

  const description = asTrimmedString(mappedRow.description);
  if (description.length > LIMITS.description) {
    errors.push(`Описание не длиннее ${LIMITS.description}`);
  }

  const room_explanation = buildRoomExplanation(mappedRow);
  if (room_explanation.length > LIMITS.room_explanation) {
    errors.push(`Экспликация не длиннее ${LIMITS.room_explanation}`);
  }

  const floorsForType = asTrimmedString(mappedRow.floors);
  const type =
    asTrimmedString(mappedRow.type) ||
    (toComparableFloorCount(floorsForType) > 1
      ? "Двухэтажные проекты"
      : floorsForType
        ? "Одноэтажные проекты"
        : "");
  if (!type) errors.push("Категория (type) обязательна");

  const houseAreaSource =
    asTrimmedString(mappedRow.house_area) || asTrimmedString(mappedRow.area);
  const bedrooms = asTrimmedString(mappedRow.bedrooms);
  const floors = floorsForType;
  const materialWalls = asTrimmedString(mappedRow.material_walls);

  if (houseAreaSource.length > LIMITS.area) {
    errors.push(`Площадь дома не длиннее ${LIMITS.area}`);
  }
  if (bedrooms && bedrooms.length > LIMITS.rooms)
    errors.push(`Количество спален не длиннее ${LIMITS.rooms}`);
  if (floors && floors.length > LIMITS.floors)
    errors.push(`Этажей не длиннее ${LIMITS.floors}`);
  if (materialWalls && materialWalls.length > LIMITS.material)
    errors.push(`Стены не длиннее ${LIMITS.material}`);

  const statusRaw = asTrimmedString(mappedRow.status);
  const status = statusRaw ? normalizeStatus(statusRaw) : SALE_STATUS_AVAILABLE;
  if (![SALE_STATUS_AVAILABLE, SALE_STATUS_ORDER].includes(status)) {
    errors.push("Статус: В наличии или Под заказ");
  }

  const published = parseBoolean(mappedRow.published);
  const featured = parseBoolean(mappedRow.featured);

  const garage = normalizeAttachmentChoice(mappedRow.garage);
  const canopy = normalizeAttachmentChoice(mappedRow.canopy);
  const basement = normalizeYesNoChoice(mappedRow.basement);
  const terrace = normalizeYesNoChoice(mappedRow.terrace);

  const images = splitImages(mappedRow.images);

  const price = asTrimmedString(mappedRow.price);
  const old_price = asTrimmedString(mappedRow.old_price);
  const construction_price_from = asTrimmedString(
    mappedRow.construction_price_from,
  );

  const plotAreaRaw = asTrimmedString(mappedRow.plot_area) || null;
  const usableAreaRaw = asTrimmedString(mappedRow.usable_area) || null;

  const plotNorm = plotAreaRaw ? normalizePlotAreaField(plotAreaRaw) : "";
  const houseNorm = houseAreaSource
    ? normalizeSquareField(houseAreaSource)
    : "";
  const usableNorm = usableAreaRaw ? normalizeSquareField(usableAreaRaw) : "";
  const totalBuiltAreaRaw = asTrimmedString(mappedRow.total_built_area) || null;
  const totalBuiltAreaNorm = totalBuiltAreaRaw
    ? normalizeSquareField(totalBuiltAreaRaw)
    : null;
  const explication = buildStructuredExplication(mappedRow);
  const constructionMaterials = buildMaterials(mappedRow);
  const garageAreaRaw =
    asTrimmedString(mappedRow.garage_area) ||
    extractNamedSquareArea(
      /гараж/i,
      mappedRow.room_explanation,
      explication?.basement,
      explication?.floor_1,
      explication?.floor_2,
    );
  const canopyAreaRaw =
    asTrimmedString(mappedRow.canopy_area) ||
    extractNamedSquareArea(
      /навес/i,
      mappedRow.room_explanation,
      explication?.basement,
      explication?.floor_1,
      explication?.floor_2,
    );

  const row = {
    id,
    title,
    description: description || null,
    room_explanation: room_explanation || null,
    type,
    floors: floors || null,
    price: price || null,
    old_price: old_price || null,
    construction_price_from: construction_price_from || null,
    status,
    published: published ?? true,
    featured: featured ?? false,
    images,
    plot_area: plotNorm || null,
    house_area: houseNorm || null,
    usable_area: usableNorm || null,
    implementation_period:
      asTrimmedString(mappedRow.implementation_period) || null,
    house_dimensions: asTrimmedString(mappedRow.house_dimensions) || null,
    style: asTrimmedString(mappedRow.style) || null,
    garage,
    canopy,
    basement,
    terrace,
    bedrooms: bedrooms || null,
    total_built_area: totalBuiltAreaNorm,
    note: asTrimmedString(mappedRow.note) || null,
    garage_area: garageAreaRaw ? normalizeSquareField(garageAreaRaw) : null,
    canopy_area: canopyAreaRaw ? normalizeSquareField(canopyAreaRaw) : null,
    explication_basement: explication?.basement ?? null,
    explication_floor_1: explication?.floor_1 ?? null,
    explication_floor_2: explication?.floor_2 ?? null,
    material_foundation: constructionMaterials?.foundation ?? null,
    material_walls: constructionMaterials?.walls ?? (materialWalls || null),
    material_roof: constructionMaterials?.roof ?? null,
    material_facade: constructionMaterials?.facade ?? null,
    attributes: null,
    __rowNumber: rowIndex1,
  };

  return { row, errors };
}

export function buildSaleProjectImportPayload(row, sortOrderInCategory) {
  const mergedAttributes =
    row?.attributes && typeof row.attributes === "object" ? { ...row.attributes } : {};
  [
    "plot_area",
    "house_area",
    "usable_area",
    "implementation_period",
    "house_dimensions",
    "room_explanation",
    "area",
    "rooms",
    "material",
    "has_garage",
    "has_canopy",
    "has_basement",
    "style",
    "garage",
    "canopy",
    "basement",
    "terrace",
    "bedrooms",
    "total_built_area",
    "garage_area",
    "canopy_area",
    "сanopy_area",
    "discounted_price",
    "discount",
    "print_price",
    "site_status",
    "source_photo_url",
    "material_summary",
    "note",
    "explication",
    "constructionMaterials",
  ].forEach((key) => {
    delete mergedAttributes[key];
  });

  // CSV импорт не может загрузить реальные file-объекты в поле images.
  // Сохраняем исходные URL для последующей миграции изображений.
  if (Array.isArray(row?.images) && row.images.length > 0) {
    mergedAttributes.legacy_image_urls = row.images;
  }

  const hasAttributes =
    Object.keys(mergedAttributes).length > 0 &&
    Object.values(mergedAttributes).some((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v != null && String(v).trim() !== "";
    });

  return {
    external_id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    floors: row.floors,
    price: row.price,
    old_price: row.old_price,
    construction_price_from: row.construction_price_from,
    status: row.status,
    plot_area: row.plot_area ?? row.attributes?.plot_area ?? null,
    house_area: row.house_area ?? row.attributes?.house_area ?? row.area,
    usable_area: row.usable_area ?? row.attributes?.usable_area ?? null,
    implementation_period:
      row.implementation_period ?? row.attributes?.implementation_period ?? null,
    house_dimensions:
      row.house_dimensions ?? row.attributes?.house_dimensions ?? null,
    style: row.style ?? null,
    garage: row.garage ?? null,
    canopy: row.canopy ?? null,
    basement: row.basement ?? null,
    terrace: row.terrace ?? null,
    bedrooms: row.bedrooms ?? null,
    total_built_area: row.total_built_area ?? null,
    garage_area: row.garage_area ?? null,
    canopy_area: row.canopy_area ?? null,
    note: row.note ?? null,
    explication_basement: row.explication_basement ?? null,
    explication_floor_1: row.explication_floor_1 ?? null,
    explication_floor_2: row.explication_floor_2 ?? null,
    material_foundation: row.material_foundation ?? null,
    material_walls: row.material_walls ?? null,
    material_roof: row.material_roof ?? null,
    material_facade: row.material_facade ?? null,
    published: !!row.published,
    featured: !!row.featured,
    sort_order_in_category: sortOrderInCategory,
    ...(hasAttributes ? { attributes: mergedAttributes } : {}),
  };
}
