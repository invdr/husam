import { useMemo, useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/common/Modal";
import Icon from "@/components/common/Icon";
import { pb } from "@/lib/pocketbase";
import {
  asTrimmedString,
  buildSaleProjectImportPayload,
  buildCsvTemplate,
  isHintRow,
  mapRowKeys,
  validateRow,
} from "@/utils/saleProjectsCsvImport";

const CHUNK_SIZE = 100;

function formatPocketbaseError(error, fallbackMessage = "Ошибка импорта") {
  const responseData = error?.response?.data;
  const data = responseData?.data;
  if (data && typeof data === "object") {
    const firstField = Object.keys(data)[0];
    if (firstField) {
      const fieldError = data[firstField];
      const fieldMessage =
        fieldError?.message || fieldError?.code || responseData?.message;
      if (fieldMessage) {
        return `${firstField}: ${fieldMessage}`;
      }
    }
  }
  if (
    responseData?.message === "Failed to create record." &&
    (!data || Object.keys(data).length === 0)
  ) {
    return "PocketBase отклонил создание записи без деталей. Обычно это createRule/права доступа или невалидная сессия. Перелогиньтесь в /admin и проверьте createRule у sale_projects.";
  }
  return responseData?.message || error?.message || fallbackMessage;
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function parseInputFile(file) {
  const name = file?.name ?? "";
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) throw new Error("Не удалось определить формат файла");
  if (ext !== "csv") {
    throw new Error("Поддерживается только файл в формате CSV. Сохраните таблицу как CSV (разделитель — точка с запятой, кодировка UTF-8).");
  }
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => String(h ?? "").trim(),
  });
  if (parsed.errors?.length) {
    const first = parsed.errors[0];
    throw new Error(`Ошибка чтения CSV на строке ${first.row ?? "?"}: ${first.message}`);
  }
  return Array.isArray(parsed.data) ? parsed.data : [];
}

async function ensureSaleTypesExist(typeNames) {
  const unique = Array.from(new Set((typeNames || []).map((t) => asTrimmedString(t)).filter(Boolean)));
  if (unique.length === 0) return;

  const existing = await pb.collection("sale_project_types").getFullList({
    sort: "sort_order",
    fields: "name,sort_order",
  });

  const existingSet = new Set((existing || []).map((r) => r.name));
  const maxSort =
    (existing || []).reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1) ?? -1;

  const missing = unique.filter((name) => !existingSet.has(name));
  if (missing.length === 0) return;

  const rows = missing.map((name, idx) => ({
    name,
    sort_order: maxSort + 1 + idx,
  }));

  await Promise.all(
    rows.map((row) => pb.collection("sale_project_types").create(row))
  );
}

async function getNextSortOrderByType(typeNames) {
  const uniqueTypes = Array.from(new Set((typeNames || []).filter(Boolean)));
  const pairs = await Promise.all(
    uniqueTypes.map(async (type) => {
      const escapedType = String(type).replace(/"/g, '\\"');
      const data = await pb
        .collection("sale_projects")
        .getFirstListItem(`type = "${escapedType}"`, {
          sort: "-sort_order_in_category",
          fields: "sort_order_in_category",
        })
        .catch(() => null);
      const next = (data?.sort_order_in_category ?? -1) + 1;
      return [type, next];
    })
  );
  return new Map(pairs);
}

async function fetchExistingIds(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  const set = new Set();
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const filters = chunk.map(
      (id) => `external_id = "${String(id).replace(/"/g, '\\"')}"`,
    );
    const data = await pb.collection("sale_projects").getFullList({
      filter: filters.join(" || "),
      fields: "external_id",
    });
    for (const row of data || []) {
      if (row.external_id) set.add(row.external_id);
    }
  }
  return set;
}

export default function SaleProjectsImportModal({ onClose, onImported }) {
  const [state, setState] = useState({
    file: null,
    parsing: false,
    importing: false,
    rows: [], // [{ row, errors }]
    existingIds: new Set(),
    skipExisting: true,
    dropActive: false,
    progress: { done: 0, total: 0 },
  });

  const {
    file,
    parsing,
    importing,
    rows,
    existingIds,
    skipExisting,
    dropActive,
    progress,
  } = state;

  const setFile = (nextFile) =>
    setState((s) => ({ ...s, file: nextFile }));
  const setParsing = (next) => setState((s) => ({ ...s, parsing: next }));
  const setImporting = (next) =>
    setState((s) => ({ ...s, importing: next }));
  const setRows = (nextRows) => setState((s) => ({ ...s, rows: nextRows }));
  const setExistingIds = (nextSet) =>
    setState((s) => ({ ...s, existingIds: nextSet }));
  const setSkipExisting = (next) =>
    setState((s) => ({ ...s, skipExisting: next }));
  const setDropActive = (next) =>
    setState((s) => ({ ...s, dropActive: next }));
  const setProgress = (next) =>
    setState((s) => ({ ...s, progress: next }));

  const valid = useMemo(
    () => rows.filter((r) => r.errors.length === 0).map((r) => r.row),
    [rows]
  );
  const invalidCount = rows.filter((r) => r.errors.length > 0).length;

  const duplicatesInDb = useMemo(() => {
    const ids = new Set(existingIds);
    return valid.filter((r) => ids.has(r.id)).map((r) => r.id);
  }, [valid, existingIds]);

  const validForImport = useMemo(() => {
    if (!skipExisting) return valid;
    const ids = new Set(existingIds);
    return valid.filter((r) => !ids.has(r.id));
  }, [valid, existingIds, skipExisting]);

  const canImport =
    validForImport.length > 0 &&
    invalidCount === 0 &&
    (skipExisting || duplicatesInDb.length === 0) &&
    !importing;

  const handlePickFile = async (picked) => {
    if (!picked) return;
    setFile(picked);
    setParsing(true);
    setRows([]);
    setExistingIds(new Set());
    setSkipExisting(true);
    setProgress({ done: 0, total: 0 });

    try {
      const raw = await parseInputFile(picked);
      const rowsWithoutHints = raw
        .map((r) => mapRowKeys(r))
        .filter((mapped) => !isHintRow(mapped));
      const seenIds = new Set();
      const validated = rowsWithoutHints.map((r, idx) => {
        const rowIndex1 = idx + 2; // +1 header, +1 to make it 1-based
        const { row, errors } = validateRow(r, rowIndex1, seenIds);
        return { row, errors };
      });
      setRows(validated);

      const ids = validated
        .filter((x) => x.errors.length === 0)
        .map((x) => x.row.id)
        .filter(Boolean);
      const existing = await fetchExistingIds(ids);
      setExistingIds(existing);
    } catch (e) {
      toast.error(e?.message ?? "Не удалось прочитать файл");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!canImport) return;
    if (!pb.authStore?.isValid) {
      toast.error("Сессия админа истекла. Перелогиньтесь и повторите импорт.");
      return;
    }
    setImporting(true);
    setProgress({ done: 0, total: validForImport.length });

    try {
      // 1) гарантируем, что категории существуют (иначе проекты не видны в админке)
      await ensureSaleTypesExist(validForImport.map((r) => r.type));

      // 2) проставляем sort_order_in_category в конце каждой категории
      const nextByType = await getNextSortOrderByType(validForImport.map((r) => r.type));
      const counters = new Map(nextByType);

      const insertRows = validForImport.map((r) => {
        const next = counters.get(r.type) ?? 0;
        counters.set(r.type, next + 1);
        return buildSaleProjectImportPayload(r, next);
      });

      for (let i = 0; i < insertRows.length; i += CHUNK_SIZE) {
        const chunk = insertRows.slice(i, i + CHUNK_SIZE);
        for (const row of chunk) {
          try {
            await pb.collection("sale_projects").create(row);
          } catch (error) {
            const details = formatPocketbaseError(error, "Ошибка создания записи");
            throw new Error(
              `Строка ID "${row.external_id}": ${details}`,
            );
          }
        }
        setProgress({ done: Math.min(i + chunk.length, insertRows.length), total: insertRows.length });
      }

      const skipped = valid.length - insertRows.length;
      toast.success(skipped > 0 ? `Импортировано: ${insertRows.length} (пропущено: ${skipped})` : `Импортировано: ${insertRows.length}`);
      onImported?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.message ?? formatPocketbaseError(e, "Ошибка импорта"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal title="Импорт готовых проектов (CSV)" onClose={onClose} maxWidth="max-w-4xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-brand/20 bg-ink/40 p-4 text-sm text-gray-300">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="font-medium text-white">Как подготовить файл</div>
              <p className="text-gray-400">
                Проще всего сделать так:
              </p>
              <ol className="list-decimal pl-5 text-gray-400 space-y-1">
                <li>
                  Скачайте <span className="text-white">шаблон CSV</span> и откройте его в Excel или Google Таблицах.
                </li>
                <li>
                  Заполните минимум 3 поля: <span className="text-white">Артикул</span>, <span className="text-white">Название</span>, <span className="text-white">Категория</span>.
                </li>
                <li>
                  Остальные поля заполняйте по желанию. Они такие же, как в форме создания проекта: описание, экспликация, гараж, навес, подвал, площади, размеры дома и т.д.
                </li>
                <li>
                  Если у проекта несколько фото, вставьте все ссылки в одну ячейку через <span className="text-white">|</span> или <span className="text-white">;</span>. Импорт сохранит ссылки для последующей миграции изображений в PocketBase.
                </li>
                <li>
                  Сохраните файл как <span className="text-white">CSV с разделителем ;</span>. Если таблица предлагает выбор кодировки, выберите <span className="text-white">UTF-8</span>.
                </li>
                <li>
                  Загрузите файл сюда. Строку с подсказками из шаблона можно оставить, она не помешает импорту.
                </li>
              </ol>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    "sale-projects-template.csv",
                    buildCsvTemplate(),
                    "text/csv;charset=utf-8"
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-200 hover:bg-brand/10"
                title="CSV в UTF-8 с разделителем «;» для Excel"
              >
                <Icon name="download" className="h-4 w-4" />
                Шаблон CSV
              </button>
            </div>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            if (importing) return;
            e.preventDefault();
            e.stopPropagation();
            setDropActive(true);
          }}
          onDragLeave={(e) => {
            if (importing) return;
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget)) setDropActive(false);
          }}
          onDrop={(e) => {
            if (importing) return;
            e.preventDefault();
            e.stopPropagation();
            setDropActive(false);
            const dropped = e.dataTransfer?.files?.[0];
            if (dropped) handlePickFile(dropped);
          }}
          className={`rounded-xl border p-3 transition-colors ${
            dropActive
              ? "border-brand bg-brand/10"
              : "border-brand/20 bg-ink/10"
          }`}
          aria-label="Зона для перетаскивания CSV-файла"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand/30 bg-[#2A2A28] px-4 py-2 text-sm text-white hover:bg-brand/10">
                <Icon name="upload" className="h-4 w-4" />
                <span>{file ? "Заменить файл" : "Выбрать файл"}</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file && (
                <div className="text-sm text-gray-400">
                  {file.name}{" "}
                  {parsing && <span className="ml-2 text-gray-500">(чтение...)</span>}
                </div>
              )}
              {!file && (
                <div className="text-sm text-gray-500">
                  или перетащите файл сюда
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <span>
                Строк: <span className="text-white">{rows.length}</span>
              </span>
              <span>
                Валидных: <span className="text-white">{valid.length}</span>
              </span>
              <span>
                К импорту: <span className="text-white">{validForImport.length}</span>
              </span>
              <span>
                Ошибок: <span className={invalidCount ? "text-red-400" : "text-white"}>{invalidCount}</span>
              </span>
              <span>
                Дубликатов в БД:{" "}
                <span className={duplicatesInDb.length ? "text-amber-300" : "text-white"}>
                  {duplicatesInDb.length}
                </span>
              </span>
            </div>
          </div>
        </div>

        {duplicatesInDb.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            В файле есть ID, которые уже существуют в базе. Сейчас импорт работает в режиме{" "}
            <span className="font-medium">только добавление</span>.
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-amber-100">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                  disabled={importing}
                />
                Пропустить существующие ID и импортировать остальные
              </label>
              {!skipExisting && (
                <span className="text-xs text-amber-200/90">
                  (при выключении импорт будет заблокирован)
                </span>
              )}
            </div>
            <div className="mt-2 max-h-24 overflow-auto rounded-lg bg-black/20 p-2 text-amber-100">
              {duplicatesInDb.slice(0, 50).join(", ")}
              {duplicatesInDb.length > 50 ? "…" : ""}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-brand/20 overflow-hidden">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#2A2A28]">
                <tr className="text-gray-300">
                  <th className="p-3 w-[72px]">Строка</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Название</th>
                  <th className="p-3">Категория</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Цена</th>
                  <th className="p-3">Ошибки</th>
                </tr>
              </thead>
              <tbody className="bg-ink/30">
                {rows.length === 0 ? (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={7}>
                      Выберите CSV-файл, чтобы увидеть предпросмотр.
                    </td>
                  </tr>
                ) : (
                  rows.slice(0, 200).map(({ row, errors }) => {
                    const hasErrors = errors.length > 0;
                    const exists = existingIds.has(row.id);
                    return (
                      <tr
                        key={`${row.__rowNumber}`}
                        className={`border-t border-brand/10 ${hasErrors ? "bg-red-500/5" : exists ? "bg-amber-500/5" : ""}`}
                      >
                        <td className="p-3 text-gray-500">{row.__rowNumber}</td>
                        <td className="p-3 text-white">{row.id || "—"}</td>
                        <td className="p-3 text-gray-200">{row.title || "—"}</td>
                        <td className="p-3 text-gray-200">{row.type || "—"}</td>
                        <td className="p-3 text-gray-200">{row.status || "—"}</td>
                        <td className="p-3 text-gray-200">{row.price || "—"}</td>
                        <td className="p-3">
                          {hasErrors ? (
                            <div className="text-xs text-red-300 space-y-1">
                              {errors.map((e) => (
                                <div key={`err-${row.__rowNumber}-${e}`}>- {e}</div>
                              ))}
                            </div>
                          ) : exists ? (
                            <span className="text-xs text-amber-300">ID уже есть в базе</span>
                          ) : (
                            <span className="text-xs text-gray-500">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && (
            <div className="border-t border-brand/10 bg-[#2A2A28] p-3 text-xs text-gray-500">
              Показаны первые 200 строк для предпросмотра.
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-brand/30 px-6 py-2.5 text-gray-300 hover:bg-brand/10"
            disabled={importing}
          >
            Закрыть
          </button>

          <div className="flex items-center gap-3">
            {importing && (
              <div className="text-sm text-gray-400">
                Импорт: <span className="text-white">{progress.done}</span> /{" "}
                <span className="text-white">{progress.total}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleImport}
              disabled={!canImport}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 font-medium text-ink hover:opacity-90 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Icon name="loader" className="h-4 w-4 animate-spin" />
                  Импортирую...
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4" />
                  Импортировать
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
