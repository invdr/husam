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
import { pb, getPocketbaseFileUrl } from "@/lib/pocketbase";
import Icon from "@/components/common/Icon";
import { ConfirmModal, Pagination } from "@/components/common";
import ProjectForm from "@/components/admin/ProjectForm";
import SortableProjectCard from "@/components/admin/SortableProjectCard";
import TypesEditor from "@/components/admin/TypesEditor";
import { useProjectTypes } from "@/hooks/useProjectTypes";

export default function CatalogEditor({ onBreadcrumbChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showTypesEditor, setShowTypesEditor] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  const { types, refetch: refetchTypes } = useProjectTypes();

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const ADMIN_PAGE_SIZE = 12;

  const fetchProjects = useCallback(async () => {
    const typesData = await pb.collection("project_types").getFullList({
      sort: "sort_order",
      fields: "name,sort_order",
    });
    const typeOrder = new Map(
      (typesData || []).map((t, i) => [t.name, t.sort_order ?? i])
    );

    const data = await pb.collection("projects").getFullList();
    const normalized = (data ?? []).map((row) => ({
      ...row,
      id: row.external_id ?? row.id,
      recordId: row.id,
      images: Array.isArray(row.images)
        ? row.images.map((name) => getPocketbaseFileUrl(row, name)).filter(Boolean)
        : [],
    }));
    const sorted = normalized.sort((a, b) => {
      const oa = typeOrder.get(a.type) ?? 999;
      const ob = typeOrder.get(b.type) ?? 999;
      if (oa !== ob) return oa - ob;
      return (a.sort_order_in_category ?? 999) - (b.sort_order_in_category ?? 999);
    });
    setProjects(sorted);
  }, []);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openEdit = useCallback(
    (p) => {
      setEditing(p);
      if (p) {
        onBreadcrumbChange?.({ label: p.title ?? "Редактировать проект", href: null });
        window.scrollTo(0, 0);
      }
    },
    [onBreadcrumbChange]
  );
  const openNewForm = useCallback(() => {
    setShowForm(true);
    onBreadcrumbChange?.({ label: "Новый проект", href: null });
    window.scrollTo(0, 0);
  }, [onBreadcrumbChange]);
  const closeForm = useCallback(() => {
    setEditing(null);
    setShowForm(false);
    onBreadcrumbChange?.(null);
  }, [onBreadcrumbChange]);

  const filteredProjects = searchDebounced.trim()
    ? projects.filter((p) => {
        const q = searchDebounced.trim().toLowerCase();
        return (
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.id ?? "").toLowerCase().includes(q) ||
          (p.type ?? "").toLowerCase().includes(q) ||
          (p.location ?? "").toLowerCase().includes(q)
        );
      })
    : projects;

  const handleDeleteClick = (project) => {
    setDeleteTarget(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await pb.collection("projects").delete(deleteTarget.recordId ?? deleteTarget.id);
    } catch (error) {
      toast.error(error?.message ?? "Ошибка удаления");
      return;
    }
    toast.success("Проект удален");
    setDeleteTarget(null);
    await fetchProjects();
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleSave = (savedProject) => {
    closeForm();
    if (savedProject) {
      const typeOrder = new Map(types.map((name, i) => [name, i]));
      setProjects((prev) => {
        const next = prev.some((p) => p.id === savedProject.id)
          ? prev.map((p) => (p.id === savedProject.id ? savedProject : p))
          : [savedProject, ...prev];
        return next.sort((a, b) => {
          const oa = typeOrder.get(a.type) ?? 999;
          const ob = typeOrder.get(b.type) ?? 999;
          if (oa !== ob) return oa - ob;
          return (a.sort_order_in_category ?? 999) - (b.sort_order_in_category ?? 999);
        });
      });
    } else {
      fetchProjects();
    }
  };

  const handleCancel = () => {
    closeForm();
  };

  const isSearching = !!searchDebounced.trim();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const projectsByType = useMemo(() => {
    const map = new Map();
    for (const p of filteredProjects) {
      const t = p.type ?? "";
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(p);
    }
    return map;
  }, [filteredProjects]);

  const flatProjects = useMemo(
    () =>
      [
        ...types.flatMap((t) => projectsByType.get(t) ?? []),
        ...Array.from(projectsByType.keys())
          .filter((t) => !types.includes(t))
          .flatMap((t) => projectsByType.get(t) ?? []),
      ],
    [types, projectsByType]
  );

  const totalPages = Math.ceil(flatProjects.length / ADMIN_PAGE_SIZE);
  const currentPageSafe = Math.min(currentPage, Math.max(totalPages, 1));
  const showPagination = totalPages > 1;
  const paginatedFlat = showPagination
    ? flatProjects.slice(
        (currentPageSafe - 1) * ADMIN_PAGE_SIZE,
        currentPageSafe * ADMIN_PAGE_SIZE
      )
    : flatProjects;

  useEffect(() => {
    if (currentPage !== currentPageSafe) setCurrentPage(currentPageSafe);
  }, [currentPage, currentPageSafe]);

  const projectsByTypePaginated = useMemo(() => {
    const map = new Map();
    for (const p of paginatedFlat) {
      const t = p.type ?? "";
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(p);
    }
    return map;
  }, [paginatedFlat]);

  const allSectionIds = useMemo(
    () => [
      ...types,
      ...Array.from(projectsByTypePaginated.keys())
        .filter((t) => !types.includes(t))
        .map((t) => `orphan:${t}`),
    ],
    [types, projectsByTypePaginated]
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

  const handleDragEndInCategory = useCallback(
    async (categoryType, reordered) => {
      const updates = reordered.map((p, i) =>
        pb
          .collection("projects")
          .update(p.recordId ?? p.id, { sort_order_in_category: i })
      );
      try {
        await Promise.all(updates);
      } catch {
        toast.error("Не удалось сохранить порядок");
        await fetchProjects();
      }
    },
    [fetchProjects]
  );

  const handleFeaturedToggle = useCallback(
    async (project, featured) => {
      try {
        await pb
          .collection("projects")
          .update(project.recordId ?? project.id, { featured });
      } catch (error) {
        toast.error(error?.message ?? "Ошибка обновления");
        return;
      }
      toast.success(featured ? "Проект на главной" : "Проект убран с главной");
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, featured } : p))
      );
    },
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (showForm || editing) {
    return (
      <ProjectForm
        project={editing}
        existingProjects={projects}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="font-play text-xl font-bold text-white">
          Каталог проектов ({projects.length})
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowTypesEditor(true)}
            className="rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-300 hover:border-brand hover:text-white transition-colors"
          >
            Категории
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
          <input
            type="search"
            placeholder="Поиск по названию, id, типу, локации..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-brand/30 bg-[#2A2A28] px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-brand focus:outline-none min-w-[200px]"
          />
          <button
            onClick={openNewForm}
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
          Проектов пока нет. Нажмите «Добавить проект».
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

            const activeProject = filteredProjects.find((p) => p.id === active.id);
            const overProject = filteredProjects.find((p) => p.id === over.id);
            if (!activeProject || !overProject) return;
            if (activeProject.type !== overProject.type) return;

            const categoryProjects = projectsByType.get(activeProject.type) ?? [];
            const oldIdx = categoryProjects.findIndex((p) => p.id === active.id);
            const newIdx = categoryProjects.findIndex((p) => p.id === over.id);
            if (oldIdx === -1 || newIdx === -1) return;

            const reordered = arrayMove(categoryProjects, oldIdx, newIdx);
            applyReorderToProjects(activeProject.type, reordered);
            handleDragEndInCategory(activeProject.type, reordered);
          }}
        >
          <div className="space-y-8">
            {types.map((categoryType) => {
              const categoryProjects =
                projectsByTypePaginated.get(categoryType) ?? [];
              const fullCategoryCount =
                projectsByType.get(categoryType)?.length ?? 0;
              const canReorderInCat =
                !isSearching && fullCategoryCount > 0;
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
                    {showPagination && fullCategoryCount > categoryProjects.length
                      ? `(${categoryProjects.length} из ${fullCategoryCount})`
                      : `(${fullCategoryCount})`}
                  </button>
                  {!isCollapsed && (
                    <SortableContext
                      items={categoryProjects.map((p) => p.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {categoryProjects.map((p) => (
                          <SortableProjectCard
                            key={p.id}
                            project={p}
                            disabled={!canReorderInCat}
                            onFeaturedToggle={handleFeaturedToggle}
                          >
                            <button
                              onClick={() => openEdit(p)}
                              className="flex-1 rounded-xl border border-brand px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-brand hover:bg-brand hover:text-ink transition-colors"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleDeleteClick(p)}
                              className="flex-1 rounded-xl border border-red-500/50 px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              Удалить
                            </button>
                          </SortableProjectCard>
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
            {Array.from(projectsByTypePaginated.keys())
              .filter((t) => !types.includes(t))
              .map((orphanType) => {
                const categoryProjects =
                  projectsByTypePaginated.get(orphanType) ?? [];
                const sectionId = `orphan:${orphanType}`;
                const isCollapsed = collapsedSections.has(sectionId);
                return (
                  <div key={orphanType}>
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionId)}
                      className="mb-4 flex w-full items-center gap-2 text-left font-play text-lg font-semibold text-gray-500 hover:opacity-90"
                    >
                      <Icon
                        name={isCollapsed ? "chevron-right" : "chevron-down"}
                        className="h-5 w-5 shrink-0 text-gray-400"
                      />
                      {orphanType} ({categoryProjects.length}) — нет в категориях
                    </button>
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {categoryProjects.map((p) => (
                          <SortableProjectCard
                            key={p.id}
                            project={p}
                            disabled
                            onFeaturedToggle={handleFeaturedToggle}
                          >
                            <button
                              onClick={() => openEdit(p)}
                              className="flex-1 rounded-xl border border-brand px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-brand hover:bg-brand hover:text-ink transition-colors"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleDeleteClick(p)}
                              className="flex-1 rounded-xl border border-red-500/50 px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              Удалить
                            </button>
                          </SortableProjectCard>
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
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </DndContext>
      )}

      {showTypesEditor && (
        <TypesEditor
          key={types.join(",")}
          types={types}
          onClose={() => setShowTypesEditor(false)}
          onUpdate={refetchTypes}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Удалить проект?"
          message={`Проект «${deleteTarget.title}» будет удален безвозвратно.`}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
