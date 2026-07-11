import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const pbMock = vi.hoisted(() => ({ collection: vi.fn() }));

vi.mock("@/lib/pocketbase", () => ({ pb: pbMock }));

import { useProjectTypes } from "./useProjectTypes.js";
import { useSaleProjectTypes } from "./useSaleProjectTypes.js";

beforeEach(() => {
  pbMock.collection.mockReset();
});

describe("configured project type authority", () => {
  it("keeps successful empty category collections empty", async () => {
    pbMock.collection.mockImplementation(() => ({
      getFullList: vi.fn(async () => []),
    }));

    const catalog = renderHook(() => useProjectTypes());
    await waitFor(() => expect(catalog.result.current.loading).toBe(false));
    expect(catalog.result.current.types).toEqual([]);
    catalog.unmount();

    const sale = renderHook(() => useSaleProjectTypes());
    await waitFor(() => expect(sale.result.current.loading).toBe(false));
    expect(sale.result.current.types).toEqual([]);
  });

  it("does not invent default categories when the collection is unavailable", async () => {
    pbMock.collection.mockImplementation(() => ({
      getFullList: vi.fn(async () => {
        throw new Error("types unavailable");
      }),
    }));

    const catalog = renderHook(() => useProjectTypes());
    await waitFor(() => expect(catalog.result.current.loading).toBe(false));
    expect(catalog.result.current.types).toEqual([]);
    expect(catalog.result.current.error).toBeInstanceOf(Error);
  });
});
