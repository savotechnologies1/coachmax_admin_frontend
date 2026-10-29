import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import apiClient from "../../api/apiClient";
import { useCategories } from "../../hooks/useCategories";
import { useCurrentTerm } from "../../hooks/useCurrentTerm";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import Badge from "../ui/badge/Badge";
import { MoreVertical } from "lucide-react";
import ViewClassPlayersModal from "../classes/ViewClassPlayersModal";
import Select from "../form/Select";
import Pagination from "../common/Pagination";

interface ClassDetail {
  classId: string;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
  location: string;
  sessionDuration: number;
  trainingType: string;
  capacity: number;
  totalPlayers: number;
  status?: string;
  broadcastChatRoomId?: string;
  term?: { _id?: string; name: string; year: number };
  program?: { _id?: string; name: string };
  category?: { _id?: string; name: string };
}

export default function MyClassesListComp() {
  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);

  // Filter state
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

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedProgram) params.programId = selectedProgram;
      if (selectedTerm) params.termId = selectedTerm;
      if (selectedDay) params.day = selectedDay;

      const response = await apiClient.get("/api/coach/classes", { params });
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [page, limit, searchQuery, selectedCategory, selectedProgram, selectedTerm, selectedDay]);

  // Reset selected program when category is cleared
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedProgram("");
    }
  }, [selectedCategory]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenDropdownId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const DAYS = ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-4">

      <div className="flex flex-col gap-4 mb-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Classes</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
            <span>Home</span><span>&gt;</span>
            <span className="text-[#0047FF]">My Classes</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {/* Year Selector */}
          <div className="w-36 shrink-0">
            <Select
              value={selectedYear}
              onChange={(val) => setSelectedYear(val)}
              options={[
                { label: "All Years", value: "" },
                ...availableYears.map((y) => ({ label: y, value: y }))
              ]}
              placeholder="All Years"
              triggerClassName="h-[42px] w-full flex items-center justify-between appearance-none rounded-none border px-4 py-2 text-xs font-bold shadow-theme-xs outline-hidden bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 dark:border-slate-800 dark:text-white transition-all cursor-pointer"
            />
          </div>

          {/* Term Selector */}
          <div className="w-52 shrink-0">
            <Select
              value={selectedTerm}
              onChange={(val) => setSelectedTerm(val)}
              options={[
                { label: "All Terms", value: "" },
                ...terms.map((t) => ({ label: `${t.name} (${t.year})`, value: t._id }))
              ]}
              placeholder="All Terms"
              triggerClassName="h-[42px] w-full flex items-center justify-between appearance-none rounded-none border px-4 py-2 text-xs font-bold shadow-theme-xs outline-hidden bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 dark:border-slate-800 dark:text-white transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>


      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar gap-2">
        <button
          onClick={() => { setSelectedCategory(""); setSelectedProgram(""); }}
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
            onClick={() => { setSelectedCategory(c._id); setSelectedProgram(""); }}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] shrink-0 ${selectedCategory === c._id
                ? "border-[#0047FF] text-[#0047FF]"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
          >
            {c.name}
          </button>
        ))}
      </div>


      {selectedCategory && programs.length > 0 && (
        <div className="flex border-b border-slate-100 dark:border-slate-800/60 overflow-x-auto custom-scrollbar gap-2 -mt-4 bg-slate-50/50 dark:bg-slate-900/10 px-2 py-0.5">
          <button
            onClick={() => setSelectedProgram("")}
            className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${selectedProgram === ""
                ? "border-[#0047FF] text-[#0047FF]"
                : "border-transparent text-slate-400 hover:text-slate-600"
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
                  : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}


      <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar gap-1">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day === "All Days" ? "" : day)}
            className={`py-3 px-6 transition-all border-b-[3px] shrink-0 text-xs font-semibold tracking-wider cursor-pointer ${(selectedDay === "" && day === "All Days") || selectedDay === day
                ? "bg-[#031549] text-white font-bold border-[#0047FF]"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent"
              }`}
          >
            {day}
          </button>
        ))}
      </div>


      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-none shadow-theme-xs">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes by name, location, or program..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-none text-xs font-semibold focus:outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF]"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-none shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs [&_th]:border [&_th]:border-slate-700/50 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700">
            <thead>
              <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-[40px]">#</th>
                <th className="py-3 px-3 min-w-[180px]">Name</th>
                <th className="py-3 px-3 min-w-[150px]">Program / Term</th>
                <th className="py-3 px-3 min-w-[120px]">Schedule</th>
                <th className="py-3 px-3 min-w-[120px]">Location</th>
                <th className="py-3 px-3 min-w-[80px]">Status</th>
                <th className="py-3 px-4 w-[50px] text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-semibold">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0047FF] border-t-transparent shadow-sm"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing Classes...</span>
                    </div>
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-semibold italic">
                    No classes found.
                  </td>
                </tr>
              ) : (
                classes.map((cls, idx) => (
                  <tr
                    key={cls.classId}
                    className="border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-default"
                  >
                    <td className="py-4 px-4 font-semibold text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="py-4 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{cls.className}</div>
                      <div className="mt-1.5 w-full max-w-[160px]">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold mb-1">
                          <span>Capacity</span>
                          <span>{cls.totalPlayers} / {cls.capacity}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${(cls.totalPlayers / (cls.capacity || 1)) >= 1
                                ? "bg-rose-500"
                                : (cls.totalPlayers / (cls.capacity || 1)) >= 0.8
                                  ? "bg-amber-500"
                                  : "bg-[#0047FF]"
                              }`}
                            style={{ width: `${Math.min(100, (cls.totalPlayers / (cls.capacity || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="text-slate-700 dark:text-slate-300 font-bold">{cls.program?.name || "N/A"}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {cls.term?.name || "N/A"} {cls.term?.year ? `(${cls.term.year})` : ""}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="text-slate-700 dark:text-slate-300 font-bold capitalize">
                        {cls.dayOfWeek?.toLowerCase() || "—"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{cls.startTime} – {cls.endTime}</div>
                    </td>
                    <td className="py-4 px-3 font-semibold text-slate-600 dark:text-slate-400">
                      {cls.venue || cls.location || "N/A"}
                    </td>
                    <td className="py-4 px-3">
                      <Badge color={cls.status === "INACTIVE" ? "warning" : "success"}>
                        {cls.status || "ACTIVE"}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="inline-flex items-center justify-center w-7 h-7 bg-white border border-slate-200 hover:bg-slate-50 text-slate-400 transition-colors shadow-sm"
                        title="More Options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === cls.classId ? null : cls.classId);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openDropdownId === cls.classId && (
                        <div className="absolute right-8 top-10 w-36 bg-white dark:bg-slate-800 rounded-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 z-50 py-1.5 overflow-hidden">
                          <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClassId(cls.classId);
                              setOpenDropdownId(null);
                            }}
                          >
                            View Players
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {!loading && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalClasses}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      <ViewClassPlayersModal
        isOpen={!!selectedClassId}
        onClose={() => setSelectedClassId(null)}
        classId={selectedClassId}
      />
    </div>
  );
}
