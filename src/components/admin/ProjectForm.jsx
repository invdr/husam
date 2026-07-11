import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  useUnsavedChangesWarning,
  confirmDiscard,
} from "@/hooks/useUnsavedChangesWarning";
import UnsavedChangesNavigationWarning from "@/hooks/UnsavedChangesNavigationWarning";
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
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { pb, getPocketbaseFileUrl } from "@/lib/pocketbase";
import Icon from "@/components/common/Icon";
import {
  getImageReorderAction,
  getImageNamesAfterAppend,
} from "@/components/admin/projectImageReorder";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import {
  CATALOG_TYPE_DESIGN,
  CATALOG_TYPE_REPAIR,
  CATALOG_TYPE_BUILD,
  DESIGN_OBJECT_TYPES,
  DESIGN_STYLES,
  DESIGN_AREA_RANGES,
  REPAIR_PROPERTY_TYPES,
  REPAIR_TYPES,
  REPAIR_FINISH_CLASSES,
  REPAIR_ROOMS,
} from "@/utils/catalogAttributes";
import { resizeImage } from "@/utils/imageResize";
import { buildDictionaryCreatePayload } from "@/utils/dictionaryName";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Лимиты для отображения в карточке
const LIMITS = {
  title: 80,
  id: 30,
  area: 20,
  duration: 20,
  budget: 25,
  location: 50,
  description: 2000,
  testimonial: 300,
  client_name: 50,
  attrValue: 40,
};

/** Варианты срока реализации для селекта */
const DURATION_OPTIONS = [
  "3 месяца",
  "4 месяца",
  "5 месяцев",
  "6 месяцев",
  "8 месяцев",
  "10 месяцев",
  "1 год",
  "1,5 года",
  "2 года",
];
const DURATION_OTHER = "__other__";

/** Варианты площади участка для селекта */
const PLOT_AREA_OPTIONS = [
  "4 сотки",
  "5 соток",
  "6 соток",
  "8 соток",
  "10 соток",
  "12 соток",
  "15 соток",
  "20 соток",
  "25 соток",
];
const PLOT_AREA_OTHER = "__other__";

function getExt(filename) {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i) : ".jpg";
}

function toPocketbaseFilename(value) {
  if (!value || typeof value !== "string") return null;
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").pop() || "");
  } catch {
    return null;
  }
}

function sanitizeStorageSegment(value, defaultSegment = "project") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || defaultSegment;
}

/** Добавляет « м²» к значению площади, если его еще нет. */
function ensureSquareSuffix(value) {
  const v = (value ?? "").trim();
  if (!v) return v;
  if (/м²|м2$/i.test(v)) return v;
  return v + " м²";
}

/** Из строки "8 млн ₽" или "8.5" извлекает число для отображения в поле ввода */
function parseBudgetValue(str) {
  if (!str || typeof str !== "string") return "";
  const cleaned = str.replace(/[^\d.,]/g, "").replace(",", ".");
  const parts = cleaned.split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  return cleaned;
}

/** Оставляет в строке только цифры и одну точку, возвращает "N млн ₽" для сохранения */
function formatBudgetInput(raw) {
  const onlyDigits = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  const parts = onlyDigits.split(".");
  const normalized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : onlyDigits;
  if (!normalized) return "";
  return normalized + " млн ₽";
}

function SortableThumb({ id, children, className = "" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`${className} relative`}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0.5 top-0.5 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded bg-black/50 text-white transition hover:bg-brand/80 active:cursor-grabbing"
        aria-label="Перетащить для изменения порядка"
      >
        <Icon name="grip-vertical" className="h-3.5 w-3.5" />
      </div>
      {children}
    </div>
  );
}

export default function ProjectForm({ project, onSave, onCancel, existingProjects = [] }) {
  const isEdit = !!project;
  const { types, refetch } = useProjectTypes();

  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    type: "",
    area: "",
    duration: "",
    budget: "",
    location: "",
    scope: [],
    images: [],
    testimonial: "",
    client_name: "",
    published: true,
    attributes: {},
  });
  const [scopeInput, setScopeInput] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [pendingImagesFirst, setPendingImagesFirst] = useState(false);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [dropActive, setDropActive] = useState(false);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState("");
  const [dirty, setDirty] = useState(false);

  useUnsavedChangesWarning(dirty);

  // Сбрасываем dirty при открытии формы для другого проекта (или для нового).
  useEffect(() => {
    setDirty(false);
  }, [project]);

  const handleCancelClick = () => {
    if (dirty && !confirmDiscard()) return;
    onCancel();
  };

  const validateImageFile = useCallback((file) => {
    if (!file.type.startsWith("image/")) {
      return "Только изображения (image/*)";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Файл «${file.name}» превышает лимит 5 MB`;
    }
    return null;
  }, []);

  const addImageFiles = useCallback(
    (files) => {
      const valid = [];
      const errors = [];
      for (const file of Array.from(files)) {
        const err = validateImageFile(file);
        if (err) errors.push(err);
        else valid.push(file);
      }
      if (errors.length > 0) toast.error(errors[0]);
      if (valid.length > 0) {
        setImageFiles((prev) => [...prev, ...valid]);
        setDirty(true);
      }
    },
    [validateImageFile]
  );

  useEffect(() => {
    setForm((prev) => {
      if (project) {
        const att =
          project.attributes && typeof project.attributes === "object"
            ? project.attributes
            : {};
        return {
          id: project.id,
          title: project.title ?? "",
          description: project.description ?? "",
          type: project.type ?? (types[0] ?? ""),
          area: project.area ?? "",
          duration: project.duration ?? "",
          budget: project.budget ?? "",
          location: project.location ?? "",
          scope: Array.isArray(project.scope) ? [...project.scope] : [],
          images: Array.isArray(project.images) ? [...project.images] : [],
          testimonial: project.testimonial ?? "",
          client_name: project.client_name ?? "",
          published: project.published !== false,
          attributes: { ...att },
        };
      }

      if (types.length > 0 && !prev.type) {
        return { ...prev, type: types[0] };
      }

      return prev;
    });

    setExistingImages((prev) => {
      if (!project) return prev;
      return Array.isArray(project.images) ? project.images : [];
    });
  }, [project, types]);

  const addScope = () => {
    const s = scopeInput.trim();
    if (s && !form.scope.includes(s)) {
      setForm((f) => ({ ...f, scope: [...f.scope, s] }));
      setDirty(true);
      setScopeInput("");
    }
  };

  const removeScope = (idx) => {
    setForm((f) => ({ ...f, scope: f.scope.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const removeExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
    }));
    setDirty(true);
  };

  const removePendingFile = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const setPendingFileAsMain = (idx) => {
    setPendingImagesFirst(true);
    setDirty(true);
    if (idx === 0) return;
    setImageFiles((prev) => {
      const next = [...prev];
      const [file] = next.splice(idx, 1);
      next.unshift(file);
      return next;
    });
  };

  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [imageFiles]);

  useEffect(() => {
    if (imageFiles.length === 0) setPendingImagesFirst(false);
  }, [imageFiles.length]);

  const setImageAsMain = (idx) => {
    setPendingImagesFirst(false);
    setDirty(true);
    if (idx === 0) return;
    setExistingImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
    setForm((f) => {
      const imgs = [...(f.images || [])];
      const [item] = imgs.splice(idx, 1);
      imgs.unshift(item);
      return { ...f, images: imgs };
    });
  };

  const reorderExistingImages = useCallback((oldIndex, newIndex) => {
    setExistingImages((prev) => arrayMove(prev, oldIndex, newIndex));
    setForm((f) => ({
      ...f,
      images: arrayMove(f.images || [], oldIndex, newIndex),
    }));
    setDirty(true);
  }, []);

  const reorderPendingFiles = useCallback((oldIndex, newIndex) => {
    setImageFiles((prev) => arrayMove(prev, oldIndex, newIndex));
    setDirty(true);
  }, []);

  const imageDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleImageDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      const action = getImageReorderAction(active.id, over?.id);
      if (!action) return;

      if (action.group === "existing") {
        reorderExistingImages(action.oldIndex, action.newIndex);
      }

      if (action.group === "pending") {
        reorderPendingFiles(action.oldIndex, action.newIndex);
      }
    },
    [reorderExistingImages, reorderPendingFiles]
  );

  const addNewType = async () => {
    const name = newTypeInput.trim();
    if (!name) return;
    try {
      const existing = await pb
        .collection("project_types")
        .getFirstListItem(`name = "${name.replace(/"/g, '\\"')}"`)
        .catch(() => null);
      if (!existing) {
        await pb
          .collection("project_types")
          .create(buildDictionaryCreatePayload(name, types.length));
      }
      await refetch();
      setForm((f) => ({ ...f, type: name }));
      setDirty(true);
      setNewTypeInput("");
      setShowNewType(false);
    } catch (error) {
      toast.error(error?.message ?? "Ошибка добавления категории");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const projectId = form.id.trim();
      if (!projectId) {
        toast.error("Артикул (ID) обязателен");
        setSaving(false);
        return;
      }
      if (projectId.length > LIMITS.id) {
        toast.error(`Артикул не длиннее ${LIMITS.id} символов`);
        setSaving(false);
        return;
      }
      const duplicateProject = existingProjects.find(
        (item) =>
          String(item.id ?? item.external_id ?? "").trim().toLowerCase() ===
            projectId.toLowerCase() &&
          String(item.recordId ?? item.id ?? "") !== String(project?.recordId ?? project?.id ?? ""),
      );
      if (duplicateProject) {
        toast.error("Проект с таким артикулом уже существует");
        setSaving(false);
        return;
      }
      const title = form.title.trim();
      if (!title) {
        toast.error("Название обязательно");
        setSaving(false);
        return;
      }
      const description = form.description.trim();
      if (description.length > LIMITS.description) {
        toast.error(`Описание не длиннее ${LIMITS.description} символов`);
        setSaving(false);
        return;
      }
      if (title.length > LIMITS.title) {
        toast.error(`Название не длиннее ${LIMITS.title} символов — в карточке будет обрезаться`);
        setSaving(false);
        return;
      }
      const location = form.location.trim();
      const testimonial = form.testimonial.trim();
      const clientName = form.client_name.trim();
      if (location.length > LIMITS.location || testimonial.length > LIMITS.testimonial || clientName.length > LIMITS.client_name) {
        const over = [];
        if (location.length > LIMITS.location) over.push(`Локация (${LIMITS.location})`);
        if (testimonial.length > LIMITS.testimonial) over.push(`Отзыв (${LIMITS.testimonial})`);
        if (clientName.length > LIMITS.client_name) over.push(`Имя клиента (${LIMITS.client_name})`);
        toast.error(`Сократите: ${over.join(", ")} символов`);
        setSaving(false);
        return;
      }
      const attForLimit = form.attributes && typeof form.attributes === "object" ? form.attributes : {};
      for (const [key, val] of Object.entries(attForLimit)) {
        if (typeof val === "string" && val.length > LIMITS.attrValue) {
          toast.error(`Поле «${key}» в характеристиках не длиннее ${LIMITS.attrValue} символов`);
          setSaving(false);
          return;
        }
      }

      const existingImageNames = existingImages
        .map(toPocketbaseFilename)
        .filter(Boolean);

      const newImageFiles = [];
      if (imageFiles.length > 0) {
        const storageProjectId = sanitizeStorageSegment(projectId);
        const baseTime = Date.now();
        const total = imageFiles.length;
        setUploadProgress({ current: 0, total });
        for (let i = 0; i < imageFiles.length; i += 1) {
          const file = imageFiles[i];
          const blob = await resizeImage(file).catch(() => file);
          const ext = blob instanceof File ? getExt(file.name) : ".jpg";
          newImageFiles.push(
            new File([blob], `${storageProjectId}_${baseTime}_${i}${ext}`, {
              type: blob.type || "image/jpeg",
            })
          );
          setUploadProgress((prev) => ({ ...prev, current: prev.current + 1 }));
        }
        setUploadProgress({ current: 0, total: 0 });
      }

      let sortOrderInCategory;
      if (isEdit && form.type === project.type) {
        sortOrderInCategory = project.sort_order_in_category ?? 0;
      } else {
        const escapedType = String(form.type).replace(/"/g, '\\"');
        const existing = await pb
          .collection("projects")
          .getFirstListItem(`type = "${escapedType}"`, {
            sort: "-sort_order_in_category",
            fields: "sort_order_in_category",
          })
          .catch(() => null);
        sortOrderInCategory = (existing?.sort_order_in_category ?? -1) + 1;
      }

      const att = form.attributes && typeof form.attributes === "object" ? { ...form.attributes } : {};
      if (att.houseArea && String(att.houseArea).trim()) att.houseArea = ensureSquareSuffix(att.houseArea);
      if (att.usefulArea && String(att.usefulArea).trim()) att.usefulArea = ensureSquareSuffix(att.usefulArea);
      const hasAtt = Object.keys(att).length > 0;
      const areaValRaw = form.type === CATALOG_TYPE_BUILD && (att.houseArea ?? form.area)
        ? (att.houseArea ?? form.area).trim()
        : form.area.trim();
      const areaVal = areaValRaw ? ensureSquareSuffix(areaValRaw) : areaValRaw;
      const durationVal = (att.duration ?? form.duration).trim();
      const budgetVal = (att.budget ?? form.budget).trim();
      if (areaVal.length > LIMITS.area || durationVal.length > LIMITS.duration || budgetVal.length > LIMITS.budget) {
        const over = [];
        if (areaVal.length > LIMITS.area) over.push(`Площадь (${LIMITS.area})`);
        if (durationVal.length > LIMITS.duration) over.push(`Срок (${LIMITS.duration})`);
        if (budgetVal.length > LIMITS.budget) over.push(`Бюджет (${LIMITS.budget})`);
        toast.error(`Сократите: ${over.join(", ")} символов`);
        setSaving(false);
        return;
      }

      const row = {
        external_id: projectId,
        title,
        description: description || null,
        type: form.type,
        area: areaVal || null,
        duration: durationVal || null,
        budget: budgetVal || null,
        location: location || null,
        scope: form.scope.length ? form.scope : null,
        images: existingImageNames,
        testimonial: testimonial || null,
        client_name: clientName || null,
        sort_order_in_category: sortOrderInCategory,
        published: !!form.published,
        ...(hasAtt && { attributes: att }),
      };

      let savedProject = null;
      if (isEdit) {
        const updatePayload = { ...row };
        if (newImageFiles.length > 0) {
          updatePayload["images+"] = newImageFiles;
        }
        savedProject = await pb
          .collection("projects")
          .update(project.recordId ?? project.id, updatePayload);

        if (newImageFiles.length > 0) {
          // Файлы уже точно загружены на сервер этим update — чистим
          // локальный imageFiles сразу, иначе повторное "Сохранить"
          // задвоит фото, даже если ниже упадёт применение порядка.
          setImageFiles([]);
          setPendingImagesFirst(false);

          const orderedImageNames = getImageNamesAfterAppend(
            savedProject.images,
            existingImageNames,
            pendingImagesFirst,
          );
          try {
            savedProject = await pb
              .collection("projects")
              .update(project.recordId ?? project.id, {
                images: orderedImageNames,
              });
          } catch {
            // Фото сохранены, но порядок применить не удалось — подтягиваем
            // актуальное состояние с сервера, чтобы форма не разошлась с БД.
            const fresh = await pb
              .collection("projects")
              .getOne(project.recordId ?? project.id)
              .catch(() => savedProject);
            const freshImageNames = Array.isArray(fresh.images) ? fresh.images : [];
            setExistingImages(
              freshImageNames
                .map((name) => getPocketbaseFileUrl(fresh, name))
                .filter(Boolean)
            );
            setForm((f) => ({ ...f, images: freshImageNames }));
            toast.error(
              "Фото загружены, но порядок применить не удалось. Данные обновлены с сервера — проверьте порядок фото и сохраните ещё раз."
            );
            return;
          }
        }
      } else {
        if (newImageFiles.length > 0) {
          row.images = newImageFiles;
        }
        savedProject = await pb.collection("projects").create(row);
      }

      const mappedProject = {
        ...savedProject,
        id: savedProject.external_id ?? savedProject.id,
        recordId: savedProject.id,
        images: Array.isArray(savedProject.images)
          ? savedProject.images
              .map((name) => getPocketbaseFileUrl(savedProject, name))
              .filter(Boolean)
          : [],
      };

      toast.success(isEdit ? "Проект обновлен" : "Проект создан");
      setDirty(false);
      onSave(mappedProject);
    } catch (err) {
      toast.error(err?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-brand/20 bg-ink px-4 py-2.5 text-white outline-none focus:border-brand disabled:opacity-50";
  const labelClass = "mb-1 block text-sm text-gray-400";

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => setDirty(true)}
      className="space-y-6"
    >
      <UnsavedChangesNavigationWarning dirty={dirty} />
      <div className="flex items-center justify-between">
        <h2 className="font-play text-xl font-bold text-white">
          {isEdit ? "Редактировать проект" : "Новый проект"}
        </h2>
        <button
          type="button"
          onClick={handleCancelClick}
          className="rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Отмена
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="project-id" className={labelClass}>Артикул (ID) *</label>
          <input
            id="project-id"
            type="text"
            value={form.id}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            placeholder="HS-001"
            required
            disabled={isEdit}
            maxLength={LIMITS.id}
            className={inputClass}
          />
          <p className="form-hint">{form.id.length} / {LIMITS.id}</p>
          {isEdit && (
            <span className="mt-1 block text-xs text-gray-500">
              Артикул нельзя изменить
            </span>
          )}
        </div>
        <div>
          <label htmlFor="project-title" className={labelClass}>Название *</label>
          <input
            id="project-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Дизайн и ремонт офиса"
            required
            maxLength={LIMITS.title}
            className={inputClass}
          />
          <p className="form-hint">{form.title.length} / {LIMITS.title}</p>
        </div>
      </div>

      <div>
        <label htmlFor="project-description" className={labelClass}>Описание</label>
        <textarea
          id="project-description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Краткое описание проекта, особенности, задачи и решения"
          maxLength={LIMITS.description}
          rows={4}
          className={`${inputClass} resize-y`}
        />
        <p className="form-hint">{form.description.length} / {LIMITS.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className={labelClass}>Опубликован</span>
        <button
          type="button"
          role="switch"
          aria-checked={form.published}
          onClick={() => {
            setForm((f) => ({ ...f, published: !f.published }));
            setDirty(true);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50 ${
            form.published ? "border-brand bg-brand" : "border-gray-500 bg-ink"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              form.published ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-gray-400">
          {form.published ? "Показывается на сайте" : "Черновик (скрыт)"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={showNewType ? "project-new-type" : "project-type"} className={labelClass}>Категория</label>
          {showNewType ? (
            <div className="flex gap-2">
              <input
                id="project-new-type"
                type="text"
                value={newTypeInput}
                onChange={(e) => setNewTypeInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addNewType())
                }
                placeholder="Название категории"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addNewType}
                aria-label="Добавить категорию"
                className="shrink-0 rounded-xl border border-brand/30 px-4 py-2.5 text-brand hover:bg-brand/10"
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewType(false);
                  setNewTypeInput("");
                }}
                className="shrink-0 rounded-xl border border-brand/30 px-4 py-2.5 text-gray-400 hover:text-white"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                id="project-type"
                value={form.type}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__new__") setShowNewType(true);
                  else setForm((f) => ({ ...f, type: v, attributes: {} }));
                }}
                className={inputClass}
              >
                {[...new Set([...types, form.type].filter(Boolean))].map(
                  (t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  )
                )}
                <option value="__new__">➕ Добавить категорию</option>
              </select>
            </div>
          )}
        </div>
        {form.type !== CATALOG_TYPE_DESIGN && form.type !== CATALOG_TYPE_REPAIR && form.type !== CATALOG_TYPE_BUILD && (
          <>
            <div>
              <label htmlFor="project-area" className={labelClass}>Площадь</label>
              <input
                id="project-area"
                type="text"
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                placeholder="200"
                maxLength={LIMITS.area}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="project-duration" className={labelClass}>Срок</label>
              <input
                id="project-duration"
                type="text"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                placeholder="3 месяца"
                maxLength={LIMITS.duration}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="project-budget" className={labelClass}>Бюджет</label>
              <div className="relative">
                <input
                  id="project-budget"
                  type="text"
                  inputMode="decimal"
                  value={parseBudgetValue(form.budget)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, budget: formatBudgetInput(e.target.value) }))
                  }
                  placeholder="8"
                  className={inputClass + " pr-12"}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                  млн ₽
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Поля по типу: Дизайн */}
      {form.type === CATALOG_TYPE_DESIGN && (
        <div className="rounded-xl border border-brand/20 bg-ink/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Характеристики (Дизайн)</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="project-design-object-type" className={labelClass}>Тип объекта</label>
              <select
                id="project-design-object-type"
                value={form.attributes?.objectType ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, objectType: e.target.value },
                }))}
                className={inputClass}
              >
                <option value="">—</option>
                {DESIGN_OBJECT_TYPES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {(form.attributes?.objectType === "Другое") && (
                <input
                  id="project-design-object-type-other"
                  type="text"
                  value={form.attributes?.objectTypeOther ?? ""}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    attributes: { ...f.attributes, objectTypeOther: e.target.value },
                  }))}
                  placeholder="Введите свой вариант, например: Таунхаус"
                  className={inputClass + " mt-2"}
                />
              )}
            </div>
            <div>
              <label htmlFor="project-design-style" className={labelClass}>Стиль</label>
              <select
                id="project-design-style"
                value={form.attributes?.style ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, style: e.target.value },
                }))}
                className={inputClass}
              >
                <option value="">—</option>
                {DESIGN_STYLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {(form.attributes?.style === "Другое") && (
                <input
                  id="project-design-style-other"
                  type="text"
                  value={form.attributes?.styleOther ?? ""}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    attributes: { ...f.attributes, styleOther: e.target.value },
                  }))}
                  placeholder="Введите свой вариант, например: Прованс"
                  className={inputClass + " mt-2"}
                />
              )}
            </div>
            <div>
              <label htmlFor="project-design-area-range" className={labelClass}>Площадь (диапазон)</label>
              <select
                id="project-design-area-range"
                value={form.attributes?.areaRange ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, areaRange: e.target.value },
                }))}
                className={inputClass}
              >
                <option value="">—</option>
                {DESIGN_AREA_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {(form.attributes?.areaRange === "Другое") && (
                <input
                  id="project-design-area-range-other"
                  type="text"
                  value={form.attributes?.areaRangeOther ?? ""}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    attributes: { ...f.attributes, areaRangeOther: e.target.value },
                  }))}
                  placeholder="Например: до 200 или 150"
                  className={inputClass + " mt-2"}
                />
              )}
            </div>
            <div>
              <label htmlFor="project-design-budget" className={labelClass}>Бюджет</label>
              <div className="relative">
                <input
                  id="project-design-budget"
                  type="text"
                  inputMode="decimal"
                  value={parseBudgetValue(form.attributes?.budget ?? form.budget)}
                  onChange={(e) => {
                    const value = formatBudgetInput(e.target.value);
                    setForm((f) => ({
                      ...f,
                      budget: value,
                      attributes: { ...f.attributes, budget: value },
                    }));
                  }}
                  placeholder="8"
                  className={inputClass + " pr-12"}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                  млн ₽
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Поля по типу: Ремонт */}
      {form.type === CATALOG_TYPE_REPAIR && (
        <div className="rounded-xl border border-brand/20 bg-ink/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Характеристики (Ремонт)</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="project-repair-property-type" className={labelClass}>Тип недвижимости</label>
              <select
                id="project-repair-property-type"
                value={form.attributes?.propertyType ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, propertyType: e.target.value },
                }))}
                className={inputClass}
              >
                <option value="">—</option>
                {REPAIR_PROPERTY_TYPES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project-repair-type" className={labelClass}>Вид ремонта</label>
              <select
                id="project-repair-type"
                value={form.attributes?.repairType ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, repairType: e.target.value },
                }))}
                className={inputClass}
              >
                <option value="">—</option>
                {REPAIR_TYPES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {(form.attributes?.repairType === "Другое") && (
                <input
                  id="project-repair-type-other"
                  type="text"
                  value={form.attributes?.repairTypeOther ?? ""}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    attributes: { ...f.attributes, repairTypeOther: e.target.value },
                  }))}
                  placeholder="Укажите вид ремонта"
                  className={inputClass + " mt-2"}
                />
              )}
            </div>
            <div>
              <label htmlFor="project-repair-finish-class" className={labelClass}>Класс отделки</label>
              <select
                id="project-repair-finish-class"
                value={form.attributes?.finishClass ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, finishClass: e.target.value },
                }))}
                className={inputClass}
              >
                <option value="">—</option>
                {REPAIR_FINISH_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project-repair-rooms" className={labelClass}>Количество комнат</label>
              <select
                id="project-repair-rooms"
                value={form.attributes?.rooms ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, rooms: e.target.value },
                }))}
                className={inputClass}
              >
                <option value="">—</option>
                {REPAIR_ROOMS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Площадь участка, дома, полезная площадь, срок — для Строительство, Дизайн и Ремонт */}
      {(form.type === CATALOG_TYPE_BUILD || form.type === CATALOG_TYPE_DESIGN || form.type === CATALOG_TYPE_REPAIR) && (
        <div className="rounded-xl border border-brand/20 bg-ink/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            {form.type === CATALOG_TYPE_BUILD ? "Характеристики (Строительство)" : "Площадь участка, дома, полезная площадь, срок реализации"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="project-plot-area-select" className={labelClass}>Площадь участка</label>
              <select
                id="project-plot-area-select"
                value={PLOT_AREA_OPTIONS.includes((form.attributes?.plotArea ?? "").trim())
                  ? (form.attributes?.plotArea ?? "").trim()
                  : PLOT_AREA_OTHER}
                onChange={(e) => {
                  const v = e.target.value;
                  const value = v === PLOT_AREA_OTHER ? (form.attributes?.plotArea ?? "") : v;
                  setForm((f) => ({
                    ...f,
                    attributes: { ...f.attributes, plotArea: value },
                  }));
                }}
                className={inputClass}
              >
                {PLOT_AREA_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value={PLOT_AREA_OTHER}>Другое</option>
              </select>
              {!PLOT_AREA_OPTIONS.includes((form.attributes?.plotArea ?? "").trim()) && (
                <input
                  id="project-plot-area-other"
                  type="text"
                  value={form.attributes?.plotArea ?? ""}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    attributes: { ...f.attributes, plotArea: e.target.value },
                  }))}
                  placeholder="например 600 м² или 7 соток"
                  className={`${inputClass} mt-2`}
                />
              )}
            </div>
            <div>
              <label htmlFor="project-house-area" className={labelClass}>Площадь дома</label>
              <input
                id="project-house-area"
                type="text"
                value={form.attributes?.houseArea ?? (form.type === CATALOG_TYPE_BUILD ? form.area : "") ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  ...(f.type === CATALOG_TYPE_BUILD && { area: e.target.value }),
                  attributes: { ...f.attributes, houseArea: e.target.value },
                }))}
                placeholder="280"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="project-useful-area" className={labelClass}>Полезная площадь</label>
              <input
                id="project-useful-area"
                type="text"
                value={form.attributes?.usefulArea ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  attributes: { ...f.attributes, usefulArea: e.target.value },
                }))}
                placeholder="250"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="project-duration-select" className={labelClass}>Срок реализации</label>
              <select
                id="project-duration-select"
                value={DURATION_OPTIONS.includes(form.attributes?.duration ?? form.duration ?? "")
                  ? (form.attributes?.duration ?? form.duration ?? "")
                  : DURATION_OTHER}
                onChange={(e) => {
                  const v = e.target.value;
                  const value = v === DURATION_OTHER ? (form.attributes?.duration ?? form.duration ?? "") : v;
                  setForm((f) => ({
                    ...f,
                    duration: value,
                    attributes: { ...f.attributes, duration: value },
                  }));
                }}
                className={inputClass}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value={DURATION_OTHER}>Другое</option>
              </select>
              {!DURATION_OPTIONS.includes(form.attributes?.duration ?? form.duration ?? "") && (
                <input
                  id="project-duration-other"
                  type="text"
                  value={form.attributes?.duration ?? form.duration ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      duration: v,
                      attributes: { ...f.attributes, duration: v },
                    }));
                  }}
                  placeholder="например 14 месяцев"
                  className={`${inputClass} mt-2`}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {(form.type !== CATALOG_TYPE_DESIGN && form.type !== CATALOG_TYPE_REPAIR && form.type !== CATALOG_TYPE_BUILD) && (
        <div>
          <label htmlFor="project-location" className={labelClass}>Локация</label>
          <input
            id="project-location"
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="г. Грозный, центр"
            maxLength={LIMITS.location}
            className={inputClass}
          />
        </div>
      )}

      {form.type && (form.type === CATALOG_TYPE_DESIGN || form.type === CATALOG_TYPE_REPAIR || form.type === CATALOG_TYPE_BUILD) && (
        <div>
          <label htmlFor="project-location-optional" className={labelClass}>Локация (опционально)</label>
          <input
            id="project-location-optional"
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="г. Грозный, центр"
            maxLength={LIMITS.location}
            className={inputClass}
          />
        </div>
      )}

      <div>
        <div className={labelClass}>Состав работ</div>
        <div className="flex gap-2">
          <input
            id="project-scope-input"
            type="text"
            value={scopeInput}
            onChange={(e) => setScopeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addScope())}
            placeholder="Добавить пункт"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addScope}
            className="shrink-0 rounded-xl border border-brand/30 px-4 py-2.5 text-brand hover:bg-brand/10"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
        {form.scope.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.scope.map((s, idx) => (
              <span
                key={`scope-${s}`}
                className="flex items-center gap-1 rounded-lg border border-brand/30 bg-ink/50 px-3 py-1 text-sm"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeScope(idx)}
                  className="text-gray-500 hover:text-red-400"
                  aria-label="Удалить"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className={labelClass}>Изображения</div>
        {existingImages.length > 0 && (
          <DndContext
            sensors={imageDragSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleImageDragEnd}
          >
            <SortableContext
              items={existingImages.map((_, i) => `existing-${i}`)}
              strategy={rectSortingStrategy}
            >
              <div className="mb-3 flex flex-wrap gap-2">
                {existingImages.map((url, idx) => (
                  <SortableThumb
                    key={url}
                    id={`existing-${idx}`}
                    className="relative group"
                  >
                    <img
                      src={url}
                      alt={`Фото ${idx + 1}`}
                      className={`h-20 w-20 rounded-lg object-cover ${
                        idx === 0 ? "ring-2 ring-brand" : ""
                      }`}
                    />
                    {idx === 0 && !pendingImagesFirst ? (
                      <span className="absolute left-0 bottom-0 right-0 z-20 rounded-b-lg bg-brand/90 py-0.5 text-center text-[10px] font-medium text-ink pointer-events-none">
                        Главная
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setImageAsMain(idx)}
                        className="absolute left-0 bottom-0 right-0 z-20 rounded-b-lg bg-black/70 py-0.5 text-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand hover:text-ink"
                        title="Сделать главной"
                      >
                        Сделать главной
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      className="absolute -top-1 -right-1 z-20 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                      aria-label="Удалить"
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </SortableThumb>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget)) setDropActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropActive(false);
            addImageFiles(e.dataTransfer.files);
          }}
          className={`relative mt-1 flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            dropActive
              ? "border-brand bg-brand/10"
              : "border-brand/30 hover:border-brand/50"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              addImageFiles(e.target.files || []);
              e.target.value = "";
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <Icon name="image-plus" className="mb-2 h-10 w-10 text-gray-500" />
          <p className="text-sm text-gray-400">
            Перетащите сюда или нажмите для выбора
          </p>
          <p className="mt-1 text-xs text-gray-500">image/*, до 5 MB</p>
        </div>
        {imageFiles.length > 0 && (
          <DndContext
            sensors={imageDragSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleImageDragEnd}
          >
            <SortableContext
              items={imageFiles.map((_, i) => `pending-${i}`)}
              strategy={rectSortingStrategy}
            >
              <div className="mt-3 flex flex-wrap gap-2">
                {imageFiles.map((file, idx) => (
                  <SortableThumb
                    key={`pending-${file.name}-${file.size}-${file.lastModified}`}
                    id={`pending-${idx}`}
                    className="relative group"
                  >
                    {pendingPreviewUrls[idx] ? (
                      <img
                        src={pendingPreviewUrls[idx]}
                        alt={`К загрузке ${idx + 1}`}
                        className={`h-20 w-20 rounded-lg object-cover ${
                          idx === 0 ? "ring-2 ring-brand" : ""
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-20 w-20 items-center justify-center rounded-lg bg-brand/20 text-gray-400 ${
                          idx === 0 ? "ring-2 ring-brand" : ""
                        }`}
                      >
                        <Icon name="image-plus" className="h-8 w-8" />
                      </div>
                    )}
                    {idx === 0 && (existingImages.length === 0 || pendingImagesFirst) ? (
                      <span className="absolute left-0 bottom-0 right-0 z-20 rounded-b-lg bg-brand/90 py-0.5 text-center text-[10px] font-medium text-ink pointer-events-none">
                        Главная
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingFileAsMain(idx)}
                        className="absolute left-0 bottom-0 right-0 z-20 rounded-b-lg bg-black/70 py-0.5 text-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand hover:text-ink"
                        title="Сделать главной"
                      >
                        Сделать главной
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="absolute -top-1 -right-1 z-20 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                      aria-label="Удалить"
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </SortableThumb>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 font-medium text-ink hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Icon name="loader" className="h-4 w-4 animate-spin" />
              {uploadProgress.total > 0
                ? `Загрузка фото: ${uploadProgress.current} из ${uploadProgress.total}`
                : "Сохранение..."}
            </>
          ) : (
            <>
              <Icon name="check" className="h-4 w-4" />
              Сохранить
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleCancelClick}
          className="rounded-xl border border-brand/30 px-6 py-2.5 text-gray-400 hover:text-white"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
