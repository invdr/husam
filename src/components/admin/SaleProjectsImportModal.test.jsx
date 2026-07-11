import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaleProjectsImportModal from "./SaleProjectsImportModal";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

const pbMock = vi.hoisted(() => ({
  collection: vi.fn(),
  authStore: { isValid: true },
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: pbMock,
}));

function csvFile(rows) {
  const header = "id,title,type";
  const lines = rows.map((r) => `${r.id},${r.title},${r.type}`);
  const text = [header, ...lines].join("\n");
  return new File([text], "import.csv", { type: "text/csv" });
}

/**
 * Настраивает pb.collection так, чтобы каждый следующий вызов
 * getFullList("sale_projects") (снапшот existing external_id) возвращал
 * следующий элемент из existingIdsByCall — это позволяет симулировать
 * изменение состояния БД между выбором файла и стартом импорта.
 */
function setupPocketbase({ existingIdsByCall = [[]], createImpl } = {}) {
  let callIndex = 0;
  const saleProjectsGetFullList = vi.fn(async () => {
    const ids =
      existingIdsByCall[callIndex] ??
      existingIdsByCall[existingIdsByCall.length - 1] ??
      [];
    callIndex += 1;
    return ids.map((id) => ({ external_id: id }));
  });
  const saleProjectsGetFirstListItem = vi.fn(async () => {
    throw new Error("not found");
  });
  const saleProjectsCreate =
    createImpl ??
    vi.fn(async (payload) => ({ id: `rec_${payload.external_id}`, ...payload }));

  const typesGetFullList = vi.fn(async () => []);
  const typesCreate = vi.fn(async (payload) => ({
    id: `type_${payload.name}`,
    ...payload,
  }));

  pbMock.collection.mockImplementation((name) => {
    if (name === "sale_projects") {
      return {
        getFullList: saleProjectsGetFullList,
        getFirstListItem: saleProjectsGetFirstListItem,
        create: saleProjectsCreate,
      };
    }
    if (name === "sale_project_types") {
      return {
        getFullList: typesGetFullList,
        create: typesCreate,
      };
    }
    throw new Error(`Unexpected collection "${name}"`);
  });

  return {
    saleProjectsGetFullList,
    saleProjectsCreate,
    saleProjectsGetFirstListItem,
    typesCreate,
  };
}

function getFileInput(container) {
  return container.querySelector('input[type="file"]');
}

async function pickFile(container, rows) {
  const input = getFileInput(container);
  fireEvent.change(input, { target: { files: [csvFile(rows)] } });
  // Ждём, пока парсинг CSV и первичный запрос existingIds завершатся и кнопка
  // "Импортировать" станет доступной — только тогда рендер отражает валидные строки.
  await waitFor(
    () =>
      expect(
        screen.getByRole("button", { name: /импортировать/i })
      ).toBeEnabled(),
    { timeout: 5000 }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  pbMock.collection.mockReset();
  pbMock.authStore.isValid = true;
});

describe("SaleProjectsImportModal", () => {
  it("re-fetches existing ids right before import and skips rows that became duplicates in the meantime", async () => {
    // Первый вызов (при выборе файла) — в базе ничего нет.
    // Второй вызов (в начале handleImport) — SP-100 уже кем-то создан,
    // то есть снапшот, снятый при выборе файла, устарел.
    const { saleProjectsGetFullList, saleProjectsCreate, typesCreate } = setupPocketbase({
      existingIdsByCall: [[], ["SP-100"]],
    });

    const { container } = render(
      <SaleProjectsImportModal onClose={vi.fn()} onImported={vi.fn()} />
    );

    await pickFile(container, [
      { id: "SP-100", title: "Дом 100", type: "Houses" },
      { id: "SP-101", title: "Дом 101", type: "Houses" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /импортировать/i }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled(), {
      timeout: 5000,
    });

    // Список existing id перезапрашивался (минимум дважды: при выборе файла и перед импортом).
    expect(saleProjectsGetFullList.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Создан только один проект — SP-101, дубликат SP-100 пропущен без повторного создания.
    expect(saleProjectsCreate).toHaveBeenCalledTimes(1);
    expect(saleProjectsCreate.mock.calls[0][0]).toMatchObject({
      external_id: "SP-101",
    });
    expect(typesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Houses", name_key: "houses" })
    );
    expect(toastMock.success.mock.calls[0][0]).toContain("Создано: 1");
    expect(toastMock.success.mock.calls[0][0]).toContain("пропущено: 1");
  });

  it("continues importing remaining rows after one row fails and reports a per-row error summary", async () => {
    const createImpl = vi.fn(async (payload) => {
      if (payload.external_id === "SP-200") {
        throw new Error("Ошибка сервера");
      }
      return { id: `rec_${payload.external_id}`, ...payload };
    });
    setupPocketbase({ existingIdsByCall: [[], []], createImpl });

    const { container } = render(
      <SaleProjectsImportModal onClose={vi.fn()} onImported={vi.fn()} />
    );

    await pickFile(container, [
      { id: "SP-200", title: "Дом 200", type: "Houses" },
      { id: "SP-201", title: "Дом 201", type: "Houses" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /импортировать/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled(), {
      timeout: 5000,
    });

    // Обе строки были попытаны, несмотря на ошибку на первой.
    expect(createImpl).toHaveBeenCalledTimes(2);
    expect(toastMock.error.mock.calls[0][0]).toContain("Создано: 1");
    expect(toastMock.error.mock.calls[0][0]).toContain("ошибок: 1");

    // В UI показан список строк с ошибками.
    expect(screen.getByText(/ID «SP-200»/)).toBeInTheDocument();
  });
});
