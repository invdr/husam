import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { pb } from "@/lib/pocketbase";
import { normalizeSaleProject } from "@/hooks/useSaleProjects";
import Icon from "@/components/common/Icon";
import { ConfirmModal, Pagination } from "@/components/common";
import { useSaleProjectTypes } from "@/hooks/useSaleProjectTypes";
import { useSaleProjectOptionDictionaries } from "@/hooks/useSaleProjectOptionDictionaries";
import SaleProjectForm from "@/components/admin/SaleProjectForm";
import SaleProjectDictionariesEditor from "@/components/admin/SaleProjectDictionariesEditor";
import SaleTypesEditor from "@/components/admin/SaleTypesEditor";
import SortableSaleProjectCard from "@/components/admin/SortableSaleProjectCard";
import SaleProjectsImportModal from "@/components/admin/SaleProjectsImportModal";

const ADMIN_PAGE_SIZE = 12;

export default function SaleProjectsEditor() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showTypesEditor, setShowTypesEditor] = useState(false);
  const [showDictionariesEditor, setShowDictionariesEditor] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  const { types, refetch: refetchTypes } = useSaleProjectTypes();
  const {
    options: optionDictionaries,
    refetch: refetchOptionDictionaries,
  } = useSaleProjectOptionDictionaries(projects);

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const fetchProjects = useCallback(async () => {
    const typesData = await pb.collection("sale_project_types").getFullList({
      sort: "sort_order",
      fields: "name,sort_order",
    });
    const typeOrder = new Map(
      (typesData || []).map((typeRow, i) => [
        typeRow.name,
        typeRow.sort_order ?? i,
      ]),
    );

    const data = await pb.collection("sale_projects").getFullList();
    const normalized = (data ?? []).map(normalizeSaleProject);
    const sorted = normalized.sort((a, b) => {
      const orderA = typeOrder.get(a.type) ?? 999;
      const orderB = typeOrder.get(b.type) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.sortOrderInCategory ?? 999) - (b.sortOrderInCategory ?? 999);
    });
    setProjects(sorted);
  }, []);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredProjects = searchDebounced.trim()
    ? projects.filter((project) => {
        const query = searchDebounced.trim().toLowerCase();
        return (
          (project.title ?? "").toLowerCase().includes(query) ||
          (project.id ?? "").toLowerCase().includes(query) ||
          (project.type ?? "").toLowerCase().includes(query) ||
          (project.material ?? "").toLowerCase().includes(query)
        );
      })
    : projects;

  const isSearching = !!searchDebounced.trim();

  const projectsByType = useMemo(() => {
    const map = new Map();
    for (const project of filteredProjects) {
      const type = project.type ?? "";
      if (!map.has(type)) map.set(type, []);
      map.get(type).push(project);
    }
    return map;
  }, [filteredProjects]);

  const flatProjects = useMemo(
    () => [
      ...types.flatMap((type) => projectsByType.get(type) ?? []),
      ...Array.from(projectsByType.keys())
        .filter((type) => !types.includes(type))
        .flatMap((type) => projectsByType.get(type) ?? []),
    ],
    [types, projectsByType],
  );

  const totalPages = Math.ceil(flatProjects.length / ADMIN_PAGE_SIZE);
  const currentPageSafe = Math.min(currentPage, Math.max(totalPages, 1));
  const showPagination = totalPages > 1;
  const paginatedFlat = showPagination
    ? flatProjects.slice(
        (currentPageSafe - 1) * ADMIN_PAGE_SIZE,
        currentPageSafe * ADMIN_PAGE_SIZE,
      )
    : flatProjects;

  useEffect(() => {
    if (currentPage !== currentPageSafe) setCurrentPage(currentPageSafe);
  }, [currentPage, currentPageSafe]);

  const projectsByTypePaginated = useMemo(() => {
    const map = new Map();
    for (const project of paginatedFlat) {
      const type = project.type ?? "";
      if (!map.has(type)) map.set(type, []);
      map.get(type).push(project);
    }
    return map;
  }, [paginatedFlat]);
  const orphanTypes = useMemo(
    () => Array.from(projectsByTypePaginated.keys()).filter((type) => !types.includes(type)),
    [projectsByTypePaginated, types],
  );
  const allSectionIds = useMemo(
    () => [
      ...types,
      ...orphanTypes.map((type) => `orphan:${type}`),
    ],
    [types, orphanTypes],
  );
  const isAllCollapsed =
    allSectionIds.length > 0 &&
    allSectionIds.every((id) => collapsedSections.has(id));

  const collapsedInitialized = useRef(false);
  useEffect(() => {
    if (collapsedInitialized.current || allSectionIds.length === 0) return;
    setCollapsedSections(new Set(allSectionIds));
    collapsedInitialized.current = true;
  }, [allSectionIds]);

  const applyReorderToProjects = useCallback((categoryType, reordered) => {
    setProjects((prev) => {
      const firstIdx = prev.findIndex((p) => (p.type ?? "") === categoryType);
      if (firstIdx === -1) return prev;
      const before = prev.slice(0, firstIdx);
      const after = prev.slice(firstIdx + reordered.length);
      return [...before, ...reordered, ...after];
    });
  }, []);

  // Очередь сохранений реордера: каждое новое сохранение ждёт завершения
  // предыдущего, иначе два быстрых перетаскивания шлют параллельные PATCH
  // и создают гонку/смешанный порядок в БД. UI при этом остаётся оптимистичным.
  const reorderQueueRef = useRef(Promise.resolve());

  const handleDragEndInCategory = useCallback(
    (categoryType, reordered) => {
      reorderQueueRef.current = reorderQueueRef.current
        .catch(() => {})
        .then(async () => {
          // PATCH только для записей, у которых sort_order реально изменился.
          const changed = reordered
            .map((project, index) => ({ project, index }))
            .filter(
              ({ project, index }) =>
                (project.sortOrderInCategory ?? null) !== index,
            );
          const updates = changed.map(({ project, index }) =>
            pb
              .collection("sale_projects")
              .update(project.recordId ?? project.id, {
                sort_order_in_category: index,
              }),
          );
          try {
            await Promise.all(updates);
          } catch {
            toast.error("Не удалось сохранить порядок");
            await fetchProjects();
          }
        });
      return reorderQueueRef.current;
    },
    [fetchProjects],
  );

  const handleFeaturedToggle = useCallback(async (project, featured) => {
    try {
      await pb
        .collection("sale_projects")
        .update(project.recordId ?? project.id, { featured });
    } catch (error) {
      toast.error(error?.message ?? "Ошибка обновления");
      return;
    }
    toast.success(featured ? "Проект на главной" : "Проект убран с главной");
    setProjects((prev) =>
      prev.map((item) =>
        item.id === project.id ? { ...item, featured } : item,
      ),
    );
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await pb
        .collection("sale_projects")
        .delete(deleteTarget.recordId ?? deleteTarget.id);
    } catch (error) {
      toast.error(error?.message ?? "Ошибка удаления");
      return;
    }
    toast.success("Готовый проект удален");
    setDeleteTarget(null);
    await fetchProjects();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (showForm || editing) {
    const existingProjects = editing
      ? [editing, ...projects.filter((p) => p.id !== editing.id)]
      : projects;
    return (
      <SaleProjectForm
        key={editing?.id ?? "new"}
        project={editing}
        existingProjects={existingProjects}
        optionDictionaries={optionDictionaries}
        onSave={(savedProject) => {
          setEditing(null);
          setShowForm(false);
          if (savedProject) {
            const typeOrder = new Map(types.map((name, i) => [name, i]));
            const normalized = normalizeSaleProject(savedProject);
            setProjects((prev) => {
              const next = prev.some((p) => p.id === normalized.id)
                ? prev.map((p) => (p.id === normalized.id ? normalized : p))
                : [normalized, ...prev];
              return next.sort((a, b) => {
                const orderA = typeOrder.get(a.type) ?? 999;
                const orderB = typeOrder.get(b.type) ?? 999;
                if (orderA !== orderB) return orderA - orderB;
                return (a.sortOrderInCategory ?? 999) - (b.sortOrderInCategory ?? 999);
              });
            });
          } else {
            fetchProjects();
          }
        }}
        onCancel={() => {
          setEditing(null);
          setShowForm(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-play text-xl font-bold text-white">
          Проекты на продажу ({projects.length})
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowTypesEditor(true)}
            className="rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-brand hover:text-white"
          >
            Категории
          </button>
          <button
            onClick={() => setShowDictionariesEditor(true)}
            className="rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-brand hover:text-white"
          >
            Справочники
          </button>
          {projects.length > 0 && filteredProjects.length > 0 && allSectionIds.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setCollapsedSections(
                  isAllCollapsed ? new Set() : new Set(allSectionIds)
                )
              }
              className="flex items-center gap-2 rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-brand hover:text-white"
            >
              <Icon
                name={isAllCollapsed ? "chevron-down" : "chevron-up"}
                className="h-4 w-4"
              />
              {isAllCollapsed ? "Развернуть все" : "Свернуть все"}
            </button>
          )}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-brand hover:text-white"
            title="Импорт CSV"
          >
            <Icon name="upload" className="h-4 w-4" />
            Импорт CSV
          </button>
          <input
            type="search"
            placeholder="Поиск по названию, id, категории, материалу..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="min-w-[220px] rounded-xl border border-brand/30 bg-[#2A2A28] px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-brand focus:outline-none"
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
          >
            <Icon name="plus" className="h-4 w-4" />
            Добавить проект
          </button>
        </div>
      </div>

      {searchDebounced.trim() && (
        <p className="text-sm text-gray-400">
          Найдено: {filteredProjects.length} из {projects.length}
        </p>
      )}

      {projects.length === 0 ? (
        <div className="rounded-xl border border-brand/20 bg-[#2A2A28] p-8 text-center text-gray-400">
          Готовых проектов пока нет. Нажмите «Добавить проект».
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-brand/20 bg-[#2A2A28] p-8 text-center text-gray-400">
          Ничего не найдено по запросу «{searchQuery}».
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            if (isSearching) return;
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const activeProject = filteredProjects.find(
              (p) => p.id === active.id,
            );
            const overProject = filteredProjects.find((p) => p.id === over.id);
            if (!activeProject || !overProject) return;
            if (activeProject.type !== overProject.type) return;

            const categoryProjects =
              projectsByType.get(activeProject.type) ?? [];
            const oldIdx = categoryProjects.findIndex(
              (p) => p.id === active.id,
            );
            const newIdx = categoryProjects.findIndex((p) => p.id === over.id);
            if (oldIdx === -1 || newIdx === -1) return;

            const reordered = arrayMove(categoryProjects, oldIdx, newIdx);
            applyReorderToProjects(
              activeProject.type,
              reordered.map((p, i) => ({ ...p, sortOrderInCategory: i })),
            );
            handleDragEndInCategory(activeProject.type, reordered);
          }}
        >
          <div className="space-y-10">
            {types.map((categoryType) => {
              const categoryProjects =
                projectsByTypePaginated.get(categoryType) ?? [];
              const fullCategoryCount =
                projectsByType.get(categoryType)?.length ?? 0;
              const canReorderInCat = !isSearching && fullCategoryCount > 0;
              const isCollapsed = collapsedSections.has(categoryType);

              return (
                <div key={categoryType}>
                  <button
                    type="button"
                    onClick={() => toggleSection(categoryType)}
                    className="mb-4 flex w-full items-center gap-2 text-left font-play text-lg font-semibold text-white hover:opacity-90"
                  >
                    <Icon
                      name={isCollapsed ? "chevron-right" : "chevron-down"}
                      className="h-5 w-5 shrink-0 text-gray-400"
                    />
                    {categoryType}{" "}
                    {showPagination &&
                    fullCategoryCount > categoryProjects.length
                      ? `(${categoryProjects.length} из ${fullCategoryCount})`
                      : `(${fullCategoryCount})`}
                  </button>
                  {!isCollapsed && (
                    <SortableContext
                      items={categoryProjects.map((p) => p.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {categoryProjects.map((project) => (
                          <SortableSaleProjectCard
                            key={project.id}
                            project={project}
                            disabled={!canReorderInCat}
                            onFeaturedToggle={handleFeaturedToggle}
                          >
                            <button
                              onClick={() => setEditing(project)}
                              className="flex-1 rounded-xl border border-brand px-3 py-2.5 text-xs text-brand transition-colors hover:bg-brand hover:text-ink sm:px-4 sm:py-2 sm:text-sm"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => setDeleteTarget(project)}
                              className="flex-1 rounded-xl border border-red-500/50 px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 sm:px-4 sm:py-2 sm:text-sm"
                            >
                              Удалить
                            </button>
                          </SortableSaleProjectCard>
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
            {orphanTypes.map((categoryType) => {
              const categoryProjects =
                projectsByTypePaginated.get(categoryType) ?? [];
              const fullCategoryCount =
                projectsByType.get(categoryType)?.length ?? 0;
              const isCollapsed = collapsedSections.has(`orphan:${categoryType}`);

              return (
                <div key={`orphan-${categoryType}`}>
                  <button
                    type="button"
                    onClick={() => toggleSection(`orphan:${categoryType}`)}
                    className="mb-4 flex w-full items-center gap-2 text-left font-play text-lg font-semibold text-gray-500 hover:opacity-90"
                  >
                    <Icon
                      name={isCollapsed ? "chevron-right" : "chevron-down"}
                      className="h-5 w-5 shrink-0 text-gray-400"
                    />
                    {categoryType || "Без категории"} ({fullCategoryCount}) — нет в категориях
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {categoryProjects.map((project) => (
                        <SortableSaleProjectCard
                          key={project.id}
                          project={project}
                          disabled
                          onFeaturedToggle={handleFeaturedToggle}
                        >
                          <button
                            onClick={() => setEditing(project)}
                            className="flex-1 rounded-xl border border-brand px-3 py-2.5 text-xs text-brand transition-colors hover:bg-brand hover:text-ink sm:px-4 sm:py-2 sm:text-sm"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => setDeleteTarget(project)}
                            className="flex-1 rounded-xl border border-red-500/50 px-3 py-2.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 sm:px-4 sm:py-2 sm:text-sm"
                          >
                            Удалить
                          </button>
                        </SortableSaleProjectCard>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {showPagination && (
            <div className="mt-8">
              <Pagination
                page={currentPageSafe}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </DndContext>
      )}

      {showTypesEditor && (
        <SaleTypesEditor
          key={types.join(",")}
          types={types}
          onClose={() => setShowTypesEditor(false)}
          onUpdate={refetchTypes}
        />
      )}

      {showDictionariesEditor && (
        <SaleProjectDictionariesEditor
          key={JSON.stringify(optionDictionaries)}
          dictionaries={optionDictionaries}
          onClose={() => setShowDictionariesEditor(false)}
          onUpdate={async () => {
            await refetchOptionDictionaries();
            await fetchProjects();
          }}
        />
      )}

      {showImport && (
        <SaleProjectsImportModal
          onClose={() => setShowImport(false)}
          onImported={async () => {
            await refetchTypes();
            await fetchProjects();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Удалить готовый проект?"
          message={`Проект «${deleteTarget.title}» будет удален безвозвратно.`}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
