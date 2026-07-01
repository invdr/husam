import Icon from "./Icon";

/**
 * Пагинация: кнопки «Назад», «Вперед» и номера страниц.
 * @param {{ page: number, totalPages: number, onPageChange: (page: number) => void, className?: string }} props
 */
export default function Pagination({
  page,
  totalPages,
  onPageChange,
  className = "",
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (range[0] > 1) {
      rangeWithDots.push(1);
      if (range[0] > 2) rangeWithDots.push({ kind: "ellipsis", side: "left" });
    }
    rangeWithDots.push(...range);
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1)
        rangeWithDots.push({ kind: "ellipsis", side: "right" });
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <nav
      className={`flex items-center justify-center gap-2 ${className}`}
      aria-label="Пагинация"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-brand/30 px-3 py-2 text-sm text-white hover:border-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Предыдущая страница"
      >
        <Icon name="chevron-left" className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((item) =>
          item?.kind === "ellipsis" ? (
            <span
              key={`ellipsis-${item.side}`}
              className="px-2 text-gray-500"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                page === item
                  ? "bg-brand text-ink"
                  : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10"
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-brand/30 px-3 py-2 text-sm text-white hover:border-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Следующая страница"
      >
        <Icon name="chevron-right" className="h-4 w-4" />
      </button>
    </nav>
  );
}
