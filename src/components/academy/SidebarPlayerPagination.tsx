interface SidebarPlayerPaginationProps {
  label: string;
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const PAGE_SIZE = 5;

export default function SidebarPlayerPagination({
  label,
  page,
  totalItems,
  onPageChange,
  isLoading = false,
}: SidebarPlayerPaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstItem = (currentPage - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PAGE_SIZE, totalItems);

  return (
    <nav aria-label={`${label} pagination`} className="mb-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="mb-2 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
        Showing {firstItem}–{lastItem} of {totalItems}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          disabled={isLoading || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-[#0047FF] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          ← Previous
        </button>
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300" aria-live="polite">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={isLoading || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-[#0047FF] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Next →
        </button>
      </div>
    </nav>
  );
}
