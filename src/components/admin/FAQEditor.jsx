import { useState } from "react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import Icon from "@/components/common/Icon";
import { ConfirmModal } from "@/components/common";
import { useFaq } from "@/hooks/useFaq";

export default function FAQEditor() {
  const { items, loading, error, refetch } = useFaq();
  const [editingId, setEditingId] = useState(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    const q = newQuestion.trim();
    const a = newAnswer.trim();
    if (!q || !a) {
      toast.error("Введите вопрос и ответ");
      return;
    }
    setSaving(true);
    try {
      await pb.collection("faq").create({
        question: q,
        answer: a,
        sort_order: items.length,
      });
      toast.success("Вопрос добавлен");
      setNewQuestion("");
      setNewAnswer("");
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const q = editQuestion.trim();
    const a = editAnswer.trim();
    if (!editingId || !q || !a) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    try {
      await pb.collection("faq").update(editingId, { question: q, answer: a });
      toast.success("Вопрос обновлен");
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await pb.collection("faq").delete(deleteTarget.id);
      toast.success("Вопрос удален");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const moveItem = async (index, direction) => {
    if (direction !== -1 && direction !== 1) return;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const a = items[index];
    const b = items[next];
    const aOrder = a.sort_order ?? index;
    const bOrder = b.sort_order ?? next;
    setSaving(true);
    try {
      await Promise.all([
        pb.collection("faq").update(a.id, { sort_order: bOrder }),
        pb.collection("faq").update(b.id, { sort_order: aOrder }),
      ]);
      toast.success("Порядок обновлен");
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка");
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="loader" className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-400">
        Не удалось загрузить FAQ: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Вопросы и ответы отображаются в блоке «Частые вопросы» на главной
        странице.
      </p>

      <form onSubmit={handleAdd} className="rounded-xl border border-brand/20 bg-ink/30 p-4">
        <h3 className="mb-3 font-play text-lg font-bold text-white">
          Добавить вопрос
        </h3>
        <div className="mb-3">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Вопрос"
            className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
          />
        </div>
        <div className="mb-3">
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Ответ"
            rows={3}
            className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border border-brand/30 px-4 py-2 text-brand hover:bg-brand/10 disabled:opacity-50"
        >
          <Icon name="plus" className="mr-1 inline h-4 w-4" />
          Добавить
        </button>
      </form>

      <div>
        <h3 className="mb-3 font-play text-lg font-bold text-white">
          Список вопросов ({items.length})
        </h3>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-xl border border-brand/20 bg-ink/30 p-4"
            >
              <div className="flex flex-col gap-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0 || saving}
                  className="rounded p-0.5 text-gray-400 hover:text-brand disabled:opacity-30"
                  title="Поднять"
                  aria-label="Поднять"
                >
                  <Icon name="chevron-up" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1 || saving}
                  className="rounded p-0.5 text-gray-400 hover:text-brand disabled:opacity-30"
                  title="Опустить"
                  aria-label="Опустить"
                >
                  <Icon name="chevron-down" className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                {editingId === item.id ? (
                  <form onSubmit={handleSaveEdit} className="space-y-2">
                    <input
                      type="text"
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      className="w-full rounded border border-brand/30 bg-ink px-2 py-1 text-white"
                      placeholder="Вопрос"
                    />
                    <textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      rows={2}
                      className="w-full rounded border border-brand/30 bg-ink px-2 py-1 text-white"
                      placeholder="Ответ"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded border border-brand/30 px-2 py-1 text-sm text-brand hover:bg-brand/10"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-brand/20 px-2 py-1 text-sm text-gray-400 hover:bg-ink"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="font-medium text-white">{item.question}</p>
                    <p className="mt-1 truncate text-sm text-gray-400">
                      {item.answer}
                    </p>
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded p-1 text-gray-400 hover:text-brand"
                        title="Редактировать"
                      >
                        <Icon name="pencil" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded p-1 text-gray-400 hover:text-red-400"
                        title="Удалить"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <p className="py-4 text-center text-gray-500">
            Пока нет вопросов. Добавьте первый выше.
          </p>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Удалить вопрос?"
          message={
            <>
              «{deleteTarget.question}» — удаление нельзя отменить.
            </>
          }
          variant="danger"
          confirmLabel="Удалить"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
