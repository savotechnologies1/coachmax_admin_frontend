import { ageGroupForYear } from "../../utils/dateTime";
import { useExportUsersCSV } from "../../hooks/usePlayers";
import { useTerms } from "../../hooks/useTerms";
import { useCategories } from "../../hooks/useCategories";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import { findCurrentTerm, getCurrentYearString } from "../../hooks/useCurrentTerm";
import Select from "../form/Select";
import PlayerExportMenu from "./PlayerExportMenu";
import type { PlayerExportColumn } from "./playerExport";

interface PlayerFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  yearFilter?: string;
  setYearFilter?: (year: string) => void;
  termFilter?: string;
  setTermFilter?: (term: string) => void;
  programFilter: string;
  setProgramFilter: (program: string) => void;
  subProgramFilter?: string;
  setSubProgramFilter?: (program: string) => void;
  filterPlayers?: any[];
  ageFilter: string;
  setAgeFilter: (age: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  medicalFilter?: string;
  setMedicalFilter?: (val: string) => void;
  isExporting?: boolean;
  onExport?: (columns: PlayerExportColumn[]) => Promise<boolean>;
  hideExport?: boolean;
}

export default function PlayerFilters({
  searchQuery,
  setSearchQuery,
  yearFilter = "All",
  setYearFilter,
  termFilter = "All",
  setTermFilter = () => { },
  programFilter,
  setProgramFilter,
  subProgramFilter = "All",
  setSubProgramFilter = () => { },
  filterPlayers: filterPlayersProp,
  ageFilter,
  setAgeFilter,
  statusFilter,
  setStatusFilter,
  medicalFilter = "All",
  setMedicalFilter = () => { },
  isExporting = false,
  onExport,
  hideExport = false,
}: PlayerFiltersProps) {
  const legacyExport = useExportUsersCSV();
  const { terms = [] } = useTerms({ isEvent: "all" });
  const { categories = [] } = useCategories({ isEvent: "all" });
  const filterPlayers = filterPlayersProp || [];

  const selectedCategory = categories.find(
    (category) => category.name?.toLowerCase() === programFilter.toLowerCase()
  );
  const { programs: categoryPrograms = [] } = useProgramsByCategory(selectedCategory?._id);

  const subProgramOptions = Array.from(
    new Map(categoryPrograms.map((program) => [program._id, program.name])).entries()
  ).sort(([, first], [, second]) => String(first).localeCompare(String(second)));

  const programTypeOptions = [
    { label: "Program Type: All", value: "All" },
    ...categories
      .filter((category) => category.name)
      .map((category) => ({ label: category.name, value: category.name })),
  ];

  const ageOptions = Array.from(
    new Set(
      filterPlayers
        .map((player) => {
          return ageGroupForYear(player.dob, yearFilter === "All" ? undefined : yearFilter);
        })
        .filter((age): age is number => age !== null)
    )
  ).sort((first, second) => first - second);

  const ageSelectOptions = filterPlayersProp
    ? ageOptions.map((age) => ({ label: `U${age}`, value: `U${age}` }))
    : [
      { label: "U6 - U8", value: "U6-U8" },
      { label: "U9 - U10", value: "U9-U10" },
      { label: "U11 - U12", value: "U11-U12" },
      { label: "U13 - U14", value: "U13-U14" },
      { label: "U15+", value: "U15+" },
    ];

  const yearOptions = Array.from(new Set([yearFilter, ...terms.map((term) => String(term.year || ""))].filter(Boolean)))
    .sort((first, second) => Number(second) - Number(first));
  const termsInYear = yearFilter === "All" ? terms : terms.filter((term) => String(term.year) === yearFilter);
  const termOptions = [
    { label: "Term: All terms", value: "All" },
    ...termsInYear.map((t) => ({
      label: t.name || "Unnamed Term",
      value: t._id,
    })),
  ];
  const selectedTermName = terms.find((term) => term._id === termFilter)?.name;
  const scopeLabel = `${yearFilter === "All" ? "All years" : yearFilter} / ${selectedTermName || "All terms"}`;

  return (
    <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 rounded-none shadow-theme-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between mb-4">
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search player by name, contact, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 min-h-11 w-full border border-slate-200 rounded-none bg-white pl-9 pr-4 py-0 text-xs outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
          {hideExport ? null : onExport ? <PlayerExportMenu scopeLabel={scopeLabel} isExporting={isExporting} onExport={onExport} /> : (
            <button type="button" disabled={legacyExport.isPending} onClick={() => legacyExport.mutate(statusFilter === "All" ? "APPROVED" : statusFilter)} className="inline-flex h-11 min-h-11 min-w-[108px] items-center justify-center border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white">Export</button>
          )}
          {setYearFilter && <div className="w-full sm:w-32 flex-1 sm:flex-initial min-w-[100px]">
            <Select
              value={yearFilter}
              onChange={(val) => {
                setYearFilter(val);
                const currentYearTerms = terms.filter((term) => String(term.year) === val && !term.isEvent);
                setTermFilter(val === getCurrentYearString() ? findCurrentTerm(currentYearTerms)?._id || "All" : "All");
              }}
              options={[{ label: "Year: All", value: "All" }, ...yearOptions.map((year) => ({ label: `Year: ${year}`, value: year }))]}
              className="w-full player-filter-select"
            />
          </div>}
          <div className="w-full sm:w-44 flex-1 sm:flex-initial min-w-[140px]">
            <Select
              value={termFilter}
              onChange={(val) => setTermFilter(val)}
              options={termOptions}
              className="w-full player-filter-select"
            />
          </div>
          <div className="w-full sm:w-40 flex-1 sm:flex-initial min-w-[130px]">
            <Select
              value={programFilter}
              onChange={(val) => {
                setProgramFilter(val);
                setSubProgramFilter("All");
              }}
              options={programTypeOptions}
              className="w-full player-filter-select"
            />
          </div>
          {filterPlayersProp && programFilter !== "All" && (
            <div className="w-full sm:w-40 flex-1 sm:flex-initial min-w-[130px]">
              <Select
                value={subProgramFilter}
                onChange={(val) => setSubProgramFilter(val)}
                options={[
                  { label: "Sub Program: All", value: "All" },
                  ...subProgramOptions.map(([value, label]) => ({ label: String(label), value: String(value) })),
                ]}
                className="w-full player-filter-select"
              />
            </div>
          )}
          <div className="w-full sm:w-36 flex-1 sm:flex-initial min-w-[120px]">
            <Select
              value={ageFilter}
              onChange={(val) => setAgeFilter(val)}
              options={[
                { label: "Age Group: All", value: "All" },
                ...ageSelectOptions,
              ]}
              className="w-full player-filter-select"
            />
          </div>
          <div className="w-full sm:w-36 flex-1 sm:flex-initial min-w-[120px]">
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: "Payment: All", value: "All" },
                { label: "PAID", value: "PAID" },
                { label: "HANDSHAKE", value: "HANDSHAKE" },
                { label: "APPROVED (UNPAID)", value: "UNPAID" },
                { label: "TRIAL", value: "TRIAL" },
                { label: "TBC", value: "TBC" },
                { label: "EXTRA", value: "EXTRA" },
              ]}
              className="w-full player-filter-select"
            />
          </div>
          <div className="w-full sm:w-36 flex-1 sm:flex-initial min-w-[120px]">
            <Select
              value={medicalFilter}
              onChange={(val) => setMedicalFilter && setMedicalFilter(val)}
              options={[
                { label: "Medical: All", value: "All" },
                { label: "Yes", value: "true" },
                { label: "No", value: "false" }
              ]}
              className="w-full player-filter-select"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
