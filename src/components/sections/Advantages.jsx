import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Icon,
  Modal,
} from "@/components/common";
import EditBlockButton from "./EditBlockButton";
import { usePageContent } from "@/hooks/usePageContent";
import { ADVANTAGES_DEFAULTS } from "@/data/pageContentDefaults";

/** Иконки для карточек преимуществ: значение в БД → подпись для заказчика */
const ADVANTAGE_ICON_OPTIONS = [
  { value: "building-2", label: "Здание" },
  { value: "shield", label: "Щит" },
  { value: "users", label: "Команда" },
  { value: "file-text", label: "Документ" },
  { value: "calendar", label: "Календарь" },
  { value: "message-circle", label: "Сообщения" },
  { value: "calculator", label: "Калькулятор" },
];

export default function Advantages() {
  const { content, loading, updateContent } = usePageContent();
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const c = loading ? ADVANTAGES_DEFAULTS : content;
  const title = c.advantages_title ?? ADVANTAGES_DEFAULTS.advantages_title;
  const items = Array.isArray(c.advantages_items)
    ? c.advantages_items
    : ADVANTAGES_DEFAULTS.advantages_items;

  const [formTitle, setFormTitle] = useState(title);
  const [formItems, setFormItems] = useState([]);

  const openEdit = () => {
    setFormTitle(title);
    setFormItems(
      items.map((it, idx) => ({
        icon: it.icon || ADVANTAGE_ICON_OPTIONS[0].value,
        title: it.title || "",
        description: it.description || "",
        _localId: `adv-form-${idx}-${it.title ?? ""}`,
      }))
    );
    setShowEdit(true);
  };

  const updateItem = (index, field, value) => {
    setFormItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (index) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        icon: ADVANTAGE_ICON_OPTIONS[0].value,
        title: "",
        description: "",
        _localId: `adv-form-${Date.now()}`,
      },
    ]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const valid = formItems.map((it) => ({
      icon: it.icon || ADVANTAGE_ICON_OPTIONS[0].value,
      title: (it.title || "").trim(),
      description: (it.description || "").trim(),
    }));
    setSaving(true);
    try {
      await updateContent({
        advantages_title: formTitle.trim(),
        advantages_items: valid,
      });
      toast.success("Блок сохранен");
      setShowEdit(false);
    } catch (err) {
      toast.error(err?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="advantages" className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center py-[30px] md:py-16 will-reveal">
      <EditBlockButton onClick={openEdit} label="Изменить блок" />

      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <h2 className="mb-8 text-center font-play text-4xl font-bold md:mb-10 md:text-5xl lg:text-6xl will-reveal">
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 will-reveal">
          {items.map((item) => (
            <div
              key={`adv-${item.title ?? ""}-${item.icon ?? ""}`}
            >
              <Card className="h-full border-brand/20 bg-[#2A2A28] transition-all duration-300 hover:border-brand">
                <CardHeader>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon name={item.icon} className="h-8 w-8" />
                  </div>
                  <CardTitle className="font-play text-white">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">{item.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {showEdit && (
        <Modal
          title="Редактировать блок: Преимущества"
          onClose={() => setShowEdit(false)}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="advantages-title" className="mb-1 block text-sm text-gray-400">
                Заголовок секции
              </label>
              <input
                id="advantages-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                placeholder="Почему выбирают ХIусам"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-400">Карточки</span>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 rounded-lg border border-brand/30 px-3 py-1.5 text-sm text-brand hover:bg-brand/10"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Добавить карточку
                </button>
              </div>
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {formItems.map((item, index) => (
                  <div
                    key={item._localId}
                    className="rounded-xl border border-brand/20 bg-ink/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">
                        Карточка {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={formItems.length <= 1}
                        className="rounded p-1 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Удалить карточку"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label htmlFor={`advantages-icon-${index}`} className="mb-1 block text-xs text-gray-500">
                        Иконка
                      </label>
                      <select
                        id={`advantages-icon-${index}`}
                        value={item.icon}
                        onChange={(e) =>
                          updateItem(index, "icon", e.target.value)
                        }
                        className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                      >
                        {ADVANTAGE_ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`advantages-title-${index}`} className="mb-1 block text-xs text-gray-500">
                        Заголовок карточки
                      </label>
                      <input
                        id={`advantages-title-${index}`}
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateItem(index, "title", e.target.value)
                        }
                        className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                        placeholder="Например: Полный цикл работ"
                      />
                    </div>
                    <div>
                      <label htmlFor={`advantages-description-${index}`} className="mb-1 block text-xs text-gray-500">
                        Описание
                      </label>
                      <textarea
                        id={`advantages-description-${index}`}
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        rows={2}
                        className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                        placeholder="Краткое описание преимущества"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand/20">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="rounded-xl border border-brand/20 px-4 py-2 text-gray-400 hover:bg-ink"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brand px-4 py-2 text-ink hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
