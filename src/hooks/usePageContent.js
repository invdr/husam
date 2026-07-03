import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { useMountedRef } from "@/hooks/useMountedRef";
import {
  HERO_DEFAULTS,
  ADVANTAGES_DEFAULTS,
  PROCESS_DEFAULTS,
} from "@/data/pageContentDefaults";

const DEFAULTS_MAP = {
  ...HERO_DEFAULTS,
  advantages_title: ADVANTAGES_DEFAULTS.advantages_title,
  advantages_items: ADVANTAGES_DEFAULTS.advantages_items,
  process_badge: PROCESS_DEFAULTS.process_badge,
  process_title: PROCESS_DEFAULTS.process_title,
  process_subtitle: PROCESS_DEFAULTS.process_subtitle,
  process_steps: PROCESS_DEFAULTS.process_steps,
};

function parseValue(key, value) {
  if (value == null || value === "") return DEFAULTS_MAP[key];
  if (key === "advantages_items" || key === "process_steps") {
    try {
      return JSON.parse(value);
    } catch {
      return DEFAULTS_MAP[key];
    }
  }
  return value;
}

/**
 * Загружает контент главной страницы из PocketBase (коллекция page_content).
 * Для админа: updateContent(updates) для сохранения.
 * @returns {{ content: Record<string, any>, loading: boolean, error: Error | null, refetch: () => Promise<void>, updateContent: (updates: Record<string, any>) => Promise<void> }}
 */
export function usePageContent() {
  const [content, setContent] = useState(() => ({ ...DEFAULTS_MAP }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useMountedRef();

  const fetchContent = useCallback(async () => {
    try {
      const data = await pb.collection("page_content").getFullList();
      if (!mountedRef.current) return;

      const map = { ...DEFAULTS_MAP };
      (data || []).forEach(({ key, value }) => {
        if (key && key in map) {
          map[key] = parseValue(key, value);
        }
      });
      setContent(map);
      setError(null);
    } catch (err) {
      if (err?.isAbort || /autocancelled|aborted|cancell?ed/i.test(err?.message || "")) {
        return;
      }
      if (!mountedRef.current) return;
      setError(err);
      setContent({ ...DEFAULTS_MAP });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mountedRef]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const updateContent = useCallback(async (updates) => {
    const rows = Object.entries(updates).map(([key, val]) => ({
      key,
      value:
        typeof val === "object" && val !== null
          ? JSON.stringify(val)
          : String(val ?? ""),
    }));
    for (const { key, value } of rows) {
      const filter = `key = "${String(key).replace(/"/g, '\\"')}"`;
      const existing = await pb.collection("page_content").getFirstListItem(filter).catch(() => null);
      if (existing) {
        await pb.collection("page_content").update(existing.id, { key, value });
      } else {
        await pb.collection("page_content").create({ key, value });
      }
    }
    setContent((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    updateContent,
  };
}
