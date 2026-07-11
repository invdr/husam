import { describe, it, expect } from "vitest";
import {
  normalizeCatalogSortParam,
  getCatalogSortComparator,
  CATALOG_SORT_DEFAULT,
} from "./catalogSort.js";
import { CATALOG_TYPE_DESIGN } from "./catalogAttributes.js";

describe("catalogSort", () => {
  describe("normalizeCatalogSortParam", () => {
    it("default и пустое", () => {
      expect(normalizeCatalogSortParam(null)).toBe(CATALOG_SORT_DEFAULT);
      expect(normalizeCatalogSortParam("")).toBe(CATALOG_SORT_DEFAULT);
      expect(normalizeCatalogSortParam("default")).toBe(CATALOG_SORT_DEFAULT);
    });

    it("маппинг старых значений", () => {
      expect(normalizeCatalogSortParam("area")).toBe("area-desc");
      expect(normalizeCatalogSortParam("budget")).toBe("budget-desc");
      expect(normalizeCatalogSortParam("duration")).toBe("duration-asc");
    });

    it("неизвестное — default", () => {
      expect(normalizeCatalogSortParam("nope")).toBe(CATALOG_SORT_DEFAULT);
    });

    it("принимает area-asc и т.д.", () => {
      expect(normalizeCatalogSortParam("area-asc")).toBe("area-asc");
      expect(normalizeCatalogSortParam("budget-asc")).toBe("budget-asc");
    });
  });

  describe("getCatalogSortComparator", () => {
    it("area-desc: большая площадь раньше", () => {
      const cmp = getCatalogSortComparator("area-desc");
      const a = {
        type: CATALOG_TYPE_DESIGN,
        area: "",
        attributes: { areaRange: "до 50" },
        sortOrderInCategory: 0,
      };
      const b = {
        type: CATALOG_TYPE_DESIGN,
        area: "",
        attributes: { areaRange: "100+" },
        sortOrderInCategory: 1,
      };
      expect(cmp(a, b)).toBeGreaterThan(0);
    });

    it("area-asc: меньшая площадь раньше", () => {
      const cmp = getCatalogSortComparator("area-asc");
      const a = {
        type: CATALOG_TYPE_DESIGN,
        area: "",
        attributes: { areaRange: "100+" },
        sortOrderInCategory: 0,
      };
      const b = {
        type: CATALOG_TYPE_DESIGN,
        area: "",
        attributes: { areaRange: "до 50" },
        sortOrderInCategory: 1,
      };
      expect(cmp(a, b)).toBeGreaterThan(0);
    });

    it("default: сохраняет входной порядок из hook", () => {
      const cmp = getCatalogSortComparator(CATALOG_SORT_DEFAULT);
      expect(cmp({ sortOrderInCategory: 2 }, { sortOrderInCategory: 1 })).toBe(0);
    });

    it("default: не перемешивает элементы разных категорий по одинаковым позициям", () => {
      const cmp = getCatalogSortComparator(CATALOG_SORT_DEFAULT);
      const sortedByHook = [
        { id: "design-0", sortOrderInCategory: 0 },
        { id: "design-1", sortOrderInCategory: 1 },
        { id: "build-0", sortOrderInCategory: 0 },
        { id: "build-1", sortOrderInCategory: 1 },
      ];
      expect([...sortedByHook].sort(cmp).map((p) => p.id)).toEqual([
        "design-0",
        "design-1",
        "build-0",
        "build-1",
      ]);
    });

    it("сортирует смешанные сроки в месяцах и годах по общей шкале", () => {
      const ascending = getCatalogSortComparator("duration-asc");
      const tenMonths = { id: "10m", attributes: { duration: "10 месяцев" } };
      const oneYear = { id: "1y", attributes: { duration: "1 год" } };
      const compound = { id: "18m", attributes: { duration: "1 год 6 месяцев" } };

      expect(
        [compound, oneYear, tenMonths]
          .sort(ascending)
          .map((item) => item.id),
      ).toEqual(["10m", "1y", "18m"]);
    });
  });
});
