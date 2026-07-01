import { describe, it, expect } from "vitest";
import { pickExplicationAndFacetsForSaleProjectForm } from "./saleProjectAdminFormBinding.js";
import { normalizeSaleProject } from "../hooks/useSaleProjects.js";

describe("pickExplicationAndFacetsForSaleProjectForm", () => {
  it("читает snake_case как у строки из API", () => {
    const p = {
      id: "1",
      room_explanation: "Кухня — 18 м²",
      has_garage: true,
      has_canopy: false,
      has_basement: true,
    };
    expect(pickExplicationAndFacetsForSaleProjectForm(p)).toEqual({
      room_explanation: "Кухня — 18 м²",
      has_garage: true,
      has_canopy: false,
      has_basement: true,
    });
  });

  it("после normalizeSaleProject подтягивает camelCase (редактор админки)", () => {
    const rawRow = {
      id: "2",
      title: "T",
      room_explanation: "Гостиная — 30 м²",
      has_garage: true,
      has_canopy: true,
      has_basement: false,
      images: [],
      attributes: {},
    };
    const normalized = normalizeSaleProject(rawRow);
    expect(pickExplicationAndFacetsForSaleProjectForm(normalized)).toEqual({
      room_explanation: "Гостиная — 30 м²",
      has_garage: true,
      has_canopy: true,
      has_basement: false,
    });
  });

  it("для отсутствующего объекта возвращает пустые значения", () => {
    expect(pickExplicationAndFacetsForSaleProjectForm(null)).toEqual({
      room_explanation: "",
      has_garage: false,
      has_canopy: false,
      has_basement: false,
    });
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
});
