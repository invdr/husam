import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Icon from "@/components/common/Icon";
import { ProjectCard } from "@/components/catalog";

export default function SortableProjectCard({
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

  const projectWithClient = {
    ...project,
    clientName: project.client_name ?? project.clientName,
  };

  const featuredButton = onFeaturedToggle && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFeaturedToggle(project, !project.featured);
      }}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
        project.featured
          ? "bg-brand text-ink hover:bg-brand/90"
          : "bg-ink/80 text-gray-400 hover:bg-brand/20 hover:text-brand"
      }`}
      title={project.featured ? "Убрать с главной" : "Показывать на главной"}
    >
      <span>★</span>
      <span>{project.featured ? "На главной" : "На главную"}</span>
    </button>
  );

  const dragHandle = !disabled && (
    <div
      {...attributes}
      {...listeners}
      className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-ink/80 text-gray-400 transition hover:bg-brand/20 hover:text-brand active:cursor-grabbing"
      aria-label="Перетащить для изменения порядка"
    >
      <Icon name="grip-vertical" className="h-4 w-4" />
    </div>
  );

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {project.published === false && (
        <span className="absolute left-2 top-2 z-10 rounded bg-amber-600/90 px-2 py-1 text-xs font-medium text-white">
          Черновик
        </span>
      )}
      <ProjectCard
        project={projectWithClient}
        imageOverlay={featuredButton}
        imageOverlayTopLeft={dragHandle}
      >
        {children}
      </ProjectCard>
    </div>
  );
}
