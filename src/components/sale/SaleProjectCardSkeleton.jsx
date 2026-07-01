export default function SaleProjectCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-brand/20 bg-ink">
      <div className="p-3">
        <div className="h-56 rounded-lg bg-gray-700/70" />
      </div>
      <div className="px-5 pb-5">
        <div className="h-6 w-2/3 rounded bg-gray-700/70" />
        <div className="mt-2 h-4 w-1/3 rounded bg-gray-700/60" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`shimmer-${index}`} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-gray-700/50" />
              <div className="h-4 w-20 rounded bg-gray-700/70" />
            </div>
          ))}
        </div>
        <div className="mt-5 h-px bg-brand/20" />
        <div className="mt-3 flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="h-3 w-14 rounded bg-gray-700/50" />
            <div className="h-6 w-28 rounded bg-gray-700/70" />
          </div>
          <div className="h-8 w-24 rounded-xl bg-gray-700/70" />
        </div>
      </div>
    </div>
  );
}
