import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TypesEditor from "./TypesEditor";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

const pbMock = vi.hoisted(() => ({
  collection: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: pbMock,
}));

function setupPocketbase() {
  const getFullList = vi.fn(async () => []);
  const getFirstListItem = vi.fn(async () => ({ id: "type_rec_1" }));
  const update = vi.fn(async () => ({}));
  const create = vi.fn(async () => ({}));

  pbMock.collection.mockImplementation(() => ({
    getFullList,
    getFirstListItem,
    update,
    create,
  }));

  return { getFullList, getFirstListItem, update, create };
}

beforeEach(() => {
  vi.clearAllMocks();
  pbMock.collection.mockReset();
});

describe("TypesEditor", () => {
  it("blocks renaming a category to a name already used by another category", async () => {
    const { update } = setupPocketbase();

    render(
      <TypesEditor
        types={["Дизайн", "Ремонт"]}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByTitle("Переименовать")[1]);
    const input = screen.getByDisplayValue("Ремонт");
    fireEvent.change(input, { target: { value: "  дизайн  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringContaining("уже существует")
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("allows renaming a category to a genuinely new name", async () => {
    const { update } = setupPocketbase();

    render(
      <TypesEditor
        types={["Дизайн", "Ремонт"]}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByTitle("Переименовать")[1]);
    const input = screen.getByDisplayValue("Ремонт");
    fireEvent.change(input, { target: { value: "Стройка" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(toastMock.success).toHaveBeenCalled();
  });
});
