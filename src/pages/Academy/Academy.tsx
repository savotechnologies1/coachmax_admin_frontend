import { occurrenceKey, dayLabel, scheduleDayQuery, distinctClassSlots, currentScheduleDay, currentScheduleMinutes } from "../../utils/classSchedule";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import AcademyHeader from "../../components/academy/AcademyHeader";
import DayTabs from "../../components/academy/DayTabs";
import ClassFullTable from "../../components/academy/ClassFullTable";
import UnallocatedPlayersCard from "../../components/academy/UnallocatedPlayersCard";
import AllocatedPlayersCard from "../../components/academy/AllocatedPlayersCard";
import SidebarPlayersFilter from "../../components/academy/SidebarPlayersFilter";
import { useClassFiltersWithTimeSlots, useAssignClassesToPlayer } from "../../hooks/usePlayers";
import { useUnallocatedPlayers } from "../../hooks/useUnallocatedPlayers";
import { useAllocatedPlayers } from "../../hooks/useAllocatedPlayers";
import AddClassModal from "../../components/classes/AddClassModal";
import PlayersListModal from "../../components/academy/PlayersListModal";
import TermManagement from "../../components/management/TermManagement";
import { Modal } from "../../components/ui/modal";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import apiClient from "../../api/apiClient";

interface AcademyProps {
  programType?: string;
}
const EMPTY_TIME_SLOTS: never[] = [];

export default function Academy({ programType = "Academy" }: AcademyProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const { markItemAsRead } = useSidebarBadges();

  const [activeDay, setActiveDay] = useState(() => {
    if (state?.day) return state.day.charAt(0).toUpperCase() + state.day.slice(1).toLowerCase();
    if (state?.classId) return "View All";
    return currentScheduleDay();
  });
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [year, setYear] = useState("");
  const [termId, setTermId] = useState("");
  const [expandedClassIds, setExpandedClassIds] = useState<Record<string, boolean>>({});
  const [targetHighlightClassId, setTargetHighlightClassId] = useState<string | null>(null);
  const assignClassesMutation = useAssignClassesToPlayer();
  const queryClient = useQueryClient();

  // Smart 3-tier redirection handler when admin clicks "Go to Request" on an unallocated player card
  const handleNavigateToRequestedTarget = (player: any) => {
    if (!player) return;
    if (player._id || player.id) {
      markItemAsRead("unallocatedPlayers", player._id || player.id);
    }

    // Tier 3 Special: Holiday Camp / Event redirection
    const isCamp =
      player.isEvent ||
      player.categoryName?.toLowerCase().includes("camp") ||
      player.categoryName?.toLowerCase().includes("holiday");

    if (isCamp) {
      navigate("/events/camp", { state: { playerId: player.id } });
      toast.success(`Redirected to Holiday Camp for ${player.name}`);
      return;
    }

    // Tier 3: Sync Category
    if (player.categoryId && player.categoryId !== categoryId) {
      setCategoryId(player.categoryId);
      if (player.categoryName) setCategoryName(player.categoryName);
    }

    // Tier 2: Sync Program / Sub-program
    if (player.programId && player.programId !== programId) {
      setProgramId(player.programId);
      if (player.fullProgramName) setProgramName(player.fullProgramName);
    }

    // Sync Term if specified in request
    if (player.termId && player.termId !== termId) {
      setTermId(player.termId);
    }

    // Tier 1: Specific requested class / session
    const primaryClass =
      player.primaryClass ||
      (player.preferredClasses && player.preferredClasses.length > 0
        ? player.preferredClasses[0]
        : null);

    if (primaryClass) {
      // 1. Switch Day Tab (e.g. Wednesday)
      if (primaryClass.dayOfWeek) {
        const targetDay =
          primaryClass.dayOfWeek.charAt(0).toUpperCase() +
          primaryClass.dayOfWeek.slice(1).toLowerCase();
        setActiveDay(targetDay);
      }

      // 2. Expand & Highlight specific class table
      if (primaryClass.id) {
        setExpandedClassIds((prev) => ({
          ...prev,
          [primaryClass.id]: true,
        }));
        setTargetHighlightClassId(primaryClass.id);

        // Smoothly scroll to the target class accordion
        setTimeout(() => {
          const target = timeSlots.find((slot: any) => String(slot.classId) === String(primaryClass.id));
          const el = target ? document.getElementById(`class-card-${occurrenceKey(target)}`) : null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 350);

        // Clear glowing ring after 3.5 seconds
        setTimeout(() => {
          setTargetHighlightClassId(null);
        }, 3500);
      }

      toast.success(
        `Navigated to: ${primaryClass.dayOfWeek} ${primaryClass.startTime || ""} (${player.name})`
      );
    } else if (player.fullProgramName && player.fullProgramName !== "N/A") {
      toast.success(
        `Switched to ${player.categoryName || "Academy"} > ${player.fullProgramName}. Choose a class to assign ${player.name}.`
      );
    } else {
      toast.success(
        `Switched to ${player.categoryName || "Academy"}. Select a program and class to assign ${player.name}.`
      );
    }
  };

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<any | null>(null);
  const [classToDuplicate, setClassToDuplicate] = useState<any | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);

  const { data: filtersData, isLoading: scheduleLoading, isError: scheduleError, refetch: refetchSchedule } = useClassFiltersWithTimeSlots(categoryId, programId, scheduleDayQuery(activeDay), termId, { enabled: !!termId });
  const timeSlots = filtersData?.timeSlots || EMPTY_TIME_SLOTS;
  const assignmentSlots = distinctClassSlots<any>(timeSlots);

  useEffect(() => {
    if (!targetHighlightClassId) return;
    const target = timeSlots.find((slot: any) => String(slot.classId) === String(targetHighlightClassId));
    if (target) setExpandedClassIds((prev) => ({ ...prev, [occurrenceKey(target)]: true }));
  }, [targetHighlightClassId, timeSlots]);

  const handleEditClass = async (classId: string) => {
    try {
      const response = await apiClient.get(`/api/admin/getClassById/${classId}`);
      const classData = response.data?.data;
      if (!classData) throw new Error("Class not found");
      setClassToDuplicate(null);
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
      setClassToEdit(null);
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

  const hasInitializedFromState = useRef(false);

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
        const [time, modifier] = slot.startTime.split(' ');
        const [rawHours, minutes] = time.split(':').map(Number);
        let hours = rawHours;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const slotMinutes = hours * 60 + (minutes || 0);
        const diff = slotMinutes - currentMinutes;

        if (diff >= -90 && diff < minDiff) {
          minDiff = diff;
          closestSlot = slot;
        }
      }

      setExpandedClassIds(prev => {
        const hasAnyExpandedThisDay = timeSlots.some((slot: any) => prev[occurrenceKey(slot)]);
        if (hasAnyExpandedThisDay) return prev;
        return { ...prev, [occurrenceKey(closestSlot)]: true };
      });
    }
  }, [timeSlots, activeDay, state?.classId]);

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
    return "BOTH"; // unselected -> show all data
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

  return (
    <>
      <PageMeta
        title={`${programType} Schedule | CoachMax`}
        description={`Fidelity matched primary CoachMax ${programType.toLowerCase()} programs attendance UI`}
      />

      <AcademyHeader
        programType={programType}
        selectedCategoryId={categoryId}
        selectedProgramId={programId}
        selectedYear={year}
        selectedTermId={termId}
        onCategoryChange={(id, name) => {
          setCategoryId(id);
          if (name) setCategoryName(name);
        }}
        onProgramChange={(id, name) => {
          setProgramId(id);
          if (name) setProgramName(name);
        }}
        onYearChange={setYear}
        onTermChange={setTermId}
        onOpenCreateClass={() => {
          setClassToEdit(null);
          setClassToDuplicate(null);
          setIsClassModalOpen(true);
        }}
        onOpenTermSettings={() => setIsTermModalOpen(true)}
        showSidebar={showSidebar}
        onShowSidebarChange={setShowSidebar}
        showAllocated={showAllocated}
        onShowAllocatedChange={setShowAllocated}
        showUnallocated={showUnallocated}
        onShowUnallocatedChange={setShowUnallocated}
      />
      <DayTabs activeDay={activeDay} onChangeDay={(day) => { setActiveDay(day); }} />

      <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
        {/* Left Side: Attendance Tables */}
        <div className="flex-1 w-full min-w-0">
          {!termId && year ? (
            <div role="status" className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
              No terms are available for {year}. Create one in Term Settings to schedule classes.
            </div>
          ) : scheduleError ? (
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
                    categoryId={slot.category?._id || categoryId}
                    categoryName={slot.category?.name || categoryName}
                    programId={slot.program?._id || programId}
                    programName={slot.program?.name || programName}
                    timeSlotStr={`${slot.startTime} - ${slot.endTime}`}
                    isExpanded={isExpanded}
                    isHighlighted={targetHighlightClassId === slot.classId}
                    onToggle={() =>
                      setExpandedClassIds(prev => ({
                        ...prev,
                        [occurrenceKey(slot)]: !prev[occurrenceKey(slot)],
                      }))
                    }
                    onEditClass={handleEditClass}
                    onDuplicateClass={handleDuplicateClass}
                    onDeleteClass={(classId) => setDeleteClassId(classId)}
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
          if (!showSidebar) return null;

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
            <div className="w-full xl:w-[350px] shrink-0 xl:sticky xl:top-[88px] xl:max-h-[calc(100vh-110px)] xl:overflow-y-auto pr-1.5 custom-scrollbar flex flex-col gap-4">
              <SidebarPlayersFilter
                category={sidebarCategory}
                program={sidebarProgram}
                search={sidebarSearch}
                onCategoryChange={setSidebarCategory}
                onProgramChange={setSidebarProgram}
                onSearchChange={setSidebarSearch}
              />
              {(effectivePlayerType === "BOTH" || effectivePlayerType === "UNALLOCATED") && (
                <UnallocatedPlayersCard
                  players={unallocatedData?.players || []}
                  totalCount={unallocatedData?.pagination?.total || 0}
                  page={unallocatedPage}
                  onPageChange={setUnallocatedPage}
                  isLoading={isUnallocatedFetching}
                  onAssignPlayer={(player) => setPendingAssignPlayer(player)}
                  onNavigateToTarget={handleNavigateToRequestedTarget}
                  onViewAll={() => setIsUnallocatedModalOpen(true)}
                />
              )}
              {(effectivePlayerType === "BOTH" || effectivePlayerType === "ALLOCATED") && (
                <AllocatedPlayersCard
                  players={allocatedData?.players || []}
                  totalCount={allocatedData?.pagination?.total || 0}
                  page={allocatedPage}
                  onPageChange={setAllocatedPage}
                  isLoading={isAllocatedFetching}
                  onAssignPlayer={(player) => setPendingAssignPlayer(player)}
                  onViewAll={() => setIsAllocatedModalOpen(true)}
                />
              )}
              {/* <WaitlistCard items={mockWaitlist} /> */}
              {/* <TrialsCard items={mockTrials} /> */}
            </div>
          );
        })()}
      </div>

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
        prefilledCategoryId={categoryId}
        prefilledProgramId={programId}
        prefilledDayOfWeek={activeDay === "View All" ? undefined : scheduleDayQuery(activeDay)}
        prefilledTermId={termId}
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
          <TermManagement initialYear={year} />
        </div>
      </Modal>

      <Modal isOpen={!!pendingAssignPlayer} onClose={() => setPendingAssignPlayer(null)} className="max-w-2xl p-6">
        <div className="w-full bg-white dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Confirm Assignment</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {categoryId && programId && pendingAssignPlayer?.categoryId && pendingAssignPlayer?.programId &&
              (categoryId !== pendingAssignPlayer.categoryId || programId !== pendingAssignPlayer.programId)
              ? "The player requested a different program or category than the one you are assigning them to. Please review the details below, choose status, and confirm assignment."
              : "Please select the player's status and confirm assignment of the player to this class."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase">Requested</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingAssignPlayer?.categoryName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Program:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingAssignPlayer?.fullProgramName || pendingAssignPlayer?.programName || "N/A"}</span>
                </div>
                {pendingAssignPlayer?.preferredClasses && pendingAssignPlayer.preferredClasses.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 mt-3">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Preferred Classes:</span>
                    <ul className="space-y-1">
                      {pendingAssignPlayer.preferredClasses.map((c: any) => (
                        <li key={c.id} className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1">
                          {c.dayOfWeek.substring(0, 3)} {c.startTime}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800">
              <h4 className="text-xs font-bold text-[#0047FF] mb-3 uppercase">Assigning To</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{categoryName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Program:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{programName || "N/A"}</span>
                </div>
                <div className="pt-3 border-t border-blue-200 dark:border-blue-800/50 mt-3 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Class:</span>
                  <select
                    value={selectedAssignClassId}
                    onChange={(e) => setSelectedAssignClassId(e.target.value)}
                    className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 focus:outline-none cursor-pointer"
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

          <div className="mb-6">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 uppercase tracking-widest">Select Assignment Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: "TRIAL", label: "Trial", desc: "Trial Session", activeClass: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400", inactiveClass: "border-slate-200 hover:border-rose-300/50 hover:bg-rose-500/[0.02] text-slate-500 dark:border-slate-800" },
                { value: "UNPAID", label: "Approved", desc: "Assign & Allocate Fee (Auto)", activeClass: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400", inactiveClass: "border-slate-200 hover:border-amber-300/50 hover:bg-amber-500/[0.02] text-slate-500 dark:border-slate-800" },
                { value: "EXTRA", label: "Extra", desc: "Extra Status", activeClass: "border-[#dee08b] bg-[#dee08b]/20 text-[#8a8c23] dark:text-[#dee08b]", inactiveClass: "border-slate-200 hover:border-[#dee08b]/50 hover:bg-[#dee08b]/10 text-slate-500 dark:border-slate-800" },
                { value: "TBC", label: "TBC", desc: "To Be Confirmed", activeClass: "border-slate-400 bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-400", inactiveClass: "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400" }
              ].map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setSelectedAssignStatus(status.value)}
                  className={`p-4 border text-center rounded-none transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${selectedAssignStatus === status.value ? status.activeClass + " ring-1 ring-offset-0 font-extrabold" : status.inactiveClass
                    }`}
                >
                  <span className="text-xs font-black uppercase tracking-wide">{status.label}</span>
                  <span className="text-[9px] font-bold opacity-80">{status.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setPendingAssignPlayer(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border border-transparent hover:border-slate-300 rounded-none"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!pendingAssignPlayer || !selectedAssignClassId) return;
                assignClassesMutation.mutate({
                  playerId: pendingAssignPlayer.id || pendingAssignPlayer.playerId,
                  classIds: [selectedAssignClassId],
                  paymentStatus: selectedAssignStatus,
                  registrationRequestId: pendingAssignPlayer.registrationRequestId,
                }, {
                  onSuccess: () => {
                    setPendingAssignPlayer(null);
                  }
                });
              }}
              disabled={assignClassesMutation.isPending}
              className="px-6 py-2 text-sm font-bold bg-[#0047FF] text-white rounded-none hover:bg-blue-700 transition-colors shadow-theme-xs disabled:opacity-50"
            >
              {assignClassesMutation.isPending ? "Assigning..." : "Assign Player"}
            </button>
          </div>
        </div>
      </Modal>

      <PlayersListModal
        isOpen={isUnallocatedModalOpen}
        onClose={() => setIsUnallocatedModalOpen(false)}
        title="Unallocated Players"
        players={allUnallocatedData?.players || []}
        onAssignPlayer={(player) => {
          setPendingAssignPlayer(player);
          setIsUnallocatedModalOpen(false);
        }}
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
        onAssignPlayer={(player) => {
          setPendingAssignPlayer(player);
          setIsAllocatedModalOpen(false);
        }}
      />
    </>
  );
}
