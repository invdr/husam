import { describe, expect, it } from "vitest";
import { isSafeExternalUrl, safeExternalUrl } from "./externalUrl";

describe("safeExternalUrl", () => {
  it("accepts and normalizes absolute HTTP(S) links", () => {
    expect(safeExternalUrl(" https://t.me/husamstroy ")).toBe(
      "https://t.me/husamstroy"
    );
    expect(safeExternalUrl("http://vk.com/husamstroy")).toBe(
      "http://vk.com/husamstroy"
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "mailto:husamstroy_2020@mail.ru",
    "//example.com/profile",
    "/relative-path",
    "https://",
    "",
    null,
  ])("rejects unsafe or non-absolute values: %s", (value) => {
    expect(safeExternalUrl(value)).toBeNull();
    expect(isSafeExternalUrl(value)).toBe(false);
  });
});
