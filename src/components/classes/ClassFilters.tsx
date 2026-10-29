interface ClassFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export default function ClassFilters({
  searchQuery,
  setSearchQuery,
}: ClassFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-center flex-1 w-full">
        {/* Search Input */}
        <div className="relative w-full md:w-auto">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-[240px] rounded-none border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-theme-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
