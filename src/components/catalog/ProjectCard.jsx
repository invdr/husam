import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/common";
import { Link } from "react-router-dom";
import ProjectImage from "./ProjectImage";
import { getCardDisplayFields } from "@/utils/catalogAttributes";

export default function ProjectCard({
  project,
  children,
  imageOverlay,
  imageOverlayTopLeft,
  showDetails = true,
  titleHref,
}) {
  return (
    <Card variant="listing">
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
      <CardHeader variant="listing">
        <CardTitle variant="listing" title={project.title}>
          {titleHref ? (
            <Link
              to={titleHref}
              className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              {project.title}
            </Link>
          ) : (
            project.title
          )}
        </CardTitle>
        <CardDescription variant="listingClamped" title={project.type}>
          {project.type}
        </CardDescription>
      </CardHeader>
      <CardContent variant="listing">
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
