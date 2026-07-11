import { useState, useEffect, useCallback, useRef } from "react";
import { pb, getPocketbaseFileUrl } from "@/lib/pocketbase";
import { withRequestTimeout } from "@/lib/requestTimeout";
import {
  isPocketbaseAbortError,
  subscribeToPocketbaseCollections,
} from "@/hooks/pocketbaseRealtime";
import { normalizeCatalogProjectType } from "@/utils/catalogAttributes";

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
let projectTypesCache = null;

/**
 * Загружает проекты из PocketBase.
 * Подписывается на Realtime: при INSERT/UPDATE/DELETE перезапрашивает список.
 * @returns {{ projects: Array, loading: boolean, error: Error | null }}
 */
export function useProjects() {
  const [projects, setProjects] = useState(() => projectsCache ?? []);
  const [types, setTypes] = useState(() => projectTypesCache ?? []);
  const [loading, setLoading] = useState(
    () => projectsCache === null || projectTypesCache === null,
  );
  // Даже при наличии module cache текущий mount сначала должен подтвердить его
  // свежим атомарным снимком projects + project_types. Пока этого не произошло,
  // страницы могут показывать cache, но не должны канонизировать URL по нему.
  const [isAuthoritative, setIsAuthoritative] = useState(false);
  const [error, setError] = useState(null);
  const fetchSeq = useRef(0);

  const fetchProjects = useCallback(async (
    isInitial = false,
    promoteAuthority = true,
  ) => {
    if (!isInitial) {
      // Realtime-событие означает, что текущий snapshot уже потенциально устарел.
      // Отзываем право канонизировать URL до завершения нового атомарного fetch.
      setIsAuthoritative(false);
    }
    // autoCancellation у PocketBase отключён, поэтому защищаемся от гонки
    // сами: ответ применяется только если за время ожидания не стартовал
    // более новый запрос (иначе устаревшие данные перетёрли бы свежие).
    const seq = ++fetchSeq.current;
    try {
      const [projectsData, typesData] = await withRequestTimeout(
        Promise.all([
          pb.collection("projects").getFullList({
            sort: "sort_order_in_category",
            filter: "published = true",
          }),
          pb.collection("project_types").getFullList({
            sort: "sort_order",
          }),
        ]),
        "projects fetch"
      );

      if (seq !== fetchSeq.current) return;

      const typeOrder = new Map(
        (typesData || []).map((t, i) => [
          normalizeCatalogProjectType(t.name),
          t.sort_order ?? i,
        ])
      );
      const configuredTypes = new Set(typeOrder.keys());
      const nextTypes = (typesData || []).map((type) => type.name).filter(Boolean);

      const normalized = (projectsData || [])
        .map(normalizeProject)
        .filter((project) =>
          configuredTypes.has(normalizeCatalogProjectType(project.type)),
        )
        .sort((a, b) => {
          const orderA =
            typeOrder.get(normalizeCatalogProjectType(a.type)) ?? 999;
          const orderB =
            typeOrder.get(normalizeCatalogProjectType(b.type)) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.sortOrderInCategory ?? 999) - (b.sortOrderInCategory ?? 999);
        });

      projectsCache = normalized;
      projectTypesCache = nextTypes;
      setProjects(normalized);
      setTypes(nextTypes);
      setError(null);
      if (promoteAuthority) setIsAuthoritative(true);
    } catch (err) {
      if (isPocketbaseAbortError(err)) {
        return;
      }
      if (seq !== fetchSeq.current) return;
      setError(err);
      // Ошибка refresh не превращает последний успешный snapshot в
      // авторитетную пустую выборку. Оставляем cache на экране, но запрещаем
      // URL-канонизацию до следующего успешного атомарного refresh.
      setIsAuthoritative(false);
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
      // Первый snapshot можно показать сразу, но он ещё не закрывает окно
      // между fetch и установкой обеих realtime-подписок.
      await fetchProjects(true, false);
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
      // Повторный атомарный fetch после подписки закрывает пропущенное окно;
      // только этот snapshot получает право канонизировать URL.
      await fetchProjects(false, true);
    })().catch((err) => {
      if (!cancelled && !isPocketbaseAbortError(err)) {
        setError(err);
        setIsAuthoritative(false);
      }
    });

    return () => {
      cancelled = true;
      removeChannel();
    };
  }, [fetchProjects]);

  return { projects, types, loading, isAuthoritative, error };
}
