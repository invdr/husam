import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/pocketbase", () => ({
  pb: {},
  getPocketbaseFileUrl: (_record, filename) => `https://pb.local/files/${filename}`,
}));

import { normalizeProject } from "./useProjects.js";

describe("normalizeProject", () => {
  it("поддерживает attributes как JSON-строку и scope как JSON-массив", () => {
    const row = {
      id: "pb_rec_1",
      external_id: "HS-001",
      title: "Тестовый проект",
      type: "Дизайн проекты",
      attributes: '{"plotArea":"6 соток","houseArea":"200 м²"}',
      scope: '["Дизайн","Освещение"]',
      images: ["a.jpg", "b.jpg"],
      published: true,
    };

    const project = normalizeProject(row);

    expect(project.id).toBe("HS-001");
    expect(project.recordId).toBe("pb_rec_1");
    expect(project.attributes).toEqual({ plotArea: "6 соток", houseArea: "200 м²" });
    expect(project.scope).toEqual(["Дизайн", "Освещение"]);
    expect(project.images).toEqual([
      "https://pb.local/files/a.jpg",
      "https://pb.local/files/b.jpg",
    ]);
  });

  it("безопасно обрабатывает невалидный JSON в attributes/scope", () => {
    const row = {
      id: "pb_rec_2",
      title: "Тест 2",
      type: "Ремонт",
      attributes: "{not-json}",
      scope: "{also-not-json}",
      images: [],
    };

    const project = normalizeProject(row);

    expect(project.attributes).toEqual({});
    expect(project.scope).toEqual([]);
  });
});
