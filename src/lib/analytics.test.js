import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_CONSENT_KEY } from "./cookieConsent";

async function loadAnalytics() {
  vi.resetModules();
  return import("./analytics");
}

describe("analytics consent gate", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_YANDEX_METRIKA_ID", "123");
    window.localStorage.clear();
    document.querySelector('script[data-yandex-metrika="true"]')?.remove();
    delete window.ym;
  });

  it("does not initialize before consent", async () => {
    const { reachGoal } = await loadAnalytics();

    reachGoal("test_goal");

    expect(window.localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    expect(document.querySelector('script[data-yandex-metrika="true"]')).toBeNull();
  });

  it("initializes after consent", async () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    const { reachGoal } = await loadAnalytics();

    reachGoal("test_goal");

    expect(document.querySelector('script[data-yandex-metrika="true"]')).toBeInTheDocument();
  });
});
