import { describe, it, expect } from "vitest";
import {
  parseSaleProjectCustomFields,
  toComparableNumber,
  compareSaleProjectPrice,
  formatPrice,
  getSaleStatusLabel,
  getSaleStatusClassName,
  SALE_STATUS_AVAILABLE,
  SALE_STATUS_ORDER,
  getSaleDisplayFields,
  getSaleCardDisplayFields,
  getFilterMaterialsFromProjects,
  getFilterAreaRangesFromProjects,
  getFilterRoomsFromProjects,
  matchAreaFilter,
  matchRoomsFilter,
  matchMaterialFilter,
  matchFloorsFilter,
  FILTER_ANY,
} from "./saleProjectAttributes.js";

describe("saleProjectAttributes", () => {
  describe("parseSaleProjectCustomFields", () => {
    it("возвращает пустой массив для null/undefined/пустой строки", () => {
      expect(parseSaleProjectCustomFields(null)).toEqual([]);
      expect(parseSaleProjectCustomFields(undefined)).toEqual([]);
      expect(parseSaleProjectCustomFields("")).toEqual([]);
      expect(parseSaleProjectCustomFields("   ")).toEqual([]);
    });

    it("парсит валидный JSON-массив с key/label", () => {
      const raw = '[{"key":"custom_1","label":"Поле 1"}]';
      expect(parseSaleProjectCustomFields(raw)).toEqual([{ key: "custom_1", label: "Поле 1" }]);
    });

    it("нормализует key: пробелы в подчёркивания, trim", () => {
      const raw = '[{"key":"  my field  ","label":"My Field"}]';
      expect(parseSaleProjectCustomFields(raw)).toEqual([{ key: "my_field", label: "My Field" }]);
    });

    it("отбрасывает старые дубли стандартных полей", () => {
      const raw = JSON.stringify([
        { key: "garage_area", label: "Площадь гаража" },
        { key: "persent_of_sale", label: "Старый дубль" },
        { key: "ceiling_height", label: "Высота потолков" },
      ]);

      expect(parseSaleProjectCustomFields(raw)).toEqual([
        { key: "ceiling_height", label: "Высота потолков" },
      ]);
    });

    it("отбрасывает элементы без key или с пустым key", () => {
      const raw = '[{"key":"a","label":"A"},{"label":"B"},{"key":"","label":"C"}]';
      expect(parseSaleProjectCustomFields(raw)).toEqual([{ key: "a", label: "A" }]);
    });

    it("при невалидном JSON возвращает []", () => {
      expect(parseSaleProjectCustomFields("not json")).toEqual([]);
    });
  });

  describe("toComparableNumber", () => {
    it("извлекает число из строки с пробелами и ₽", () => {
      expect(toComparableNumber("5 900 000 ₽")).toBe(5900000);
    });

    it("извлекает число из строки с м²", () => {
      expect(toComparableNumber("120 м²")).toBe(120);
    });

    it("заменяет запятую на точку", () => {
      expect(toComparableNumber("12,5")).toBe(12.5);
    });

    it("для пустой строки возвращает 0", () => {
      expect(toComparableNumber("")).toBe(0);
      expect(toComparableNumber("  ")).toBe(0);
    });
  });

  describe("formatPrice", () => {
    it("форматирует число в рубли с разделителями", () => {
      expect(formatPrice(5900000)).toMatch(/5\s900\s000.*₽/);
    });

    it("для 0 или пустого возвращает «Стоимость по запросу»", () => {
      expect(formatPrice(0)).toBe("Стоимость по запросу");
      expect(formatPrice("")).toBe("Стоимость по запросу");
    });
  });

  describe("compareSaleProjectPrice", () => {
    it("puts projects without a price after priced projects", () => {
      const sortedAsc = [
        { id: "request", price: "" },
        { id: "cheap", price: "5 900 000" },
        { id: "expensive", price: "8 mln" },
      ].sort((a, b) => compareSaleProjectPrice(a, b, "asc"));

      expect(sortedAsc.map((p) => p.id)).toEqual([
        "cheap",
        "expensive",
        "request",
      ]);
    });
  });

  describe("getSaleStatusLabel", () => {
    it("возвращает метки для известных статусов", () => {
      expect(getSaleStatusLabel(SALE_STATUS_AVAILABLE)).toBe("В наличии");
      expect(getSaleStatusLabel(SALE_STATUS_ORDER)).toBe("Под заказ");
    });

    it("для неизвестного статуса возвращает «Под заказ»", () => {
      expect(getSaleStatusLabel("unknown")).toBe("Под заказ");
    });
  });

  describe("getSaleStatusClassName", () => {
    it("для available возвращает классы с emerald", () => {
      expect(getSaleStatusClassName(SALE_STATUS_AVAILABLE)).toContain("emerald");
    });

    it("для order возвращает классы с amber", () => {
      expect(getSaleStatusClassName(SALE_STATUS_ORDER)).toContain("amber");
    });
  });

  describe("getSaleDisplayFields", () => {
    it("включает только поля с непустыми значениями", () => {
      const project = { bedrooms: "3", area: "120", floors: "", material: "Кирпич" };
      const fields = getSaleDisplayFields(project);
      expect(fields.some((f) => f.label === "Количество спален" && f.value === "3")).toBe(true);
      expect(fields.some((f) => f.label === "Площадь дома" && f.value === "120")).toBe(true);
      expect(fields.some((f) => f.label === "Стены" && f.value === "Кирпич")).toBe(true);
    });

    it("использует house_area, если legacy area пустая", () => {
      const fields = getSaleDisplayFields({ area: "", house_area: "120 м²" });
      expect(fields).toContainEqual({ label: "Площадь дома", value: "120 м²" });
    });

    it("исключает поля со значением «—» или пустые", () => {
      const project = { rooms: "3", floors: "—", area: "" };
      const fields = getSaleDisplayFields(project);
      expect(fields.find((f) => f.label === "Этажей")).toBeUndefined();
    });

    it("does not duplicate structured construction materials in generic fields", () => {
      const fields = getSaleDisplayFields({
        material: "Газобетон",
        attributes: {
          constructionMaterials: {
            foundation: "Ж/Б плита",
            walls: "Газобетон",
            roof: "Металл",
          },
        },
      });

      expect(fields).toContainEqual({ label: "Стены", value: "Газобетон" });
      expect(fields.find((f) => f.label === "Фундамент")).toBeUndefined();
      expect(fields.find((f) => f.label === "Кровля")).toBeUndefined();
    });

    it("считает скидку из старой и текущей стоимости", () => {
      const fields = getSaleDisplayFields({
        price: "32 700",
        oldPrice: "46 800",
      });

      expect(fields).toContainEqual({ label: "Скидка", value: "30%" });
    });
  });

  describe("getSaleCardDisplayFields", () => {
    it("возвращает поля для карточки без пустых", () => {
      const project = { plot_area: "10", house_area: "150" };
      const fields = getSaleCardDisplayFields(project);
      expect(fields.some((f) => f.label === "Площадь участка" && f.value === "10")).toBe(true);
      expect(fields.some((f) => f.label === "Площадь дома" && f.value === "150")).toBe(true);
    });

    it("keeps configured custom fields within the compact card limit", () => {
      const project = {
        house_area: "150",
        floors: "2",
        rooms: "4",
        material: "Кирпич",
        style: "Классика",
        plot_area: "10",
        attributes: { ceiling_height: "3 м" },
      };
      const fields = getSaleCardDisplayFields(project, [
        { key: "ceiling_height", label: "Высота потолков" },
      ]);

      expect(fields).toHaveLength(6);
      expect(fields).toContainEqual({ label: "Высота потолков", value: "3 м" });
    });
  });

  describe("getFilterMaterialsFromProjects", () => {
    it("собирает уникальные материалы и добавляет «Любой»", () => {
      const projects = [{ material: "Кирпич" }, { material: "Газоблок" }, { material: "Кирпич" }];
      const options = getFilterMaterialsFromProjects(projects);
      expect(options[0]).toEqual({ value: FILTER_ANY, label: "Любой" });
      expect(options).toContainEqual({ value: "Кирпич", label: "Кирпич" });
      expect(options).toContainEqual({ value: "Газоблок", label: "Газоблок" });
      expect(options.length).toBe(3);
    });
  });

  describe("getFilterAreaRangesFromProjects", () => {
    it("включает только диапазоны, в которых есть проекты", () => {
      const projects = [{ area: "80" }, { area: "250" }];
      const options = getFilterAreaRangesFromProjects(projects);
      expect(options[0].value).toBe(FILTER_ANY);
      expect(options.some((o) => o.value === "50-100")).toBe(true);
      expect(options.some((o) => o.value === "200-500")).toBe(true);
    });

    it("не включает пустую площадь в диапазон до 50", () => {
      const options = getFilterAreaRangesFromProjects([{ area: "" }]);
      expect(options).toEqual([{ value: FILTER_ANY, label: "Любая" }]);
    });
  });

  describe("getFilterRoomsFromProjects", () => {
    it("включает только диапазоны комнат с проектами", () => {
      const projects = [{ rooms: "3" }, { rooms: "5" }];
      const options = getFilterRoomsFromProjects(projects);
      expect(options[0].value).toBe(FILTER_ANY);
      expect(options.some((o) => o.value === "2-3")).toBe(true);
      expect(options.some((o) => o.value === "4-5")).toBe(true);
    });

    it("не включает пустые комнаты в диапазон до 1", () => {
      const options = getFilterRoomsFromProjects([{ rooms: "" }]);
      expect(options).toEqual([{ value: FILTER_ANY, label: "Любое" }]);
    });
  });

  describe("matchAreaFilter", () => {
    it("при пустом filterValue возвращает true", () => {
      expect(matchAreaFilter({ area: "100" }, "")).toBe(true);
    });

    it("проверяет попадание в диапазон min-max", () => {
      expect(matchAreaFilter({ area: "120" }, "50-150")).toBe(true);
      expect(matchAreaFilter({ area: "30" }, "50-150")).toBe(false);
      expect(matchAreaFilter({ area: "200" }, "50-150")).toBe(false);
    });

    it("не матчится по выбранному диапазону, если площадь пустая", () => {
      expect(matchAreaFilter({ area: "" }, "0-50")).toBe(false);
    });
  });

  describe("matchRoomsFilter", () => {
    it("при пустом filterValue возвращает true", () => {
      expect(matchRoomsFilter({ rooms: "3" }, "")).toBe(true);
    });

    it("проверяет попадание в диапазон комнат", () => {
      expect(matchRoomsFilter({ rooms: "3" }, "2-3")).toBe(true);
      expect(matchRoomsFilter({ rooms: "5" }, "2-3")).toBe(false);
    });

    it("не матчится по выбранному диапазону, если комнаты пустые", () => {
      expect(matchRoomsFilter({ rooms: "" }, "0-1")).toBe(false);
    });
  });

  describe("matchMaterialFilter", () => {
    it("при пустом filterValue возвращает true", () => {
      expect(matchMaterialFilter({ material: "Кирпич" }, "")).toBe(true);
    });

    it("точное совпадение по материалу", () => {
      expect(matchMaterialFilter({ material: "Кирпич" }, "Кирпич")).toBe(true);
    });

    it("подстрока (дерево/брус)", () => {
      expect(matchMaterialFilter({ material: "Клееный брус" }, "Брус")).toBe(true);
    });
  });

  describe("matchFloorsFilter", () => {
    it("при пустом filterValue возвращает true", () => {
      expect(matchFloorsFilter({ floors: "2" }, "")).toBe(true);
    });

    it("совпадение по этажам", () => {
      expect(matchFloorsFilter({ floors: "2" }, "2")).toBe(true);
      expect(matchFloorsFilter({ floors: "1" }, "2")).toBe(false);
    });
  });
});
