import { Card, CardHeader, CardContent } from "@/components/common";

/**
 * Skeleton-карточка проекта для состояния загрузки (Portfolio, Catalog)
 */
export default function ProjectCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border-brand/20 bg-ink flex flex-col">
      <div className="px-2 pt-2 pb-1 sm:px-3 sm:pt-3 sm:pb-1.5">
        <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden rounded-lg bg-gray-700/50 animate-pulse" />
      </div>
      <CardHeader className="px-4 py-2 sm:px-5 sm:py-3">
        <div className="h-6 w-3/4 rounded bg-gray-600/50 animate-pulse mb-2" />
        <div className="h-4 w-1/2 rounded bg-gray-600/30 animate-pulse" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 sm:px-5 sm:pb-4 flex-1 flex flex-col">
        <div className="mb-1.5 sm:mb-2 grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <div className="h-3 w-12 rounded bg-gray-600/30 animate-pulse mb-1" />
            <div className="h-4 w-full rounded bg-gray-600/50 animate-pulse" />
          </div>
          <div>
            <div className="h-3 w-12 rounded bg-gray-600/30 animate-pulse mb-1" />
            <div className="h-4 w-full rounded bg-gray-600/50 animate-pulse" />
          </div>
          <div>
            <div className="h-3 w-12 rounded bg-gray-600/30 animate-pulse mb-1" />
            <div className="h-4 w-full rounded bg-gray-600/50 animate-pulse" />
          </div>
          <div>
            <div className="h-3 w-12 rounded bg-gray-600/30 animate-pulse mb-1" />
            <div className="h-4 w-full rounded bg-gray-600/50 animate-pulse" />
          </div>
        </div>
        <div className="border-t border-brand/20 pt-1 sm:pt-1.5 mt-auto flex gap-2">
          <div className="h-10 flex-1 rounded-xl bg-gray-600/40 animate-pulse" />
          <div className="h-10 flex-1 rounded-xl bg-gray-600/40 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
