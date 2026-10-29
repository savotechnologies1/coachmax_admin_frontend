import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useCategories } from "../../hooks/useCategories";
import { useTerms } from "../../hooks/useTerms";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import { findCurrentTerm } from "../../hooks/useCurrentTerm";
import Select from "../form/Select";

interface AcademyHeaderProps {
  programType?: string;
  selectedCategoryId?: string;
  selectedProgramId?: string;
  selectedYear?: string;
  selectedTermId?: string;
  onCategoryChange?: (categoryId: string, name?: string) => void;
  onProgramChange?: (programId: string, name?: string) => void;
  onYearChange?: (year: string) => void;
  onTermChange?: (termId: string) => void;
  onOpenCreateClass?: () => void;
  onOpenTermSettings?: () => void;
  showSidebar: boolean;
  onShowSidebarChange: (val: boolean) => void;
  showAllocated: boolean;
  onShowAllocatedChange: (val: boolean) => void;
  showUnallocated: boolean;
  onShowUnallocatedChange: (val: boolean) => void;
}

export default function AcademyHeader({
  programType = "Academy",
  selectedCategoryId,
  selectedProgramId,
  selectedYear: selectedYearProp,
  selectedTermId,
  onCategoryChange,
  onProgramChange,
  onYearChange,
  onTermChange,
  onOpenCreateClass,
  onOpenTermSettings,
  showSidebar,
  onShowSidebarChange,
  showAllocated,
  onShowAllocatedChange,
  showUnallocated,
  onShowUnallocatedChange,
}: AcademyHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  const [terms, setTerms] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryId || "");
  const [selectedProgram, setSelectedProgram] = useState<string>(selectedProgramId || "");
  const [selectedYear, setSelectedYear] = useState<string>(selectedYearProp || "");
  const [selectedTerm, setSelectedTerm] = useState<string>(selectedTermId || "");
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { categories } = useCategories({ isEvent: "all" });
  const { programs } = useProgramsByCategory(selectedCategory);
  const { terms: allTerms } = useTerms({ isEvent: "all" });
  const { terms: yearTerms } = useTerms({ year: selectedYear, isEvent: "all" }, { enabled: !!selectedYear });

  const getDropdownLabel = () => {
    if (showAllocated && showUnallocated) return "Show All Players";
    if (showAllocated) return "Allocated Players";
    if (showUnallocated) return "Unallocated Players";
    return "Show All Players";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync external controlled props
  useEffect(() => {
    if (selectedCategoryId && selectedCategoryId !== selectedCategory) {
      setSelectedCategory(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (selectedProgramId && selectedProgramId !== selectedProgram) {
      setSelectedProgram(selectedProgramId);
    }
  }, [selectedProgramId]);

  useEffect(() => {
    if (selectedTermId && selectedTermId !== selectedTerm) {
      setSelectedTerm(selectedTermId);
    }
  }, [selectedTermId]);

  useEffect(() => {
    if (selectedYearProp && selectedYearProp !== selectedYear) {
      setSelectedYear(selectedYearProp);
    }
  }, [selectedYearProp]);

  // 1. Sync category when categories load or programType changes
  useEffect(() => {
    if (categories && categories.length > 0) {
      let matched = selectedCategoryId ? categories.find((c: any) => c._id === selectedCategoryId) : null;
      if (!matched && state?.categoryId) {
        matched = categories.find((c: any) => c._id === state.categoryId);
      }
      if (!matched && !selectedCategoryId) {
        matched = categories.find((c: any) => c.name.toLowerCase() === programType.toLowerCase());
      }
      if (!matched && categories.length > 0 && !selectedCategoryId) {
        matched = categories[0];
      }
      if (matched && matched._id !== selectedCategory) {
        setSelectedCategory(matched._id);
        onCategoryChange?.(matched._id, matched.name);
      }
    }
  }, [categories, programType, selectedCategoryId]);

  // 2. Sync program when selectedCategory or programs list changes
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedProgram("");
      onProgramChange?.("", "");
      return;
    }
    if (programs && programs.length > 0) {
      let matchedProg = selectedProgramId ? programs.find((p: any) => p._id === selectedProgramId) : null;
      if (!matchedProg && state?.programId) {
        matchedProg = programs.find((p: any) => p._id === state.programId);
      }
      if (!matchedProg && programs.length > 0 && !selectedProgramId) {
        matchedProg = programs[0];
      }
      if (matchedProg) {
        setSelectedProgram(matchedProg._id);
        onProgramChange?.(matchedProg._id, matchedProg.name);
      } else if (!selectedProgramId) {
        setSelectedProgram("");
        onProgramChange?.("", "");
      }
    } else if (!selectedProgramId) {
      setSelectedProgram("");
      onProgramChange?.("", "");
    }
  }, [selectedCategory, programs, selectedProgramId]);

  // 3. Set available years and initial term from all terms
  useEffect(() => {
    if (allTerms && allTerms.length > 0) {
      const years = Array.from(new Set(allTerms.map((t: any) => t.year?.toString()).filter(Boolean))).sort() as string[];
      setAvailableYears(years);

      let currentTerm = selectedTermId ? allTerms.find((t: any) => t._id === selectedTermId) : null;
      if (!currentTerm && state?.termId) {
        currentTerm = allTerms.find((t: any) => t._id === state.termId);
      }
      if (!currentTerm && !selectedTermId) {
        currentTerm = findCurrentTerm(allTerms);
      }

      if (currentTerm && !selectedTerm) {
        setSelectedYear(currentTerm.year?.toString() || "");
        setSelectedTerm(currentTerm._id);
        onTermChange?.(currentTerm._id);
      }
    }
  }, [allTerms, selectedTermId]);

  // Sync terms for year
  useEffect(() => {
    if (yearTerms) {
      setTerms(yearTerms);
    }
  }, [yearTerms]);

  // 4. Update initial term selection when categories or terms are loaded
  useEffect(() => {
    if (categories.length === 0 || terms.length === 0 || !selectedCategory) return;

    const activeCat = categories.find((c: any) => c._id === selectedCategory);
    const activeIsEvent = activeCat ? !!activeCat.isEvent : false;

    // Check if current selection already satisfies the isEvent filter
    if (selectedTerm) {
      const match = terms.find((t: any) => t._id === selectedTerm);
      if (match && !!match.isEvent === activeIsEvent) {
        return;
      }
    }

    const matchedTerm = findCurrentTerm(terms, { isEvent: activeIsEvent });

    if (matchedTerm) {
      if (matchedTerm.year?.toString() !== selectedYear) {
        setSelectedYear(matchedTerm.year?.toString() || "");
      }
      setSelectedTerm(matchedTerm._id);
      onTermChange?.(matchedTerm._id);
    } else {
      setSelectedTerm("");
      onTermChange?.("");
    }
  }, [categories, terms, selectedCategory]);

  const uniqueYears = availableYears.length > 0
    ? availableYears
    : Array.from(new Set(terms.map((t) => t.year.toString())));

  // Filter terms by selectedCategory's isEvent flag (year filter is already handled by API)
  const filteredTerms = terms.filter(t => {
    const activeCat = categories.find((c: any) => c._id === selectedCategory);
    const activeIsEvent = activeCat ? !!activeCat.isEvent : false;
    return !!t.isEvent === activeIsEvent;
  });

  return (
    <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-center xl:justify-between">
      {/* Title & Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Programs (Static) */}
        <div className="flex items-center gap-1.5 cursor-pointer">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Programs</h1>
        </div>

        <span className="text-slate-300 dark:text-slate-700 text-lg">/</span>

        {/* Category (Academy/School/Holiday...) */}
        <div className="relative flex items-center bg-transparent program-toolbar-select">
          <Select
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val);
              const matched = categories.find((c: any) => c._id === val);
              onCategoryChange?.(val, matched?.name);
              setSelectedTerm("");
              onTermChange?.("");
              if (matched) {
                const newPath = `/program/${matched.name.toLowerCase().replace(/\s+/g, '-')}`;
                navigate(newPath);
              }
            }}
            options={
              categories.length === 0
                ? [{ label: programType, value: "" }]
                : categories.map(cat => ({
                  label: cat.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
                  value: cat._id
                }))
            }
            triggerClassName="h-11 min-h-11 appearance-none flex items-center gap-1 text-xl font-bold text-[#0047FF] bg-transparent outline-none cursor-pointer pr-2 hover:opacity-80"
          />
        </div>

        <span className="text-slate-300 dark:text-slate-700 text-lg">/</span>

        {/* Sub-category (Programs like Elite Performance) */}
        <div className="relative flex items-center bg-transparent program-toolbar-select">
          <Select
            value={selectedProgram}
            onChange={(val) => {
              setSelectedProgram(val);
              const matched = programs.find(p => p._id === val);
              onProgramChange?.(val, matched?.name);
            }}
            options={
              programs.length === 0
                ? [{ label: "Sub-category", value: "" }]
                : programs.map(prog => ({
                  label: prog.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
                  value: prog._id
                }))
            }
            triggerClassName="h-11 min-h-11 appearance-none flex items-center gap-1 text-lg font-semibold text-slate-700 dark:text-slate-300 bg-transparent outline-none cursor-pointer pr-2 hover:opacity-80"
          />
        </div>

        <span className="text-slate-300 dark:text-slate-700 text-lg">/</span>

        {/* Year Dropdown */}
        <div className="relative flex items-center min-w-[90px] program-toolbar-select">
          <Select
            value={selectedYear}
            onChange={(val) => {
              setSelectedYear(val);
              onYearChange?.(val);
              const termsForNewYear = terms.filter(t => t.year.toString() === val);
              if (termsForNewYear.length > 0) {
                setSelectedTerm(termsForNewYear[0]._id);
                onTermChange?.(termsForNewYear[0]._id);
              } else {
                setSelectedTerm("");
                onTermChange?.("");
              }
            }}
            options={uniqueYears.map(year => ({ label: year, value: year }))}
            triggerClassName="h-11 min-h-11 appearance-none flex items-center justify-between w-full text-sm font-semibold text-slate-600 dark:text-slate-400 bg-transparent outline-none cursor-pointer pr-1"
          />
        </div>

        {/* Term Dropdown */}
        <div className="relative flex items-center min-w-[100px] program-toolbar-select">
          <Select
            value={selectedTerm}
            onChange={(val) => {
              setSelectedTerm(val);
              onTermChange?.(val);
            }}
            options={
              filteredTerms.length === 0
                ? [{ label: "Select Term", value: "" }]
                : filteredTerms.map(term => ({ label: term.name, value: term._id }))
            }
            triggerClassName="h-11 min-h-11 appearance-none flex items-center justify-between w-full text-sm font-semibold text-slate-600 dark:text-slate-400 bg-transparent outline-none cursor-pointer pr-1"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {/* <button className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-none bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>New Trial</span>
        </button> */}

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative inline-flex h-11 min-h-11 items-center gap-1.5 border border-slate-200 rounded-none bg-white px-3 text-xs font-semibold text-slate-700 shadow-theme-xs hover:bg-slate-50 focus:outline-none cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
          >
            <span>{getDropdownLabel()}</span>
            <svg
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-[100] rounded-none flex flex-col text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer select-none text-xs font-medium">
                <input
                  type="checkbox"
                  checked={showSidebar}
                  onChange={(e) => onShowSidebarChange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-none border-slate-300 dark:border-slate-600 text-[#0047FF] focus:ring-[#0047FF] cursor-pointer"
                />
                <span>Show Sidebar</span>
              </label>

              <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

              <label className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer select-none text-xs font-medium">
                <input
                  type="checkbox"
                  checked={showAllocated}
                  onChange={(e) => onShowAllocatedChange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-none border-slate-300 dark:border-slate-600 text-[#0047FF] focus:ring-[#0047FF] cursor-pointer"
                />
                <span>Show Allocated Players</span>
              </label>

              <label className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer select-none text-xs font-medium">
                <input
                  type="checkbox"
                  checked={showUnallocated}
                  onChange={(e) => onShowUnallocatedChange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-none border-slate-300 dark:border-slate-600 text-[#0047FF] focus:ring-[#0047FF] cursor-pointer"
                />
                <span>Show Unallocated Players</span>
              </label>
            </div>
          )}
        </div>

        {(() => {
          const userStr = localStorage.getItem("user");
          let isCoach = false;
          if (userStr) {
            try {
              const parsed = JSON.parse(userStr);
              if (parsed?.role === "COACH") {
                isCoach = true;
              }
            } catch (e) {
              console.error(e);
            }
          }

          if (isCoach) return null;

          return (
            <>
              <button onClick={onOpenCreateClass} className="inline-flex h-11 min-h-11 items-center gap-1.5 px-4 rounded-none bg-[#0047FF] hover:bg-[#003cc2] text-white shadow-theme-xs transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Create Class</span>
              </button>

              <button onClick={onOpenTermSettings} className="inline-flex h-11 min-h-11 items-center gap-1.5 px-3.5 border border-slate-200 rounded-none bg-white hover:bg-slate-50 text-slate-700 shadow-theme-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <span>Term Settings</span>
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
}
