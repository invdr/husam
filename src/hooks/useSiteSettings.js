import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";

const DEFAULT_KEYS = [
  "address",
  "phone",
  "email",
  "instagram_url",
  "vk_url",
  "telegram_url",
];

const DEFAULTS = {
  address: "г. Грозный, пр-т Кадырова, 274",
  phone: "+7 (928) 945-31-31",
  email: "husamstroy_2020@mail.ru",
  instagram_url: "https://instagram.com/husamstroy",
  vk_url: "https://vk.com/husamstroy",
  telegram_url: "https://t.me/husamstroy",
};

/**
 * Загружает настройки сайта (контакты, соцсети) из PocketBase (коллекция site_settings).
 * @returns {{ settings: Record<string, string>, loading: boolean, error: Error | null, refetch: () => Promise<void>, updateSetting: (key: string, value: string) => Promise<void> }}
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await pb.collection("site_settings").getFullList();

      const map = { ...DEFAULTS };
      (data || []).forEach(({ key, value }) => {
        if (key && value != null) map[key] = value;
      });
      setSettings(map);
      setError(null);
    } catch (err) {
      setError(err);
      setSettings({ ...DEFAULTS });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(
    async (key, value) => {
      const filter = `key = "${String(key).replace(/"/g, '\\"')}"`;
      const existing = await pb.collection("site_settings").getFirstListItem(filter).catch(() => null);
      if (existing) {
        await pb.collection("site_settings").update(existing.id, { key, value: value ?? "" });
      } else {
        await pb.collection("site_settings").create({ key, value: value ?? "" });
      }
      setSettings((prev) => ({ ...prev, [key]: value ?? "" }));
    },
    []
  );

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSetting,
    defaultKeys: DEFAULT_KEYS,
  };
}
