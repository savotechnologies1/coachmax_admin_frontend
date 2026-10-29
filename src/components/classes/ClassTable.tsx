import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import Badge from "../../components/ui/badge/Badge";
import { MoreVertical, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import ChatActionButton from "../chat/ChatActionButton";
import { chatApi } from "../../services/chatApi";
import ClassFullTable from "../academy/ClassFullTable";

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
  term?: { _id?: string; name: string; year: number } | any;
  program?: { _id?: string; name: string } | any;
  category?: { _id?: string; name: string } | any;
  coach?: { name: string };
  players?: any[];
  broadcastChatRoomId?: string;
}

interface ClassTableProps {
  classes: ClassItem[];
  isLoading: boolean;
  onEditClass?: (cls: ClassItem) => void;
  onViewPlayers?: (cls: ClassItem) => void;
  onDeleteClass?: (cls: ClassItem) => void;
  onBroadcastClass?: (cls: ClassItem) => void;
}

export default function ClassTable({ classes, isLoading, onEditClass, onViewPlayers, onDeleteClass, onBroadcastClass }: ClassTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [expandedClassIds, setExpandedClassIds] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const toggleExpandClass = (classId: string) => {
    setExpandedClassIds((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  const handleNavigateToProgram = (cls: ClassItem) => {
    const categoryName = cls.category?.name || "Academy";
    const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/program/${categorySlug}`, {
      state: {
        categoryId: cls.category?._id || cls.category,
        categoryName: categoryName,
        programId: cls.program?._id || cls.program,
        programName: cls.program?.name,
        termId: cls.term?._id || cls.term,
        year: cls.term?.year?.toString(),
        day: cls.dayOfWeek,
        classId: cls._id,
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="bg-white border border-slate-100 rounded-none shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs [&_th]:border [&_th]:border-slate-700/50 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700">
          <thead>
            <tr className="bg-[#020e33] text-white text-[10px] font-bold uppercase tracking-wider select-none">
              <th className="py-3 px-4 w-[50px] text-white font-black">#</th>
              <th className="py-3 px-3 min-w-[150px] text-white font-black">Name</th>
              <th className="py-3 px-3 min-w-[140px] text-white font-black">Program / Term</th>
              <th className="py-3 px-3 min-w-[120px] text-white font-black">Schedule</th>
              <th className="py-3 px-3 min-w-[120px] text-white font-black">Location</th>
              <th className="py-3 px-3 min-w-[120px] text-white font-black">Coach</th>
              <th className="py-3 px-3 min-w-[80px] text-white font-black">Status</th>
              <th className="py-3 px-3 min-w-[110px] text-white font-black">Chat</th>
              <th className="py-3 px-4 w-[85px] min-w-[85px] text-right text-white font-black">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500 font-semibold">
                  Loading classes...
                </td>
              </tr>
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500 font-semibold">
                  No classes found.
                </td>
              </tr>
            ) : (
              classes.map((cls, idx) => {
                const isRowExpanded = !!expandedClassIds[cls._id];
                return (
                  <React.Fragment key={cls._id}>
                    <tr
                      onClick={() => toggleExpandClass(cls._id)}
                      className={`transition-colors cursor-pointer group select-none ${
                        isRowExpanded
                          ? "bg-[#031549] text-white border-b border-[#031549] shadow-md"
                          : "border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-900 dark:text-white"
                      }`}
                    >
                      <td className={`py-4 px-4 font-semibold ${isRowExpanded ? "text-white font-bold" : "text-slate-500"}`}>
                        {idx + 1}
                      </td>
                      <td className="py-4 px-3">
                        <div className={`font-bold text-sm transition-colors ${
                          isRowExpanded ? "text-white hover:text-blue-200" : "text-slate-800 dark:text-slate-200 group-hover:text-[#0047FF]"
                        }`}>
                          {cls.name}
                        </div>
                        {isRowExpanded && (
                          <div className="text-[10px] text-blue-300 font-semibold mt-0.5">
                            Attendance Active
                          </div>
                        )}
                        <div className="mt-1.5 w-full max-w-[140px]">
                          <div className={`flex justify-between items-center text-[10px] font-semibold mb-1 ${
                            isRowExpanded ? "text-slate-300" : "text-slate-500"
                          }`}>
                            <span>Capacity</span>
                            <span>{cls.players?.length || 0} / {cls.capacity}</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                            isRowExpanded ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
                          }`}>
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                ((cls.players?.length || 0) / (cls.capacity || 1)) >= 1
                                  ? "bg-rose-500"
                                  : ((cls.players?.length || 0) / (cls.capacity || 1)) >= 0.8
                                    ? "bg-amber-500"
                                    : isRowExpanded ? "bg-blue-400" : "bg-[#0047FF]"
                              }`}
                              style={{ width: `${Math.min(100, ((cls.players?.length || 0) / (cls.capacity || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className={`font-bold transition-colors ${
                          isRowExpanded ? "text-white" : "text-slate-700 dark:text-slate-300 group-hover:text-[#0047FF]"
                        }`}>
                          {cls.program?.name || "N/A"}
                        </div>
                        <div className={`text-xs mt-0.5 ${
                          isRowExpanded ? "text-slate-300" : "text-slate-500"
                        }`}>
                          {cls.term?.name || "N/A"} ({cls.term?.year || ""})
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className={`font-bold capitalize ${
                          isRowExpanded ? "text-white" : "text-slate-700 dark:text-slate-300"
                        }`}>
                          {cls.dayOfWeek?.toLowerCase()}
                        </div>
                        <div className={`text-xs mt-0.5 ${
                          isRowExpanded ? "text-slate-300" : "text-slate-500"
                        }`}>
                          {cls.startTime} - {cls.endTime}
                        </div>
                      </td>
                      <td className={`py-4 px-3 font-semibold ${
                        isRowExpanded ? "text-slate-200" : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {cls.location}
                      </td>
                      <td className={`py-4 px-3 font-semibold ${
                        isRowExpanded ? "text-slate-200" : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {cls.coach?.name || "Unassigned"}
                      </td>
                      <td className="py-4 px-3">
                        <Badge color={cls.status === "ACTIVE" ? "success" : "warning"}>
                          {cls.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-3">
                        <ChatActionButton
                          contextLabel={cls.name}
                          ensureRoom={() => chatApi.openClassChat(cls._id)}
                          buttonText="Chat"
                          className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-[4px] text-[10px] font-semibold transition-all active:scale-95 cursor-pointer shadow-sm ${
                            isRowExpanded
                              ? "border-white/20 bg-white/10 hover:bg-white/20 text-white"
                              : "border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700/50"
                          }`}
                          title="Open class chat"
                        />
                      </td>
                      <td className="py-4 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandClass(cls._id);
                            }}
                            className={`inline-flex items-center justify-center w-7 h-7 border transition-all shadow-sm cursor-pointer ${
                              isRowExpanded
                                ? "bg-[#0047FF] text-white border-[#0047FF] hover:bg-blue-600 shadow-md"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            }`}
                            title={isRowExpanded ? "Collapse Class Attendance" : "Expand Class Attendance"}
                          >
                            {isRowExpanded ? (
                              <ChevronUp size={16} className="stroke-[2.5]" />
                            ) : (
                              <ChevronDown size={16} className="stroke-[2.5]" />
                            )}
                          </button>

                          <button
                            className={`inline-flex items-center justify-center w-7 h-7 border transition-colors shadow-sm cursor-pointer ${
                              isRowExpanded
                                ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                            }`}
                            title="More Options"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({
                                top: rect.bottom + window.scrollY,
                                left: rect.right - 150 + window.scrollX,
                              });
                              setOpenDropdownId(openDropdownId === cls._id ? null : cls._id);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>

                        {openDropdownId === cls._id && menuPosition && createPortal(
                          <div
                            style={{
                              position: "absolute",
                              top: `${menuPosition.top}px`,
                              left: `${menuPosition.left}px`,
                            }}
                            className="w-40 bg-white dark:bg-slate-800 rounded-none shadow-xl border border-slate-200 dark:border-slate-700 z-[99999] py-1.5 overflow-hidden text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandClass(cls._id);
                                setOpenDropdownId(null);
                              }}
                            >
                              <span>{isRowExpanded ? "Collapse Details" : "Expand Details"}</span>
                              {isRowExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 flex items-center justify-between"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToProgram(cls);
                                setOpenDropdownId(null);
                              }}
                            >
                              <span>Go to Program</span>
                              <ExternalLink size={13} className="text-slate-400" />
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onEditClass) onEditClass(cls);
                                setOpenDropdownId(null);
                              }}
                            >
                              Edit Class
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onViewPlayers) onViewPlayers(cls);
                                setOpenDropdownId(null);
                              }}
                            >
                              View Players
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-[#0047FF] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors border-t border-slate-100 dark:border-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onBroadcastClass) onBroadcastClass(cls);
                                setOpenDropdownId(null);
                              }}
                            >
                              Send Announcement
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors border-t border-slate-100 dark:border-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteClass) onDeleteClass(cls);
                                setOpenDropdownId(null);
                              }}
                            >
                              Delete Class
                            </button>
                          </div>,
                          document.body
                        )}
                      </td>
                    </tr>
                    {isRowExpanded && (
                      <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                        <td colSpan={9} className="p-0 border-b-2 border-slate-200 dark:border-slate-700 w-full">
                          <div className="bg-white dark:bg-slate-900 overflow-hidden">
                            <ClassFullTable
                              classId={cls._id}
                              index={idx + 1}
                              categoryId={cls.category?._id || cls.category}
                              categoryName={cls.category?.name}
                              programId={cls.program?._id || cls.program}
                              programName={cls.program?.name}
                              timeSlotStr={`${cls.startTime} - ${cls.endTime}`}
                              isExpanded={true}
                              hideHeader={true}
                              onCreateClassChat={() => onBroadcastClass?.(cls)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

