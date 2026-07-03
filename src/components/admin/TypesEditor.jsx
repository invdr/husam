import { useState, useEffect } from "react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import Icon from "@/components/common/Icon";

export default function TypesEditor({ types, onClose, onUpdate }) {
  const items = types.map((name) => ({ name }));
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [projectCounts, setProjectCounts] = useState({});

  useEffect(() => {
    async function fetchCounts() {
      const data = await pb.collection("projects").getFullList({
        fields: "type",
      });
      const counts = {};
      (data ?? []).forEach((p) => {
        counts[p.type] = (counts[p.type] ?? 0) + 1;
      });
      setProjectCounts(counts);
    }
    fetchCounts();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await pb.collection("project_types").create({ name, sort_order: items.length });
      toast.success("Категория добавлена");
      setNewName("");
      onUpdate?.();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка добавления");
    }
  };

  const handleRename = async (oldName) => {
    const newVal = editName.trim();
    if (!newVal || newVal === oldName) {
      setEditing(null);
      return;
    }

    const isTaken = items.some(
      ({ name }) =>
        name !== oldName && name.trim().toLowerCase() === newVal.toLowerCase()
    );
    if (isTaken) {
      toast.error("Категория с таким названием уже существует");
      return;
    }

    try {
      const escapedOld = String(oldName).replace(/"/g, '\\"');
      const oldRow = await pb
        .collection("project_types")
        .getFirstListItem(`name = "${escapedOld}"`)
        .catch(() => null);

      const projects = await pb.collection("projects").getFullList({
        filter: `type = "${escapedOld}"`,
      });
      await Promise.all(
        projects.map((project) =>
          pb.collection("projects").update(project.id, { type: newVal })
        )
      );

      if (oldRow) {
        await pb.collection("project_types").update(oldRow.id, { name: newVal });
      } else {
        await pb.collection("project_types").create({
          name: newVal,
          sort_order: 0,
        });
      }

      toast.success("Категория переименована");
      setEditing(null);
      setEditName("");
      onUpdate?.();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка переименования");
    }
  };

  const handleDelete = async (name) => {
    const count = projectCounts[name] ?? 0;
    if (count > 0) {
      toast.error(`Нельзя удалить: ${count} проект(ов) используют эту категорию`);
      return;
    }
    try {
      const escapedName = String(name).replace(/"/g, '\\"');
      const row = await pb
        .collection("project_types")
        .getFirstListItem(`name = "${escapedName}"`);
      await pb.collection("project_types").delete(row.id);
      toast.success("Категория удалена");
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
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-brand/30 bg-[#2A2A28] p-6 shadow-xl">
        <h3 className="font-play text-lg font-bold text-white mb-4">
          Управление категориями
        </h3>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Новая категория"
            className="flex-1 rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
          />
          <button
            onClick={handleAdd}
            className="rounded-xl border border-brand/30 px-4 py-2 text-brand hover:bg-brand/10"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>

        <ul className="space-y-2 mb-6 max-h-60 overflow-y-auto">
          {items.map(({ name }) => (
            <li
              key={name}
              className="flex items-center justify-between rounded-lg border border-brand/20 bg-ink/50 px-3 py-2"
            >
              {editing === name ? (
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(name);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="flex-1 rounded border border-brand/30 bg-ink px-2 py-1 text-white"
                  />
                  <button
                    onClick={() => handleRename(name)}
                    className="text-brand hover:text-white"
                  >
                    <Icon name="check" className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-white">{name}</span>
                  <span className="text-xs text-gray-500 mr-2">
                    {projectCounts[name] ?? 0} проект.
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(name);
                        setEditName(name);
                      }}
                      className="rounded p-1 text-gray-400 hover:text-brand"
                      title="Переименовать"
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(name)}
                      disabled={(projectCounts[name] ?? 0) > 0}
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

        <button
          onClick={onClose}
          className="w-full rounded-xl border border-brand/30 px-4 py-2 text-gray-300 hover:bg-brand/10"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
