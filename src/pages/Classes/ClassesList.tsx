import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import apiClient from "../../api/apiClient";
import { useCategories } from "../../hooks/useCategories";
import { useCurrentTerm } from "../../hooks/useCurrentTerm";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import ClassFilters from "../../components/classes/ClassFilters";
import ClassTable from "../../components/classes/ClassTable";
import ViewClassPlayersModal from "../../components/classes/ViewClassPlayersModal";
import AddClassModal from "../../components/classes/AddClassModal";
import Select from "../../components/form/Select";
import Pagination from "../../components/common/Pagination";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import ClassBroadcastModal from "../../components/classes/ClassBroadcastModal";
import { Megaphone } from "lucide-react";
import toast from "react-hot-toast";

interface ClassItem {
  _id: string;
  name: string;
  trainingType: string;
  sessionDuration: number;
  status: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  term?: { name: string; year: number };
  program?: { name: string };
  category?: { name: string };
  coach?: { name: string };
  players?: any[];
}

export default function ClassesList() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDay, setSelectedDay] = useState(() => {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  });

  const {
    terms,
    availableYears,
    selectedYear,
    setSelectedYear,
    selectedTerm,
    setSelectedTerm,
  } = useCurrentTerm();

  const { categories } = useCategories({ isEvent: "all" });
  const { programs } = useProgramsByCategory(selectedCategory);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastClassId, setBroadcastClassId] = useState<string | null>(null);
  const [classToEdit, setClassToEdit] = useState<ClassItem | null>(null);
  const [viewPlayersClassId, setViewPlayersClassId] = useState<string | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page,
        limit,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedCategory && selectedCategory !== "all") {
        params.categoryId = selectedCategory;
      }
      if (selectedProgram && selectedProgram !== "all") {
        params.programId = selectedProgram;
      }
      if (selectedTerm && selectedTerm !== "all") {
        params.termId = selectedTerm;
      }
      if (selectedDay && selectedDay !== "all") {
        params.day = selectedDay;
      }

      const response = await apiClient.get("/api/admin/getAllClasses", { params });
      if (response.data && response.data.data) {
        setClasses(response.data.data);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalClasses(response.data.pagination.totalClasses || 0);
        }
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
      toast.error("Failed to load classes");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteClass = async () => {
    if (!deleteClassId) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/admin/deleteClass/${deleteClassId}`);
      toast.success("Class deleted successfully");
      setDeleteClassId(null);
      fetchClasses();
    } catch (error) {
      console.error("Failed to delete class:", error);
      toast.error("Failed to delete class");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [page, limit, searchQuery, selectedCategory, selectedProgram, selectedTerm, selectedDay]);

  // Reset selected program if category is cleared
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedProgram("");
    }
  }, [selectedCategory]);

  return (
    <>
      <PageMeta title="Classes Management | CoachMax" description="Manage your classes" />

      <PageBreadcrumb
        pageTitle="Classes Management"
        items={[{ name: "Operations" }]}
      >
        {/* Year Selector */}
        <div className="w-full sm:w-36 flex-1 sm:flex-initial min-w-[130px]">
          <Select
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
            options={[
              { label: "All Years", value: "" },
              ...availableYears.map((y) => ({ label: y, value: y }))
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
              { label: "All Terms", value: "" },
              ...terms.map((t) => ({ label: `${t.name} (${t.year})`, value: t._id }))
            ]}
            placeholder="All Terms"
            className="w-full select-none"
            triggerClassName="h-[42px] w-full flex items-center justify-between appearance-none rounded-none border px-4 py-2 text-xs font-bold shadow-theme-xs outline-hidden bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-800 dark:text-white transition-all cursor-pointer group"
          />
        </div>

        <button
          onClick={() => setIsBroadcastModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-none bg-[#031549] hover:bg-[#020e33] text-white px-5 py-2.5 h-[42px] text-center text-xs font-black uppercase tracking-wider transition-colors shadow-theme-xs w-full sm:w-auto shrink-0 cursor-pointer border border-[#031549]"
        >
          <Megaphone size={14} className="text-[#0047FF]" />
          <span>Broadcast</span>
        </button>

        <button
          onClick={() => { setClassToEdit(null); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center rounded-none bg-[#0047FF] px-5 py-2.5 h-[42px] text-center text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700 transition-colors shadow-theme-xs w-full sm:w-auto shrink-0 cursor-pointer"
        >
          + Add Class
        </button>
      </PageBreadcrumb>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto custom-scrollbar gap-2">
        <button
          onClick={() => {
            setSelectedCategory("");
            setSelectedProgram("");
          }}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] shrink-0 ${selectedCategory === ""
              ? "border-[#0047FF] text-[#0047FF]"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
        >
          All Classes
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            onClick={() => {
              setSelectedCategory(c._id);
              setSelectedProgram("");
            }}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] shrink-0 ${selectedCategory === c._id
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
            className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${selectedProgram === ""
                ? "border-[#0047FF] text-[#0047FF]"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
          >
            All Programs
          </button>
          {programs.map((p) => (
            <button
              key={p._id}
              onClick={() => setSelectedProgram(p._id)}
              className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${selectedProgram === p._id
                  ? "border-[#0047FF] text-[#0047FF]"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Day Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6 text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
        {["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day === "All Days" ? "" : day)}
            className={`py-3 px-8 transition-all border-b-[3px] shrink-0 text-xs font-semibold tracking-wider cursor-pointer ${
              (selectedDay === "" && day === "All Days") || selectedDay === day
                ? "bg-[#031549] text-white font-bold border-[#0047FF]"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-2 items-start w-full">
        <div className="flex-1 w-full min-w-0">
          <ClassFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <ClassTable
            classes={classes}
            isLoading={isLoading}
            onEditClass={(cls) => {
              setClassToEdit(cls);
              setIsModalOpen(true);
            }}
            onViewPlayers={(cls) => setViewPlayersClassId(cls._id)}
            onDeleteClass={(cls) => setDeleteClassId(cls._id)}
            onBroadcastClass={(cls) => {
              setBroadcastClassId(cls._id);
              setIsBroadcastModalOpen(true);
            }}
          />
          {!isLoading && totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalClasses}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>



      <AddClassModal
        isOpen={isModalOpen}
        classToEdit={classToEdit}
        prefilledCategoryId={selectedCategory}
        prefilledProgramId={selectedProgram}
        prefilledTermId={selectedTerm}
        prefilledYear={selectedYear}
        prefilledDayOfWeek={selectedDay}
        onClose={() => {
          setIsModalOpen(false);
          setClassToEdit(null);
        }}
        onSuccess={() => {
          setIsLoading(true);
          fetchClasses();
        }}
      />

      <ViewClassPlayersModal
        isOpen={!!viewPlayersClassId}
        onClose={() => setViewPlayersClassId(null)}
        classId={viewPlayersClassId}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteClassId}
        onClose={() => setDeleteClassId(null)}
        onConfirm={confirmDeleteClass}
        loading={isDeleting}
        title="Delete Class"
        message="Are you sure you want to delete this class? This action cannot be undone."
      />

      <ClassBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => {
          setIsBroadcastModalOpen(false);
          setBroadcastClassId(null);
        }}
        prefilledClassId={broadcastClassId || undefined}
        prefilledCategoryId={selectedCategory}
        prefilledProgramId={selectedProgram}
        prefilledTermId={selectedTerm}
        prefilledYear={selectedYear}
        prefilledDayOfWeek={selectedDay}
      />
    </>
  );
}
