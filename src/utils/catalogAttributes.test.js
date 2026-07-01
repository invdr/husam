import { describe, it, expect } from "vitest";
import {
  CATALOG_TYPE_DESIGN,
  CATALOG_TYPE_REPAIR,
  CATALOG_TYPE_BUILD,
  isDesignType,
  isRepairType,
  isBuildType,
  getDesignAreaRangeLabel,
  getDisplayFields,
  getCardDisplayFields,
  getCatalogSortAreaComparable,
  getCatalogSortBudgetComparable,
  getCatalogSortDurationComparable,
  DESIGN_AREA_RANGES,
} from "./catalogAttributes.js";

describe("catalogAttributes", () => {
  describe("isDesignType", () => {
    it("возвращает true для типа «Дизайн проекты» и «Дизайн»", () => {
      expect(isDesignType(CATALOG_TYPE_DESIGN)).toBe(true);
      expect(isDesignType("Дизайн")).toBe(true);
    });

    it("возвращает false для ремонт/строительство", () => {
      expect(isDesignType(CATALOG_TYPE_REPAIR)).toBe(false);
      expect(isDesignType(CATALOG_TYPE_BUILD)).toBe(false);
    });
  });

  describe("isRepairType", () => {
    it("возвращает true только для Ремонт", () => {
      expect(isRepairType(CATALOG_TYPE_REPAIR)).toBe(true);
      expect(isRepairType(CATALOG_TYPE_DESIGN)).toBe(false);
    });
  });

  describe("isBuildType", () => {
    it("возвращает true только для Строительство", () => {
      expect(isBuildType(CATALOG_TYPE_BUILD)).toBe(true);
      expect(isBuildType(CATALOG_TYPE_REPAIR)).toBe(false);
    });
  });

  describe("getDesignAreaRangeLabel", () => {
    it("возвращает метку по value из DESIGN_AREA_RANGES", () => {
      const first = DESIGN_AREA_RANGES[0];
      expect(getDesignAreaRangeLabel(first.value)).toBe(first.label);
    });

    it("для «Другое» возвращает «—»", () => {
      expect(getDesignAreaRangeLabel("Другое")).toBe("—");
    });

    it("для неизвестного value возвращает сам value или «—»", () => {
      expect(getDesignAreaRangeLabel("unknown")).toBe("unknown");
      expect(getDesignAreaRangeLabel("")).toBe("—");
    });
  });

  describe("getDisplayFields", () => {
    it("для типа Дизайн возвращает поля с objectType, style, areaRange", () => {
      const project = {
        type: CATALOG_TYPE_DESIGN,
        attributes: {
          objectType: "2-к",
          style: "Скандинавский",
          areaRange: "50-100",
        },
      };
      const fields = getDisplayFields(project);
      expect(fields.some((f) => f.label === "Тип объекта" && f.value === "2-к")).toBe(true);
      expect(fields.some((f) => f.label === "Стиль" && f.value === "Скандинавский")).toBe(true);
    });

    it("для типа Ремонт возвращает поля ремонта", () => {
      const project = {
        type: CATALOG_TYPE_REPAIR,
        attributes: { propertyType: "Вторичное жилье", repairType: "Капитальный (с заменой коммуникаций)" },
      };
      const fields = getDisplayFields(project);
      expect(fields.some((f) => f.label === "Тип недвижимости")).toBe(true);
      expect(fields.some((f) => f.label === "Вид ремонта")).toBe(true);
    });

    it("для типа Строительство возвращает площадь и срок", () => {
      const project = {
        type: CATALOG_TYPE_BUILD,
        attributes: { plotArea: "10", duration: "12 мес" },
      };
      const fields = getDisplayFields(project);
      expect(fields.some((f) => f.label === "Площадь участка")).toBe(true);
      expect(fields.some((f) => f.label === "Срок реализации")).toBe(true);
    });

    it("для типа Строительство подставляет legacy area и duration без attributes", () => {
      const fields = getDisplayFields({
        type: CATALOG_TYPE_BUILD,
        area: "280 м²",
        duration: "8 месяцев",
        attributes: {},
      });
      expect(fields).toContainEqual({ label: "Площадь дома", value: "280 м²" });
      expect(fields).toContainEqual({ label: "Срок реализации", value: "8 месяцев" });
    });

    it("для типа Ремонт подставляет legacy area и duration без attributes", () => {
      const fields = getDisplayFields({
        type: CATALOG_TYPE_REPAIR,
        area: "72 м²",
        duration: "2 месяца",
        attributes: {},
      });
      expect(fields).toContainEqual({ label: "Площадь дома", value: "72 м²" });
      expect(fields).toContainEqual({ label: "Срок реализации", value: "2 месяца" });
    });

    it("для неизвестного типа возвращает универсальный набор (area, duration, budget, location)", () => {
      const project = { type: "Other", area: "100", duration: "6 мес" };
      const fields = getDisplayFields(project);
      expect(fields.some((f) => f.label === "Площадь")).toBe(true);
      expect(fields.some((f) => f.label === "Срок")).toBe(true);
    });
  });

  describe("getCardDisplayFields", () => {
    it("возвращает только непустые поля: участок, дом, полезная, срок", () => {
      const project = {
        attributes: { plotArea: "8", houseArea: "120", usefulArea: "95", duration: "10 мес" },
      };
      const fields = getCardDisplayFields(project);
      expect(fields.length).toBe(4);
      expect(fields.some((f) => f.label === "Площадь участка" && f.value === "8")).toBe(true);
      expect(fields.some((f) => f.label === "Срок реализации" && f.value === "10 мес")).toBe(true);
    });

    it("исключает поля с пустым значением", () => {
      const project = {
        attributes: { plotArea: "8", houseArea: "", usefulArea: "", duration: "" },
      };
      const fields = getCardDisplayFields(project);
      expect(fields.length).toBe(1);
      expect(fields[0].label).toBe("Площадь участка");
    });

    it("для Дизайн добавляет Площадь и Стиль (диапазон + стиль)", () => {
      const project = {
        type: CATALOG_TYPE_DESIGN,
        attributes: {
          areaRange: "50-100",
          style: "Лофт",
        },
      };
      const fields = getCardDisplayFields(project);
      expect(fields.find((f) => f.label === "Площадь")?.value).toBe("50–100 м²");
      expect(fields.find((f) => f.label === "Стиль")?.value).toBe("Лофт");
    });

    it("для Дизайн: площадь из project.area если диапазон не задан", () => {
      const project = {
        type: CATALOG_TYPE_DESIGN,
        area: "88 м²",
        attributes: {},
      };
      const fields = getCardDisplayFields(project);
      expect(fields.find((f) => f.label === "Площадь")?.value).toBe("88 м²");
    });

    it("для строительства показывает legacy area и duration на карточке", () => {
      const fields = getCardDisplayFields({
        type: CATALOG_TYPE_BUILD,
        area: "280 м²",
        duration: "8 месяцев",
        attributes: {},
      });
      expect(fields).toContainEqual({ label: "Площадь дома", value: "280 м²" });
      expect(fields).toContainEqual({ label: "Срок реализации", value: "8 месяцев" });
    });
  });

  describe("сортировка каталога (comparable)", () => {
    it("дизайн: площадь из areaRange, а не из пустого project.area", () => {
      const small = {
        type: CATALOG_TYPE_DESIGN,
        area: "",
        attributes: { areaRange: "до 50" },
      };
      const large = {
        type: CATALOG_TYPE_DESIGN,
        area: "",
        attributes: { areaRange: "100+" },
      };
      expect(getCatalogSortAreaComparable(large)).toBeGreaterThan(
        getCatalogSortAreaComparable(small),
      );
    });

    it("дизайн: бюджет из attributes при пустом project.budget", () => {
      const a = {
        type: CATALOG_TYPE_DESIGN,
        budget: "",
        attributes: { budget: "2 млн ₽" },
      };
      const b = {
        type: CATALOG_TYPE_DESIGN,
        budget: "",
        attributes: { budget: "5 900 000 ₽" },
      };
      expect(getCatalogSortBudgetComparable(b)).toBeGreaterThan(
        getCatalogSortBudgetComparable(a),
      );
    });

    it("понимает бюджет в миллионах при сортировке", () => {
      const millionBudget = {
        type: CATALOG_TYPE_DESIGN,
        attributes: { budget: "8 млн ₽" },
      };
      const rubleBudget = {
        type: CATALOG_TYPE_DESIGN,
        attributes: { budget: "5 900 000 ₽" },
      };
      expect(getCatalogSortBudgetComparable(millionBudget)).toBeGreaterThan(
        getCatalogSortBudgetComparable(rubleBudget),
      );
    });

    it("ремонт/стройка: площадь из houseArea в attributes", () => {
      const p = {
        type: CATALOG_TYPE_REPAIR,
        area: "",
        attributes: { houseArea: "180 м²" },
      };
      expect(getCatalogSortAreaComparable(p)).toBe(180);
    });

    it("срок: берётся attributes.duration", () => {
      const short = {
        attributes: { duration: "3 мес" },
        duration: "12 мес",
      };
      const long = {
        attributes: { duration: "12 мес" },
        duration: "3 мес",
      };
      expect(getCatalogSortDurationComparable(short)).toBeLessThan(
        getCatalogSortDurationComparable(long),
      );
    });
  });
});
