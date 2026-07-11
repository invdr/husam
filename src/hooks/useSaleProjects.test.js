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
  it("excludes sale projects whose configured category was deleted", async () => {
    const collectionData = {
      sale_projects: [
        { id: "known", external_id: "KNOWN", title: "Known", type: "active", images: [], published: true },
        { id: "orphan", external_id: "ORPHAN", title: "Orphan", type: "deleted", images: [], published: true },
      ],
      sale_project_types: [{ name: "active", sort_order: 0 }],
    };
    mockPocketbaseCollections(collectionData);

    const { result } = renderHook(() => useSaleProjects());

    await waitFor(() =>
      expect(result.current.projects.map((project) => project.id)).toEqual(["KNOWN"]),
    );
  });

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

    await waitFor(() =>
      expect(result.current.projects.map((project) => project.id)).toEqual(["B", "A"]),
    );
    expect(result.current.types).toEqual(["first", "second"]);
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
    expect(result.current.types).toEqual(["second", "first"]);

    unmount();
    expect(unsubscribers.sale_projects).toHaveBeenCalledTimes(1);
    expect(unsubscribers.sale_project_types).toHaveBeenCalledTimes(1);
  });

  it("preserves the last snapshot but revokes URL authority after a realtime error", async () => {
    const collectionData = {
      sale_projects: [
        {
          id: "rec_a",
          external_id: "A",
          title: "A",
          type: "first",
          images: [],
          published: true,
        },
      ],
      sale_project_types: [{ name: "first", sort_order: 0 }],
    };
    const { callbacks } = mockPocketbaseCollections(collectionData);
    const { result } = renderHook(() => useSaleProjects());

    await waitFor(() => expect(result.current.isAuthoritative).toBe(true));
    expect(result.current.projects.map((project) => project.id)).toEqual(["A"]);

    const refreshError = new Error("sale realtime refresh failed");
    pbMock.collection.mockImplementation((collectionName) => ({
      getFullList: vi.fn(async () => {
        if (collectionName === "sale_projects") throw refreshError;
        return collectionData[collectionName] ?? [];
      }),
      subscribe: vi.fn(async () => vi.fn()),
    }));

    act(() => {
      callbacks.sale_projects();
    });

    await waitFor(() => expect(result.current.error).toBe(refreshError));
    expect(result.current.isAuthoritative).toBe(false);
    expect(result.current.projects.map((project) => project.id)).toEqual(["A"]);
    expect(result.current.types).toEqual(["first"]);
  });

  it("revokes authority while a realtime refresh is in flight", async () => {
    const collectionData = {
      sale_projects: [
        { id: "a", external_id: "A", title: "A", type: "first", images: [] },
      ],
      sale_project_types: [{ name: "first", sort_order: 0 }],
    };
    const { callbacks } = mockPocketbaseCollections(collectionData);
    const { result } = renderHook(() => useSaleProjects());
    await waitFor(() => expect(result.current.isAuthoritative).toBe(true));

    let resolveProjects;
    let resolveTypes;
    const pendingProjects = new Promise((resolve) => {
      resolveProjects = resolve;
    });
    const pendingTypes = new Promise((resolve) => {
      resolveTypes = resolve;
    });
    pbMock.collection.mockImplementation((collectionName) => ({
      getFullList: vi.fn(() =>
        collectionName === "sale_projects" ? pendingProjects : pendingTypes,
      ),
      subscribe: vi.fn(async () => vi.fn()),
    }));

    act(() => {
      callbacks.sale_project_types();
    });
    expect(result.current.isAuthoritative).toBe(false);
    expect(result.current.projects.map((project) => project.id)).toEqual(["A"]);

    await act(async () => {
      resolveProjects([
        { id: "b", external_id: "B", title: "B", type: "second", images: [] },
      ]);
      resolveTypes([{ name: "second", sort_order: 0 }]);
      await Promise.all([pendingProjects, pendingTypes]);
    });

    await waitFor(() => expect(result.current.isAuthoritative).toBe(true));
    expect(result.current.projects.map((project) => project.id)).toEqual(["B"]);
    expect(result.current.types).toEqual(["second"]);
  });

  it("uses the post-subscription fetch as the authoritative snapshot", async () => {
    const projectSnapshots = [
      [{ id: "old", external_id: "OLD", title: "Old", type: "first", images: [] }],
      [{ id: "new", external_id: "NEW", title: "New", type: "second", images: [] }],
    ];
    const typeSnapshots = [
      [{ name: "first", sort_order: 0 }],
      [{ name: "second", sort_order: 0 }],
    ];
    let projectRead = 0;
    let typeRead = 0;

    pbMock.collection.mockImplementation((collectionName) => ({
      getFullList: vi.fn(async () => {
        if (collectionName === "sale_projects") {
          return projectSnapshots[Math.min(projectRead++, 1)];
        }
        return typeSnapshots[Math.min(typeRead++, 1)];
      }),
      subscribe: vi.fn(async () => vi.fn()),
    }));

    const { result } = renderHook(() => useSaleProjects());

    await waitFor(() => expect(result.current.isAuthoritative).toBe(true));
    expect(result.current.projects.map((project) => project.id)).toEqual(["NEW"]);
    expect(result.current.types).toEqual(["second"]);
    expect(projectRead).toBeGreaterThanOrEqual(2);
    expect(typeRead).toBeGreaterThanOrEqual(2);
  });
});
