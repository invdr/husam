import { useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/common/Icon";

const LABELS = {
  address: "Адрес",
  phone: "Телефон",
  email: "Email",
  instagram_url: "Instagram (URL)",
  vk_url: "ВКонтакте (URL)",
  telegram_url: "Telegram (URL)",
};

export default function SettingsEditor({
  settings,
  loading,
  error,
  refetch,
  updateSetting,
  defaultKeys,
}) {
  const [form, setForm] = useState(() => ({ ...settings }));
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      for (const key of defaultKeys) {
        await updateSetting(key, form[key] ?? "");
      }
      toast.success("Контакты сохранены");
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка сохранения");
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
        Не удалось загрузить настройки: {error.message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-400">
        Контакты и ссылки на соцсети отображаются в блоке «Свяжитесь с нами» на
        главной странице.
      </p>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {defaultKeys.map((key) => (
          <div key={key}>
            <label
              htmlFor={`setting-${key}`}
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              {LABELS[key] ?? key}
            </label>
            <input
              id={`setting-${key}`}
              type="text"
              value={form[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
              placeholder={LABELS[key]}
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl border border-brand/30 bg-brand/10 px-6 py-2 font-medium text-white transition-colors hover:bg-brand/20 disabled:opacity-50"
      >
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
