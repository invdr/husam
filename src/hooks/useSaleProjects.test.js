import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const pbMock = vi.hoisted(() => ({
  collection: vi.fn(),
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: pbMock,
  getPocketbaseFileUrl: (_record, filename) => `https://pb.local/files/${filename}`,
}));

import { normalizeSaleProject, useSaleProjects } from "./useSaleProjects.js";

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

describe("normalizeSaleProject", () => {
  it("maps PocketBase fields and falls back to attributes for facets", () => {
    const project = normalizeSaleProject({
      id: "rec_1",
      external_id: "SP-001",
      title: "Ready house",
      type: "houses",
      images: ["a.jpg"],
      attributes: {
        plot_area: "6 sot",
        house_area: "120 m2",
      },
    });

    expect(project.id).toBe("SP-001");
    expect(project.recordId).toBe("rec_1");
    expect(project.plot_area).toBe("6 sot");
    expect(project.house_area).toBe("120 m2");
    expect(project.images).toEqual(["https://pb.local/files/a.jpg"]);
    expect(project.published).toBe(true);
  });
});

describe("useSaleProjects", () => {
  it("loads sale projects and refreshes ordering when sale project types change", async () => {
    const collectionData = {
      sale_projects: [
        {
          id: "rec_a",
          external_id: "A",
          title: "A",
          type: "second",
          images: [],
          sort_order_in_category: 0,
          published: true,
        },
        {
          id: "rec_b",
          external_id: "B",
          title: "B",
          type: "first",
          images: [],
          sort_order_in_category: 0,
          published: true,
        },
      ],
      sale_project_types: [
        { name: "first", sort_order: 0 },
        { name: "second", sort_order: 1 },
      ],
    };
    const { callbacks, unsubscribers } = mockPocketbaseCollections(collectionData);

    const { result, unmount } = renderHook(() => useSaleProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects.map((project) => project.id)).toEqual(["B", "A"]);
    expect(callbacks.sale_projects).toBeTypeOf("function");
    expect(callbacks.sale_project_types).toBeTypeOf("function");

    collectionData.sale_project_types = [
      { name: "second", sort_order: 0 },
      { name: "first", sort_order: 1 },
    ];

    act(() => {
      callbacks.sale_project_types();
    });

    await waitFor(() =>
      expect(result.current.projects.map((project) => project.id)).toEqual(["A", "B"])
    );

    unmount();
    expect(unsubscribers.sale_projects).toHaveBeenCalledTimes(1);
    expect(unsubscribers.sale_project_types).toHaveBeenCalledTimes(1);
  });
});
