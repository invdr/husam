import { beforeEach, describe, expect, it } from "vitest";
import {
  appendLeadContext,
  buildLeadContext,
  getTrackingParams,
} from "./leadContext";

describe("leadContext", () => {
  beforeEach(() => {
    window.history.pushState(
      {},
      "",
      "/projects/HS-001?utm_source=yandex&utm_campaign=summer&yclid=123"
    );
    document.title = "Готовый проект | HUSAM";
  });

  it("collects supported tracking params from the current URL", () => {
    expect(getTrackingParams()).toEqual([
      ["utm_source", "yandex"],
      ["utm_campaign", "summer"],
      ["yclid", "123"],
    ]);
  });

  it("builds lead context with page, project and UTM metadata", () => {
    const context = buildLeadContext({
      form: "Страница проекта",
      projectId: "HS-001",
      projectTitle: "Дом 120",
      service: "Строительство",
    });

    expect(context).toContain("Источник заявки:");
    expect(context).toContain("Страница: Готовый проект | HUSAM");
    expect(context).toContain("URL: http://localhost:3000/projects/HS-001");
    expect(context).toContain("Форма: Страница проекта");
    expect(context).toContain("Проект: HS-001");
    expect(context).toContain("Название проекта: Дом 120");
    expect(context).toContain(
      "Метки: utm_source=yandex; utm_campaign=summer; yclid=123"
    );
  });

  it("appends context below the original message", () => {
    const message = appendLeadContext("Хочу проект", {
      form: "Квиз",
      service: "Проектирование",
    });

    expect(message).toMatch(/^Хочу проект\nИсточник заявки:/);
    expect(message).toContain("Форма: Квиз");
    expect(message).toContain("Услуга: Проектирование");
  });
});
