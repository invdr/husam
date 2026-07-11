import { describe, expect, it } from "vitest";
import {
  EMPTY_CATALOG_FILTERS,
  appendCatalogFilters,
  filterCatalogProjects,
  getCatalogFilterDefinitions,
  getCatalogFilterOptions,
  parseCatalogFilters,
  toDurationMonths,
} from "./catalogFilters.js";

const designProjects = [
  {
    id: "d1",
    type: "Дизайн проекты",
    area: "114",
    attributes: { objectType: "Частный дом", style: "Другое", styleOther: "Неоклассика" },
  },
  {
    id: "d2",
    type: "Дизайн проекты",
    area: "82",
    attributes: { objectType: "2-к", style: "Минимализм" },
  },
];

describe("catalogFilters", () => {
  it("создаёт фильтры, соответствующие категории", () => {
    expect(getCatalogFilterDefinitions("Дизайн проекты").map((field) => field.key)).toEqual([
      "objectType",
      "style",
      "area",
    ]);
    expect(getCatalogFilterDefinitions("Ремонт").map((field) => field.key)).toContain("repairType");
  });

  it("показывает только варианты, существующие в переданном наборе", () => {
    const definition = getCatalogFilterDefinitions("Дизайн проекты").find(
      (field) => field.key === "style",
    );
    expect(getCatalogFilterOptions(definition, designProjects)).toEqual([
      { value: "", label: "Любой" },
      { value: "Минимализм", label: "Минимализм" },
      { value: "Неоклассика", label: "Неоклассика" },
    ]);
  });

  it("фильтрует по значению и диапазону площади", () => {
    expect(
      filterCatalogProjects(designProjects, "Дизайн проекты", {
        ...EMPTY_CATALOG_FILTERS,
        style: "Неоклассика",
        area: "100-149",
      }).map((project) => project.id),
    ).toEqual(["d1"]);
  });

  it("предпочитает точную площадь сортировочному proxy диапазона дизайна", () => {
    const project = {
      type: "Дизайн проекты",
      area: "180",
      attributes: { areaRange: "100+" },
    };
    const areaDefinition = getCatalogFilterDefinitions("Дизайн проекты").find(
      (field) => field.key === "area",
    );

    expect(getCatalogFilterOptions(areaDefinition, [project])).toContainEqual({
      value: "150-199",
      label: "150 – 200 м²",
    });
    expect(
      filterCatalogProjects([project], "Дизайн проекты", {
        ...EMPTY_CATALOG_FILTERS,
        area: "150-199",
      }),
    ).toEqual([project]);
  });

  it("игнорирует старый areaRangeOther после смены схемного диапазона", () => {
    const project = {
      type: "Дизайн проекты",
      area: "",
      attributes: { areaRange: "до 50", areaRangeOther: "180" },
    };
    const areaDefinition = getCatalogFilterDefinitions("Дизайн проекты").find(
      (field) => field.key === "area",
    );

    expect(getCatalogFilterOptions(areaDefinition, [project])).toContainEqual({
      value: "0-49",
      label: "до 50 м²",
    });
    expect(
      filterCatalogProjects([project], "Дизайн проекты", {
        ...EMPTY_CATALOG_FILTERS,
        area: "150-199",
      }),
    ).toEqual([]);
  });

  it("читает и записывает активные параметры URL только для категории", () => {
    const parsed = parseCatalogFilters(
      new URLSearchParams("style=Минимализм&repair=Капитальный"),
    );
    const params = appendCatalogFilters(
      new URLSearchParams("type=Дизайн"),
      parsed,
      "Дизайн проекты",
    );

    expect(params.get("style")).toBe("Минимализм");
    expect(params.has("repair")).toBe(false);
  });

  it("нормализует сроки в годах к месяцам", () => {
    expect(toDurationMonths("10 месяцев")).toBe(10);
    expect(toDurationMonths("1 год")).toBe(12);
    expect(toDurationMonths("1,5 года")).toBe(18);
    expect(toDurationMonths("2 года")).toBe(24);
    expect(toDurationMonths("1 г.")).toBe(12);
    expect(toDurationMonths("1 год 6 месяцев")).toBe(18);
  });

  it("раскладывает строительные сроки по корректным диапазонам", () => {
    const definition = getCatalogFilterDefinitions("Строительство").find(
      (field) => field.key === "duration",
    );
    const projects = [
      { attributes: { duration: "3 месяца" } },
      { attributes: { duration: "1 год" } },
      { attributes: { duration: "1,5 года" } },
    ];

    expect(getCatalogFilterOptions(definition, projects)).toEqual([
      { value: "", label: "Любой" },
      { value: "0-3", label: "до 3 месяцев" },
      { value: "7-12", label: "7 – 12 месяцев" },
      { value: "13-999", label: "более 12 месяцев" },
    ]);
    expect(
      filterCatalogProjects(projects, "Строительство", {
        ...EMPTY_CATALOG_FILTERS,
        duration: "13-999",
      }),
    ).toEqual([projects[2]]);
  });

  it("фильтрует ремонт по категорийным атрибутам", () => {
    const projects = [
      {
        id: "r1",
        attributes: {
          propertyType: "Вторичное жилье",
          repairType: "Капитальный",
          finishClass: "Стандарт",
          rooms: "3-к+",
        },
      },
      {
        id: "r2",
        attributes: {
          propertyType: "Новостройка",
          repairType: "Косметический",
          finishClass: "Бюджет",
          rooms: "1-к",
        },
      },
    ];

    expect(
      filterCatalogProjects(projects, "Ремонт", {
        ...EMPTY_CATALOG_FILTERS,
        repairType: "Капитальный",
        rooms: "3-к+",
      }).map((project) => project.id),
    ).toEqual(["r1"]);
  });

  it("фильтрует строительство одновременно по площади и сроку", () => {
    const projects = [
      { id: "b1", attributes: { houseArea: "180 м²", duration: "1 год" } },
      { id: "b2", attributes: { houseArea: "520 м²", duration: "2 года" } },
    ];

    expect(
      filterCatalogProjects(projects, "Строительство", {
        ...EMPTY_CATALOG_FILTERS,
        houseArea: "150-199",
        duration: "7-12",
      }).map((project) => project.id),
    ).toEqual(["b1"]);
  });

  it("использует legacy-поля, если атрибуты строительства пусты", () => {
    const project = {
      area: "180 м²",
      duration: "1 год 6 месяцев",
      attributes: { houseArea: "", duration: "" },
    };

    expect(
      filterCatalogProjects([project], "Строительство", {
        ...EMPTY_CATALOG_FILTERS,
        houseArea: "150-199",
        duration: "13-999",
      }),
    ).toEqual([project]);
  });
});
