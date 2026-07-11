import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCookieConsent, setCookieConsent } from "./cookieConsent";

describe("cookie consent fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("keeps the current-page decision when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    setCookieConsent("accepted");

    expect(getCookieConsent()).toBe("accepted");
  });
});
