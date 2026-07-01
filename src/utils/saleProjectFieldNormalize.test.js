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
    expect(normalizePlotAreaField("600")).toBe("600 м²");
  });
});
