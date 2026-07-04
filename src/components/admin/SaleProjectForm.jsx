import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { pb, getPocketbaseFileUrl } from "@/lib/pocketbase";
import {
  useUnsavedChangesWarning,
  confirmDiscard,
} from "@/hooks/useUnsavedChangesWarning";
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
import Icon from "@/components/common/Icon";
import {
  getImageNamesAfterAppend,
} from "@/components/admin/projectImageReorder";
import { useSaleProjectTypes } from "@/hooks/useSaleProjectTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SaleProjectCustomFieldsEditor from "@/components/admin/SaleProjectCustomFieldsEditor";
import {
  SALE_STATUS_AVAILABLE,
  SALE_STATUS_ORDER,
  toComparableNumber,
  SALE_PROJECT_CUSTOM_FIELDS_KEY,
  parseSaleProjectCustomFields,
  formatSaleProjectDiscount,
} from "@/utils/saleProjectAttributes";
import {
  normalizePlotAreaField,
  normalizeSquareField,
} from "@/utils/saleProjectFieldNormalize";
import {
  buildStructuredRoomExplanation,
  cleanStandardSaleProjectAttributes,
  pickExtendedSaleProjectFormFields,
} from "@/utils/saleProjectAdminFormBinding";
import {
  ATTACHMENT_CHOICES,
  YES_NO_CHOICES,
  normalizeAttachmentChoice,
  normalizeYesNoChoice,
} from "@/utils/saleProjectFieldStructure";
import { resizeImage } from "@/utils/imageResize";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Лимиты для отображения в карточке (чтобы не обрезалось)
const LIMITS = {
  title: 80,
  id: 30,
  area: 20,
  rooms: 15,
  floors: 15,
  material: 30,
  description: 2000,
  room_explanation: 3000,
};

function getExt(filename) {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i) : ".jpg";
}

function sanitizeStorageSegment(value, defaultSegment = "project") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || defaultSegment;
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

const STATUSES = [
  { value: SALE_STATUS_AVAILABLE, label: "В наличии" },
  { value: SALE_STATUS_ORDER, label: "Под заказ" },
];

const OTHER_VALUE = "__other__";
const EMPTY_EXISTING_PROJECTS = [];

function uniqueSorted(items) {
  const set = new Set();
  for (const p of items || []) {
    const v = String(p ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function uniqueSortedNumeric(items) {
  const set = new Set();
  for (const p of items || []) {
    const v = String(p ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) => toComparableNumber(a) - toComparableNumber(b));
}

function SortableThumb({ id, children, className = "" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
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

export default function SaleProjectForm({
  project,
  onSave,
  onCancel,
  existingProjects = EMPTY_EXISTING_PROJECTS,
}) {
  const isEdit = !!project;
  const { types, refetch } = useSaleProjectTypes();
  const { settings, updateSetting, refetch: refetchSettings } = useSiteSettings();
  const customFieldsRaw = settings[SALE_PROJECT_CUSTOM_FIELDS_KEY];
  const customFieldDefs = useMemo(
    () => parseSaleProjectCustomFields(customFieldsRaw),
    [customFieldsRaw]
  );
  const [showCustomFieldsEditor, setShowCustomFieldsEditor] = useState(false);

  const existingWallMaterials = useMemo(
    () => uniqueSorted(existingProjects.map((p) => p.material_walls ?? p.material)),
    [existingProjects]
  );
  const existingFloors = useMemo(
    () => uniqueSortedNumeric(existingProjects.map((p) => p.floors)),
    [existingProjects]
  );
  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    type: "",
    floors: "",
    price: "",
    old_price: "",
    construction_price_from: "",
    status: SALE_STATUS_AVAILABLE,
    published: true,
    images: [],
    plot_area: "",
    house_area: "",
    usable_area: "",
    implementation_period: "",
    house_dimensions: "",
    style: "",
    garage: "Нет",
    canopy: "Нет",
    basement: "Нет",
    terrace: "Нет",
    bedrooms: "",
    total_built_area: "",
    note: "",
    garage_area: "",
    canopy_area: "",
    explication_basement: "",
    explication_floor_1: "",
    explication_floor_2: "",
    material_foundation: "",
    material_walls: "",
    material_roof: "",
    material_facade: "",
  });
  const [customFields, setCustomFields] = useState({});
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
    if (!file.type.startsWith("image/")) return "Только изображения (image/*)";
    if (file.size > MAX_FILE_SIZE) return `Файл «${file.name}» превышает лимит 5 MB`;
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

  const removePendingFile = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
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
      if (!over || active.id === over.id) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      const existingPrefix = "existing-";
      const pendingPrefix = "pending-";
      if (activeId.startsWith(existingPrefix) && overId.startsWith(existingPrefix)) {
        const oldIdx = parseInt(activeId.slice(existingPrefix.length), 10);
        const newIdx = parseInt(overId.slice(existingPrefix.length), 10);
        if (!Number.isNaN(oldIdx) && !Number.isNaN(newIdx)) reorderExistingImages(oldIdx, newIdx);
      } else if (activeId.startsWith(pendingPrefix) && overId.startsWith(pendingPrefix)) {
        const oldIdx = parseInt(activeId.slice(pendingPrefix.length), 10);
        const newIdx = parseInt(overId.slice(pendingPrefix.length), 10);
        if (!Number.isNaN(oldIdx) && !Number.isNaN(newIdx)) reorderPendingFiles(oldIdx, newIdx);
      }
    },
    [reorderExistingImages, reorderPendingFiles]
  );

  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [imageFiles]);

  useEffect(() => {
    if (imageFiles.length === 0) setPendingImagesFirst(false);
  }, [imageFiles.length]);

  useEffect(() => {
    setForm((prev) => {
      if (!project) {
        if (types.length > 0 && !prev.type) return { ...prev, type: types[0] };
        return prev;
      }

      const attrs =
        project.attributes && typeof project.attributes === "object"
          ? project.attributes
          : {};

      const extended = pickExtendedSaleProjectFormFields(project);

      return {
        id: project.id ?? "",
        title: project.title ?? "",
        description: project.description ?? "",
        type: project.type ?? (types[0] ?? ""),
        floors: project.floors ?? "",
        price: project.price ?? "",
        old_price: project.old_price ?? project.oldPrice ?? "",
        construction_price_from:
          project.constructionPriceFrom ?? project.construction_price_from ?? "",
        status:
          project.status === SALE_STATUS_AVAILABLE
            ? SALE_STATUS_AVAILABLE
            : SALE_STATUS_ORDER,
        published: project.published !== false,
        images: Array.isArray(project.images) ? [...project.images] : [],
        plot_area: project.plot_area ?? attrs.plot_area ?? "",
        house_area:
          project.house_area ?? attrs.house_area ?? project.area ?? "",
        usable_area: project.usable_area ?? attrs.usable_area ?? "",
        implementation_period:
          project.implementation_period ?? attrs.implementation_period ?? "",
        house_dimensions:
          project.house_dimensions ?? attrs.house_dimensions ?? "",
        ...extended,
      };
    });
  }, [project, types]);

  useEffect(() => {
    setCustomFields((prev) => {
      if (!project) {
        if (customFieldDefs.length > 0) {
          return Object.fromEntries(
            customFieldDefs.map((def) => [def.key, ""]),
          );
        }
        return prev;
      }

      const attrs =
        project.attributes && typeof project.attributes === "object"
          ? project.attributes
          : {};

      const custom = {};
      for (const def of customFieldDefs) {
        custom[def.key] = attrs[def.key] ?? "";
      }
      return custom;
    });

    setExistingImages((prev) => {
      if (!project) return prev;
      return Array.isArray(project.images) ? project.images : [];
    });
  }, [project, customFieldDefs]);

  const removeExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

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

  const addNewType = async () => {
    const name = newTypeInput.trim();
    if (!name) return;
    try {
      const existing = await pb
        .collection("sale_project_types")
        .getFirstListItem(`name = "${name.replace(/"/g, '\\"')}"`)
        .catch(() => null);
      if (!existing) {
        await pb.collection("sale_project_types").create({
          name,
          sort_order: types.length,
        });
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

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        toast.error("Готовый проект с таким артикулом уже существует");
        setSaving(false);
        return;
      }
      const title = form.title.trim();
      if (!title) {
        toast.error("Название обязательно");
        setSaving(false);
        return;
      }
      if (title.length > LIMITS.title) {
        toast.error(`Название не длиннее ${LIMITS.title} символов — в карточке будет обрезаться`);
        setSaving(false);
        return;
      }
      const description = (form.description ?? "").trim();
      if (description.length > LIMITS.description) {
        toast.error(`Описание не длиннее ${LIMITS.description} символов`);
        setSaving(false);
        return;
      }
      const roomExplanation = buildStructuredRoomExplanation(form);
      if (roomExplanation.length > LIMITS.room_explanation) {
        toast.error(`Экспликация не длиннее ${LIMITS.room_explanation} символов`);
        setSaving(false);
        return;
      }
      const houseArea = (form.house_area ?? "").trim();
      const bedrooms = (form.bedrooms ?? "").trim();
      const floors = form.floors.trim();
      const materialWalls = (form.material_walls ?? "").trim();
      if (houseArea.length > LIMITS.area || bedrooms.length > LIMITS.rooms || floors.length > LIMITS.floors || materialWalls.length > LIMITS.material) {
        const over = [];
        if (houseArea.length > LIMITS.area) over.push(`Площадь дома (${LIMITS.area})`);
        if (bedrooms.length > LIMITS.rooms) over.push(`Количество спален (${LIMITS.rooms})`);
        if (floors.length > LIMITS.floors) over.push(`Этажи (${LIMITS.floors})`);
        if (materialWalls.length > LIMITS.material) over.push(`Стены (${LIMITS.material})`);
        toast.error(`Сократите: ${over.join(", ")} символов`);
        setSaving(false);
        return;
      }

      const existingImageNames = existingImages
        .map(toPocketbaseFilename)
        .filter(Boolean);
      const newImageFiles = [];
      if (imageFiles.length > 0) {
        const storageProjectId = sanitizeStorageSegment(projectId, "sale-project");
        const baseTime = Date.now();
        const total = imageFiles.length;
        setUploadProgress({ current: 0, total });
        for (let i = 0; i < imageFiles.length; i += 1) {
          const file = imageFiles[i];
          const blob = await resizeImage(file).catch(() => file);
          const ext =
            blob instanceof File ? getExt(file.name).toLowerCase() || ".jpg" : ".jpg";
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
        sortOrderInCategory = project.sortOrderInCategory ?? project.sort_order_in_category ?? 0;
      } else {
        const escapedType = String(form.type).replace(/"/g, '\\"');
        const existing = await pb
          .collection("sale_projects")
          .getFirstListItem(`type = "${escapedType}"`, {
            sort: "-sort_order_in_category",
            fields: "sort_order_in_category",
          })
          .catch(() => null);
        sortOrderInCategory = (existing?.sort_order_in_category ?? -1) + 1;
      }

      const existingAttrs = cleanStandardSaleProjectAttributes(project?.attributes);
      const normalizedPlotArea = (form.plot_area ?? "").trim()
        ? normalizePlotAreaField(form.plot_area)
        : "";
      const normalizedHouseArea = (form.house_area ?? "").trim()
        ? normalizeSquareField(form.house_area)
        : "";
      const normalizedUsableArea = (form.usable_area ?? "").trim()
        ? normalizeSquareField(form.usable_area)
        : "";
      const normalizedTotalBuiltArea = (form.total_built_area ?? "").trim()
        ? normalizeSquareField(form.total_built_area)
        : "";
      const implementationPeriod = (form.implementation_period ?? "").trim();
      const houseDimensions = (form.house_dimensions ?? "").trim();
      const row = {
        external_id: projectId,
        title,
        description: description || "",
        type: form.type,
        floors: floors || "",
        price: form.price.trim() || "",
        old_price: form.old_price.trim() || "",
        construction_price_from: form.construction_price_from.trim() || "",
        status: form.status,
        images: existingImageNames,
        published: !!form.published,
        sort_order_in_category: sortOrderInCategory,
        plot_area: normalizedPlotArea,
        house_area: normalizedHouseArea,
        usable_area: normalizedUsableArea,
        implementation_period: implementationPeriod,
        house_dimensions: houseDimensions,
        style: (form.style ?? "").trim(),
        garage: normalizeAttachmentChoice(form.garage),
        canopy: normalizeAttachmentChoice(form.canopy),
        basement: normalizeYesNoChoice(form.basement),
        terrace: normalizeYesNoChoice(form.terrace),
        bedrooms,
        total_built_area: normalizedTotalBuiltArea,
        note: (form.note ?? "").trim(),
        garage_area: (form.garage_area ?? "").trim(),
        canopy_area: (form.canopy_area ?? "").trim(),
        explication_basement: (form.explication_basement ?? "").trim(),
        explication_floor_1: (form.explication_floor_1 ?? "").trim(),
        explication_floor_2: (form.explication_floor_2 ?? "").trim(),
        material_foundation: (form.material_foundation ?? "").trim(),
        material_walls: materialWalls,
        material_roof: (form.material_roof ?? "").trim(),
        material_facade: (form.material_facade ?? "").trim(),
        attributes: {
          ...existingAttrs,
          ...Object.fromEntries(
            customFieldDefs.map((def) => [
              def.key,
              (customFields[def.key] ?? "").trim() || null,
            ])
          ),
        },
      };

      let savedProject = null;
      if (isEdit) {
        const updatePayload = { ...row };
        if (newImageFiles.length > 0) {
          updatePayload["images+"] = newImageFiles;
        }
        savedProject = await pb
          .collection("sale_projects")
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
              .collection("sale_projects")
              .update(project.recordId ?? project.id, {
                images: orderedImageNames,
              });
          } catch {
            // Фото сохранены, но порядок применить не удалось — подтягиваем
            // актуальное состояние с сервера, чтобы форма не разошлась с БД.
            const fresh = await pb
              .collection("sale_projects")
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
        savedProject = await pb.collection("sale_projects").create(row);
      }

      toast.success(isEdit ? "Готовый проект обновлен" : "Готовый проект создан");
      setDirty(false);
      onSave?.({
        ...savedProject,
        id: savedProject.external_id ?? savedProject.id,
        recordId: savedProject.id,
        images: Array.isArray(savedProject.images)
          ? savedProject.images
              .map((name) => getPocketbaseFileUrl(savedProject, name))
              .filter(Boolean)
          : [],
      });
    } catch (err) {
      const message = err?.message ?? (err && String(err)) ?? "Ошибка сохранения";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-brand/20 bg-ink px-4 py-2.5 text-white outline-none focus:border-brand disabled:opacity-50";
  const labelClass = "mb-1 block text-sm text-gray-400";
  const selectAllOnFocus = (e) => e.target.select();

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => setDirty(true)}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-play text-xl font-bold text-white">
          {isEdit ? "Редактировать готовый проект" : "Новый готовый проект"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomFieldsEditor((v) => !v)}
            className="rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-brand/10"
          >
            <Icon name="list-checks" className="mr-1.5 inline h-4 w-4" />
            {showCustomFieldsEditor ? "Скрыть настройку полей" : "Доп. поля"}
          </button>
          <button
            type="button"
            onClick={handleCancelClick}
            className="rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Отмена
          </button>
        </div>
      </div>

      {showCustomFieldsEditor && (
        <div className="rounded-xl border border-brand/20 bg-[#2A2A28]/50 p-4">
          <SaleProjectCustomFieldsEditor
            key={JSON.stringify(customFieldDefs)}
            value={customFieldDefs}
            loading={false}
            onSave={async (json) => {
              await updateSetting(SALE_PROJECT_CUSTOM_FIELDS_KEY, json);
              await refetchSettings();
            }}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sale-project-id" className={labelClass}>Артикул (ID) *</label>
          <input
            id="sale-project-id"
            type="text"
            value={form.id}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            onFocus={selectAllOnFocus}
            placeholder="SP-001"
            required
            disabled={isEdit}
            maxLength={LIMITS.id}
            className={inputClass}
          />
          <p className="form-hint">{form.id.length} / {LIMITS.id}</p>
        </div>
        <div>
          <label htmlFor="sale-project-title" className={labelClass}>Название *</label>
          <input
            id="sale-project-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onFocus={selectAllOnFocus}
            placeholder="Дом 120"
            required
            maxLength={LIMITS.title}
            className={inputClass}
          />
          <p className="form-hint">
            {form.title.length} / {LIMITS.title}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="sale-project-description" className={labelClass}>Описание проекта</label>
        <textarea
          id="sale-project-description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Кратко опишите планировку, особенности и преимущества проекта"
          maxLength={LIMITS.description}
          rows={4}
          className={`${inputClass} resize-y`}
        />
        <p className="form-hint">
          {(form.description ?? "").length} / {LIMITS.description}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <label htmlFor="sale-project-explication-basement" className={labelClass}>
            Экспликация: подвал
          </label>
          <textarea
            id="sale-project-explication-basement"
            value={form.explication_basement}
            onChange={(e) =>
              setForm((f) => ({ ...f, explication_basement: e.target.value }))
            }
            placeholder="Котельная — 12 м²"
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label htmlFor="sale-project-explication-floor-1" className={labelClass}>
            Экспликация: 1 этаж
          </label>
          <textarea
            id="sale-project-explication-floor-1"
            value={form.explication_floor_1}
            onChange={(e) =>
              setForm((f) => ({ ...f, explication_floor_1: e.target.value }))
            }
            placeholder="Кухня-гостиная — 32 м²"
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label htmlFor="sale-project-explication-floor-2" className={labelClass}>
            Экспликация: 2 этаж
          </label>
          <textarea
            id="sale-project-explication-floor-2"
            value={form.explication_floor_2}
            onChange={(e) =>
              setForm((f) => ({ ...f, explication_floor_2: e.target.value }))
            }
            placeholder="Мастер-спальня — 18 м²"
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="sale-project-style" className={labelClass}>Стиль</label>
          <input
            id="sale-project-style"
            type="text"
            value={form.style}
            onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
            onFocus={selectAllOnFocus}
            placeholder="Современная классика"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sale-project-bedrooms" className={labelClass}>Количество спален</label>
          <input
            id="sale-project-bedrooms"
            type="text"
            value={form.bedrooms}
            onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
            onFocus={selectAllOnFocus}
            placeholder="3"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sale-project-terrace" className={labelClass}>Терраса</label>
          <select
            id="sale-project-terrace"
            value={form.terrace}
            onChange={(e) => setForm((f) => ({ ...f, terrace: e.target.value }))}
            className={inputClass}
          >
            {YES_NO_CHOICES.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sale-project-total-built-area" className={labelClass}>
            Площадь всех построек
          </label>
          <input
            id="sale-project-total-built-area"
            type="text"
            value={form.total_built_area}
            onChange={(e) =>
              setForm((f) => ({ ...f, total_built_area: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            onBlur={() =>
              setForm((f) => {
                const v = (f.total_built_area ?? "").trim();
                return v
                  ? { ...f, total_built_area: normalizeSquareField(v) }
                  : f;
              })
            }
            placeholder="149"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="sale-project-garage" className={labelClass}>Гараж</label>
          <select
            id="sale-project-garage"
            value={form.garage}
            onChange={(e) => setForm((f) => ({ ...f, garage: e.target.value }))}
            className={inputClass}
          >
            {ATTACHMENT_CHOICES.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sale-project-canopy" className={labelClass}>Навес</label>
          <select
            id="sale-project-canopy"
            value={form.canopy}
            onChange={(e) => setForm((f) => ({ ...f, canopy: e.target.value }))}
            className={inputClass}
          >
            {ATTACHMENT_CHOICES.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sale-project-basement" className={labelClass}>Подвал</label>
          <select
            id="sale-project-basement"
            value={form.basement}
            onChange={(e) => setForm((f) => ({ ...f, basement: e.target.value }))}
            className={inputClass}
          >
            {YES_NO_CHOICES.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sale-project-garage-area" className={labelClass}>Площадь гаража</label>
          <input
            id="sale-project-garage-area"
            type="text"
            value={form.garage_area}
            onChange={(e) => setForm((f) => ({ ...f, garage_area: e.target.value }))}
            onFocus={selectAllOnFocus}
            placeholder="28,4"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sale-project-canopy-area" className={labelClass}>Площадь навеса</label>
          <input
            id="sale-project-canopy-area"
            type="text"
            value={form.canopy_area}
            onChange={(e) => setForm((f) => ({ ...f, canopy_area: e.target.value }))}
            onFocus={selectAllOnFocus}
            placeholder="31,72"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={showNewType ? "sale-project-new-type" : "sale-project-type"} className={labelClass}>Категория</label>
          {showNewType ? (
            <div className="flex gap-2">
              <input
                id="sale-project-new-type"
                type="text"
                value={newTypeInput}
                onChange={(e) => setNewTypeInput(e.target.value)}
                onFocus={selectAllOnFocus}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addNewType())
                }
                placeholder="Новая категория"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addNewType}
                className="rounded-xl border border-brand/30 px-3 text-brand hover:bg-brand/10"
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewType(false);
                  setNewTypeInput("");
                }}
                className="rounded-xl border border-brand/30 px-3 text-gray-400 hover:text-white"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <select
              id="sale-project-type"
              value={form.type}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "__new__") setShowNewType(true);
                else setForm((f) => ({ ...f, type: value }));
              }}
              className={inputClass}
            >
              {[...new Set([...types, form.type].filter(Boolean))].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="__new__">➕ Добавить категорию</option>
            </select>
          )}
        </div>
        <div>
          <label htmlFor="sale-project-status" className={labelClass}>Статус</label>
          <select
            id="sale-project-status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className={inputClass}
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sale-project-price" className={labelClass}>Стоимость проекта</label>
          <input
            id="sale-project-price"
            type="text"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            onFocus={selectAllOnFocus}
            placeholder="5900000"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sale-project-old-price" className={labelClass}>Старая стоимость</label>
          <input
            id="sale-project-old-price"
            type="text"
            value={form.old_price}
            onChange={(e) =>
              setForm((f) => ({ ...f, old_price: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            placeholder="6400000"
            className={inputClass}
          />
        </div>
        <div>
          <span className={labelClass}>Скидка (авто)</span>
          <div className="flex min-h-[46px] items-center rounded-xl border border-brand/20 bg-ink px-4 py-2.5 text-white">
            {formatSaleProjectDiscount(form.old_price, form.price) || "—"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={existingFloors.length > 0 ? "sale-project-floors-select" : "sale-project-floors"} className={labelClass}>Этажей</label>
          {existingFloors.length > 0 ? (
            <>
              <select
                id="sale-project-floors-select"
                value={existingFloors.includes(String(form.floors).trim()) ? form.floors : OTHER_VALUE}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    floors: e.target.value === OTHER_VALUE ? "" : e.target.value,
                  }))
                }
                className={inputClass}
              >
                {existingFloors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
                <option value={OTHER_VALUE}>Другое (ввести)</option>
              </select>
              {!existingFloors.includes(String(form.floors).trim()) && (
                <input
                  id="sale-project-floors-other"
                  type="text"
                  value={form.floors}
                  onChange={(e) => setForm((f) => ({ ...f, floors: e.target.value }))}
                  onFocus={selectAllOnFocus}
                  placeholder="например 2 или 1-2"
                  maxLength={LIMITS.floors}
                  className={`${inputClass} mt-2`}
                />
              )}
            </>
          ) : (
            <input
              type="text"
              value={form.floors}
              onChange={(e) => setForm((f) => ({ ...f, floors: e.target.value }))}
              onFocus={selectAllOnFocus}
              placeholder="2 или 1-2"
              maxLength={LIMITS.floors}
              className={inputClass}
            />
          )}
        </div>
        <div>
          <label htmlFor="sale-project-construction-price-from" className={labelClass}>
            Стоимость строительства (от)
          </label>
          <input
            id="sale-project-construction-price-from"
            type="text"
            value={form.construction_price_from}
            onChange={(e) =>
              setForm((f) => ({ ...f, construction_price_from: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            placeholder="например 15 000 000"
            className={inputClass}
          />
          <p className="form-hint">Текст, который пойдёт в «Стоимость строительства от …»</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="sale-project-material-foundation" className={labelClass}>Тип фундамента</label>
          <input
            id="sale-project-material-foundation"
            type="text"
            value={form.material_foundation}
            onChange={(e) =>
              setForm((f) => ({ ...f, material_foundation: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            placeholder="Ж/Б плита"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={existingWallMaterials.length > 0 ? "sale-project-material-walls-select" : "sale-project-material-walls"} className={labelClass}>Стены</label>
          {existingWallMaterials.length > 0 ? (
            <>
              <select
                id="sale-project-material-walls-select"
                value={
                  existingWallMaterials.includes(String(form.material_walls).trim())
                    ? form.material_walls
                    : OTHER_VALUE
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    material_walls: e.target.value === OTHER_VALUE ? "" : e.target.value,
                  }))
                }
                className={inputClass}
              >
                {existingWallMaterials.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
                <option value={OTHER_VALUE}>Другое (ввести)</option>
              </select>
              {!existingWallMaterials.includes(String(form.material_walls).trim()) && (
                <input
                  id="sale-project-material-walls-other"
                  type="text"
                  value={form.material_walls}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, material_walls: e.target.value }))
                  }
                  onFocus={selectAllOnFocus}
                  placeholder="Газобетонные блоки"
                  maxLength={LIMITS.material}
                  className={`${inputClass} mt-2`}
                />
              )}
            </>
          ) : (
            <input
              id="sale-project-material-walls"
              type="text"
              value={form.material_walls}
              onChange={(e) =>
                setForm((f) => ({ ...f, material_walls: e.target.value }))
              }
              onFocus={selectAllOnFocus}
              placeholder="Газобетонные блоки"
              maxLength={LIMITS.material}
              className={inputClass}
            />
          )}
        </div>
        <div>
          <label htmlFor="sale-project-material-roof" className={labelClass}>Кровля</label>
          <input
            id="sale-project-material-roof"
            type="text"
            value={form.material_roof}
            onChange={(e) =>
              setForm((f) => ({ ...f, material_roof: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            placeholder="Металлопрофиль"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sale-project-material-facade" className={labelClass}>Облицовка фасада</label>
          <input
            id="sale-project-material-facade"
            type="text"
            value={form.material_facade}
            onChange={(e) =>
              setForm((f) => ({ ...f, material_facade: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            placeholder="Декоративная штукатурка"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="sale-project-plot-area" className={labelClass}>Площадь участка</label>
          <input
            id="sale-project-plot-area"
            type="text"
            value={form.plot_area}
            onChange={(e) => setForm((f) => ({ ...f, plot_area: e.target.value }))}
            onFocus={selectAllOnFocus}
            onBlur={() =>
              setForm((f) => {
                const v = (f.plot_area ?? "").trim();
                return v ? { ...f, plot_area: normalizePlotAreaField(f.plot_area) } : f;
              })
            }
            placeholder="6 или 6 соток"
            className={inputClass}
          />
          <p className="form-hint">Число — подставится «соток»</p>
        </div>
        <div>
          <label htmlFor="sale-project-house-area" className={labelClass}>Площадь дома</label>
          <input
            id="sale-project-house-area"
            type="text"
            value={form.house_area}
            onChange={(e) => setForm((f) => ({ ...f, house_area: e.target.value }))}
            onFocus={selectAllOnFocus}
            onBlur={() =>
              setForm((f) => {
                const v = (f.house_area ?? "").trim();
                return v ? { ...f, house_area: normalizeSquareField(f.house_area) } : f;
              })
            }
            placeholder="120"
            className={inputClass}
          />
          <p className="form-hint">Только число — м² подставится автоматически</p>
        </div>
        <div>
          <label htmlFor="sale-project-usable-area" className={labelClass}>Полезная площадь</label>
          <input
            id="sale-project-usable-area"
            type="text"
            value={form.usable_area}
            onChange={(e) => setForm((f) => ({ ...f, usable_area: e.target.value }))}
            onFocus={selectAllOnFocus}
            onBlur={() =>
              setForm((f) => {
                const v = (f.usable_area ?? "").trim();
                return v ? { ...f, usable_area: normalizeSquareField(f.usable_area) } : f;
              })
            }
            placeholder="95"
            className={inputClass}
          />
          <p className="form-hint">Только число — м² подставится автоматически</p>
        </div>
        <div>
          <label htmlFor="sale-project-implementation-period" className={labelClass}>Срок реализации</label>
          <input
            id="sale-project-implementation-period"
            type="text"
            value={form.implementation_period}
            onChange={(e) =>
              setForm((f) => ({ ...f, implementation_period: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            placeholder="например 6 месяцев"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sale-project-house-dimensions" className={labelClass}>Общие размеры дома</label>
          <input
            id="sale-project-house-dimensions"
            type="text"
            value={form.house_dimensions}
            onChange={(e) =>
              setForm((f) => ({ ...f, house_dimensions: e.target.value }))
            }
            onFocus={selectAllOnFocus}
            placeholder="12,6м х 14,6м"
            className={inputClass}
          />
          <p className="form-hint">Например: 12,6м х 14,6м</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="sale-project-note" className={labelClass}>Примечание</label>
          <textarea
            id="sale-project-note"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Внутренний комментарий"
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      {customFieldDefs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {customFieldDefs.map((def) => (
            <div key={def.key}>
              <label htmlFor={`sale-project-custom-${def.key}`} className={labelClass}>{def.label}</label>
              <input
                id={`sale-project-custom-${def.key}`}
                type="text"
                value={customFields[def.key] ?? ""}
                onChange={(e) =>
                  setCustomFields((prev) => ({
                    ...prev,
                    [def.key]: e.target.value,
                  }))
                }
                onFocus={selectAllOnFocus}
                placeholder={def.label}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      )}

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
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
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

      <div>
        <div className={labelClass}>Изображения</div>
        <DndContext
          sensors={imageDragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleImageDragEnd}
        >
          <SortableContext
            items={[
              ...existingImages.map((_, i) => `existing-${i}`),
              ...imageFiles.map((_, i) => `pending-${i}`),
            ]}
            strategy={rectSortingStrategy}
          >
            {existingImages.length > 0 && (
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
                      <span className="absolute left-0 bottom-0 right-0 rounded-b-lg bg-brand/90 py-0.5 text-center text-[10px] font-medium text-ink z-20 pointer-events-none">
                        Главная
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setImageAsMain(idx)}
                        className="absolute left-0 bottom-0 right-0 rounded-b-lg bg-black/70 py-0.5 text-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand hover:text-ink z-20"
                      >
                        Сделать главной
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition z-20"
                      aria-label="Удалить"
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </SortableThumb>
                ))}
              </div>
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
                        className={`h-20 w-20 rounded-lg object-cover ${idx === 0 ? "ring-2 ring-brand" : ""}`}
                      />
                    ) : (
                      <div className={`flex h-20 w-20 items-center justify-center rounded-lg bg-brand/20 text-gray-400 ${idx === 0 ? "ring-2 ring-brand" : ""}`}>
                        <Icon name="image-plus" className="h-8 w-8" />
                      </div>
                    )}
                    {idx === 0 && (existingImages.length === 0 || pendingImagesFirst) ? (
                      <span className="absolute left-0 bottom-0 right-0 rounded-b-lg bg-brand/90 py-0.5 text-center text-[10px] font-medium text-ink z-20 pointer-events-none">
                        Главная
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingFileAsMain(idx)}
                        className="absolute left-0 bottom-0 right-0 rounded-b-lg bg-black/70 py-0.5 text-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand hover:text-ink z-20"
                        title="Сделать главной"
                      >
                        Сделать главной
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition z-20"
                      aria-label="Удалить"
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </SortableThumb>
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
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
