import { describe, expect, it, vi, beforeEach } from "vitest";

const pbMock = vi.hoisted(() => ({
  collection: vi.fn(),
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: pbMock,
}));

import {
  isPocketbaseAbortError,
  subscribeToPocketbaseCollections,
} from "./pocketbaseRealtime";

beforeEach(() => {
  pbMock.collection.mockReset();
});

describe("pocketbaseRealtime", () => {
  it("cleans up successful subscriptions when a later subscription fails", async () => {
    const unsubscribeFirst = vi.fn();
    const subscribeError = new Error("subscribe failed");

    pbMock.collection.mockImplementation((collectionName) => ({
      subscribe: vi.fn(async () => {
        if (collectionName === "second") throw subscribeError;
        return unsubscribeFirst;
      }),
    }));

    await expect(
      subscribeToPocketbaseCollections(["first", "second"], vi.fn())
    ).rejects.toBe(subscribeError);
    expect(unsubscribeFirst).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes all successful subscriptions", async () => {
    const unsubscribeFirst = vi.fn();
    const unsubscribeSecond = vi.fn();

    pbMock.collection.mockImplementation((collectionName) => ({
      subscribe: vi.fn(async () =>
        collectionName === "first" ? unsubscribeFirst : unsubscribeSecond
      ),
    }));

    const unsubscribe = await subscribeToPocketbaseCollections(
      ["first", "second"],
      vi.fn()
    );
    unsubscribe();

    expect(unsubscribeFirst).toHaveBeenCalledTimes(1);
    expect(unsubscribeSecond).toHaveBeenCalledTimes(1);
  });

  it("detects PocketBase abort errors", () => {
    expect(isPocketbaseAbortError({ isAbort: true })).toBe(true);
    expect(isPocketbaseAbortError(new Error("request autocancelled"))).toBe(true);
    expect(isPocketbaseAbortError(new Error("network down"))).toBe(false);
  });
});
