import { useCategories } from "../../hooks/useCategories";
import { useProgramsByCategory } from "../../hooks/usePrograms";

interface SidebarPlayersFilterProps {
  category: string;
  program: string;
  search: string;
  onCategoryChange: (val: string) => void;
  onProgramChange: (val: string) => void;
  onSearchChange: (val: string) => void;
}

export default function SidebarPlayersFilter({
  category,
  program,
  search,
  onCategoryChange,
  onProgramChange,
  onSearchChange,
}: SidebarPlayersFilterProps) {
  const { categories } = useCategories({ isEvent: "all" });
  const { programs } = useProgramsByCategory(category);

  return (
    <div className="bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-900 p-4 rounded-none shadow-sm mb-5 flex flex-col gap-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
        Filter Players
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={(e) => {
            onCategoryChange(e.target.value);
            onProgramChange("");
          }}
          className="h-11 min-h-11 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none px-2 py-0 text-xs focus:outline-none focus:border-brand-500 dark:text-white"
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <select
          value={program}
          onChange={(e) => onProgramChange(e.target.value)}
          disabled={!category}
          className="h-11 min-h-11 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none px-2 py-0 text-xs focus:outline-none focus:border-brand-500 dark:text-white"
        >
          <option value="">Select Program</option>
          {programs.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>



      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 min-h-11 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none pl-8 pr-3 py-0 text-xs focus:outline-none focus:border-brand-500 dark:text-white"
        />
      </div>
    </div>
  );
}
