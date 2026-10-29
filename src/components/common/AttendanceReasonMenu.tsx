// src/components/common/AttendanceReasonMenu.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Clock, X, RotateCcw, Flag, User, AlertCircle, Save } from "lucide-react";
import { formatDateOnly } from "../../utils/dateTime";

export interface AttendanceCellFlagProps {
  reason?: string;
  markedByParent?: boolean;
  status?: string;
}

/**
 * Corner flag shown in the top-right corner of an attendance cell when a reason is present.
 * Shows a rich tooltip on hover explaining why the player was Late or Absent.
 */
export const AttendanceCellFlag: React.FC<AttendanceCellFlagProps> = ({
  reason,
  markedByParent,
  status,
}) => {
  if (!reason || !reason.trim()) return null;

  return (
    <div
      className="absolute top-0 right-0 z-10 group/flag pointer-events-auto p-0.5 cursor-help"
      onClick={(e) => e.stopPropagation()}
      title={`${status ? `${status}: ` : ""}${reason}${markedByParent ? " (Reported by Parent)" : ""}`}
    >
      {/* Corner Red / Amber Marker */}
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 shadow-sm border border-white dark:border-slate-800"></span>
      </span>

      {/* Hover Tooltip Card */}
      <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/flag:flex flex-col whitespace-normal min-w-[170px] max-w-[240px] bg-slate-900/95 text-white text-[11px] rounded-md p-2.5 shadow-2xl z-[99999] pointer-events-none border border-slate-700 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between gap-1 border-b border-slate-800 pb-1 mb-1">
          <span className="font-bold text-[10px] tracking-wider uppercase text-rose-400 flex items-center gap-1">
            <Flag size={10} className="fill-rose-400" />
            {status || "Reason"}
          </span>
          {markedByParent && (
            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-semibold flex items-center gap-0.5">
              <User size={9} /> Parent Reported
            </span>
          )}
        </div>
        <p className="text-slate-100 text-xs font-medium leading-relaxed break-words">
          "{reason}"
        </p>
      </div>
    </div>
  );
};

export interface AttendanceStatusDropdownProps {
  isOpen: boolean;
  position: { top: number; left: number };
  currentStatus: string;
  currentReason?: string;
  markedByParent?: boolean;
  playerName?: string;
  sessionDateStr?: string;
  onSelectStatus: (status: string, reason?: string) => void;
  onClose: () => void;
}

/**
 * Unified Attendance Status & Reason Dropdown
 * Used across Academy (Classes), Leagues (Teams), and Events (Holiday Camps).
 */
export const AttendanceStatusDropdown: React.FC<AttendanceStatusDropdownProps> = ({
  isOpen,
  position,
  currentStatus,
  currentReason = "",
  markedByParent = false,
  playerName,
  sessionDateStr,
  onSelectStatus,
  onClose,
}) => {
  const [reasonInput, setReasonInput] = useState(currentReason);
  const quickReasons = ["Great session", "Good effort", "Needs follow-up", "Sick", "Traffic", "Doctor / Injury"];

  useEffect(() => {
    setReasonInput(currentReason || "");
  }, [currentReason]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById("portal-attendance-reason-menu");
      if (menu && !menu.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      id="portal-attendance-reason-menu"
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: "220px",
      }}
      className="z-[99999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-lg py-2 overflow-hidden text-xs flex flex-col animate-in fade-in zoom-in-95 duration-100"
      role="dialog"
      aria-label="Attendance and note"
    >
      {/* Optional Player / Date Header */}
      {(playerName || sessionDateStr) && (
        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850">
          {playerName && (
            <div className="font-bold text-gray-800 dark:text-white truncate text-xs">
              {playerName}
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{formatDateOnly(sessionDateStr) || sessionDateStr || "Mark Attendance"}</span>
            {markedByParent && (
              <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-bold">
                Parent Reported
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status Options */}
      <div className="p-1 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onSelectStatus("PRESENT", reasonInput);
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 rounded flex items-center justify-between transition-colors font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ${
            currentStatus === "PRESENT" ? "bg-emerald-50 dark:bg-emerald-950/50 font-bold" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <Check size={14} strokeWidth={2.5} />
            Present
          </span>
          {currentStatus === "PRESENT" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectStatus("LATE", reasonInput);
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 rounded flex items-center justify-between transition-colors font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 ${
            currentStatus === "LATE" ? "bg-amber-50 dark:bg-amber-950/50 font-bold" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <Clock size={14} strokeWidth={2.5} />
            Late
          </span>
          {currentStatus === "LATE" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectStatus("ABSENT", reasonInput);
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 rounded flex items-center justify-between transition-colors font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 ${
            currentStatus === "ABSENT" ? "bg-rose-50 dark:bg-rose-950/50 font-bold" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <X size={14} strokeWidth={2.5} />
            Absent
          </span>
          {currentStatus === "ABSENT" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectStatus("NOT_MARKED", reasonInput);
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 rounded flex items-center justify-between transition-colors font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 ${
            currentStatus === "NOT_MARKED" ? "bg-slate-100 dark:bg-slate-700 font-bold" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <RotateCcw size={13} strokeWidth={2} />
            Clear Status
          </span>
        </button>
      </div>

      {/* Reason for Late / Absent Section */}
      <div className="border-t border-slate-100 dark:border-slate-700 p-2.5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Flag size={10} className="text-rose-500" />
            Note:
          </label>
        </div>

        <input
          type="text"
          placeholder="Add a session note..."
          aria-label="Session note"
          maxLength={2000}
          value={reasonInput}
          onChange={(e) => setReasonInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const targetStatus = currentStatus || "NOT_MARKED";
              onSelectStatus(targetStatus, reasonInput);
              onClose();
            }
          }}
          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100 outline-none focus:border-[#0047FF] transition-all"
        />

        {/* Quick Reason Chips */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {quickReasons.map((qr) => (
            <button
              key={qr}
              type="button"
              onClick={() => setReasonInput(qr)}
              className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-[#0047FF] transition-colors"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Save Reason Button */}
        <button
          type="button"
          onClick={() => {
            const targetStatus = currentStatus || "NOT_MARKED";
            onSelectStatus(targetStatus, reasonInput);
            onClose();
          }}
          className="mt-1 w-full py-1 px-2 bg-[#0047FF] hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
        >
          <Save size={11} />
          Save Note
        </button>
      </div>
    </div>,
    document.body
  );
};
