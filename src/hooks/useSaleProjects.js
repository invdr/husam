import { useState, useEffect, useCallback } from "react";
import { pb, getPocketbaseFileUrl } from "@/lib/pocketbase";

function pickText(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return "";
}

/** Нормализует сырую строку sale_projects: поднимает поля из attributes, приводит images. */
export function normalizeSaleProject(row) {
  const rawImages = Array.isArray(row.images) ? row.images : [];
  const images = rawImages
    .map((name) => getPocketbaseFileUrl(row, name))
    .filter(Boolean);

  const attributes =
    row.attributes && typeof row.attributes === "object" ? row.attributes : {};

  return {
    id: row.external_id ?? row.id,
    recordId: row.recordId ?? row.id,
    title: row.title,
    description: row.description ?? "",
    hasGarage: !!row.has_garage,
    hasCanopy: !!row.has_canopy,
    hasBasement: !!row.has_basement,
    roomExplanation: row.room_explanation ?? "",
    type: row.type ?? "",
    area: row.area ?? "",
    rooms: row.rooms ?? "",
    floors: row.floors ?? "",
    material: row.material ?? "",
    price: row.price ?? "",
    oldPrice: row.old_price ?? "",
    constructionPriceFrom: row.construction_price_from ?? "",
    status: row.status ?? "available",
    images,
    sortOrder: row.sort_order ?? 999,
    sortOrderInCategory: row.sort_order_in_category ?? 999,
    featured: !!row.featured,
    published: row.published !== false,
    attributes,
    plot_area: pickText(row.plot_area, attributes.plot_area),
    house_area: pickText(row.house_area, attributes.house_area),
    usable_area: pickText(row.usable_area, attributes.usable_area),
    implementation_period: pickText(
      row.implementation_period,
      attributes.implementation_period
    ),
    house_dimensions: pickText(row.house_dimensions, attributes.house_dimensions),
  };
}

/**
 * Загружает готовые проекты на продажу (sale_projects) из PocketBase
 * и подписывается на realtime-обновления.
 */
export function useSaleProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async (isInitial = false) => {
    try {
      const [projectsData, typesData] = await Promise.all([
        pb.collection("sale_projects").getFullList({
          sort: "sort_order_in_category",
          filter: "published = true",
        }),
        pb.collection("sale_project_types").getFullList({
          sort: "sort_order",
        }),
      ]);

      const typeOrder = new Map(
        (typesData || []).map((typeRow, index) => [
          typeRow.name,
          typeRow.sort_order ?? index,
        ])
      );

      const normalized = (projectsData || [])
        .map(normalizeSaleProject)
        .sort((a, b) => {
          const orderA = typeOrder.get(a.type) ?? 999;
          const orderB = typeOrder.get(b.type) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.sortOrderInCategory ?? 999) - (b.sortOrderInCategory ?? 999);
        });

      setProjects(normalized);
      setError(null);
    } catch (err) {
      if (err?.isAbort || /autocancelled|aborted|cancell?ed/i.test(err?.message || "")) {
        return;
      }
      setError(err);
      setProjects([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let removeChannel = () => {};

    (async function init() {
      await fetchProjects(true);
      if (cancelled) return;

      const unsubscribe = await pb.collection("sale_projects").subscribe("*", () => {
        if (!cancelled) fetchProjects(false);
      });
      removeChannel = () => {
        unsubscribe();
      };
    })();

    return () => {
      cancelled = true;
      removeChannel();
    };
  }, [fetchProjects]);

  return { projects, loading, error };
}
