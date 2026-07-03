import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  GOALS: {
    MESSENGER_CLICK: "click_messenger",
    PROJECT_CTA_CLICK: "project_cta_click",
  },
  reachGoal: vi.fn(),
}));

import { reachGoal } from "@/lib/analytics";
import { messengerLink, openMessenger } from "./messenger";

describe("messenger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockImplementation(() => null);
    window.history.pushState(
      {},
      "",
      "/catalog/HS-777?utm_source=direct&utm_medium=cpc"
    );
    document.title = "Каталог | HUSAM";
  });

  it("builds messenger links with a normalized phone and encoded text", () => {
    const link = messengerLink("+7 (999) 123-45-67", "Привет, HUSAM");

    expect(link).toBe(
      "https://wa.me/79991234567?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%2C%20HUSAM"
    );
  });

  it("opens a message with appended lead context and tracks the goal", () => {
    openMessenger("Интересует проект", "+7 (999) 123-45-67", {
      goal: "project_cta_click",
      context: {
        form: "Карточка проекта",
        projectId: "HS-777",
        projectTitle: "Дом",
      },
    });

    expect(reachGoal).toHaveBeenCalledWith("project_cta_click", {
      form: "Карточка проекта",
      projectId: "HS-777",
      projectTitle: "Дом",
    });

    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/wa\.me\/79991234567\?text=/),
      "_blank",
      "noopener"
    );

    const openedUrl = window.open.mock.calls[0][0];
    const encodedText = new URL(openedUrl).searchParams.get("text");
    expect(encodedText).toContain("Интересует проект");
    expect(encodedText).toContain("Источник заявки:");
    expect(encodedText).toContain("Страница: Каталог | HUSAM");
    expect(encodedText).toContain("Форма: Карточка проекта");
    expect(encodedText).toContain("Проект: HS-777");
    expect(encodedText).toContain("utm_source=direct; utm_medium=cpc");
  });
});

