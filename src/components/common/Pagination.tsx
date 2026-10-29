interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50, 100],
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  // Generate pagination window with ellipsis for large page counts
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 mt-4 shadow-sm">
      {/* Left: Showing X to Y of Z results */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <p>
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startItem}</span> to{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{endItem}</span> of{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{totalItems}</span> results
        </p>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[11px]">Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-2 py-1 outline-none focus:border-[#0047FF] cursor-pointer"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1 text-xs">
        <nav className="isolate inline-flex -space-x-px shadow-2xs" aria-label="Pagination">
          {/* Previous Page Button */}
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            className="relative inline-flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            &larr; Prev
          </button>

          {/* Page numbers */}
          {pages.map((item, idx) => {
            if (item === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="relative inline-flex items-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 text-xs text-slate-400"
                >
                  ...
                </span>
              );
            }

            const pNum = item as number;
            const isActive = pNum === page;

            return (
              <button
                key={pNum}
                type="button"
                onClick={() => onPageChange(pNum)}
                className={`relative inline-flex items-center border px-3 py-1.5 text-xs font-bold transition-colors ${
                  isActive
                    ? "z-10 bg-[#0047FF] border-[#0047FF] text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                }`}
              >
                {pNum}
              </button>
            );
          })}

          {/* Next Page Button */}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            className="relative inline-flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            Next &rarr;
          </button>
        </nav>
      </div>
    </div>
  );
}
