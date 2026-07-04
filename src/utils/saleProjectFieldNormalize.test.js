import { describe, expect, it } from "vitest";
import { normalizePlotAreaField, normalizeSquareField } from "./saleProjectFieldNormalize";

describe("normalizeSquareField", () => {
  it("добавляет м² к числу", () => {
    expect(normalizeSquareField("120")).toBe("120 м²");
  });

  it("берёт последнее число из шумной строки (как в форме)", () => {
    expect(normalizeSquareField("95 м²2132")).toBe("2132 м²");
  });
});

describe("normalizePlotAreaField", () => {
  it("не ломает «6 соток»", () => {
    expect(normalizePlotAreaField("6 соток")).toMatch(/соток/);
  });

  it("нормализует чисто числовую площадь участка", () => {
    expect(normalizePlotAreaField("6")).toBe("6 соток");
  });

  it("исправляет ошибочную единицу м² у площади участка", () => {
    expect(normalizePlotAreaField("6 м²")).toBe("6 соток");
  });

  it("переводит крупные значения м² в сотки", () => {
    expect(normalizePlotAreaField("600 м²")).toBe("6 соток");
    expect(normalizePlotAreaField("252 м²")).toBe("2.52 соток");
  });

  it("убирает дефис вместо площади участка", () => {
    expect(normalizePlotAreaField("-")).toBe("");
  });
});
