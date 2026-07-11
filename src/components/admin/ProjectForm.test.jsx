import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProjectForm from "./ProjectForm";

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

vi.mock("@/hooks/useProjectTypes", () => ({
  useProjectTypes: () => ({
    types: ["first"],
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
  const update = vi.fn();

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

describe("ProjectForm", () => {
  it("shows validation error when project id is empty", async () => {
    const { container } = render(
      <ProjectForm onSave={vi.fn()} onCancel={vi.fn()} />
    );

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.error.mock.calls[0][0]).toContain("ID");
  });

  it("blocks duplicate project ids before saving", async () => {
    const { container } = render(
      <ProjectForm
        existingProjects={[{ id: "HS-001", recordId: "other_rec" }]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("HS-001"), {
      target: { value: "HS-001" },
    });
    fireEvent.change(screen.getByPlaceholderText("Дизайн и ремонт офиса"), {
      target: { value: "Duplicate" },
    });
    fireEvent.submit(getForm(container));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining("существует")
      )
    );
    expect(pbMock.collection).not.toHaveBeenCalledWith("projects");
  });

  it("creates a project and returns the saved record", async () => {
    const onSave = vi.fn();
    const { create } = setupPocketbase();
    const { container } = render(
      <ProjectForm onSave={onSave} onCancel={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText("HS-001"), {
      target: { value: "HS-002" },
    });
    fireEvent.change(screen.getByPlaceholderText("Дизайн и ремонт офиса"), {
      target: { value: "New project" },
    });
    fireEvent.submit(getForm(container));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      external_id: "HS-002",
      title: "New project",
      type: "first",
      published: true,
    });
    expect(toastMock.success).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "HS-002",
        recordId: "rec_1",
      })
    );
    expect(screen.getByRole("button", { name: /сохранить/i })).toBeEnabled();
  });

  it("creates a new category with its normalized key", async () => {
    const { create } = setupPocketbase();
    const { container } = render(
      <ProjectForm onSave={vi.fn()} onCancel={vi.fn()} />
    );

    fireEvent.change(container.querySelector("#project-type"), {
      target: { value: "__new__" },
    });
    fireEvent.change(screen.getByPlaceholderText("Название категории"), {
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
    expect(container.querySelector("#project-new-type")).toBeNull();
  });
});
