import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Icon from "@/components/common/Icon";
import { SaleProjectCard } from "@/components/sale";

export default function SortableSaleProjectCard({
  project,
  children,
  disabled,
  onFeaturedToggle,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const featuredButton = onFeaturedToggle && (
    <button
      type="button"
      onClick={() => onFeaturedToggle(project, !project.featured)}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        project.featured
          ? "bg-brand text-ink hover:bg-brand/90"
          : "bg-ink/80 text-gray-400 hover:bg-brand/20 hover:text-brand"
      }`}
      title={project.featured ? "Убрать с главной" : "Показывать на главной"}
    >
      ★ {project.featured ? "На главной" : "На главную"}
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-3 top-3 z-20 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-black/60 text-white transition hover:bg-brand/80 active:cursor-grabbing"
          aria-label="Перетащить для изменения порядка"
        >
          <Icon name="grip-vertical" className="h-4 w-4" />
        </div>
      )}

      {project.published === false && (
        <span className="absolute left-14 top-3 z-20 rounded bg-amber-600/90 px-2 py-1 text-xs font-medium text-white">
          Черновик
        </span>
      )}

      <SaleProjectCard
        project={project}
        imageOverlay={featuredButton}
        adminFooter={
          <div className="flex flex-col gap-2 sm:flex-row">{children}</div>
        }
      />
    </div>
  );
}
