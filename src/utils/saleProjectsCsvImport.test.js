import { describe, expect, it } from "vitest";
import {
  buildSaleProjectImportPayload,
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
    expect(row.room_explanation).toBe("Кухня — 10 м²");
    expect(row.has_garage).toBe(true);
    expect(row.has_canopy).toBe(false);
    expect(row.area).toBe("100 м²");
    expect(row.construction_price_from).toBe("5 млн");
    expect(row.attributes?.plot_area).toMatch(/соток/);
    expect(row.attributes?.house_area).toBe("100 м²");
    expect(row.attributes?.usable_area).toBe("80 м²");
    expect(row.attributes?.house_dimensions).toBe("10 x 12");
    expect(row.status).toBe(SALE_STATUS_AVAILABLE);
  });

  it("совместимость: колонка «Площадь» без «Площадь дома» заполняет area и attributes.house_area", () => {
    const mapped = mapRowKeys({
      Артикул: "X-1",
      Название: "Тест",
      Категория: "Дома",
      Площадь: "90",
    });
    const seen = new Set();
    const { row, errors } = validateRow(mapped, 2, seen);
    expect(errors).toEqual([]);
    expect(row.area).toBe("90 м²");
    expect(row.attributes?.house_area).toBe("90 м²");
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
});
