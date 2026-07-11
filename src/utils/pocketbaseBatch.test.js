import { describe, expect, it } from "vitest";
import {
  canRenameWithBatch,
  MAX_RENAME_BATCH_REQUESTS,
} from "./pocketbaseBatch";

describe("pocketbase rename batch limits", () => {
  it("leaves room for the dictionary record operation", () => {
    expect(canRenameWithBatch(MAX_RENAME_BATCH_REQUESTS - 1)).toBe(true);
    expect(canRenameWithBatch(MAX_RENAME_BATCH_REQUESTS)).toBe(false);
  });
});
