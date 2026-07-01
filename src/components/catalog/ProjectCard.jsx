import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/common";
import ProjectImage from "./ProjectImage";
import { getCardDisplayFields } from "@/utils/catalogAttributes";

export default function ProjectCard({
  project,
  children,
  imageOverlay,
  imageOverlayTopLeft,
  showDetails = true,
}) {
  return (
    <Card className="group h-full overflow-hidden border-brand/20 bg-ink flex flex-col transition-all hover:border-brand/40 hover:shadow-xl">
      <div className="px-2 pt-2 pb-1 sm:px-3 sm:pt-3 sm:pb-1.5">
        <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden rounded-lg">
          <ProjectImage
            project={project}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {imageOverlayTopLeft && (
            <div className="absolute left-2 top-2 z-10">
              {imageOverlayTopLeft}
            </div>
          )}
          {imageOverlay && (
            <div className="absolute right-2 bottom-2 z-10">{imageOverlay}</div>
          )}
        </div>
      </div>
      <CardHeader className="px-4 py-2 sm:px-5 sm:py-3">
        <CardTitle className="font-play text-white text-lg sm:text-xl line-clamp-2" title={project.title}>
          {project.title}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm line-clamp-1" title={project.type}>
          {project.type}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 sm:px-5 sm:pb-4 flex-1 flex flex-col">
        {showDetails && (() => {
          const fields = getCardDisplayFields(project);
          if (fields.length === 0) return null;
          return (
            <div className="mb-1.5 sm:mb-2 grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
              {fields.map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <div className="text-gray-500 text-xs truncate">{label}</div>
                  <div className="text-brand font-medium break-words line-clamp-2 text-xs sm:text-sm" title={value}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {children && (
          <div className="border-t border-brand/20 pt-1 sm:pt-1.5 mt-auto">
            <div className="mt-1 sm:mt-1.5 flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
              {children}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
