import { describe, expect, it } from "vitest";
import {
  getImageReorderAction,
  getImageNamesAfterAppend,
  getNewlyUploadedImageNames,
  getOrderedImageNames,
} from "./projectImageReorder";

describe("getImageReorderAction", () => {
  it("returns reorder action for existing images in the same group", () => {
    expect(getImageReorderAction("existing-2", "existing-0")).toEqual({
      group: "existing",
      oldIndex: 2,
      newIndex: 0,
    });
  });

  it("returns reorder action for pending images in the same group", () => {
    expect(getImageReorderAction("pending-0", "pending-3")).toEqual({
      group: "pending",
      oldIndex: 0,
      newIndex: 3,
    });
  });

  it("ignores cross-group drags and invalid targets", () => {
    expect(getImageReorderAction("existing-0", "pending-1")).toBeNull();
    expect(getImageReorderAction("pending-0", "existing-1")).toBeNull();
    expect(getImageReorderAction("pending-0", null)).toBeNull();
    expect(getImageReorderAction("pending-0", "pending-0")).toBeNull();
    expect(getImageReorderAction("bad", "pending-0")).toBeNull();
  });
});

describe("getNewlyUploadedImageNames", () => {
  it("uses server-returned filenames after PocketBase appends files", () => {
    expect(
      getNewlyUploadedImageNames(
        ["old.jpg", "new_abc123.webp", "plan_9.png"],
        ["old.jpg"],
      ),
    ).toEqual(["new_abc123.webp", "plan_9.png"]);
  });

  it("handles duplicate existing names by count", () => {
    expect(
      getNewlyUploadedImageNames(
        ["same.jpg", "same.jpg", "same_x1.jpg"],
        ["same.jpg", "same.jpg"],
      ),
    ).toEqual(["same_x1.jpg"]);
  });
});

describe("getOrderedImageNames", () => {
  it("keeps existing images first by default", () => {
    expect(getOrderedImageNames(["old.jpg"], ["new.jpg"], false)).toEqual([
      "old.jpg",
      "new.jpg",
    ]);
  });

  it("moves pending images before existing images when selected as main", () => {
    expect(getOrderedImageNames(["old.jpg"], ["new.jpg"], true)).toEqual([
      "new.jpg",
      "old.jpg",
    ]);
  });
});

describe("getImageNamesAfterAppend", () => {
  it("orders PocketBase-returned appended filenames after existing images by default", () => {
    expect(
      getImageNamesAfterAppend(
        ["old.jpg", "same.jpg", "same.jpg", "new_hash.webp"],
        ["old.jpg", "same.jpg"],
        false,
      ),
    ).toEqual(["old.jpg", "same.jpg", "same.jpg", "new_hash.webp"]);
  });

  it("moves PocketBase-returned appended filenames before existing images when pending is main", () => {
    expect(
      getImageNamesAfterAppend(
        ["old.jpg", "same.jpg", "same.jpg", "new_hash.webp"],
        ["old.jpg", "same.jpg"],
        true,
      ),
    ).toEqual(["same.jpg", "new_hash.webp", "old.jpg", "same.jpg"]);
  });
});
