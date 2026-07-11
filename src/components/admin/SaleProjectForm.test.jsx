import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaleProjectForm from "./SaleProjectForm";

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
  getPocketbaseFileUrl: (_record, filename) => `https://pb.local/files/${filename}`,
}));

vi.mock("@/hooks/useSaleProjectTypes", () => ({
  useSaleProjectTypes: () => ({
    types: ["houses"],
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: {},
    updateSetting: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock("@/utils/imageResize", () => ({
  resizeImage: vi.fn(async (file) => file),
}));

function setupPocketbase() {
  const getFirstListItem = vi.fn(async () => null);
  const create = vi.fn(async (payload) => ({
    id: "rec_1",
    external_id: payload.external_id,
    title: payload.title,
    images: [],
  }));
  const update = vi.fn(async (id, payload) => ({
    id,
    external_id: payload.external_id,
    title: payload.title,
    images: payload.images ?? [],
    ...payload,
  }));

  pbMock.collection.mockImplementation(() => ({
    getFirstListItem,
    create,
    update,
  }));

  return { getFirstListItem, create, update };
}

function getForm(container) {
  return container.querySelector("form");
}

beforeEach(() => {
  vi.clearAllMocks();
  pbMock.collection.mockReset();
  setupPocketbase();
});

describe("SaleProjectForm", () => {
  it("shows validation error when project id is empty", async () => {
    const { container } = render(
      <SaleProjectForm onSave={vi.fn()} onCancel={vi.fn()} />
    );

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.error.mock.calls[0][0]).toContain("ID");
  });

  it("blocks duplicate sale project ids before saving", async () => {
    const { container } = render(
      <SaleProjectForm
        existingProjects={[{ id: "SP-001", recordId: "other_rec" }]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("SP-001"), {
      target: { value: "SP-001" },
    });
    fireEvent.change(screen.getByPlaceholderText("Дом 120"), {
      target: { value: "Duplicate" },
    });
    fireEvent.submit(getForm(container));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining("существует")
      )
    );
    expect(pbMock.collection).not.toHaveBeenCalledWith("sale_projects");
  });

  it("creates a sale project and returns the saved record", async () => {
    const onSave = vi.fn();
    const { create } = setupPocketbase();
    const { container } = render(
      <SaleProjectForm onSave={onSave} onCancel={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText("SP-001"), {
      target: { value: "SP-002" },
    });
    fireEvent.change(screen.getByPlaceholderText("Дом 120"), {
      target: { value: "Ready house" },
    });
    fireEvent.submit(getForm(container));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      external_id: "SP-002",
      title: "Ready house",
      type: "houses",
      published: true,
    });
    expect(toastMock.success).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "SP-002",
        recordId: "rec_1",
      })
    );
  });

  it("creates a new category with its normalized key", async () => {
    const { create } = setupPocketbase();
    const { container } = render(
      <SaleProjectForm onSave={vi.fn()} onCancel={vi.fn()} />
    );

    fireEvent.change(container.querySelector("#sale-project-type"), {
      target: { value: "__new__" },
    });
    fireEvent.change(screen.getByPlaceholderText("Новая категория"), {
      target: { value: "  New category  " },
    });
    fireEvent.click(container.querySelector('button[aria-label="Добавить категорию"]'));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New category",
          name_key: "new category",
        })
      )
    );
    expect(container.querySelector("#sale-project-new-type")).toBeNull();
  });

});
