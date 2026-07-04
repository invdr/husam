import { describe, expect, it } from "vitest";
import {
  buildSaleProjectImportPayload,
  CSV_EXAMPLE_ROW,
  CSV_RU_HEADERS,
  mapRowKeys,
  validateRow,
} from "./saleProjectsCsvImport";
import { SALE_STATUS_AVAILABLE } from "./saleProjectAttributes";

describe("saleProjectsCsvImport", () => {
  it("маппит русские заголовки и собирает строку как в форме создания", () => {
    const raw = {
      Артикул: "SP-TEST",
      Название: "Дом",
      Описание: "Текст",
      Экспликация: "Кухня — 10 м²",
      "Есть гараж": "Да",
      "Есть навес": "Нет",
      "Есть подвал": "Нет",
      Категория: "Дома",
      Комнаты: "3",
      Этажи: "2",
      Материал: "Кирпич",
      "Площадь дома": "100",
      Цена: "1",
      "Старая цена": "",
      "Стоимость строительства от": "5 млн",
      Статус: "В наличии",
      Опубликован: "Да",
      "На главной": "Нет",
      Изображения: "",
      "Площадь участка": "6 соток",
      "Полезная площадь": "80",
      "Общие размеры дома": "10 x 12",
      "Срок реализации": "1 год",
    };
    const mapped = mapRowKeys(raw);
    const seen = new Set();
    const { row, errors } = validateRow(mapped, 2, seen);
    expect(errors).toEqual([]);
    expect(row.description).toBe("Текст");
    expect(row.explication_floor_1).toBe("Кухня — 10 м²");
    expect(row.garage).toBe("Пристроенный");
    expect(row.canopy).toBe("Нет");
    expect(row.house_area).toBe("100 м²");
    expect(row.construction_price_from).toBe("5 млн");
    expect(row.plot_area).toMatch(/соток/);
    expect(row.usable_area).toBe("80 м²");
    expect(row.house_dimensions).toBe("10 x 12");
    expect(row.status).toBe(SALE_STATUS_AVAILABLE);
  });

  it("совместимость: колонка «Площадь» без «Площадь дома» заполняет house_area", () => {
    const mapped = mapRowKeys({
      Артикул: "X-1",
      Название: "Тест",
      Категория: "Дома",
      Площадь: "90",
    });
    const seen = new Set();
    const { row, errors } = validateRow(mapped, 2, seen);
    expect(errors).toEqual([]);
    expect(row.house_area).toBe("90 м²");
  });

  it("импорт-пейлоад не пишет системный id и не отправляет URL в images", () => {
    const payload = buildSaleProjectImportPayload(
      {
        id: "SP-001",
        title: "Дом 120",
        type: "Дома",
        status: SALE_STATUS_AVAILABLE,
        published: true,
        featured: false,
        images: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
        attributes: { plot_area: "6 соток" },
      },
      3,
    );

    expect(payload.id).toBeUndefined();
    expect(payload.external_id).toBe("SP-001");
    expect(payload.images).toBeUndefined();
    expect(payload.attributes?.legacy_image_urls).toEqual([
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
    ]);
  });
  it("maps Excel registry columns into structured attributes", () => {
    const mapped = mapRowKeys({
      Артикул: "V-117-N",
      Название: "Дом 117",
      Описание: "Одноэтажный дом",
      "Кол-во этажей": "1",
      "Кол-во спален": "2",
      Стиль: "Современная классика",
      "1й этаж": "1. Спальня - 15,20 кв.м.\n2. Навес - 31,72 кв.м.",
      Навес: "Пристроенный",
      Подвал: "Нет",
      "Тип фундамента": "Ж/Б плита",
      Стены: "Газобетонные блоки",
      Кровля: "Металлопрофиль",
      "Облицовка фасада": "Декоративная штукатурка",
      "Цена со скидкой": "31 500₽",
      "Стоимость проекта": "59 600₽",
      "Перенесен на сайт": "Опубликован",
      Изображения: "https://example.com/1.jpg",
      "Общая площадь дома": "117",
    });
    const { row, errors } = validateRow(mapped, 2, new Set());

    expect(errors).toEqual([]);
    expect(row.type).toBe("Одноэтажные проекты");
    expect(row.price).toBe("31 500₽");
    expect(row.old_price).toBe("59 600₽");
    expect(row.published).toBe(true);
    expect(row.canopy).toBe("Пристроенный");
    expect(row.basement).toBe("Нет");
    expect(row.room_explanation).toContain("1 этаж");
    expect(row.style).toBe("Современная классика");
    expect(row.bedrooms).toBe("2");
    expect(row.material_foundation).toBe("Ж/Б плита");
    expect(row.material_walls).toBe("Газобетонные блоки");
    expect(row.material_roof).toBe("Металлопрофиль");
    expect(row.material_facade).toBe("Декоративная штукатурка");
    expect(row.explication_floor_1).toContain("Спальня");
    expect(row.canopy_area).toBe("31.72 м²");
    expect(row.images).toEqual(["https://example.com/1.jpg"]);
  });

  it("maps every generated CSV template column used by the example row", () => {
    const raw = Object.fromEntries(
      CSV_RU_HEADERS.map((header, index) => [header, CSV_EXAMPLE_ROW[index] ?? ""]),
    );
    const mapped = mapRowKeys(raw);
    const { row, errors } = validateRow(mapped, 3, new Set());

    expect(errors).toEqual([]);
    expect(row.explication_floor_1).toContain("Спальня");
    expect(row.material_summary).toBeUndefined();
    expect(row.canopy).toBe("Пристроенный");
    expect(row.price).toBe("31 500₽");
    expect(row.old_price).toBe("59 600₽");
    expect(row.images).toEqual([
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
    ]);
  });

  it("импорт-пейлоад пишет реестровые поля top-level, а не дублирует их в attributes", () => {
    const raw = Object.fromEntries(
      CSV_RU_HEADERS.map((header, index) => [header, CSV_EXAMPLE_ROW[index] ?? ""]),
    );
    const mapped = mapRowKeys(raw);
    const { row, errors } = validateRow(mapped, 3, new Set());
    const payload = buildSaleProjectImportPayload(row, 0);

    expect(errors).toEqual([]);
    expect(payload.style).toBe("Современная классика");
    expect(payload.material_walls).toBe("Газобетонные блоки");
    expect(payload.explication_floor_1).toContain("Спальня");
    expect(payload.canopy_area).toBe("31.72 м²");
    expect(payload.material_summary).toBeUndefined();
    expect(payload.source_photo_url).toBeUndefined();
    expect(payload.area).toBeUndefined();
    expect(payload.material).toBeUndefined();
    expect(payload.rooms).toBeUndefined();
    expect(payload.has_garage).toBeUndefined();
    expect(payload.discounted_price).toBeUndefined();
    expect(payload.discount).toBeUndefined();
    expect(payload.attributes?.plot_area).toBeUndefined();
    expect(payload.attributes?.constructionMaterials).toBeUndefined();
    expect(payload.attributes?.legacy_image_urls).toEqual([
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
    ]);
  });
});
