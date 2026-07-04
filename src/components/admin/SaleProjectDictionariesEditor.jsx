import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import Icon from "@/components/common/Icon";
import { SALE_PROJECT_OPTION_DICTIONARIES } from "@/data/saleProjectOptionDictionaries";

function escapeFilterValue(value) {
  return String(value).replace(/"/g, '\\"');
}

function isDuplicate(values, currentValue, nextValue) {
  const normalized = nextValue.trim().toLowerCase();
  return values.some(
    (value) =>
      value !== currentValue &&
      String(value).trim().toLowerCase() === normalized,
  );
}

export default function SaleProjectDictionariesEditor({
  dictionaries,
  onClose,
  onUpdate,
}) {
  const [newNames, setNewNames] = useState({});
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [projectCounts, setProjectCounts] = useState({});

  const fields = useMemo(
    () => SALE_PROJECT_OPTION_DICTIONARIES.map((dict) => dict.projectField),
    [],
  );

  useEffect(() => {
    async function fetchCounts() {
      const data = await pb.collection("sale_projects").getFullList({
        fields: fields.join(","),
      });
      const counts = {};
      for (const dict of SALE_PROJECT_OPTION_DICTIONARIES) {
        counts[dict.key] = {};
      }
      (data ?? []).forEach((project) => {
        SALE_PROJECT_OPTION_DICTIONARIES.forEach((dict) => {
          const value = String(project[dict.projectField] ?? "").trim();
          if (!value) return;
          counts[dict.key][value] = (counts[dict.key][value] ?? 0) + 1;
        });
      });
      setProjectCounts(counts);
    }
    fetchCounts().catch((err) =>
      toast.error(err?.message ?? "Не удалось посчитать проекты"),
    );
  }, [fields]);

  const handleAdd = async (dict) => {
    const name = (newNames[dict.key] ?? "").trim();
    if (!name) return;

    const values = dictionaries[dict.key] ?? [];
    if (isDuplicate(values, null, name)) {
      toast.error("Такое значение уже есть");
      return;
    }

    try {
      await pb
        .collection(dict.collection)
        .create({ name, sort_order: values.length });
      toast.success("Значение добавлено");
      setNewNames((prev) => ({ ...prev, [dict.key]: "" }));
      onUpdate?.();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка добавления");
    }
  };

  const handleRename = async (dict, oldName) => {
    const newValue = editName.trim();
    if (!newValue || newValue === oldName) {
      setEditing(null);
      return;
    }

    const values = dictionaries[dict.key] ?? [];
    if (isDuplicate(values, oldName, newValue)) {
      toast.error("Такое значение уже есть");
      return;
    }

    try {
      const escapedOld = escapeFilterValue(oldName);
      const oldRow = await pb
        .collection(dict.collection)
        .getFirstListItem(`name = "${escapedOld}"`)
        .catch(() => null);

      const projects = await pb.collection("sale_projects").getFullList({
        filter: `${dict.projectField} = "${escapedOld}"`,
        fields: "id",
      });
      await Promise.all(
        projects.map((project) =>
          pb
            .collection("sale_projects")
            .update(project.id, { [dict.projectField]: newValue }),
        ),
      );

      if (oldRow) {
        await pb.collection(dict.collection).update(oldRow.id, {
          name: newValue,
        });
      } else {
        await pb.collection(dict.collection).create({
          name: newValue,
          sort_order: values.length,
        });
      }

      toast.success("Значение переименовано");
      setEditing(null);
      setEditName("");
      onUpdate?.();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка переименования");
    }
  };

  const handleDelete = async (dict, name) => {
    const count = projectCounts[dict.key]?.[name] ?? 0;
    if (count > 0) {
      toast.error(`Нельзя удалить: ${count} проект(ов) используют это значение`);
      return;
    }

    try {
      const escapedName = escapeFilterValue(name);
      const row = await pb
        .collection(dict.collection)
        .getFirstListItem(`name = "${escapedName}"`);
      await pb.collection(dict.collection).delete(row.id);
      toast.success("Значение удалено");
      onUpdate?.();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка удаления");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-brand/30 bg-[#2A2A28] p-6 shadow-xl">
        <h3 className="mb-5 font-play text-lg font-bold text-white">
          Справочники готовых проектов
        </h3>

        <div className="grid gap-5 lg:grid-cols-2">
          {SALE_PROJECT_OPTION_DICTIONARIES.map((dict) => {
            const values = dictionaries[dict.key] ?? [];
            return (
              <section key={dict.key} className="rounded-xl border border-brand/20 bg-ink/40 p-4">
                <h4 className="mb-3 font-play text-base font-semibold text-white">
                  {dict.label}
                </h4>

                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newNames[dict.key] ?? ""}
                    onChange={(e) =>
                      setNewNames((prev) => ({
                        ...prev,
                        [dict.key]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAdd(dict)}
                    placeholder={`Новое значение: ${dict.placeholder}`}
                    className="min-w-0 flex-1 rounded-xl border border-brand/20 bg-ink px-3 py-2 text-sm text-white outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdd(dict)}
                    className="rounded-xl border border-brand/30 px-3 text-brand hover:bg-brand/10"
                    title="Добавить"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                  </button>
                </div>

                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {values.length === 0 && (
                    <li className="rounded-lg border border-brand/10 px-3 py-2 text-sm text-gray-500">
                      Значений пока нет
                    </li>
                  )}
                  {values.map((name) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 rounded-lg border border-brand/20 bg-[#2A2A28] px-3 py-2"
                    >
                      {editing?.key === dict.key && editing?.name === name ? (
                        <div className="flex min-w-0 flex-1 gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(dict, name);
                              if (e.key === "Escape") setEditing(null);
                            }}
                            className="min-w-0 flex-1 rounded border border-brand/30 bg-ink px-2 py-1 text-sm text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRename(dict, name)}
                            className="text-brand hover:text-white"
                            title="Сохранить"
                          >
                            <Icon name="check" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="text-gray-400 hover:text-white"
                            title="Отмена"
                          >
                            <Icon name="x" className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate text-sm text-white">
                            {name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {projectCounts[dict.key]?.[name] ?? 0} проект.
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing({ key: dict.key, name });
                                setEditName(name);
                              }}
                              className="rounded p-1 text-gray-400 hover:text-brand"
                              title="Переименовать"
                            >
                              <Icon name="pencil" className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(dict, name)}
                              disabled={(projectCounts[dict.key]?.[name] ?? 0) > 0}
                              className="rounded p-1 text-gray-400 hover:text-red-400 disabled:opacity-30"
                              title="Удалить"
                            >
                              <Icon name="trash" className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-brand/30 px-4 py-2 text-gray-300 hover:bg-brand/10"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
