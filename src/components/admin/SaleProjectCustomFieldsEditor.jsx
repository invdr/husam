import { useState, useCallback } from "react";
import { toast } from "sonner";
import Icon from "@/components/common/Icon";

const EMPTY_CUSTOM_FIELDS = [];

const inputClass =
  "flex-1 min-w-0 rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand";
const labelClass = "mb-1 block text-sm text-gray-400";

/**
 * Редактор списка доп. полей для готовых проектов.
 * Сохраняет в site_settings под ключом SALE_PROJECT_CUSTOM_FIELDS_KEY.
 */
export default function SaleProjectCustomFieldsEditor({
  value = EMPTY_CUSTOM_FIELDS,
  onSave,
  loading,
}) {
  const [list, setList] = useState(() => value.map((item) => ({ ...item })));
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = useCallback(() => {
    const key = newKey.trim().replace(/\s+/g, "_").toLowerCase();
    const label = newLabel.trim() || key;
    if (!key) {
      toast.error("Укажите ключ поля (латиница/цифры, без пробелов)");
      return;
    }
    if (list.some((item) => item.key === key)) {
      toast.error("Поле с таким ключом уже есть");
      return;
    }
    setList((prev) => [...prev, { key, label }]);
    setNewKey("");
    setNewLabel("");
  }, [list, newKey, newLabel]);

  const handleRemove = useCallback((index) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(JSON.stringify(list));
      toast.success("Список полей сохранён");
    } catch (err) {
      toast.error(err?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }, [list, onSave]);

  return (
    <div className="rounded-xl border border-brand/20 bg-[#2A2A28]/50 p-4">
      <h3 className="mb-3 font-play text-base font-semibold text-white">
        Дополнительные поля для карточек
      </h3>
      <p className="mb-4 text-sm text-gray-400">
        Добавьте поля, которые появятся в форме проекта и на карточке. Ключ — латиница/цифры (например: ceiling_height).
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex min-w-0 flex-1 basis-48 flex-col">
          <label htmlFor="sale-custom-field-key" className={labelClass}>
            Ключ
          </label>
          <input
            id="sale-custom-field-key"
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            placeholder="ceiling_height"
            className={inputClass}
          />
        </div>
        <div className="flex min-w-0 flex-1 basis-48 flex-col">
          <label htmlFor="sale-custom-field-label" className={labelClass}>
            Подпись в форме
          </label>
          <input
            id="sale-custom-field-label"
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            placeholder="Высота потолков"
            className={inputClass}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl border border-brand/30 px-4 py-2 text-sm text-brand transition hover:bg-brand/10"
          >
            <Icon name="plus" className="inline h-4 w-4" /> Добавить
          </button>
        </div>
      </div>

      {list.length > 0 && (
        <>
          <ul className="mb-4 space-y-2">
            {list.map((item, index) => (
              <li
                key={item.key}
                className="flex items-center gap-2 rounded-lg border border-brand/10 bg-ink/50 px-3 py-2"
              >
                <code className="text-xs text-brand">{item.key}</code>
                <span className="text-gray-400">—</span>
                <span className="text-sm text-white">{item.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="ml-auto rounded p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400"
                  aria-label="Удалить поле"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить список полей"}
          </button>
        </>
      )}

      {list.length === 0 && !loading && (
        <p className="text-sm text-gray-500">
          Нет доп. полей. Добавьте ключ и подпись выше и нажмите «Добавить», затем «Сохранить список полей».
        </p>
      )}
    </div>
  );
}
