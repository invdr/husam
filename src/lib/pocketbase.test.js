import { describe, expect, it } from "vitest";
import { resolvePocketbaseUrl } from "./pocketbase";

describe("resolvePocketbaseUrl", () => {
  it("uses the remote API when no env URL is set", () => {
    expect(resolvePocketbaseUrl("", { hostname: "localhost" })).toBe(
      "https://api.husam.ru"
    );
  });

  it("uses the same-origin API on production hostnames", () => {
    expect(resolvePocketbaseUrl("", { hostname: "husam.ru" })).toBe("/");
    expect(resolvePocketbaseUrl("", { hostname: "www.husam.ru" })).toBe("/");
  });

  it("uses the same-origin API when the site is opened by IP", () => {
    expect(resolvePocketbaseUrl("", { hostname: "77.222.63.88" })).toBe("/");
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
