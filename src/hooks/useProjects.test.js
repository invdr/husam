import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const pbMock = vi.hoisted(() => ({
  collection: vi.fn(),
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: pbMock,
  getPocketbaseFileUrl: (_record, filename) => `https://pb.local/files/${filename}`,
}));

import { normalizeProject, useProjects } from "./useProjects.js";

function mockPocketbaseCollections(collectionData) {
  const callbacks = {};
  const unsubscribers = {};

  pbMock.collection.mockImplementation((collectionName) => {
    unsubscribers[collectionName] ??= vi.fn();

    return {
      getFullList: vi.fn(async () => collectionData[collectionName] ?? []),
      subscribe: vi.fn(async (_topic, callback) => {
        callbacks[collectionName] = callback;
        return unsubscribers[collectionName];
      }),
    };
  });

  return { callbacks, unsubscribers };
}

beforeEach(() => {
  pbMock.collection.mockReset();
});

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

describe("useProjects", () => {
  it("loads projects and refreshes ordering when project types change", async () => {
    const collectionData = {
      projects: [
        {
          id: "pb_a",
          external_id: "A",
          title: "A",
          type: "second",
          images: [],
          sort_order_in_category: 0,
          published: true,
        },
        {
          id: "pb_b",
          external_id: "B",
          title: "B",
          type: "first",
          images: [],
          sort_order_in_category: 0,
          published: true,
        },
      ],
      project_types: [
        { name: "first", sort_order: 0 },
        { name: "second", sort_order: 1 },
      ],
    };
    const { callbacks, unsubscribers } = mockPocketbaseCollections(collectionData);

    const { result, unmount } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects.map((project) => project.id)).toEqual(["B", "A"]);
    expect(callbacks.projects).toBeTypeOf("function");
    expect(callbacks.project_types).toBeTypeOf("function");

    collectionData.project_types = [
      { name: "second", sort_order: 0 },
      { name: "first", sort_order: 1 },
    ];

    act(() => {
      callbacks.project_types();
    });

    await waitFor(() =>
      expect(result.current.projects.map((project) => project.id)).toEqual(["A", "B"])
    );

    unmount();
    expect(unsubscribers.projects).toHaveBeenCalledTimes(1);
    expect(unsubscribers.project_types).toHaveBeenCalledTimes(1);
  });

  it("ignores PocketBase abort errors without replacing existing projects", async () => {
    const collectionData = {
      projects: [
        {
          id: "pb_a",
          external_id: "A",
          title: "A",
          type: "first",
          images: [],
          published: true,
        },
      ],
      project_types: [{ name: "first", sort_order: 0 }],
    };
    const { callbacks } = mockPocketbaseCollections(collectionData);
    const { result } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects.map((project) => project.id)).toEqual(["A"]);

    pbMock.collection.mockImplementation((collectionName) => ({
      getFullList: vi.fn(async () => {
        if (collectionName === "projects") {
          throw Object.assign(new Error("autocancelled request"), { isAbort: true });
        }
        return collectionData[collectionName] ?? [];
      }),
      subscribe: vi.fn(async (_topic, callback) => {
        callbacks[collectionName] = callback;
        return vi.fn();
      }),
    }));

    act(() => {
      callbacks.projects();
    });

    await waitFor(() => expect(result.current.projects.map((project) => project.id)).toEqual(["A"]));
    expect(result.current.error).toBeNull();
  });

  it("cleans up partial realtime subscriptions when setup fails", async () => {
    const collectionData = {
      projects: [
        {
          id: "pb_a",
          external_id: "A",
          title: "A",
          type: "first",
          images: [],
          published: true,
        },
      ],
      project_types: [{ name: "first", sort_order: 0 }],
    };
    const unsubscribeProjects = vi.fn();
    const subscribeError = new Error("project_types subscribe failed");

    pbMock.collection.mockImplementation((collectionName) => ({
      getFullList: vi.fn(async () => collectionData[collectionName] ?? []),
      subscribe: vi.fn(async () => {
        if (collectionName === "project_types") throw subscribeError;
        return unsubscribeProjects;
      }),
    }));

    const { result } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects.map((project) => project.id)).toEqual(["A"]);
    await waitFor(() => expect(result.current.error).toBe(subscribeError));
    expect(unsubscribeProjects).toHaveBeenCalledTimes(1);
    expect(result.current.projects.map((project) => project.id)).toEqual(["A"]);
  });
});
