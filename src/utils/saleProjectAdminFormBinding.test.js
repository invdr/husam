import { describe, it, expect } from "vitest";
import {
  buildStructuredRoomExplanation,
  cleanStandardSaleProjectAttributes,
  pickExtendedSaleProjectFormFields,
} from "./saleProjectAdminFormBinding.js";
import { normalizeSaleProject } from "../hooks/useSaleProjects.js";

describe("saleProjectAdminFormBinding", () => {
  it("после normalizeSaleProject подтягивает структурные поля для редактора", () => {
    const rawRow = {
      id: "2",
      title: "T",
      room_explanation: "1 этаж\nГостиная — 30 м²\n\nПодвал\nКотельная — 8 м²",
      has_garage: true,
      has_canopy: true,
      has_basement: false,
      material: "Кирпич",
      images: [],
      attributes: {},
    };
    const normalized = normalizeSaleProject(rawRow);
    const fields = pickExtendedSaleProjectFormFields(normalized);

    expect(fields.garage).toBe("Пристроенный");
    expect(fields.canopy).toBe("Пристроенный");
    expect(fields.basement).toBe("Да");
    expect(fields.explication_floor_1).toBe("Гостиная — 30 м²");
    expect(fields.explication_basement).toBe("Котельная — 8 м²");
    expect(fields.material_walls).toBe("Кирпич");
  });

  it("normalizeSaleProject keeps PocketBase recordId after repeated normalization", () => {
    const savedProject = {
      id: "HS-101",
      recordId: "pb-record-101",
      external_id: "HS-101",
      images: [],
      attributes: {},
    };

    expect(normalizeSaleProject(savedProject)).toMatchObject({
      id: "HS-101",
      recordId: "pb-record-101",
    });
  });

  it("prefers top-level registry fields and falls back to legacy attributes", () => {
    const fields = pickExtendedSaleProjectFormFields({
      style: "Современная классика",
      bedrooms: "2",
      explication_floor_1: "Гостиная",
      material_walls: "Газобетонные блоки",
      attributes: {
        style: "Legacy style",
        garage: "Пристроенный",
        explication: { floor_2: "Спальня" },
        constructionMaterials: { roof: "Металл" },
      },
    });

    expect(fields.style).toBe("Современная классика");
    expect(fields.bedrooms).toBe("2");
    expect(fields.garage).toBe("Пристроенный");
    expect(fields.explication_floor_1).toBe("Гостиная");
    expect(fields.explication_floor_2).toBe("Спальня");
    expect(fields.material_walls).toBe("Газобетонные блоки");
    expect(fields.material_roof).toBe("Металл");
  });

  it("cleans standard registry fields from attributes before manual save", () => {
    const attrs = cleanStandardSaleProjectAttributes({
      plot_area: "6 соток",
      style: "Современная классика",
      explication: { floor_1: "Гостиная" },
      constructionMaterials: { walls: "Газобетон" },
      room_explanation: "legacy",
      area: "120 м²",
      rooms: "4",
      material: "Кирпич",
      has_garage: true,
      ceiling_height: "3 м",
      empty_custom: "",
    });

    expect(attrs).toEqual({ ceiling_height: "3 м" });
  });

  it("builds legacy room explanation from structured floors for text display", () => {
    expect(
      buildStructuredRoomExplanation({
        roomExplanation: "Legacy",
        explication_basement: "Котельная",
        explication_floor_1: "Гостиная",
        explication_floor_2: "Спальня",
      }),
    ).toBe("1 этаж\nГостиная\n\n2 этаж\nСпальня\n\nПодвал\nКотельная");
  });
});
