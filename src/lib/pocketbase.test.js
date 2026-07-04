import { describe, expect, it } from "vitest";
import { resolvePocketbaseUrl } from "./pocketbase";

describe("resolvePocketbaseUrl", () => {
  it("uses the remote API when no env URL is set", () => {
    expect(resolvePocketbaseUrl("")).toBe("https://api.husam.ru");
  });

  it("trims the default remote API URL", () => {
    expect(resolvePocketbaseUrl("https://api.husam.ru/")).toBe("https://api.husam.ru");
  });

  it("keeps custom configured API URLs", () => {
    expect(resolvePocketbaseUrl("https://stage-api.husam.ru")).toBe(
      "https://stage-api.husam.ru"
    );
  });
});
