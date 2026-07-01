import {
  normalizePlotAreaField,
  normalizeSquareField,
} from "@/utils/saleProjectFieldNormalize";
import {
  SALE_STATUS_AVAILABLE,
  SALE_STATUS_ORDER,
} from "@/utils/saleProjectAttributes";

export const LIMITS = {
  id: 30,
  title: 80,
  area: 20,
  rooms: 15,
  floors: 15,
  material: 30,
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
    ["id", ["id", "артикул", "артикул (id)", "код", "sku"]],
    ["title", ["title", "название", "имя", "наименование"]],
    ["description", ["description", "описание", "описание проекта"]],
    [
      "room_explanation",
      ["room_explanation", "экспликация", "экспликация проекта", "поэтажка"],
    ],
    ["has_garage", ["has_garage", "гараж", "есть гараж"]],
    ["has_canopy", ["has_canopy", "навес", "есть навес"]],
    ["has_basement", ["has_basement", "подвал", "есть подвал", "цоколь"]],
    ["type", ["type", "категория", "тип", "раздел"]],
    ["area", ["area", "площадь"]],
    ["rooms", ["rooms", "комнаты", "кол-во комнат", "количество комнат"]],
    ["floors", ["floors", "этажей", "этажи"]],
    ["material", ["material", "материал"]],
    ["price", ["price", "цена"]],
    [
      "old_price",
      ["old_price", "oldprice", "old price", "старая цена", "старая_цена"],
    ],
    [
      "construction_price_from",
      [
        "construction_price_from",
        "стоимость строительства от",
        "строительство от",
        "цена строительства",
      ],
    ],
    ["status", ["status", "статус"]],
    ["published", ["published", "опубликован", "публикация", "видимость"]],
    ["featured", ["featured", "на главной", "главная", "в избранном"]],
    [
      "images",
      ["images", "image", "изображения", "картинки", "фото", "urls", "url"],
    ],
    ["plot_area", ["plot_area", "площадь участка", "участок"]],
    ["house_area", ["house_area", "площадь дома", "дом"]],
    ["usable_area", ["usable_area", "полезная площадь"]],
    [
      "implementation_period",
      ["implementation_period", "срок реализации", "срок", "период реализации"],
    ],
    [
      "house_dimensions",
      [
        "house_dimensions",
        "общие размеры",
        "общие размеры дома",
        "размеры дома",
        "размеры",
        "габариты",
      ],
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
  if (["1", "true", "yes", "y", "да", "on", "вкл"].includes(raw)) return true;
  if (["0", "false", "no", "n", "нет", "off", "выкл"].includes(raw))
    return false;
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

function normalizeStatus(value) {
  const raw = normalizeKey(value);
  if (!raw) return "";
  return STATUS_ALIASES.get(raw) ?? raw;
}

export const CSV_RU_HEADERS = [
  "Артикул",
  "Название",
  "Описание",
  "Экспликация",
  "Есть гараж",
  "Есть навес",
  "Есть подвал",
  "Категория",
  "Комнаты",
  "Этажи",
  "Материал",
  "Площадь дома",
  "Цена",
  "Старая цена",
  "Стоимость строительства от",
  "Статус",
  "Опубликован",
  "На главной",
  "Изображения",
  "Площадь участка",
  "Полезная площадь",
  "Общие размеры дома",
  "Срок реализации",
];

export const CSV_RU_HINTS = [
  "Уникальный код проекта (например SP-001)",
  "Название объекта для отображения на сайте",
  "Краткое описание (как в форме)",
  "Комната — площадь, по строкам; можно через \\n",
  "Да / Нет",
  "Да / Нет",
  "Да / Нет",
  "Раздел: Дом, Участок и т.д. (новые создаются автоматически)",
  "Количество комнат",
  "Количество этажей",
  "Материал стен (газоблок, кирпич и т.д.)",
  "Только число — м² подставится автоматически (как «Площадь дома» в форме)",
  "Цена в рублях",
  "Старая цена (зачеркнутая), руб",
  "Текст для блока «Стоимость строительства от …»",
  "В наличии / Под заказ",
  "Да или Нет — показывать на сайте",
  "Да или Нет — вывести на главную",
  "Ссылки на фото через | или ;",
  "Например 6 соток или число — м² подставится при числе",
  "Только число — м² подставится автоматически",
  "Например 12,6м х 14,6м",
  "Срок реализации (например 6 месяцев)",
];

export const CSV_EXAMPLE_ROW = [
  "SP-001",
  "Дом 120",
  "Одноэтажный дом с террасой",
  "Кухня — 18 м²\nГостиная — 32 м²",
  "Нет",
  "Да",
  "Нет",
  "Дом",
  "3",
  "2",
  "Газоблок",
  "120",
  "5900000",
  "6400000",
  "15 000 000",
  "В наличии",
  "Да",
  "Нет",
  "https://example.com/1.jpg|https://example.com/2.jpg",
  "6 соток",
  "95",
  "12,6м х 14,6м",
  "6 месяцев",
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
  for (const [k, v] of Object.entries(rawRow || {})) {
    const mapped = HEADER_MAP.get(normalizeKey(k));
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

  const room_explanation = asTrimmedString(mappedRow.room_explanation);
  if (room_explanation.length > LIMITS.room_explanation) {
    errors.push(`Экспликация не длиннее ${LIMITS.room_explanation}`);
  }

  const type = asTrimmedString(mappedRow.type);
  if (!type) errors.push("Категория (type) обязательна");

  const houseAreaSource =
    asTrimmedString(mappedRow.house_area) || asTrimmedString(mappedRow.area);
  const rooms = asTrimmedString(mappedRow.rooms);
  const floors = asTrimmedString(mappedRow.floors);
  const material = asTrimmedString(mappedRow.material);

  if (houseAreaSource.length > LIMITS.area) {
    errors.push(`Площадь дома не длиннее ${LIMITS.area}`);
  }
  if (rooms && rooms.length > LIMITS.rooms)
    errors.push(`Комнаты не длиннее ${LIMITS.rooms}`);
  if (floors && floors.length > LIMITS.floors)
    errors.push(`Этажей не длиннее ${LIMITS.floors}`);
  if (material && material.length > LIMITS.material)
    errors.push(`Материал не длиннее ${LIMITS.material}`);

  const statusRaw = asTrimmedString(mappedRow.status);
  const status = statusRaw ? normalizeStatus(statusRaw) : SALE_STATUS_AVAILABLE;
  if (![SALE_STATUS_AVAILABLE, SALE_STATUS_ORDER].includes(status)) {
    errors.push("Статус: В наличии или Под заказ");
  }

  const published = parseBoolean(mappedRow.published);
  const featured = parseBoolean(mappedRow.featured);

  const has_garage = parseBoolean(mappedRow.has_garage) ?? false;
  const has_canopy = parseBoolean(mappedRow.has_canopy) ?? false;
  const has_basement = parseBoolean(mappedRow.has_basement) ?? false;

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

  const attrs = {
    plot_area: plotNorm || null,
    house_area: houseNorm || null,
    usable_area: usableNorm || null,
    implementation_period:
      asTrimmedString(mappedRow.implementation_period) || null,
    house_dimensions: asTrimmedString(mappedRow.house_dimensions) || null,
  };
  const attributes = Object.values(attrs).some(
    (v) => v != null && String(v).trim() !== "",
  )
    ? attrs
    : null;

  const row = {
    id,
    title,
    description: description || null,
    room_explanation: room_explanation || null,
    has_garage: !!has_garage,
    has_canopy: !!has_canopy,
    has_basement: !!has_basement,
    type,
    area: houseNorm || null,
    rooms: rooms || null,
    floors: floors || null,
    material: material || null,
    price: price || null,
    old_price: old_price || null,
    construction_price_from: construction_price_from || null,
    status,
    published: published ?? true,
    featured: featured ?? false,
    images,
    attributes,
    __rowNumber: rowIndex1,
  };

  return { row, errors };
}

export function buildSaleProjectImportPayload(row, sortOrderInCategory) {
  const mergedAttributes =
    row?.attributes && typeof row.attributes === "object" ? { ...row.attributes } : {};

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
    room_explanation: row.room_explanation,
    has_garage: !!row.has_garage,
    has_canopy: !!row.has_canopy,
    has_basement: !!row.has_basement,
    type: row.type,
    area: row.area,
    rooms: row.rooms,
    floors: row.floors,
    material: row.material,
    price: row.price,
    old_price: row.old_price,
    construction_price_from: row.construction_price_from,
    status: row.status,
    published: !!row.published,
    featured: !!row.featured,
    sort_order_in_category: sortOrderInCategory,
    ...(hasAttributes ? { attributes: mergedAttributes } : {}),
  };
}
