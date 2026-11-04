import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiClient";
import { useTerms } from "../../hooks/useTerms";
import { useClassFullTable, useMarkSingleAttendance, useMarkBulkAttendance, useAssignClassesToPlayer, useRemoveClassFromPlayer, useClassesForAssign, useTransferClass } from "../../hooks/usePlayers";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import GenerateInvoiceModal from "../InvoiceManagement/GenerateInvoiceModal";
import PlayerDetailCard from "../players/PlayerDetailCard";
import AddCoachNoteModal from "../CoachManagement/AddCoachNoteModal";
import { chatApi } from "../../services/chatApi";
import ChatActionButton from "../chat/ChatActionButton";
import { getPlayerStatusTextClass, StatusIcon, StatusUpdateMenuList } from "../common/StatusColorCode";
import { AttendanceCellFlag, AttendanceStatusDropdown } from "../common/AttendanceReasonMenu";
import { Ban, CalendarCheck, CheckCircle2, Copy, Eye, FileText, Mail, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { formatDateOnly, toDateOnly } from "../../utils/dateTime";
import { sortPlayersByPaymentStatus } from "../../utils/paymentStatus";
import { useCoachAccess } from "../../hooks/useCoachAccess";
import { updateClassSessionDay } from "../../api/adminApi";

interface ClassFullTableProps {
  classId: string;
  timeSlotStr: string;
  categoryId?: string;
  programId?: string;
  categoryName?: string;
  programName?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  index?: number;
  hideHeader?: boolean;
  occurrenceDay?: string;
  instanceId?: string;
  classSummary?: any;
  isHighlighted?: boolean;
  onEditClass?: (classId: string) => void;
  onDuplicateClass?: (classId: string) => void;
  onDeleteClass?: (classId: string) => void;
  onCreateClassChat?: (classId: string) => void;
}

export default function ClassFullTable({ classId, timeSlotStr, categoryId, programId, categoryName, programName, isExpanded = true, onToggle, index, hideHeader = false, isHighlighted = false, onEditClass, onDuplicateClass, onDeleteClass, onCreateClassChat, occurrenceDay, instanceId, classSummary }: ClassFullTableProps) {
  const access = useCoachAccess();
  const canMarkAttendance = access.can("attendance", "edit");
  const canAssignPlayers = access.can("players", "assign");
  const { data: fullSchedule, isLoading, isError, refetch } = useClassFullTable(classId, { enabled: !classSummary || isExpanded });
  const schedule = fullSchedule || classSummary;
  const navigate = useNavigate();
  const openParentChat = (row: any) => {
    const rawParent = row.parent?.id || row.parent?._id || row.parentId || row.parent;
    const parentId = typeof rawParent === "object" ? rawParent?._id || rawParent?.id : rawParent;
    return parentId
      ? chatApi.openDirectChat(String(parentId), { classId })
      : Promise.reject(new Error("Parent ID not found for this player."));
  };
  const markSingleMutation = useMarkSingleAttendance(classId);
  const markBulkMutation = useMarkBulkAttendance(classId);
  const assignClassesMutation = useAssignClassesToPlayer();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingDropData, setPendingDropData] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("TRIAL");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const [openAttendanceMenu, setOpenAttendanceMenu] = useState<{
    playerId: string;
    sessionDate: string;
    currentStatus: string;
    currentReason?: string;
    markedByParent?: boolean;
    playerName?: string;
  } | null>(null);
  const [attendanceMenuPos, setAttendanceMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [openDayMenu, setOpenDayMenu] = useState<string | null>(null);
  const [dayMenuPos, setDayMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedDayOnly, setSelectedDayOnly] = useState<string | null>(null);
  const [dayActionDialog, setDayActionDialog] = useState<{ sessionDate: string; action: "NOTE" | "CANCEL" } | null>(null);
  const [dayActionText, setDayActionText] = useState("");
  const [dayActionPending, setDayActionPending] = useState(false);

  const updatePosition = () => {
    if (!openMenuId) return;
    const trigger = document.getElementById(`trigger-${instanceId || classId}-${openMenuId}`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 240;

    const menuEl = document.getElementById(`portal-action-menu-${instanceId || classId}`);
    const menuHeight = menuEl ? menuEl.offsetHeight : 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + window.scrollY;
    let placement: 'top' | 'bottom' = 'bottom';

    // If space below is not enough, open upward
    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      top = rect.top - menuHeight + window.scrollY;
      placement = 'top';
    }

    let left = rect.right - menuWidth + window.scrollX;
    if (left < 0) {
      left = rect.left + window.scrollX;
    }

    setMenuPosition({ top, left, placement });
  };

  useEffect(() => {
    if (openMenuId) {
      updatePosition();

      const handle = requestAnimationFrame(() => {
        updatePosition();
      });

      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        cancelAnimationFrame(handle);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    } else {
      setMenuPosition(null);
    }
  }, [openMenuId]);

  useEffect(() => {
    if (!openMenuId) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const menu = document.getElementById(`portal-action-menu-${instanceId || classId}`);
      const trigger = document.getElementById(`trigger-${instanceId || classId}-${openMenuId}`);
      if (menu && !menu.contains(e.target as Node) && trigger && !trigger.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!openAttendanceMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const menu = document.getElementById("portal-attendance-menu");
      if (menu && !menu.contains(e.target as Node)) {
        setOpenAttendanceMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAttendanceMenu(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openAttendanceMenu]);

  useEffect(() => {
    if (!openDayMenu) {
      setDayMenuPos(null);
      return;
    }
    const menu = document.getElementById("portal-class-day-menu");
    const trigger = document.getElementById(`day-action-trigger-${instanceId || classId}-${openDayMenu}`);
    const handleOutsideClick = (event: MouseEvent) => {
      if (menu && !menu.contains(event.target as Node) && trigger && !trigger.contains(event.target as Node)) {
        setOpenDayMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDayMenu(null);
    };
    const handleScroll = () => setOpenDayMenu(null);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openDayMenu, instanceId, classId]);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);
  const removeClassMutation = useRemoveClassFromPlayer();
  const transferClassMutation = useTransferClass();
  const [transferPlayer, setTransferPlayer] = useState<any | null>(null);
  const [assignPlayer, setAssignPlayer] = useState<any | null>(null);

  const { terms: allTerms } = useTerms(
    { isEvent: "all" },
    { enabled: !!(transferPlayer || assignPlayer) }
  );

  const { data: classesForAssignRes, isLoading: loadingClasses } = useClassesForAssign(
    categoryId || "",
    programId || "",
    (!!transferPlayer || !!assignPlayer) && !!categoryId && !!programId
  );
  const classesForAssign = classesForAssignRes?.data || [];

  const handleTransferSubmit = async (targetClassId: string) => {
    if (!transferPlayer || !targetClassId) return;

    try {
      await transferClassMutation.mutateAsync({
        userId: transferPlayer.playerId,
        fromClassId: classId,
        toClassId: targetClassId,
      });

      toast.success("Player transferred successfully");
      setTransferPlayer(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || "Failed to transfer player");
    }
  };

  const handleAssignSubmit = async (targetClassId: string) => {
    if (!assignPlayer || !targetClassId) return;

    try {
      await assignClassesMutation.mutateAsync({
        playerId: assignPlayer.playerId,
        classIds: [targetClassId],
        paymentStatus: assignPlayer.paymentStatus || "TRIAL"
      });
      setAssignPlayer(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const [invoicePlayer, setInvoicePlayer] = useState<any | null>(null);
  const [coachNotePlayer, setCoachNotePlayer] = useState<{ playerId: string; name: string; classId?: string } | null>(null);

  const handleUpdateStatus = async (userId: string, paymentStatus: string) => {
    try {
      const payload: any = { paymentStatus };
      if (classId) {
        payload.classId = classId;
      }
      await apiClient.put(`/api/admin/updatePaymentStatus/${userId}`, payload);
      toast.success("Status updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["classFullTable", classId] });
      queryClient.invalidateQueries({ queryKey: ["academySchedule"] });
      queryClient.invalidateQueries({ queryKey: ["myClassesList"] });
    } catch (error: any) {
      console.error("Failed to update status", error);
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  if (isLoading && !schedule) {
    return <div className="p-4 text-center text-sm text-slate-500">Loading class data...</div>;
  }

  if (!schedule) {
    return <div role="alert" className="p-4 text-sm text-slate-600">Unable to load class data. <button type="button" onClick={() => refetch()} className="underline">Retry</button></div>;
  }

  // Map API response to the table format
  const sessions = (schedule.sessions || []).filter((value: string) => {
    if (!occurrenceDay) return true;
    const normalized = toDateOnly(value);
    const weekday = normalized ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${normalized}T00:00:00Z`).getUTCDay()] : "";
    return weekday.toUpperCase() === occurrenceDay.toUpperCase();
  });
  const sessionDetails = schedule.sessionDetails || {};
  const visibleSessions = selectedDayOnly ? sessions.filter((date: string) => date === selectedDayOnly) : sessions;
  const isSessionCancelled = (date: string) => sessionDetails[date]?.status === "CANCELLED";
  const players = sortPlayersByPaymentStatus(
    schedule.players || [],
    (player: any) => player.paymentStatus || player.status
  );

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <div className="flex justify-center text-emerald-600">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "ABSENT":
        return (
          <div className="flex justify-center text-rose-600">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "LATE":
        return (
          <div className="flex justify-center text-amber-500">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "NOT_MARKED":
      default:
        return (
          <div className="flex justify-center text-slate-300 dark:text-slate-700">
            <span className="font-semibold">—</span>
          </div>
        );
    }
  };

  const handleToggleAttendance = (
    playerId: string,
    sessionDate: string,
    currentStatus: string,
    e: React.MouseEvent,
    currentReason?: string,
    markedByParent?: boolean,
    playerName?: string
  ) => {
    e.stopPropagation();
    if (isSessionCancelled(sessionDate)) {
      toast.error("This class session is cancelled; attendance cannot be changed.");
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 240;
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;
    if (rect.bottom + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight + window.scrollY;
    }
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 10;
    }

    setAttendanceMenuPos({ top, left });
    setOpenAttendanceMenu({
      playerId,
      sessionDate,
      currentStatus,
      currentReason: currentReason || "",
      markedByParent: markedByParent || false,
      playerName: playerName || "",
    });
  };

  const handleSetAttendanceStatus = (status: string, reason?: string) => {
    if (!openAttendanceMenu) return;
    markSingleMutation.mutate({
      sessionDate: openAttendanceMenu.sessionDate,
      playerId: openAttendanceMenu.playerId,
      status,
      reason,
    });
    setOpenAttendanceMenu(null);
  };

  const handleMarkAllPresent = (sessionDate: string) => {
    if (isSessionCancelled(sessionDate)) {
      toast.error("This class session is cancelled.");
      return;
    }
    const records = players.map((p: any) => ({
      player: p.playerId,
      status: "PRESENT",
    }));

    if (!records.length) {
      toast.error("No players are assigned to this class.");
      return;
    }

    markBulkMutation.mutate({
      sessionDate,
      records,
    });
  };

  const handleOpenDayMenu = (sessionDate: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 208;
    const estimatedHeight = 270;
    setDayMenuPos({
      top: rect.bottom + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - estimatedHeight) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right + 4 - width, window.innerWidth - width - 8)),
    });
    setOpenDayMenu((current) => current === sessionDate ? null : sessionDate);
  };

  const openDayDialog = (sessionDate: string, action: "NOTE" | "CANCEL") => {
    const details = sessionDetails[sessionDate] || {};
    setDayActionDialog({ sessionDate, action });
    setDayActionText(action === "NOTE" ? details.note || "" : details.cancellationReason || "");
    setOpenDayMenu(null);
  };

  const notifyClassParents = async (sessionDate: string, action: "CANCEL" | "RESTORE", reason?: string) => {
    const dateLabel = formatDateOnly(sessionDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const message = action === "CANCEL"
      ? `Class cancelled for ${dateLabel}. Reason: ${reason}`
      : `Class on ${dateLabel} is back on as scheduled.`;
    await chatApi.broadcastToClass(classId, message);
  };

  const handleSaveDayAction = async () => {
    if (!dayActionDialog) return;
    const { sessionDate, action } = dayActionDialog;
    const text = dayActionText.trim();
    if (action === "CANCEL" && !text) {
      toast.error("Add a cancellation reason so families know why class is cancelled.");
      return;
    }
    setDayActionPending(true);
    try {
      await updateClassSessionDay(classId, {
        sessionDate,
        action,
        ...(action === "NOTE" ? { note: text } : { reason: text }),
      });
      await queryClient.invalidateQueries({ queryKey: ["classFullTable", classId] });
      setDayActionDialog(null);
      if (action === "CANCEL") {
        try {
          await notifyClassParents(sessionDate, "CANCEL", text);
          toast.success("Class cancelled; the reason was posted to class chat and notifications sent to parents.");
        } catch (error: any) {
          toast.error(`Class cancelled, but the chat notification could not be sent: ${error?.response?.data?.message || error.message || "Please retry from class chat."}`);
        }
      } else {
        toast.success("Admin note saved for this class date.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Unable to update this class date.");
    } finally {
      setDayActionPending(false);
    }
  };

  const handleRestoreClassDay = async (sessionDate: string) => {
    setOpenDayMenu(null);
    try {
      await updateClassSessionDay(classId, { sessionDate, action: "RESTORE" });
      await queryClient.invalidateQueries({ queryKey: ["classFullTable", classId] });
      try {
        await notifyClassParents(sessionDate, "RESTORE");
        toast.success("Class restored; parents have been notified in class chat.");
      } catch (error: any) {
        toast.error(`Class restored, but the chat notification could not be sent: ${error?.response?.data?.message || error.message || "Please retry from class chat."}`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Unable to restore this class date.");
    }
  };

  const formatDateLabel = (dateStr: string) => {
    return {
      day: formatDateOnly(dateStr, { weekday: 'short' }),
      date: formatDateOnly(dateStr, { day: 'numeric', month: '2-digit' })
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canAssignPlayers) return;
    dragCounter.current = 0;
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.playerId) {
        setPendingDropData(data);
        setSelectedStatus(data.paymentStatus || "TRIAL");
        setIsConfirmModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to parse drop data", err);
    }
  };

  const confirmAssignment = () => {
    if (pendingDropData) {
      assignClassesMutation.mutate({
        playerId: pendingDropData.playerId,
        classIds: [classId],
        paymentStatus: selectedStatus,
        registrationRequestId: pendingDropData.registrationRequestId,
      });
      setIsConfirmModalOpen(false);
      setPendingDropData(null);
    }
  };

  return (
    <div
      id={instanceId || `class-card-${classId}`}
      className={`relative border overflow-hidden shadow-theme-xs transition-all duration-300 ${
        isHighlighted
          ? "border-[#0047FF] ring-4 ring-blue-500/30 dark:ring-blue-400/30 shadow-xl"
          : "border-slate-100 dark:border-slate-800"
      } bg-white dark:bg-slate-900 ${
        assignClassesMutation.isPending ? "opacity-75" : ""
      }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 pointer-events-none z-[100] border-2 border-emerald-500 bg-emerald-500/10" />
      )}
      {/* Table Header Bar */}
      {!hideHeader && (
        <div
          className={`relative bg-[#031549] text-white px-5 py-2.5 flex flex-wrap gap-4 items-center justify-between ${onToggle ? 'cursor-pointer select-none' : ''}`}
          onClick={onToggle}
        >
          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold flex-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>{schedule.className}</span>
            </div>
            <div className="flex items-center gap-2">
              {index !== undefined && <span className="text-slate-300 font-bold">{index}.</span>}
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{timeSlotStr}</span>
            </div>
            {schedule.coach?.name && (
              <div className="flex items-center gap-1.5 text-slate-200">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Coach {schedule.coach.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-[4px] ml-auto sm:ml-4 border border-white/5 shadow-sm">
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-200">
                {categoryName || schedule.category?.name || "N/A"}
                <span className="mx-1.5 text-slate-400/60 font-normal text-xs">/</span>
                <span className="text-[#38bdf8]">{programName || schedule.program?.name || "N/A"}</span>
              </span>
            </div>
            {access.can("communication", "create") && access.can("parents", "read") && (players.length > 0 || Number(schedule.playerCount) > 0) && (
              <ChatActionButton
                contextLabel={schedule?.className || schedule?.name || "Class"}
                ensureRoom={() => chatApi.openClassChat(classId)}
                buttonText="Class Chat"
                className="flex items-center gap-1.5 border border-white/20 hover:bg-white/10 text-white px-3 py-1.5 rounded-[4px] text-[10px] font-semibold transition-all active:scale-95 cursor-pointer ml-2 shadow-sm"
              />
            )}
            {access.can("communication", "create") && access.can("parents", "read") && (
              <button
                type="button"
                title="Email players in this class"
                aria-label="Email players in this class"
                onClick={(event) => {
                  event.stopPropagation();
                  const params = new URLSearchParams({ audienceType: "CLASS", audienceId: classId });
                  navigate(`/email-campaigns?${params.toString()}`);
                }}
                className="ml-1 inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Mail size={13} />
                Email
              </button>
            )}
          </div>
          <div className="ml-2 pl-3 border-l border-white/10 shrink-0 flex items-center gap-1">
            {onEditClass && (
              <button
                type="button"
                aria-label="Edit class"
                title="Edit class"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClass(classId);
                }}
                className="inline-flex items-center justify-center w-7 h-7 text-slate-200 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors rounded"
              >
                <Pencil size={15} />
              </button>
            )}
            {onDuplicateClass && (
              <button
                type="button"
                aria-label="Duplicate class"
                title="Duplicate class"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateClass(classId);
                }}
                className="inline-flex items-center justify-center w-7 h-7 text-slate-200 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors rounded"
              >
                <Copy size={15} />
              </button>
            )}
            {onDeleteClass && (
              <button
                type="button"
                aria-label="Delete class"
                title="Delete class"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClass(classId);
                }}
                className="inline-flex items-center justify-center w-7 h-7 text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 border border-transparent hover:border-rose-300/30 transition-colors rounded"
              >
                <Trash2 size={15} />
              </button>
            )}
            {onToggle && (
              <button
                type="button"
                aria-label={isExpanded ? "Collapse class" : "Expand class"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="inline-flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded"
              >
                <svg className={`w-5 h-5 text-slate-300 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Attendance Grid Table */}
      {isExpanded && (
        <div className="overflow-x-auto custom-scrollbar">
          {selectedDayOnly && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-blue-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-blue-950/20">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Showing attendance for {formatDateOnly(selectedDayOnly, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
              <button type="button" onClick={() => setSelectedDayOnly(null)} className="font-bold text-[#0047FF] hover:underline">Show all days</button>
            </div>
          )}
          {isError && <div role="alert" className="p-4 text-sm text-rose-600">Unable to load the class roster. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
          {isLoading && <div role="status" className="p-4 text-sm">Loading class roster...</div>}
          <table className="w-full text-left border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="sticky left-0 z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1.5 text-center min-w-[35px] w-[35px] max-w-[35px] border-b border-slate-100 dark:border-slate-800">#</th>
                <th className="sticky left-[35px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1 text-center min-w-[40px] w-[40px] max-w-[40px] border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-center">
                    <span className="text-sm select-none" title="Payment Status">
                      💰
                    </span>
                  </div>
                </th>
                <th className="sticky left-[75px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-2.5 min-w-[160px] w-[160px] max-w-[160px] border-b border-slate-100 dark:border-slate-800">Player</th>
                <th className="sticky left-[235px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1.5 text-center min-w-[75px] w-[75px] max-w-[75px] border-b border-slate-100 dark:border-slate-800">DOB</th>
                <th className="sticky left-[310px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1 text-center min-w-[50px] w-[50px] max-w-[50px] border-b border-slate-100 dark:border-slate-800 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">Cond</th>
                {visibleSessions.map((sessionDate: string) => {
                  const formatted = formatDateLabel(sessionDate);
                  const details = sessionDetails[sessionDate] || {};
                  const isCancelled = details.status === "CANCELLED";
                  const hasAdminNote = Boolean(details.note);
                  return (
                    <th key={sessionDate} title={isCancelled ? `Class cancelled: ${details.cancellationReason || "No reason provided"}` : hasAdminNote ? `Admin note: ${details.note}` : undefined} className={`py-2 px-1.5 text-center min-w-[58px] font-semibold border-l relative ${isCancelled ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" : "border-slate-100 dark:border-slate-800/40"}`}>
                      <div className="flex items-start justify-center gap-0.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] text-slate-400 font-bold">{sessions.indexOf(sessionDate) + 1}</span>
                          <span className={isCancelled ? "text-rose-700 dark:text-rose-300" : "text-slate-500"}>{formatted.day}</span>
                          <span className={`font-bold ${isCancelled ? "text-rose-700 dark:text-rose-300" : "text-slate-500"}`}>{formatted.date}</span>
                        </div>
                        {canMarkAttendance && (
                          <button
                            id={`day-action-trigger-${instanceId || classId}-${sessionDate}`}
                            type="button"
                            aria-label={`Actions for ${formatDateOnly(sessionDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
                            aria-expanded={openDayMenu === sessionDate}
                            onClick={(event) => handleOpenDayMenu(sessionDate, event)}
                            className={`-mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${openDayMenu === sessionDate ? "border-blue-200 bg-blue-50 text-[#0047FF]" : "border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-700 dark:hover:border-slate-700 dark:hover:bg-slate-800"}`}
                          >
                            <MoreVertical size={13} />
                          </button>
                        )}
                      </div>
                      {isCancelled && <span className="mt-1 block text-[7px] font-black uppercase tracking-wide text-rose-600 dark:text-rose-300">Cancelled</span>}
                      {hasAdminNote && <FileText size={10} className="mx-auto mt-1 text-amber-500" aria-label="Admin note saved" />}
                    </th>
                  );
                })}
                <th className="sticky right-0 z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1 min-w-[40px] w-[40px] max-w-[40px] text-center border-l border-b border-slate-100 dark:border-slate-800 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]"></th>
              </tr>
            </thead>
            <tbody>
              {players.length > 0 ? players.map((row: any, idx: number) => (
                <tr key={row.playerId} className={`group border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 ${openMenuId === row.playerId ? 'relative z-30' : ''}`}>
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1.5 text-center font-bold text-slate-400 text-xs min-w-[35px] w-[35px] max-w-[35px] border-b border-slate-50 dark:border-slate-800/40">
                    {idx + 1}
                  </td>
                  <td 
                    className="sticky left-[35px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-2 text-center min-w-[40px] w-[40px] max-w-[40px] border-b border-slate-50 dark:border-slate-800/40"
                    title={["TRIAL", "TBC", "EXTRA", "OTHERS", "SUBSTITUTE"].includes((row.paymentStatus || "").toUpperCase()) ? (row.paymentStatus || "").toUpperCase() : undefined}
                  >
                    <StatusIcon status={row.paymentStatus} />
                  </td>
                  <td className="sticky left-[75px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-2.5 min-w-[160px] w-[160px] max-w-[160px] border-b border-slate-50 dark:border-slate-800/40">
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                      {row.profileImage ? (
                        <img
                          src={getMediaUrl(row.profileImage, getMediaFallback(row.name))}
                          alt={row.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getMediaFallback(row.name);
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#0A1930] text-white flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold">{row.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                        <button
                          onClick={() => setSelectedPlayer({
                            ...row,
                            _id: row.playerId || row._id || row.id,
                            playerId: row.playerId || row._id || row.id,
                            fullName: row.name,
                            dob: row.dob,
                            jerseyNumber: row.jerseyNumber || "-",
                            preferredFoot: row.preferredFoot || "N/A",
                            prefferedFoot: row.preferredFoot || "N/A",
                            status: row.paymentStatus || row.status || "PENDING",
                            paymentStatus: row.paymentStatus,
                            playerStatus: row.playerStatus || row.status || "ACTIVE",
                            isMedicalCondition: row.isMedicalCondition,
                            medicalConditionDetails: row.medicalConditionDetails,
                            medicalConditions: row.medicalConditions,
                            program: schedule?.program,
                            category: schedule?.category,
                            profileImage: row.profileImage,
                            rating: row.rating
                          })}
                          title={row.name}
                          className={`font-bold text-left hover:underline transition-all text-xs truncate leading-tight block w-full ${getPlayerStatusTextClass(row.paymentStatus || row.status)}`}
                        >
                          {row.name}
                        </button>
                        {/* Rating stars directly below player name */}
                        <div className="flex items-center gap-0.5 text-amber-400 mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg
                              key={i}
                              className={`w-2.5 h-2.5 ${(row.rating || 0) > i
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-200 fill-slate-200 dark:text-slate-700 dark:fill-slate-700"
                                }`}
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="sticky left-[235px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1.5 text-center font-semibold text-slate-500 min-w-[75px] w-[75px] max-w-[75px] border-b border-slate-50 dark:border-slate-800/40 text-xs">
                    {row.dob ? formatDateOnly(row.dob, { day: "2-digit", month: "2-digit", year: "numeric" }) || "-" : "-"}
                  </td>
                  <td className="sticky left-[310px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1 text-center min-w-[50px] w-[50px] max-w-[50px] border-b border-slate-50 dark:border-slate-800/40 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                    {row.isMedicalCondition ? (
                      <span className="text-rose-600 font-bold text-xs truncate block max-w-full" title={row.medicalConditionDetails || "Yes"}>
                        Yes
                      </span>
                    ) : (
                      <span className="text-slate-500 font-semibold text-xs">No</span>
                    )}
                  </td>
                  {visibleSessions.map((sessionDate: string) => {
                    const status = row.attendance?.[sessionDate] || "NOT_MARKED";
                    const attDetail = row.attendanceDetails?.[sessionDate];
                    const reason = attDetail?.reason || (typeof row.attendance?.[sessionDate] === 'object' ? row.attendance[sessionDate].reason : "");
                    const markedByParent = attDetail?.markedByParent || false;
                    const details = sessionDetails[sessionDate] || {};
                    const isCancelled = details.status === "CANCELLED";

                    return (
                      <td
                        key={sessionDate}
                        title={isCancelled ? `Class cancelled: ${details.cancellationReason || "No reason provided"}` : undefined}
                        className={`relative py-2 px-1.5 border-l transition-colors group/cell ${isCancelled ? "border-rose-100 bg-rose-50/70 dark:border-rose-900/30 dark:bg-rose-950/20" : "border-slate-50 dark:border-slate-800/20"} ${canMarkAttendance && !isCancelled ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50" : ""}`}
                        onClick={canMarkAttendance && !isCancelled ? (e) => handleToggleAttendance(row.playerId, sessionDate, status, e, reason, markedByParent, row.name) : undefined}
                      >
                        {isCancelled ? (
                          <div className="flex justify-center text-rose-500" aria-label="Class cancelled"><Ban size={13} /></div>
                        ) : (
                          <>
                            <AttendanceCellFlag reason={reason} markedByParent={markedByParent} status={status} />
                            {renderStatusIcon(status)}
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1 text-center min-w-[40px] w-[40px] max-w-[40px] border-l border-b border-slate-50 dark:border-slate-800/40 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] z-10">
                    <div className="flex items-center justify-center relative">
                      <button
                        id={`trigger-${instanceId || classId}-${row.playerId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === row.playerId ? null : row.playerId);
                        }}
                        className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 border rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm inline-flex items-center justify-center ${openMenuId === row.playerId ? 'border-[#0047FF] bg-blue-50/50 dark:bg-blue-950/20 text-[#0047FF]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
                      >
                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                    {openMenuId === row.playerId && menuPosition && createPortal(
                      <div
                        id={`portal-action-menu-${instanceId || classId}`}
                        style={{
                          position: "absolute",
                          top: `${menuPosition.top}px`,
                          left: `${menuPosition.left}px`,
                          width: "240px",
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-[99999] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 rounded-none flex flex-col"
                      >
                        {(() => {
                          return (
                            <>
                              {access.role === "COACH" && access.can("notes", "create") && <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setCoachNotePlayer({ playerId: row.playerId, name: row.name, classId });
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                              >Add Coach Note</button>}
                              {access.can("payments", "edit") && <StatusUpdateMenuList
                                currentStatus={row.paymentStatus}
                                onSelectStatus={(newStatus) => {
                                  setOpenMenuId(null);
                                  handleUpdateStatus(row.playerId, newStatus);
                                }}
                              />}
                              {access.can("communication", "create") && access.can("parents", "read") && <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                <ChatActionButton
                                  contextLabel={row.name || row.playerName || "Parent"}
                                  ensureRoom={() => openParentChat(row)}
                                  buttonText="Chat with Parent"
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                />
                              </div>}
                              {access.can("invoices", "create") && <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setInvoicePlayer({
                                      _id: row.playerId,
                                      name: row.name,
                                      parentId: row.parent?.id || row.parent?._id || row.parentId || row.parent,
                                      classId: classId
                                    });
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-1"
                                >
                                  Generate Invoice
                                </button>
                              </div>}
                              {canAssignPlayers && <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setTransferPlayer(row);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                  Transfer Class
                                </button>
                              </div>}
                              {canAssignPlayers && <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setAssignPlayer(row);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                  Assign to other class
                                </button>
                              </div>}
                              {canAssignPlayers && <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    if (window.confirm("Are you sure you want to remove this player from this class?")) {
                                      removeClassMutation.mutate({ userId: row.playerId, classId });
                                    }
                                  }}
                                  disabled={removeClassMutation.isPending}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                                >
                                  Remove Class
                                </button>
                              </div>}
                            </>
                          );
                        })()}
                      </div>,
                      document.body
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6 + visibleSessions.length} className="text-center py-4 text-sm text-slate-500">
                    No players in this class.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      )}

      {openDayMenu && dayMenuPos && createPortal(
        <div
          id="portal-class-day-menu"
          style={{ position: "fixed", top: `${dayMenuPos.top}px`, left: `${dayMenuPos.left}px` }}
          className="z-[99999] max-h-[calc(100vh-16px)] w-[208px] overflow-y-auto border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        >
          {(() => {
            const details = sessionDetails[openDayMenu] || {};
            const isCancelled = details.status === "CANCELLED";
            const dateLabel = formatDateOnly(openDayMenu, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            return (
              <>
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Day actions</span>
                  <span className="block text-xs font-bold text-slate-800 dark:text-white">{dateLabel}</span>
                  {isCancelled && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600"><Ban size={11} /> Class cancelled</span>}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedDayOnly(openDayMenu); setOpenDayMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Eye size={14} className="text-[#0047FF]" /> View only this day
                </button>
                {canMarkAttendance && (
                  <button
                    type="button"
                    disabled={isCancelled || markBulkMutation.isPending}
                    onClick={() => { setOpenDayMenu(null); handleMarkAllPresent(openDayMenu); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {markBulkMutation.isPending ? "Marking present..." : "Mark all present"}
                  </button>
                )}
                {access.can("communication", "create") && access.can("parents", "read") && (
                  <div onClickCapture={() => setOpenDayMenu(null)}>
                    <ChatActionButton
                      contextLabel={`${schedule.className || "Class"} · ${dateLabel}`}
                      ensureRoom={() => chatApi.openClassChat(classId)}
                      buttonText="Day chat"
                      title={`Open class chat for ${dateLabel}`}
                      className="flex w-full items-center gap-2 border-0 border-t border-slate-100 bg-transparent px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                    />
                  </div>
                )}
                {canMarkAttendance && (
                  <button
                    type="button"
                    onClick={() => openDayDialog(openDayMenu, "NOTE")}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <FileText size={14} className="text-amber-500" /> {details.note ? "Edit admin note" : "Add admin note"}
                  </button>
                )}
                {canMarkAttendance && (isCancelled ? (
                  <button
                    type="button"
                    onClick={() => handleRestoreClassDay(openDayMenu)}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  >
                    <CalendarCheck size={14} /> Restore class
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDayDialog(openDayMenu, "CANCEL")}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    <Ban size={14} /> Cancel class
                  </button>
                ))}
              </>
            );
          })()}
        </div>,
        document.body
      )}

      <Modal
        isOpen={Boolean(dayActionDialog)}
        onClose={() => { if (!dayActionPending) setDayActionDialog(null); }}
        className="max-w-md p-6"
      >
        <div className="pr-8">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {dayActionDialog?.action === "CANCEL" ? "Cancel class session" : "Admin note"}
          </h3>
          {dayActionDialog && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatDateOnly(dayActionDialog.sessionDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>}
        </div>
        <label htmlFor="class-day-action-text" className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">
          {dayActionDialog?.action === "CANCEL" ? "Cancellation reason (required)" : "Staff-only note"}
        </label>
        <textarea
          id="class-day-action-text"
          value={dayActionText}
          onChange={(event) => setDayActionText(event.target.value)}
          rows={4}
          maxLength={dayActionDialog?.action === "CANCEL" ? 500 : 1000}
          required={dayActionDialog?.action === "CANCEL"}
          placeholder={dayActionDialog?.action === "CANCEL" ? "For example: Class is cancelled today due to severe weather." : "Add an internal note for this class date..."}
          className="mt-2 w-full resize-none border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#0047FF] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <div className="mt-1 flex justify-between gap-3 text-[10px] text-slate-400">
          <span>{dayActionDialog?.action === "CANCEL" ? "Parents of enrolled players will receive a chat message and notification." : "Only staff can see this note."}</span>
          <span className="shrink-0">{dayActionText.length}/{dayActionDialog?.action === "CANCEL" ? 500 : 1000}</span>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <Button variant="outline" onClick={() => setDayActionDialog(null)} disabled={dayActionPending}>Cancel</Button>
          <Button
            onClick={handleSaveDayAction}
            disabled={dayActionPending || (dayActionDialog?.action === "CANCEL" && !dayActionText.trim())}
            className={dayActionDialog?.action === "CANCEL" ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/40" : ""}
          >
            {dayActionPending ? "Saving..." : dayActionDialog?.action === "CANCEL" ? "Cancel class" : "Save note"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} className="max-w-2xl p-6">
        <div className="w-full">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Confirm Assignment</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {categoryId && programId && pendingDropData?.categoryId && pendingDropData?.programId &&
              (categoryId !== pendingDropData.categoryId || programId !== pendingDropData.programId)
              ? "The player requested a different program or category than the one you are assigning them to. Please review the details below, choose status, and confirm assignment."
              : "Please select the player's status and confirm assignment of the player to this class."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase">Requested</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingDropData?.categoryName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Program:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingDropData?.programName || "N/A"}</span>
                </div>
                {pendingDropData?.preferredClasses && pendingDropData.preferredClasses.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 mt-3">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Preferred Classes:</span>
                    <ul className="space-y-1">
                      {pendingDropData.preferredClasses.map((c: any) => (
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
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{categoryName || schedule.category?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Program:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{programName || schedule.program?.name || "N/A"}</span>
                </div>
                <div className="pt-3 border-t border-blue-200 dark:border-blue-800/50 mt-3 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Class:</span>
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 inline-block">
                    {timeSlotStr} - {schedule.className}
                  </div>
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
                  onClick={() => setSelectedStatus(status.value)}
                  className={`p-4 border text-center rounded-none transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${selectedStatus === status.value ? status.activeClass + " ring-1 ring-offset-0 font-extrabold" : status.inactiveClass
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
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border border-transparent hover:border-slate-300 rounded-none"
            >
              Cancel
            </button>
            <button
              onClick={confirmAssignment}
              disabled={assignClassesMutation.isPending}
              className="px-6 py-2 text-sm font-bold bg-[#0047FF] text-white rounded-none hover:bg-blue-700 transition-colors shadow-theme-xs disabled:opacity-50"
            >
              {assignClassesMutation.isPending ? "Assigning..." : "Assign Player"}
            </button>
          </div>
        </div>
      </Modal>

      <GenerateInvoiceModal
        isOpen={!!invoicePlayer}
        onClose={() => setInvoicePlayer(null)}
        player={invoicePlayer}
      />

      {selectedPlayer && (
        <PlayerDetailCard
          player={selectedPlayer}
          contextYear={schedule.term?.year}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {coachNotePlayer && (
        <AddCoachNoteModal
          isOpen={coachNotePlayer !== null}
          onClose={() => setCoachNotePlayer(null)}
          playerId={coachNotePlayer.playerId}
          playerName={coachNotePlayer.name}
          classId={coachNotePlayer.classId}
        />
      )}

      {/* Transfer Class Modal */}
      <Modal isOpen={!!transferPlayer} onClose={() => setTransferPlayer(null)} className="max-w-[450px] p-6 lg:p-8 rounded-none shadow-2xl">
        <h4 className="text-xl font-bold mb-2 tracking-tight">Transfer Player</h4>
        <p className="text-xs text-gray-500 mb-6 font-medium">
          Transfer <span className="text-[#031549] font-bold">{transferPlayer?.name}</span> to another class in this program.
        </p>

        {loadingClasses ? (
          <div className="text-center py-6 text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">
            Loading classes...
          </div>
        ) : classesForAssign.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 italic">
            No other classes available for this program.
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Select Target Class</label>
            {classesForAssign
              .filter((c: any) => c._id !== classId)
              .map((c: any) => (
                <button
                  key={c._id}
                  onClick={() => handleTransferSubmit(c._id)}
                  disabled={transferClassMutation.isPending}
                  className="w-full text-left p-4 border border-slate-200 dark:border-slate-700 hover:border-[#0047FF] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex justify-between items-center rounded-none group"
                >
                  <div className="flex flex-col gap-1 flex-grow min-w-0">
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-sm truncate">
                      {c.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        {c.category?.name || schedule.category?.name || categoryName || "Academy"}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 uppercase tracking-wider">
                        {c.program?.name || schedule.program?.name || programName || "Elite Program"}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="text-slate-500 font-semibold">
                        {(() => {
                          const matchedTermObj = allTerms.find(t => t._id === c.term);
                          return c.term?.name || (matchedTermObj ? `${matchedTermObj.name} (${matchedTermObj.year})` : "N/A Term");
                        })()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {c.dayOfWeek} ({c.startTime} - {c.endTime})
                      </span>
                    </div>
                  </div>
                  <span className="text-[#0047FF] font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    Transfer &rarr;
                  </span>
                </button>
              ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setTransferPlayer(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Assign Class Modal */}
      <Modal isOpen={!!assignPlayer} onClose={() => setAssignPlayer(null)} className="max-w-[450px] p-6 lg:p-8 rounded-none shadow-2xl">
        <h4 className="text-xl font-bold mb-2 tracking-tight">Assign Player to Class</h4>
        <p className="text-xs text-gray-500 mb-6 font-medium">
          Assign <span className="text-[#031549] font-bold">{assignPlayer?.name}</span> to another class in this program.
        </p>

        {loadingClasses ? (
          <div className="text-center py-6 text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">
            Loading classes...
          </div>
        ) : classesForAssign.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 italic">
            No other classes available for this program.
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Select Class to Assign</label>
            {classesForAssign
              .filter((c: any) => c._id !== classId)
              .map((c: any) => (
                <button
                  key={c._id}
                  onClick={() => handleAssignSubmit(c._id)}
                  disabled={assignClassesMutation.isPending}
                  className="w-full text-left p-4 border border-slate-200 dark:border-slate-700 hover:border-[#0047FF] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex justify-between items-center rounded-none group"
                >
                  <div className="flex flex-col gap-1 flex-grow min-w-0">
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-sm truncate">
                      {c.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        {c.category?.name || schedule.category?.name || categoryName || "Academy"}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 uppercase tracking-wider">
                        {c.program?.name || schedule.program?.name || programName || "Elite Program"}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="text-slate-500 font-semibold">
                        {(() => {
                          const matchedTermObj = allTerms.find(t => t._id === c.term);
                          return c.term?.name || (matchedTermObj ? `${matchedTermObj.name} (${matchedTermObj.year})` : "N/A Term");
                        })()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {c.dayOfWeek} ({c.startTime} - {c.endTime})
                      </span>
                    </div>
                  </div>
                  <span className="text-[#0047FF] font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    Assign &rarr;
                  </span>
                </button>
              ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setAssignPlayer(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Attendance Dropdown Portal with Reason & Flags */}
      {openAttendanceMenu && attendanceMenuPos && (
        <AttendanceStatusDropdown
          isOpen={Boolean(openAttendanceMenu)}
          position={attendanceMenuPos}
          currentStatus={openAttendanceMenu.currentStatus}
          currentReason={openAttendanceMenu.currentReason}
          markedByParent={openAttendanceMenu.markedByParent}
          playerName={openAttendanceMenu.playerName}
          sessionDateStr={openAttendanceMenu.sessionDate}
          onSelectStatus={handleSetAttendanceStatus}
          onClose={() => setOpenAttendanceMenu(null)}
        />
      )}
    </div>
  );
}
