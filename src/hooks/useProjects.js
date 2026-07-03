import { useState, useEffect, useCallback, useRef } from "react";
import { pb, getPocketbaseFileUrl } from "@/lib/pocketbase";
import {
  isPocketbaseAbortError,
  subscribeToPocketbaseCollections,
} from "@/hooks/pocketbaseRealtime";

function parseMaybeJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseScope(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeProject(row) {
  const rawImages = Array.isArray(row.images) ? row.images : [];
  const images = rawImages
    .map((name) => getPocketbaseFileUrl(row, name))
    .filter(Boolean);

  const attributes = parseMaybeJsonObject(row.attributes);

  return {
    id: row.external_id ?? row.id,
    recordId: row.id,
    title: row.title,
    description: row.description ?? "",
    type: row.type,
    area: row.area ?? "",
    duration: row.duration ?? "",
    budget: row.budget ?? "",
    location: row.location ?? "",
    scope: parseScope(row.scope),
    images,
    testimonial: row.testimonial,
    clientName: row.client_name,
    sortOrder: row.sort_order ?? 999,
    sortOrderInCategory: row.sort_order_in_category ?? 999,
    featured: !!row.featured,
    published: row.published !== false,
    attributes,
  };
}

// Кэш последней успешной выборки на уровне модуля: при повторном маунте
// (переходы Каталог → проект → Каталог) данные показываются сразу, без
// скелетонов, а свежая выборка выполняется в фоне.
let projectsCache = null;

/**
 * Загружает проекты из PocketBase.
 * Подписывается на Realtime: при INSERT/UPDATE/DELETE перезапрашивает список.
 * @returns {{ projects: Array, loading: boolean, error: Error | null }}
 */
export function useProjects() {
  const [projects, setProjects] = useState(() => projectsCache ?? []);
  const [loading, setLoading] = useState(() => projectsCache === null);
  const [error, setError] = useState(null);
  const fetchSeq = useRef(0);

  const fetchProjects = useCallback(async (isInitial = false) => {
    // autoCancellation у PocketBase отключён, поэтому защищаемся от гонки
    // сами: ответ применяется только если за время ожидания не стартовал
    // более новый запрос (иначе устаревшие данные перетёрли бы свежие).
    const seq = ++fetchSeq.current;
    try {
      const [projectsData, typesData] = await Promise.all([
        pb.collection("projects").getFullList({
          sort: "sort_order_in_category",
          filter: "published = true",
        }),
        pb.collection("project_types").getFullList({
          sort: "sort_order",
        }),
      ]);

      if (seq !== fetchSeq.current) return;

      const typeOrder = new Map(
        (typesData || []).map((t, i) => [t.name, t.sort_order ?? i])
      );

      const normalized = (projectsData || [])
        .map(normalizeProject)
        .sort((a, b) => {
          const orderA = typeOrder.get(a.type) ?? 999;
          const orderB = typeOrder.get(b.type) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.sortOrderInCategory ?? 999) - (b.sortOrderInCategory ?? 999);
        });

      projectsCache = normalized;
      setProjects(normalized);
      setError(null);
    } catch (err) {
      if (isPocketbaseAbortError(err)) {
        return;
      }
      if (seq !== fetchSeq.current) return;
      projectsCache = null;
      setError(err);
      setProjects([]);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let removeChannel = () => {};

    (async function init() {
      await fetchProjects(true);
      if (cancelled) return;

      const unsubscribe = await subscribeToPocketbaseCollections(
        ["projects", "project_types"],
        () => {
          if (!cancelled) fetchProjects(false);
        }
      );
      if (cancelled) {
        unsubscribe();
        return;
      }
      removeChannel = () => {
        unsubscribe();
      };
    })().catch((err) => {
      if (!cancelled && !isPocketbaseAbortError(err)) {
        setError(err);
      }
    });

    return () => {
      cancelled = true;
      removeChannel();
    };
  }, [fetchProjects]);

  return { projects, loading, error };
}
