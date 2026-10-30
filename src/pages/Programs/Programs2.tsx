import DayTabs from "../../components/academy/DayTabs";
import { occurrenceKey, dayLabel, scheduleDayQuery, distinctClassSlots, currentScheduleDay, currentScheduleMinutes } from "../../utils/classSchedule";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Settings, ChevronDown, Check } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import Select from "../../components/form/Select";
import ClassFullTable from "../../components/academy/ClassFullTable";
import UnallocatedPlayersCard from "../../components/academy/UnallocatedPlayersCard";
import AllocatedPlayersCard from "../../components/academy/AllocatedPlayersCard";
import SidebarPlayersFilter from "../../components/academy/SidebarPlayersFilter";
import AddClassModal from "../../components/classes/AddClassModal";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import PlayersListModal from "../../components/academy/PlayersListModal";
import TermManagement from "../../components/management/TermManagement";
import { Modal } from "../../components/ui/modal";
import { useClassFiltersWithTimeSlots, useAssignClassesToPlayer } from "../../hooks/usePlayers";
import { useUnallocatedPlayers } from "../../hooks/useUnallocatedPlayers";
import { useAllocatedPlayers } from "../../hooks/useAllocatedPlayers";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { useCategories } from "../../hooks/useCategories";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import { useTerms } from "../../hooks/useTerms";
import { findCurrentTerm } from "../../hooks/useCurrentTerm";
import apiClient from "../../api/apiClient";
import { useCoachAccess } from "../../hooks/useCoachAccess";

const EMPTY_TIME_SLOTS: never[] = [];

export default function Programs2() {
  const access = useCoachAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const { markItemAsRead } = useSidebarBadges();

  // Active day selection
  const [activeDay, setActiveDay] = useState<string>(() => {
    if (state?.viewAll) return "View All";
    if (state?.day) return state.day.charAt(0).toUpperCase() + state.day.slice(1).toLowerCase();
    if (state?.classId) return "View All";
    return currentScheduleDay();
  });

  // Category and sub-program tabs
  const [selectedCategory, setSelectedCategory] = useState<string>(state?.categoryId || "");
  const [selectedProgram, setSelectedProgram] = useState<string>(state?.programId || "");

  // Year & Term selectors
  const [selectedYear, setSelectedYear] = useState<string>(state?.year ? String(state.year) : "");
  const [selectedTerm, setSelectedTerm] = useState<string>(state?.termId || "");
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Accordion and highlighting
  const [expandedClassIds, setExpandedClassIds] = useState<Record<string, boolean>>({});
  const [targetHighlightClassId, setTargetHighlightClassId] = useState<string | null>(null);
  const assignClassesMutation = useAssignClassesToPlayer();
  const queryClient = useQueryClient();

  // Modals
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<any | null>(null);
  const [classToDuplicate, setClassToDuplicate] = useState<any | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const playerDropdownRef = useRef<HTMLDivElement>(null);

  // Queries for categories, programs, terms
  const { categories = [] } = useCategories({ isEvent: "all" });
  const { programs = [] } = useProgramsByCategory(selectedCategory);
  const { terms: allTerms = [] } = useTerms({ isEvent: "all" });
  const { terms: yearTerms = [] } = useTerms(
    { year: selectedYear, isEvent: "all" },
    { enabled: !!selectedYear }
  );

  const terms = selectedYear ? yearTerms : allTerms;

  // Sync available years
  useEffect(() => {
    if (allTerms && allTerms.length > 0) {
      const years = Array.from(new Set(allTerms.map((t: any) => t.year?.toString()).filter(Boolean))).sort(
        (a: any, b: any) => Number(b) - Number(a)
      );
      setAvailableYears(years as string[]);
    }
  }, [allTerms]);

  // Auto-select current term if not selected
  useEffect(() => {
    if (terms && terms.length > 0 && !selectedTerm) {
      const matchedTerm = findCurrentTerm(terms);
      if (matchedTerm) {
        if (matchedTerm.year?.toString() && !selectedYear) {
          setSelectedYear(matchedTerm.year.toString());
        }
        setSelectedTerm(matchedTerm._id);
      } else if (terms[0]?._id) {
        setSelectedTerm(terms[0]._id);
        if (terms[0].year && !selectedYear) {
          setSelectedYear(terms[0].year.toString());
        }
      }
    }
  }, [terms, selectedTerm, selectedYear]);

  // Click outside player dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (playerDropdownRef.current && !playerDropdownRef.current.contains(e.target as Node)) {
        setIsPlayerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered terms by year
  const filteredTerms = terms.filter((t: any) => {
    if (!selectedYear) return true;
    return t.year?.toString() === selectedYear;
  });

  // Time slots for schedule
  const { data: filtersData, isLoading: scheduleLoading, isError: scheduleError, refetch: refetchSchedule } = useClassFiltersWithTimeSlots(
    selectedCategory,
    selectedProgram,
    scheduleDayQuery(activeDay),
    selectedTerm,
    { allowUnfiltered: true, enabled: !!selectedTerm }
  );
  const timeSlots = filtersData?.timeSlots || EMPTY_TIME_SLOTS;
  const assignmentSlots = distinctClassSlots<any>(timeSlots);

  useEffect(() => {
    if (!targetHighlightClassId) return;
    const target = timeSlots.find((slot: any) => String(slot.classId) === String(targetHighlightClassId));
    if (target) setExpandedClassIds((prev) => ({ ...prev, [occurrenceKey(target)]: true }));
  }, [targetHighlightClassId, timeSlots]);

  // Category, program, and term are selected asynchronously after a fresh load.
  // Refetch the active day once they are ready so classes appear immediately.
  useEffect(() => {
    if (!selectedTerm) return;
    void queryClient.refetchQueries({
      queryKey: ["classFiltersWithTimeSlots", selectedCategory, selectedProgram, scheduleDayQuery(activeDay), selectedTerm],
      type: "active",
    });
  }, [selectedCategory, selectedProgram, selectedTerm, activeDay, queryClient]);

  const handleEditClass = async (classId: string) => {
    try {
      const response = await apiClient.get(`/api/admin/getClassById/${classId}`);
      const classData = response.data?.data;
      if (!classData) throw new Error("Class not found");
      setClassToEdit(classData);
      setIsClassModalOpen(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load class details");
    }
  };

  const handleDuplicateClass = async (classId: string) => {
    try {
      const response = await apiClient.get(`/api/admin/getClassById/${classId}`);
      const classData = response.data?.data;
      if (!classData) throw new Error("Class not found");
      setClassToDuplicate(classData);
      setIsClassModalOpen(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load class for duplication");
    }
  };

  const confirmDeleteClass = async () => {
    if (!deleteClassId) return;
    try {
      setIsDeletingClass(true);
      await apiClient.delete(`/api/admin/deleteClass/${deleteClassId}`);
      toast.success("Class deleted successfully");
      setDeleteClassId(null);
      setExpandedClassIds((current) => {
        const next = { ...current };
        delete next[deleteClassId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["classFiltersWithTimeSlots"] });
      await queryClient.invalidateQueries({ queryKey: ["classFullTable", deleteClassId] });
      await queryClient.invalidateQueries({ queryKey: ["classesForAssign"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete class");
    } finally {
      setIsDeletingClass(false);
    }
  };

  // Default expand closest or first slot
  const hasInitializedFromState = useRef(false);
  // Global search can select another class while this screen is already open.
  useEffect(() => {
    if (!state?.classId) return;
    setActiveDay("View All");
    if (state.categoryId) setSelectedCategory(String(state.categoryId));
    if (state.programId) setSelectedProgram(String(state.programId));
    if (state.year) setSelectedYear(String(state.year));
    if (state.termId) setSelectedTerm(String(state.termId));
    hasInitializedFromState.current = false;
  }, [state?.classId, location.key]);
  useEffect(() => {
    if (timeSlots && timeSlots.length > 0) {
      if (state?.classId && !hasInitializedFromState.current) {
        const target = timeSlots.find((slot: any) => String(slot.classId) === String(state.classId));
        if (!target) return;
        setExpandedClassIds({ [occurrenceKey(target)]: true });
        hasInitializedFromState.current = true;
        return;
      }

      if (activeDay === "View All") return;
      const currentMinutes = currentScheduleMinutes();
      let closestSlot = timeSlots[0];
      let minDiff = Infinity;

      for (const slot of timeSlots) {
        if (!slot.startTime) continue;
        const [time, modifier] = slot.startTime.split(" ");
        const [rawHours, minutes] = time.split(":").map(Number);
        let hours = rawHours;
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;

        const slotMinutes = hours * 60 + (minutes || 0);
        const diff = slotMinutes - currentMinutes;

        if (diff >= -90 && diff < minDiff) {
          minDiff = diff;
          closestSlot = slot;
        }
      }

      setExpandedClassIds((prev) => {
        const hasAnyExpandedThisDay = timeSlots.some((slot: any) => prev[occurrenceKey(slot)]);
        if (hasAnyExpandedThisDay) return prev;
        return { ...prev, [occurrenceKey(closestSlot)]: true };
      });
    }
  }, [timeSlots, activeDay, state?.classId]);

  // Smart 3-tier redirection handler when admin clicks "Go to Request"
  const handleNavigateToRequestedTarget = (player: any) => {
    if (!player) return;
    if (player._id || player.id) {
      markItemAsRead("unallocatedPlayers", String(player._id || player.id));
    }

    const isCamp =
      player.isEvent ||
      player.categoryName?.toLowerCase().includes("camp") ||
      player.categoryName?.toLowerCase().includes("holiday");

    if (isCamp) {
      navigate("/events/camp", { state: { playerId: player.id } });
      toast.success(`Redirected to Holiday Camp for ${player.name}`);
      return;
    }

    if (player.categoryId && player.categoryId !== selectedCategory) {
      setSelectedCategory(player.categoryId);
    }
    if (player.programId && player.programId !== selectedProgram) {
      setSelectedProgram(player.programId);
    }
    if (player.termId && player.termId !== selectedTerm) {
      setSelectedTerm(player.termId);
    }

    const primaryClass =
      player.primaryClass ||
      (player.preferredClasses && player.preferredClasses.length > 0
        ? player.preferredClasses[0]
        : null);

    if (primaryClass) {
      if (primaryClass.dayOfWeek) {
        const targetDay =
          primaryClass.dayOfWeek.charAt(0).toUpperCase() +
          primaryClass.dayOfWeek.slice(1).toLowerCase();
        setActiveDay(targetDay);
      }

      if (primaryClass.id) {
        setExpandedClassIds((prev) => ({
          ...prev,
          [primaryClass.id]: true,
        }));
        setTargetHighlightClassId(primaryClass.id);

        setTimeout(() => {
          const target = timeSlots.find((slot: any) => String(slot.classId) === String(primaryClass.id));
          const el = target ? document.getElementById(`class-card-${occurrenceKey(target)}`) : null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 350);

        setTimeout(() => {
          setTargetHighlightClassId(null);
        }, 3500);
      }

      toast.success(
        `Navigated to: ${primaryClass.dayOfWeek} ${primaryClass.startTime || ""} (${player.name})`
      );
    }
  };

  // Sidebar filters and player controls
  const [sidebarCategory, setSidebarCategory] = useState("");
  const [sidebarProgram, setSidebarProgram] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");

  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    const stored = localStorage.getItem("show_players_sidebar");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showAllocated, setShowAllocated] = useState<boolean>(() => {
    const stored = localStorage.getItem("show_allocated_players");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showUnallocated, setShowUnallocated] = useState<boolean>(() => {
    const stored = localStorage.getItem("show_unallocated_players");
    return stored !== null ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    localStorage.setItem("show_players_sidebar", JSON.stringify(showSidebar));
  }, [showSidebar]);
  useEffect(() => {
    localStorage.setItem("show_allocated_players", JSON.stringify(showAllocated));
  }, [showAllocated]);
  useEffect(() => {
    localStorage.setItem("show_unallocated_players", JSON.stringify(showUnallocated));
  }, [showUnallocated]);

  const effectivePlayerType = (() => {
    if (showAllocated && showUnallocated) return "BOTH";
    if (showAllocated) return "ALLOCATED";
    if (showUnallocated) return "UNALLOCATED";
    return "BOTH";
  })();

  const [unallocatedPage, setUnallocatedPage] = useState(1);
  const [allocatedPage, setAllocatedPage] = useState(1);

  const [isUnallocatedModalOpen, setIsUnallocatedModalOpen] = useState(false);
  const [isAllocatedModalOpen, setIsAllocatedModalOpen] = useState(false);

  useEffect(() => {
    setUnallocatedPage(1);
    setAllocatedPage(1);
  }, [sidebarCategory, sidebarProgram, sidebarSearch, effectivePlayerType]);

  const { data: unallocatedData, isFetching: isUnallocatedFetching } = useUnallocatedPlayers(
    sidebarCategory,
    sidebarProgram,
    sidebarSearch,
    unallocatedPage,
    5,
    effectivePlayerType === "BOTH" || effectivePlayerType === "UNALLOCATED"
  );

  const { data: allocatedData, isFetching: isAllocatedFetching } = useAllocatedPlayers(
    sidebarCategory,
    sidebarProgram,
    sidebarSearch,
    allocatedPage,
    5,
    effectivePlayerType === "BOTH" || effectivePlayerType === "ALLOCATED"
  );

  const { data: allUnallocatedData } = useUnallocatedPlayers(
    sidebarCategory,
    sidebarProgram,
    sidebarSearch,
    1,
    1000,
    isUnallocatedModalOpen
  );

  const { data: allAllocatedData } = useAllocatedPlayers(
    sidebarCategory,
    sidebarProgram,
    sidebarSearch,
    1,
    1000,
    isAllocatedModalOpen
  );

  useEffect(() => {
    if (!isUnallocatedFetching && unallocatedPage > Math.max(1, unallocatedData?.pagination?.totalPages ?? 1)) {
      setUnallocatedPage(Math.max(1, unallocatedData?.pagination?.totalPages ?? 1));
    }
  }, [isUnallocatedFetching, unallocatedData?.pagination?.totalPages, unallocatedPage]);

  useEffect(() => {
    if (!isAllocatedFetching && allocatedPage > Math.max(1, allocatedData?.pagination?.totalPages ?? 1)) {
      setAllocatedPage(Math.max(1, allocatedData?.pagination?.totalPages ?? 1));
    }
  }, [isAllocatedFetching, allocatedData?.pagination?.totalPages, allocatedPage]);

  // Assign player modal state
  const [pendingAssignPlayer, setPendingAssignPlayer] = useState<any | null>(null);
  const [selectedAssignClassId, setSelectedAssignClassId] = useState<string>("");
  const [selectedAssignStatus, setSelectedAssignStatus] = useState<string>("TRIAL");

  useEffect(() => {
    if (pendingAssignPlayer) {
      const expandedSlot = timeSlots.find((slot: any) => expandedClassIds[occurrenceKey(slot)]);
      if (expandedSlot) {
        setSelectedAssignClassId(expandedSlot.classId);
      } else if (timeSlots.length > 0) {
        setSelectedAssignClassId(timeSlots[0].classId);
      } else {
        setSelectedAssignClassId("");
      }
      setSelectedAssignStatus(pendingAssignPlayer.paymentStatus || "TRIAL");
    }
  }, [pendingAssignPlayer, timeSlots, expandedClassIds]);

  const currentCategoryName =
    categories.find((c: any) => c._id === selectedCategory)?.name || "";
  const currentProgramName =
    programs.find((p: any) => p._id === selectedProgram)?.name || "";

  const getDropdownLabel = () => {
    if (showAllocated && showUnallocated) return "Show All Players";
    if (showAllocated) return "Allocated Players";
    if (showUnallocated) return "Unallocated Players";
    return "Show All Players";
  };

  return (
    <>
      <PageMeta
        title="Programs | CoachMax"
        description="Manage programs and attendance schedule"
      />

      {/* Header with Classes Management styling */}
      <PageBreadcrumb
        pageTitle="Programs"
        items={[{ name: "Operations", path: "/classes" }]}
      >
        {/* Year Selector */}
        <div className="w-full sm:w-36 flex-1 sm:flex-initial min-w-[130px]">
          <Select
            value={selectedYear}
            onChange={(val) => {
              setSelectedYear(val);
              const termsForNewYear = allTerms.filter(
                (t: any) => t.year?.toString() === val
              );
              if (termsForNewYear.length > 0) {
                setSelectedTerm(termsForNewYear[0]._id);
              } else {
                setSelectedTerm("");
              }
            }}
            options={[
              { label: "All Years", value: "" },
              ...availableYears.map((y) => ({ label: y, value: y })),
            ]}
            placeholder="All Years"
            className="w-full select-none"
            triggerClassName="h-[42px] w-full flex items-center justify-between appearance-none rounded-none border px-4 py-2 text-xs font-bold shadow-theme-xs outline-hidden bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-800 dark:text-white transition-all cursor-pointer group"
          />
        </div>

        {/* Term Selector */}
        <div className="w-full sm:w-48 flex-1 sm:flex-initial min-w-[150px]">
          <Select
            value={selectedTerm}
            onChange={(val) => setSelectedTerm(val)}
            options={[
              { label: "Select Term", value: "" },
              ...filteredTerms.map((t: any) => ({
                label: `${t.name}${t.year ? ` (${t.year})` : ""}`,
                value: t._id,
              })),
            ]}
            placeholder="Select Term"
            className="w-full select-none"
            triggerClassName="h-[42px] w-full flex items-center justify-between appearance-none rounded-none border px-4 py-2 text-xs font-bold shadow-theme-xs outline-hidden bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-800 dark:text-white transition-all cursor-pointer group"
          />
        </div>

        {/* Show Players dropdown */}
        <div className="relative" ref={playerDropdownRef}>
          <button
            type="button"
            onClick={() => setIsPlayerDropdownOpen(!isPlayerDropdownOpen)}
            className="inline-flex items-center justify-between gap-1.5 h-[42px] px-3.5 border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-theme-xs cursor-pointer transition-colors"
          >
            <span>{getDropdownLabel()}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {isPlayerDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1">
              <button
                type="button"
                onClick={() => {
                  setShowAllocated(true);
                  setShowUnallocated(true);
                  setIsPlayerDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Show All Players</span>
                {showAllocated && showUnallocated && (
                  <Check size={14} className="text-[#0047FF]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllocated(true);
                  setShowUnallocated(false);
                  setIsPlayerDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Allocated Players</span>
                {showAllocated && !showUnallocated && (
                  <Check size={14} className="text-[#0047FF]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllocated(false);
                  setShowUnallocated(true);
                  setIsPlayerDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Unallocated Players</span>
                {!showAllocated && showUnallocated && (
                  <Check size={14} className="text-[#0047FF]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Add Class Button */}
        {access.can("classes", "create") && <button
          onClick={() => setIsClassModalOpen(true)}
          className="inline-flex items-center justify-center gap-1 rounded-none bg-[#0047FF] px-5 py-2.5 h-[42px] text-center text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700 transition-colors shadow-theme-xs w-full sm:w-auto shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Class</span>
        </button>}

        {/* Term Settings Button */}
        {(access.can("terms", "create") || access.can("terms", "edit") || access.can("terms", "delete")) && <button
          onClick={() => setIsTermModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-4 py-2.5 h-[42px] text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-theme-xs w-full sm:w-auto shrink-0 cursor-pointer"
        >
          <Settings size={14} className="text-slate-500" />
          <span>Term Settings</span>
        </button>}
      </PageBreadcrumb>

      {/* Category Tabs (Classes Management underline style) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto custom-scrollbar gap-2">
        <button
          onClick={() => {
            setSelectedCategory("");
            setSelectedProgram("");
          }}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] shrink-0 cursor-pointer ${
            selectedCategory === ""
              ? "border-[#0047FF] text-[#0047FF]"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          All Programs
        </button>
        {categories.map((c: any) => (
          <button
            key={c._id}
            onClick={() => {
              setSelectedCategory(c._id);
              setSelectedProgram("");
            }}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] shrink-0 cursor-pointer ${
              selectedCategory === c._id
                ? "border-[#0047FF] text-[#0047FF]"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Program (Sub-category) Tabs */}
      {selectedCategory && programs.length > 0 && (
        <div className="flex border-b border-slate-100 dark:border-slate-800/60 mb-6 overflow-x-auto custom-scrollbar gap-2 -mt-4 bg-slate-50/50 dark:bg-slate-900/10 px-2 py-0.5">
          <button
            onClick={() => setSelectedProgram("")}
            className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 cursor-pointer ${
              selectedProgram === ""
                ? "border-[#0047FF] text-[#0047FF]"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            All Sub-programs
          </button>
          {programs.map((p: any) => (
            <button
              key={p._id}
              onClick={() => setSelectedProgram(p._id)}
              className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 cursor-pointer ${
                selectedProgram === p._id
                  ? "border-[#0047FF] text-[#0047FF]"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <DayTabs activeDay={activeDay} onChangeDay={setActiveDay} />

      {/* Content Area */}
      <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
        {/* Left Side: Attendance Tables */}
        <div className="flex-1 w-full min-w-0">
          {scheduleError ? (
            <div role="alert" className="p-6 text-sm text-red-600">Classes could not be loaded. <button type="button" className="underline" onClick={() => void refetchSchedule()}>Retry</button></div>
          ) : scheduleLoading ? <div role="status" className="p-6 text-sm text-slate-500">Loading classes…</div> : timeSlots.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 md:p-6 shadow-sm flex flex-col gap-3">
              {timeSlots.map((slot: any, idx: number) => {
                const isExpanded = !!expandedClassIds[occurrenceKey(slot)];
                const startsDay = activeDay === "View All" && (idx === 0 || timeSlots[idx - 1].dayOfWeek !== slot.dayOfWeek);
                return (
                  <div key={occurrenceKey(slot)} id={`class-card-${occurrenceKey(slot)}`}>
                  {startsDay && <h3 className="mb-3 mt-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{dayLabel(slot.dayOfWeek)}</h3>}
                  <ClassFullTable
                    classSummary={slot}
                    occurrenceDay={slot.dayOfWeek}
                    instanceId={`class-table-${occurrenceKey(slot)}`}
                    classId={slot.classId}
                    index={idx + 1}
                    categoryId={slot.category?._id || selectedCategory}
                    categoryName={slot.category?.name || currentCategoryName}
                    programId={slot.program?._id || selectedProgram}
                    programName={slot.program?.name || currentProgramName}
                    timeSlotStr={`${slot.startTime} - ${slot.endTime}`}
                    isExpanded={isExpanded}
                    isHighlighted={targetHighlightClassId === slot.classId}
                    onToggle={() =>
                      setExpandedClassIds((prev) => ({
                        ...prev,
                        [occurrenceKey(slot)]: !prev[occurrenceKey(slot)],
                      }))
                    }
                    onEditClass={access.can("classes", "edit") ? handleEditClass : undefined}
                    onDuplicateClass={access.can("classes", "create") ? handleDuplicateClass : undefined}
                    onDeleteClass={access.can("classes", "delete") ? (classId) => setDeleteClassId(classId) : undefined}
                  />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
              {activeDay === "View All" ? "No classes scheduled for the selected term and filters." : "No classes scheduled for this day."}
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Cards Panel */}
        {(() => {
          if (!showSidebar || (!access.can("players", "read") && !access.can("requests", "read"))) return null;
          const showFilter = (showAllocated && access.can("players", "read")) || (showUnallocated && access.can("requests", "read"));
          if (!showFilter) return null;

          return (
            <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto custom-scrollbar pr-1">
              <SidebarPlayersFilter
                category={sidebarCategory}
                program={sidebarProgram}
                search={sidebarSearch}
                onCategoryChange={setSidebarCategory}
                onProgramChange={setSidebarProgram}
                onSearchChange={setSidebarSearch}
              />

              {showUnallocated && access.can("requests", "read") && (
                <UnallocatedPlayersCard
                  players={unallocatedData?.players || []}
                  totalCount={unallocatedData?.pagination?.total || 0}
                  page={unallocatedPage}
                  onPageChange={setUnallocatedPage}
                  isLoading={isUnallocatedFetching}
                  onAssignPlayer={access.can("requests", "assign") && access.can("players", "assign") ? (player) => setPendingAssignPlayer(player) : undefined}
                  onNavigateToTarget={handleNavigateToRequestedTarget}
                  onViewAll={() => setIsUnallocatedModalOpen(true)}
                />
              )}

              {showAllocated && access.can("players", "read") && (
                <AllocatedPlayersCard
                  players={allocatedData?.players || []}
                  totalCount={allocatedData?.pagination?.total || 0}
                  page={allocatedPage}
                  onPageChange={setAllocatedPage}
                  isLoading={isAllocatedFetching}
                  onAssignPlayer={access.can("players", "assign") ? (player) => setPendingAssignPlayer(player) : undefined}
                  onViewAll={() => setIsAllocatedModalOpen(true)}
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      <AddClassModal
        isOpen={isClassModalOpen}
        classToEdit={classToEdit}
        duplicateFromClass={classToDuplicate}
        onClose={() => {
          setIsClassModalOpen(false);
          setClassToEdit(null);
          setClassToDuplicate(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["classFiltersWithTimeSlots"] });
          queryClient.invalidateQueries({ queryKey: ["classesForAssign"] });
        }}
        prefilledCategoryId={selectedCategory}
        prefilledProgramId={selectedProgram}
        prefilledDayOfWeek={activeDay === "View All" ? undefined : scheduleDayQuery(activeDay)}
        prefilledTermId={selectedTerm}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteClassId}
        onClose={() => setDeleteClassId(null)}
        onConfirm={confirmDeleteClass}
        loading={isDeletingClass}
        title="Delete Class"
        message="Are you sure you want to delete this class? All attendance and class chat data will be removed."
      />

      <Modal
        isOpen={isTermModalOpen}
        onClose={() => setIsTermModalOpen(false)}
        className="max-w-5xl mx-auto"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-none shadow-sm">
          <TermManagement />
        </div>
      </Modal>

      <PlayersListModal
        isOpen={isUnallocatedModalOpen}
        onClose={() => setIsUnallocatedModalOpen(false)}
        title="Unallocated Players"
        players={allUnallocatedData?.players || []}
        onAssignPlayer={access.can("requests", "assign") && access.can("players", "assign") ? (player) => {
          setPendingAssignPlayer(player);
          setIsUnallocatedModalOpen(false);
        } : undefined}
        onNavigateToTarget={(player) => {
          setIsUnallocatedModalOpen(false);
          handleNavigateToRequestedTarget(player);
        }}
      />

      <PlayersListModal
        isOpen={isAllocatedModalOpen}
        onClose={() => setIsAllocatedModalOpen(false)}
        title="Allocated Players"
        players={allAllocatedData?.players || []}
        onAssignPlayer={access.can("players", "assign") ? (player) => {
          setPendingAssignPlayer(player);
          setIsAllocatedModalOpen(false);
        } : undefined}
      />

      {/* Direct Assign Class Modal */}
      {pendingAssignPlayer && (
        <Modal
          isOpen={true}
          onClose={() => setPendingAssignPlayer(null)}
          className="max-w-xl mx-auto p-6 bg-white dark:bg-slate-900"
        >
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Assign {pendingAssignPlayer.name} to Class
            </h3>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase">Player Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Name:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingAssignPlayer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Category:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingAssignPlayer.categoryName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Program:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingAssignPlayer.fullProgramName || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800">
                <h4 className="text-xs font-bold text-[#0047FF] mb-3 uppercase">Assigning To</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Day:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{activeDay}</span>
                  </div>
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-800/50 flex flex-col gap-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Class:</span>
                    <select
                      value={selectedAssignClassId}
                      onChange={(e) => setSelectedAssignClassId(e.target.value)}
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded p-1.5 focus:outline-none cursor-pointer"
                    >
                      {assignmentSlots.map((slot: any) => (
                        <option key={slot.classId} value={slot.classId}>
                          {slot.className} — {dayLabel(slot.dayOfWeek || "")} {slot.startTime} - {slot.endTime}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Payment Status
              </label>
              <select
                value={selectedAssignStatus}
                onChange={(e) => setSelectedAssignStatus(e.target.value)}
                className="w-full text-xs font-semibold p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded outline-none"
              >
                <option value="TRIAL">TRIAL</option>
                <option value="PAID">PAID</option>
                <option value="UNPAID">UNPAID</option>
                <option value="HANDSHAKE">HANDSHAKE</option>
                <option value="EXTRA">EXTRA</option>
                <option value="TBC">TBC</option>
                <option value="SUBSTITUTE">SUBSTITUTE</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setPendingAssignPlayer(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedAssignClassId || assignClassesMutation.isPending}
                onClick={() => {
                  if (!selectedAssignClassId) return;
                  assignClassesMutation.mutate(
                    {
                      playerId: pendingAssignPlayer.id || pendingAssignPlayer._id,
                      classIds: [selectedAssignClassId],
                      registrationRequestId: pendingAssignPlayer.registrationRequestId,
                      paymentStatus: selectedAssignStatus,
                    },
                    {
                      onSuccess: () => {
                        toast.success(`Assigned ${pendingAssignPlayer.name} successfully!`);
                        queryClient.invalidateQueries({ queryKey: ["allocatedPlayers"] });
                        queryClient.invalidateQueries({ queryKey: ["unallocatedPlayers"] });
                        queryClient.invalidateQueries({ queryKey: ["classFiltersWithTimeSlots"] });
                        setPendingAssignPlayer(null);
                      },
                    }
                  );
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-blue-700 disabled:opacity-50 rounded cursor-pointer shadow-xs"
              >
                {assignClassesMutation.isPending ? "Assigning..." : "Confirm Assign"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
