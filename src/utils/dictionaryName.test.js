import { describe, expect, it } from "vitest";
import { buildDictionaryCreatePayload, normalizeDictionaryName } from "./dictionaryName";

describe("normalizeDictionaryName", () => {
  it("normalizes Unicode case and surrounding whitespace", () => {
    expect(normalizeDictionaryName("  Дом  ")).toBe("дом");
    expect(normalizeDictionaryName("дОМ")).toBe("дом");
  });
  it("builds dictionary create payloads with the required unique key", () => {
    expect(buildDictionaryCreatePayload("  Houses  ", 3)).toEqual({
      name: "Houses",
      name_key: "houses",
      sort_order: 3,
    });
  });
});
