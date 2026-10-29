import React, { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { setPublishing } from "../../store/slices/broadcastSlice";
import { broadcastApi } from "../../services/broadcastApi";
import {
  Megaphone,
  Bell,
  Loader2,
  Send,
  SlidersHorizontal,
  Calendar,
  Layers,
  Sparkles,
  School,
  GraduationCap,
  CalendarDays,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useCategories } from "../../hooks/useCategories";
import { useTerms } from "../../hooks/useTerms";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import apiClient from "../../api/apiClient";

export interface BroadcastComposerProps {
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
  initialTargetMode?: "SPECIFIC" | "FILTER";
  prefilledClassId?: string;
  prefilledCategoryId?: string;
  prefilledProgramId?: string;
  prefilledTermId?: string;
  prefilledYear?: string;
  prefilledDayOfWeek?: string;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const QUICK_TEMPLATES = [
  {
    label: "Early Arrival",
    text: "Hello parents, tomorrow's class will start on time. Please make sure all players arrive 10 minutes early.",
  },
  {
    label: "Schedule Update",
    text: "Important announcement: Today's training schedule has been updated. Please check with your coach.",
  },
  {
    label: "Monday Reminder",
    text: "Monday class reminder: Please arrive 15 minutes before the session with full kit and water bottles.",
  },
];

const extractArray = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.categories)) return res.categories;
  if (Array.isArray(res.programs)) return res.programs;
  if (Array.isArray(res.terms)) return res.terms;
  if (Array.isArray(res.classes)) return res.classes;
  return [];
};

const getEntityId = (entity: any): string => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || entity.classId || entity.categoryId || entity.programId || entity.termId || "";
};

export const BroadcastComposer: React.FC<BroadcastComposerProps> = ({
  onSuccess,
  onClose,
  isModal = false,
  initialTargetMode,
  prefilledClassId = "",
  prefilledCategoryId = "",
  prefilledProgramId = "",
  prefilledTermId = "",
  prefilledYear = "",
  prefilledDayOfWeek = "",
}) => {
  const dispatch = useAppDispatch();
  const activeClassId = useAppSelector((state) => state.broadcast.activeClassId);
  const publishing = useAppSelector((state) => state.broadcast.publishing);

  // Target Mode: 'SPECIFIC' or 'FILTER' (Default to 'FILTER' unless specific class is prefilled)
  const [targetMode, setTargetMode] = useState<"SPECIFIC" | "FILTER">(
    initialTargetMode || (prefilledClassId ? "SPECIFIC" : "FILTER")
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(prefilledClassId);

  // Filters (for filtering classes in specific mode OR broadcasting in bulk)
  const [selectedYear, setSelectedYear] = useState<string>(prefilledYear);
  const [selectedTerm, setSelectedTerm] = useState<string>(prefilledTermId);
  const [selectedCategory, setSelectedCategory] = useState<string>(prefilledCategoryId);
  const [selectedProgram, setSelectedProgram] = useState<string>(prefilledProgramId);
  const [selectedDay, setSelectedDay] = useState<string>(prefilledDayOfWeek);

  const [text, setText] = useState<string>("");
  const [classesList, setClassesList] = useState<any[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);

  const { categories: categoriesList } = useCategories({ isEvent: "all" });
  const { terms: allTermsList } = useTerms({ isEvent: "all" });
  const { programs: programsList } = useProgramsByCategory(selectedCategory);

  const availableTerms = useMemo(() => {
    if (!selectedYear) return allTermsList;
    return allTermsList.filter((t) => t.year?.toString() === selectedYear.toString());
  }, [allTermsList, selectedYear]);

  useEffect(() => {
    const fetchClassesData = async () => {
      setIsLoadingClasses(true);
      const userStr = localStorage.getItem("user");
      let isCoach = false;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          isCoach = user?.role === "COACH";
        } catch {}
      }

      try {
        let classesData: any[] = [];
        if (isCoach) {
          try {
            const res = await apiClient.get("/api/coach/getClasses");
            classesData = extractArray(res.data);
          } catch {
            const res = await apiClient.get("/api/coach/classes");
            classesData = extractArray(res.data);
          }
        } else {
          try {
            const res = await apiClient.get("/api/admin/getAllClasses", { params: { limit: 500 } });
            classesData = extractArray(res.data);
          } catch {
            const res = await apiClient.get("/api/coach/getClasses");
            classesData = extractArray(res.data);
          }
        }
        setClassesList(classesData);
      } catch (err) {
        console.error("Failed to load classes for broadcast:", err);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClassesData();
  }, []);

  // Update when prefilled values change
  useEffect(() => {
    if (prefilledClassId) setSelectedClassId(prefilledClassId);
    if (prefilledCategoryId) setSelectedCategory(prefilledCategoryId);
    if (prefilledProgramId) setSelectedProgram(prefilledProgramId);
    if (prefilledTermId) setSelectedTerm(prefilledTermId);
    if (prefilledYear) setSelectedYear(prefilledYear);
    if (prefilledDayOfWeek) setSelectedDay(prefilledDayOfWeek);
  }, [
    prefilledClassId,
    prefilledCategoryId,
    prefilledProgramId,
    prefilledTermId,
    prefilledYear,
    prefilledDayOfWeek,
  ]);

  // Reset selected program if category is cleared
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedProgram("");
    }
  }, [selectedCategory]);

  // Sync with activeClassId from redux if available and no prefilledClassId
  useEffect(() => {
    if (activeClassId && !selectedClassId && !prefilledClassId) {
      setSelectedClassId(activeClassId);
    }
  }, [activeClassId, selectedClassId, prefilledClassId]);

  // Reactive class filtering based on Year, Term, Category, Program, and Day
  const filteredClassesList = useMemo(() => {
    return classesList.filter((c: any) => {
      // 1. Year filter
      if (selectedYear && selectedYear !== "all") {
        const cYear = (c.term?.year || c.year)?.toString();
        if (cYear && cYear !== selectedYear.toString()) return false;
      }

      // 2. Term filter
      if (selectedTerm && selectedTerm !== "all") {
        const cTermId = getEntityId(c.term) || c.termId;
        if (cTermId && cTermId !== selectedTerm) return false;
        if (!cTermId && selectedTerm) return false;
      }

      // 3. Category filter
      if (selectedCategory && selectedCategory !== "all") {
        const cCatId = getEntityId(c.category) || c.categoryId;
        if (cCatId && cCatId !== selectedCategory) return false;
        if (!cCatId && selectedCategory) return false;
      }

      // 4. Program filter
      if (selectedProgram && selectedProgram !== "all") {
        const cProgId = getEntityId(c.program) || c.programId;
        if (cProgId && cProgId !== selectedProgram) return false;
        if (!cProgId && selectedProgram) return false;
      }

      // 5. Day filter (Case-insensitive comparison for "Monday", "MONDAY", etc.)
      if (selectedDay && selectedDay !== "all") {
        const targetDay = selectedDay.trim().toUpperCase();
        const cDay = (c.dayOfWeek || "").trim().toUpperCase();
        const matchesDay =
          cDay === targetDay ||
          (Array.isArray(c.schedule) &&
            c.schedule.some((s: any) => (s.dayOfWeek || "").trim().toUpperCase() === targetDay));
        if (!matchesDay) return false;
      }

      return true;
    });
  }, [classesList, selectedYear, selectedTerm, selectedCategory, selectedProgram, selectedDay]);

  // Sync selectedClassId whenever filtered list changes
  useEffect(() => {
    if (targetMode === "SPECIFIC") {
      if (filteredClassesList.length > 0) {
        const exists = filteredClassesList.some(
          (c) => (c._id || c.classId || c.id) === selectedClassId
        );
        if (!exists) {
          setSelectedClassId(
            filteredClassesList[0]._id || filteredClassesList[0].classId || filteredClassesList[0].id || ""
          );
        }
      } else {
        setSelectedClassId("");
      }
    }
  }, [filteredClassesList, targetMode, selectedClassId]);

  const hasActiveFilters = Boolean(
    selectedYear || selectedTerm || selectedCategory || selectedProgram || selectedDay
  );

  const handleResetFilters = () => {
    setSelectedYear("");
    setSelectedTerm("");
    setSelectedCategory("");
    setSelectedProgram("");
    setSelectedDay("");
  };

  const handlePublish = async () => {
    const cleanText = text.trim();
    if (!cleanText) {
      toast.error("Announcement text cannot be empty.");
      return;
    }

    if (targetMode === "SPECIFIC" && !selectedClassId) {
      toast.error("Please select a specific class to broadcast to.");
      return;
    }

    dispatch(setPublishing(true));
    try {
      let res: any;
      if (targetMode === "SPECIFIC") {
        // 1. Specific Class: POST /api/coach/chat/broadcast/:classId
        res = await broadcastApi.sendClassBroadcast(
          {
            text: cleanText,
            classId: selectedClassId,
          },
          selectedClassId
        );
      } else {
        // 2. Multiple Classes via Filters: POST /api/coach/chat/broadcast/filter
        const payload: any = {
          text: cleanText,
        };
        if (selectedYear) payload.year = selectedYear;
        if (selectedTerm) payload.term = selectedTerm;
        if (selectedCategory) payload.category = selectedCategory;
        if (selectedProgram) payload.program = selectedProgram;
        if (selectedDay) payload.day = selectedDay;

        res = await broadcastApi.sendClassBroadcast(payload, "filter");
      }

      if (res?.success) {
        toast.success(res.message || "Broadcast announcement published successfully!");
        setText("");
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.message || "Failed to publish broadcast.");
      }
    } catch (err: any) {
      console.error("Failed to send broadcast announcement:", err);
      toast.error(err?.response?.data?.message || err?.message || "Error broadcasting announcement.");
    } finally {
      dispatch(setPublishing(false));
    }
  };

  // Preview targeting text
  const getAudienceDescription = () => {
    if (targetMode === "SPECIFIC") {
      const cls = classesList.find((c) => (c._id || c.classId || c.id) === selectedClassId);
      if (cls) {
        const progName = cls.program?.name || cls.category?.name || "";
        const sched = cls.dayOfWeek ? ` (${cls.dayOfWeek} ${cls.startTime || ""})` : "";
        return `Specific Class: ${cls.name || "Selected Class"} ${progName ? `• ${progName}` : ""} ${sched}`;
      }
      return "Specific Class";
    }

    const filters: string[] = [];
    if (selectedYear) {
      filters.push(`Year: ${selectedYear}`);
    }
    if (selectedTerm) {
      const t = allTermsList.find((term) => term._id === selectedTerm);
      if (t) filters.push(`Term: ${t.name}`);
    }
    if (selectedCategory) {
      const c = categoriesList.find((cat) => cat._id === selectedCategory);
      if (c) filters.push(`Category: ${c.name}`);
    }
    if (selectedProgram) {
      const p = programsList.find((prog) => (prog._id || prog.id) === selectedProgram);
      if (p) filters.push(`Program: ${p.name}`);
    }
    if (selectedDay) {
      filters.push(`Day: ${selectedDay}`);
    }

    if (filters.length === 0) return "All Active Classes";
    return `Filtered Audience (${filters.join(", ")})`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 sm:p-6 shadow-theme-xs flex flex-col gap-5">
      {/* Top Header & Mode Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Megaphone size={16} className="text-[#0047FF]" />
            <span>Create Class Broadcast</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Send instant push notices & chat announcements to parents
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Target Mode Segmented Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTargetMode("SPECIFIC")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                targetMode === "SPECIFIC"
                  ? "bg-[#0047FF] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <School size={13} />
              <span>Specific Class</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetMode("FILTER")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                targetMode === "FILTER"
                  ? "bg-[#0047FF] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filter Classes</span>
            </button>
          </div>

          {/* Optional Close button when used inside Modal */}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Bar (Available in both modes to filter the specific class list or scope bulk broadcast) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal size={12} className="text-[#0047FF]" />
            <span>
              {targetMode === "SPECIFIC" ? "Filter Classes By (Optional)" : "Broadcast Filters"}
            </span>
          </label>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-[#0047FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3.5 border border-slate-200 dark:border-slate-800">
          {/* Term / Year Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={11} className="text-[#0047FF]" />
              <span>Term</span>
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-none px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#0047FF] cursor-pointer"
            >
              <option value="">All Terms</option>
              {availableTerms.map((term) => (
                <option key={term._id} value={term._id}>
                  {term.name} {term.year ? `(${term.year})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers size={11} className="text-[#0047FF]" />
              <span>Category</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedProgram(""); // reset program if category changes
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-none px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#0047FF] cursor-pointer"
            >
              <option value="">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Program Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap size={11} className="text-[#0047FF]" />
              <span>Program</span>
            </label>
            <select
              value={selectedProgram}
              disabled={!selectedCategory}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-none px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#0047FF] ${
                !selectedCategory ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <option value="">
                {!selectedCategory ? "Select Category First" : "All Programs in Category"}
              </option>
              {programsList.map((prog) => (
                <option key={prog._id || prog.id} value={prog._id || prog.id}>
                  {prog.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CalendarDays size={11} className="text-[#0047FF]" />
              <span>Day of Week</span>
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-none px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#0047FF] cursor-pointer"
            >
              <option value="">All Days</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* In Filter Classes Mode: Audience scope summary banner */}
        {targetMode === "FILTER" && (
          <div className="flex items-center justify-between flex-wrap gap-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0047FF] dark:text-blue-300">
              <SlidersHorizontal size={14} className="shrink-0 text-[#0047FF]" />
              <span>
                {filteredClassesList.length === 0
                  ? "No active classes match the selected filter combination."
                  : `Broadcasting to all ${filteredClassesList.length} matching classes.`}
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-[#0047FF] text-white">
              {filteredClassesList.length} {filteredClassesList.length === 1 ? "Class" : "Classes"} Target
            </span>
          </div>
        )}

        {/* In Specific Class Mode: Class Selection Dropdown */}
        {targetMode === "SPECIFIC" && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <School size={13} className="text-[#0047FF]" />
                <span>
                  Select Target Class <span className="text-rose-500">*</span>
                </span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {isLoadingClasses
                  ? "Loading classes..."
                  : `${filteredClassesList.length} ${
                      filteredClassesList.length === 1 ? "class" : "classes"
                    } available`}
              </span>
            </div>

            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={isLoadingClasses}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-none px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF] cursor-pointer"
            >
              {isLoadingClasses ? (
                <option value="" disabled>
                  Loading classes...
                </option>
              ) : filteredClassesList.length === 0 ? (
                <option value="" disabled>
                  -- No classes found matching selected filters --
                </option>
              ) : (
                <>
                  <option value="" disabled>
                    -- Choose a Class ({filteredClassesList.length} available) --
                  </option>
                  {filteredClassesList.map((c) => {
                    const id = c._id || c.classId || c.id;
                    const name = c.name || c.className || "Class";
                    const progName = c.program?.name || c.category?.name || "";
                    const termName = c.term?.name ? ` [${c.term.name}]` : "";
                    const schedule = c.dayOfWeek
                      ? ` (${c.dayOfWeek} ${c.startTime || ""})`
                      : "";
                    return (
                      <option key={id} value={id}>
                        {name} {progName ? `• ${progName}` : ""} {schedule} {termName}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Quick Prompt Templates */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Sparkles size={11} className="text-amber-500" />
          <span>Quick Templates:</span>
        </span>
        {QUICK_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.label}
            type="button"
            onClick={() => setText(tmpl.text)}
            className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-[#0047FF] dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write announcement for parents... (Schedule changes, gear details, urgent reminders, etc.)"
          className="w-full min-h-[120px] p-4 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF] leading-relaxed resize-y"
        />
        <span className="absolute right-3 bottom-3 text-[10px] font-semibold text-slate-400">
          {text.length} chars
        </span>
      </div>

      {/* Footer / Publish Action */}
      <div className="flex justify-between items-center flex-wrap gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[#0047FF] dark:text-blue-400 font-black uppercase tracking-wider">
            <Bell size={12} className="shrink-0" />
            <span className="truncate max-w-[320px] sm:max-w-md">
              {getAudienceDescription()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing || (targetMode === "SPECIFIC" && !selectedClassId) || !text.trim()}
          className="px-6 py-2.5 bg-[#0047FF] hover:bg-blue-700 disabled:bg-[#0047FF]/50 text-white font-extrabold rounded-none text-[11px] uppercase tracking-wider transition-colors shrink-0 shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
        >
          {publishing ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Publishing Broadcast...</span>
            </>
          ) : (
            <>
              <span>Publish Broadcast</span>
              <Send size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BroadcastComposer;
