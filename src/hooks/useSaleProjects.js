import { useState, useEffect, useCallback, useRef } from "react";
import { pb, getPocketbaseFileUrl } from "@/lib/pocketbase";
import { withRequestTimeout } from "@/lib/requestTimeout";
import {
  isPocketbaseAbortError,
  subscribeToPocketbaseCollections,
} from "@/hooks/pocketbaseRealtime";
import {
  buildStructuredRoomExplanation,
  isPositiveChoice,
  normalizeAttachmentChoice,
  normalizeYesNoChoice,
  splitSaleProjectRoomExplanation,
} from "@/utils/saleProjectFieldStructure";

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
  const constructionMaterials =
    attributes.constructionMaterials &&
    typeof attributes.constructionMaterials === "object"
      ? attributes.constructionMaterials
      : {};
  const topLevelConstructionMaterials = {
    foundation: pickText(row.material_foundation, constructionMaterials.foundation),
    walls: pickText(row.material_walls, constructionMaterials.walls, row.material),
    roof: pickText(row.material_roof, constructionMaterials.roof),
    facade: pickText(row.material_facade, constructionMaterials.facade),
  };
  const explication =
    attributes.explication && typeof attributes.explication === "object"
      ? attributes.explication
      : {};
  const parsedExplication = splitSaleProjectRoomExplanation(row.room_explanation);
  const topLevelExplication = {
    basement: pickText(row.explication_basement, explication.basement, parsedExplication.basement),
    floor_1: pickText(row.explication_floor_1, explication.floor_1, parsedExplication.floor_1),
    floor_2: pickText(row.explication_floor_2, explication.floor_2, parsedExplication.floor_2),
  };
  const roomExplanation = buildStructuredRoomExplanation({
    explication_basement: topLevelExplication.basement,
    explication_floor_1: topLevelExplication.floor_1,
    explication_floor_2: topLevelExplication.floor_2,
  });
  const garage = normalizeAttachmentChoice(
    pickText(row.garage, attributes.garage),
    !!row.has_garage,
  );
  const canopy = normalizeAttachmentChoice(
    pickText(row.canopy, attributes.canopy),
    !!row.has_canopy,
  );
  const basement = normalizeYesNoChoice(
    pickText(row.basement, attributes.basement),
    !!row.has_basement || isPositiveChoice(topLevelExplication.basement),
  );
  const terrace = normalizeYesNoChoice(
    pickText(row.terrace, attributes.terrace),
    /террас|веранд/i.test(roomExplanation),
  );
  const houseArea = pickText(row.house_area, attributes.house_area, row.area);
  const bedrooms = pickText(row.bedrooms, attributes.bedrooms, row.rooms);

  return {
    id: row.external_id ?? row.id,
    recordId: row.recordId ?? row.id,
    title: row.title,
    description: row.description ?? "",
    hasGarage: garage !== "Нет",
    hasCanopy: canopy !== "Нет",
    hasBasement: basement === "Да",
    roomExplanation,
    type: row.type ?? "",
    area: houseArea,
    rooms: bedrooms,
    floors: row.floors ?? "",
    material: topLevelConstructionMaterials.walls,
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
    constructionMaterials: topLevelConstructionMaterials,
    explication: topLevelExplication,
    style: pickText(row.style, attributes.style, attributes.house_style),
    garage,
    canopy,
    basement,
    bedrooms,
    terrace,
    total_built_area: pickText(row.total_built_area, attributes.total_built_area),
    note: pickText(row.note, attributes.note),
    garage_area: pickText(row.garage_area, attributes.garage_area),
    canopy_area: pickText(row.canopy_area, attributes.canopy_area, attributes["сanopy_area"]),
    plot_area: pickText(row.plot_area, attributes.plot_area),
    house_area: houseArea,
    usable_area: pickText(row.usable_area, attributes.usable_area),
    implementation_period: pickText(
      row.implementation_period,
      attributes.implementation_period
    ),
    house_dimensions: pickText(row.house_dimensions, attributes.house_dimensions),
    explication_basement: topLevelExplication.basement,
    explication_floor_1: topLevelExplication.floor_1,
    explication_floor_2: topLevelExplication.floor_2,
    material_foundation: topLevelConstructionMaterials.foundation,
    material_walls: topLevelConstructionMaterials.walls,
    material_roof: topLevelConstructionMaterials.roof,
    material_facade: topLevelConstructionMaterials.facade,
  };
}

// Кэш последней успешной выборки на уровне модуля: при повторном маунте
// данные показываются сразу, без скелетонов, а свежая выборка идёт в фоне.
let saleProjectsCache = null;
let saleProjectTypesCache = null;

/**
 * Загружает готовые проекты на продажу (sale_projects) из PocketBase
 * и подписывается на realtime-обновления.
 */
export function useSaleProjects() {
  const [projects, setProjects] = useState(() => saleProjectsCache ?? []);
  const [types, setTypes] = useState(() => saleProjectTypesCache ?? []);
  const [loading, setLoading] = useState(
    () => saleProjectsCache === null || saleProjectTypesCache === null,
  );
  // Cache ускоряет повторный mount, но не считается основанием для удаления
  // параметров deep-link до успешного refresh обеих коллекций.
  const [isAuthoritative, setIsAuthoritative] = useState(false);
  const [error, setError] = useState(null);
  const fetchSeq = useRef(0);

  const fetchProjects = useCallback(async (
    isInitial = false,
    promoteAuthority = true,
  ) => {
    if (!isInitial) {
      // До атомарного обновления sale_projects + sale_project_types старый
      // snapshot остаётся пригоден для показа, но не для изменения URL.
      setIsAuthoritative(false);
    }
    // autoCancellation у PocketBase отключён, поэтому защищаемся от гонки
    // сами: ответ применяется только если за время ожидания не стартовал
    // более новый запрос (иначе устаревшие данные перетёрли бы свежие).
    const seq = ++fetchSeq.current;
    try {
      const [projectsData, typesData] = await withRequestTimeout(
        Promise.all([
          pb.collection("sale_projects").getFullList({
            sort: "sort_order_in_category",
            filter: "published = true",
          }),
          pb.collection("sale_project_types").getFullList({
            sort: "sort_order",
          }),
        ]),
        "sale projects fetch"
      );

      if (seq !== fetchSeq.current) return;

      const typeOrder = new Map(
        (typesData || []).map((typeRow, index) => [
          typeRow.name,
          typeRow.sort_order ?? index,
        ])
      );
      const configuredTypes = new Set(typeOrder.keys());
      const nextTypes = (typesData || [])
        .map((typeRow) => typeRow.name)
        .filter(Boolean);

      const normalized = (projectsData || [])
        .map(normalizeSaleProject)
        .filter((project) => configuredTypes.has(project.type))
        .sort((a, b) => {
          const orderA = typeOrder.get(a.type) ?? 999;
          const orderB = typeOrder.get(b.type) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.sortOrderInCategory ?? 999) - (b.sortOrderInCategory ?? 999);
        });

      saleProjectsCache = normalized;
      saleProjectTypesCache = nextTypes;
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
      // Сохраняем последний успешный snapshot, но не используем его для
      // разрушительной канонизации URL после неудачного refresh.
      setIsAuthoritative(false);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let removeChannel = () => {};

    (async function init() {
      // Начальный snapshot ускоряет показ, но не считается окончательным до
      // установки обеих realtime-подписок.
      await fetchProjects(true, false);
      if (cancelled) return;

      const unsubscribe = await subscribeToPocketbaseCollections(
        ["sale_projects", "sale_project_types"],
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
      // Закрываем fetch→subscribe gap вторым атомарным чтением.
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
