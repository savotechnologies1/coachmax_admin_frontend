import { formatDateOnly } from "../../utils/dateTime";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiClient";
import { unassignPlayersFromTeam, updateTeamSessionDay } from "../../api/adminApi";
import {
  useTeamFullTable,
  useMarkSingleTeamAttendance,
  useMarkTeamAttendance,
} from "../../hooks/usePlayers";
import GenerateInvoiceModal from "../InvoiceManagement/GenerateInvoiceModal";
import PlayerDetailCard from "../players/PlayerDetailCard";
import AddCoachNoteModal from "../CoachManagement/AddCoachNoteModal";
import EditPlayerStatsModal from "../players/EditPlayerStatsModal";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { getPlayerStatusTextClass, StatusIcon, StatusUpdateMenuList } from "../common/StatusColorCode";
import { AttendanceCellFlag, AttendanceStatusDropdown } from "../common/AttendanceReasonMenu";
import { Activity, Ban, CalendarCheck, CheckCircle2, Eye, FileText, MoreVertical } from "lucide-react";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { sortPlayersByPaymentStatus } from "../../utils/paymentStatus";
import { chatApi } from "../../services/chatApi";
import ChatActionButton from "../chat/ChatActionButton";
import { useCoachAccess } from "../../hooks/useCoachAccess";

interface TeamFullTableProps {
  teamId: string;
  leagueId?: string;
  teamName?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
  hideHeader?: boolean;
}

export default function TeamFullTable({
  teamId,
  leagueId,
  teamName = "Team",
  isExpanded = true,
  onToggle,
  className,
  hideHeader = false,
}: TeamFullTableProps) {
  const { can } = useCoachAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch Team Full Table Matrix
  const { data: scheduleData, isLoading } = useTeamFullTable(teamId, leagueId);

  // Attendance Mutations
  const markSingleMutation = useMarkSingleTeamAttendance(teamId, leagueId);
  const markBulkMutation = useMarkTeamAttendance(teamId, leagueId);

  // UI state for menus & modals
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [statsPlayer, setStatsPlayer] = useState<any | null>(null);
  const [invoicePlayer, setInvoicePlayer] = useState<any | null>(null);
  const [coachNotePlayer, setCoachNotePlayer] = useState<{
    playerId: string;
    name: string;
    teamId?: string;
  } | null>(null);
  const [unassignPlayer, setUnassignPlayer] = useState<any | null>(null);

  // Attendance menu states
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
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);
  const [dayActionDialog, setDayActionDialog] = useState<{ sessionDate: string; action: "NOTE" | "CANCEL" } | null>(null);
  const [dayActionText, setDayActionText] = useState("");
  const [dayActionPending, setDayActionPending] = useState(false);

  // Unassign Player Mutation
  const unassignMutation = useMutation({
    mutationFn: (playerId: string) => unassignPlayersFromTeam(teamId, [playerId]),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["teamFullTable", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(res?.message || "Player unassigned successfully!");
      setUnassignPlayer(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to unassign player");
    },
  });

  const updatePosition = () => {
    if (!openMenuId) return;
    const trigger = document.getElementById(`trigger-${openMenuId}`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 240;

    const menuEl = document.getElementById("portal-action-menu-team");
    const menuHeight = menuEl ? menuEl.offsetHeight : 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + window.scrollY;
    let placement: "top" | "bottom" = "bottom";

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      top = rect.top - menuHeight + window.scrollY;
      placement = "top";
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
      const menu = document.getElementById("portal-action-menu-team");
      const trigger = document.getElementById(`trigger-${openMenuId}`);
      if (
        menu &&
        !menu.contains(e.target as Node) &&
        trigger &&
        !trigger.contains(e.target as Node)
      ) {
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

  const openPlayerParentChat = (row: any) => {
    const rawParent = row.parent?.id || row.parent?._id || row.parentId || row.parent;
    const parentId = typeof rawParent === "object" ? rawParent?._id || rawParent?.id : rawParent;
    return parentId
      ? chatApi.openDirectChat(String(parentId), { teamId })
      : Promise.reject(new Error("Parent ID not found for this player."));
  };

  const schedule = scheduleData?.data || scheduleData || {};
  const sessions: string[] = schedule.sessions || [];
  const sessionDetails = schedule.sessionDetails || {};
  const visibleSessions = selectedDayFilter ? sessions.filter((sessionDate) => sessionDate === selectedDayFilter) : sessions;
  const isSessionCancelled = (sessionDate: string) => sessionDetails[sessionDate]?.status === "CANCELLED";
  const players: any[] = useMemo(
    () => sortPlayersByPaymentStatus(schedule.players || [], (player: any) => player.paymentStatus || player.status, (player: any) => player.playerName || player.name),
    [schedule.players]
  );

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <div className="flex justify-center text-emerald-600">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "ABSENT":
        return (
          <div className="flex justify-center text-rose-600">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "LATE":
        return (
          <div className="flex justify-center text-amber-500">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
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
      toast.error("This team session is cancelled; attendance cannot be changed.");
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
      toast.error("This team session is cancelled.");
      return;
    }
    if (!players.length) {
      toast.error("No players are assigned to this team.");
      return;
    }
    const records = players.map((p: any) => ({
      player: p.playerId,
      status: "PRESENT",
    }));

    markBulkMutation.mutate({
      sessionDate,
      records,
    });
  };

  const handleOpenDayMenu = (sessionDate: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 190;
    const estimatedHeight = 220;
    setDayMenuPos({
      top: rect.bottom + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - estimatedHeight) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right + 4 - width, window.innerWidth - width - 8)),
    });
    setOpenDayMenu((current) => current === sessionDate ? null : sessionDate);
  };

  const openDayActionDialog = (sessionDate: string, action: "NOTE" | "CANCEL") => {
    const details = sessionDetails[sessionDate] || {};
    setDayActionDialog({ sessionDate, action });
    setDayActionText(action === "NOTE" ? details.note || "" : details.cancellationReason || "");
    setOpenDayMenu(null);
  };

  const notifyTeamParents = async (sessionDate: string, action: "CANCEL" | "RESTORE", reason?: string) => {
    const dateLabel = formatDateOnly(sessionDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const text = action === "CANCEL"
      ? `${teamName} session cancelled for ${dateLabel}. Reason: ${reason}`
      : `${teamName} session on ${dateLabel} is back on as scheduled.`;
    await chatApi.broadcastToTeam(teamId, text);
  };

  const handleSaveDayAction = async () => {
    if (!dayActionDialog) return;
    const { sessionDate, action } = dayActionDialog;
    const text = dayActionText.trim();
    if (action === "CANCEL" && !text) {
      toast.error("Add a cancellation reason so families know why this session is cancelled.");
      return;
    }
    setDayActionPending(true);
    try {
      await updateTeamSessionDay(teamId, {
        sessionDate,
        action,
        ...(leagueId ? { leagueId } : {}),
        ...(action === "NOTE" ? { note: text } : { reason: text }),
      });
      await queryClient.invalidateQueries({ queryKey: ["teamFullTable", teamId] });
      setDayActionDialog(null);
      if (action === "CANCEL") {
        try {
          await notifyTeamParents(sessionDate, "CANCEL", text);
          toast.success("Team session cancelled; parents were notified in team chat.");
        } catch (error: any) {
          if (!error?._handled) toast.error(`Team session cancelled, but the parent notification could not be sent: ${error?.response?.data?.message || error.message || "Please retry from team chat."}`);
        }
      } else {
        toast.success("Admin note saved for this team session.");
      }
    } catch (error: any) {
      if (!error?._handled) toast.error(error?.response?.data?.message || error.message || "Unable to update this team session.");
    } finally {
      setDayActionPending(false);
    }
  };

  const handleRestoreTeamSession = async (sessionDate: string) => {
    setOpenDayMenu(null);
    try {
      await updateTeamSessionDay(teamId, {
        sessionDate,
        action: "RESTORE",
        ...(leagueId ? { leagueId } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["teamFullTable", teamId] });
      try {
        await notifyTeamParents(sessionDate, "RESTORE");
        toast.success("Team session restored; parents were notified in team chat.");
      } catch (error: any) {
        if (!error?._handled) toast.error(`Team session restored, but the parent notification could not be sent: ${error?.response?.data?.message || error.message || "Please retry from team chat."}`);
      }
    } catch (error: any) {
      if (!error?._handled) toast.error(error?.response?.data?.message || error.message || "Unable to restore this team session.");
    }
  };

  useEffect(() => {
    if (!openDayMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const menu = document.getElementById("portal-team-day-menu");
      const trigger = document.getElementById(`team-day-trigger-${openDayMenu}`);
      if (menu && !menu.contains(event.target as Node) && trigger && !trigger.contains(event.target as Node)) {
        setOpenDayMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDayMenu(null);
    };
    const closeOnScroll = () => setOpenDayMenu(null);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openDayMenu]);

  const getImageUrl = (path: string | undefined | null) => {
    return getMediaUrl(path) || null;
  };

  const formatDob = (value?: string) => value ? formatDateOnly(value) || "—" : "—";

  const handleUpdateStatus = async (userId: string, paymentStatus: string) => {
    try {
      const payload: any = { paymentStatus };
      if (teamId) {
        payload.teamId = teamId;
      }
      if (leagueId) {
        payload.leagueId = leagueId;
      }
      await apiClient.put(`/api/admin/updatePaymentStatus/${userId}`, payload);
      toast.success("Status updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["teamFullTable", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    } catch (error: any) {
      console.error("Failed to update status", error);
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  const formatDateLabel = (value: string) => ({ day: formatDateOnly(value, { weekday: "short" }), date: formatDateOnly(value) });

  return (
    <div className={`relative overflow-hidden w-full ${className ? className : "border shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-6"}`}>
      {/* Header Controls & Filter Bar */}
      {!hideHeader && (
      <div className="bg-[#031549] text-white px-5 py-3.5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold flex-1">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-sky-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="font-bold text-white uppercase tracking-wider">
              {teamName} Attendance Matrix
            </span>
            {schedule.round && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0047FF] text-white uppercase tracking-wider ml-1">
                Round {schedule.round} ({schedule.totalSessions || sessions.length} {((schedule.totalSessions || sessions.length) === 1) ? "Session" : "Sessions"})
              </span>
            )}
          </div>

        </div>

        {onToggle && (
          <button
            onClick={onToggle}
            className="ml-2 pl-3 border-l border-white/20 text-slate-300 hover:text-white"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>
      )}

      {/* Attendance Grid Table */}
      {isExpanded && (
        <div className="relative">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-2 border-[#0047FF] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold animate-pulse">
                Loading Team Attendance Matrix...
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              {selectedDayFilter && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-blue-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-blue-950/20">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Showing attendance for {formatDateOnly(selectedDayFilter, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <button type="button" onClick={() => setSelectedDayFilter(null)} className="font-bold text-[#0047FF] hover:underline">Show all days</button>
                </div>
              )}
              <table className="w-full text-left border-separate border-spacing-0 text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-900/80">
                    <th className="sticky left-0 z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1.5 text-center min-w-[35px] w-[35px] max-w-[35px] border-b border-slate-100 dark:border-slate-800">
                      #
                    </th>
                    <th className="sticky left-[35px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1 text-center min-w-[40px] w-[40px] max-w-[40px] border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center">
                        <span className="text-sm select-none" title="Payment Status">
                          💰
                        </span>
                      </div>
                    </th>
                    <th className="sticky left-[75px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-2 min-w-[180px] w-[180px] max-w-[180px] border-b border-slate-100 dark:border-slate-800">
                      Player
                    </th>
                    <th className="sticky left-[255px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1.5 text-center min-w-[90px] w-[90px] max-w-[90px] border-b border-slate-100 dark:border-slate-800">
                      DOB
                    </th>
                    <th className="sticky left-[345px] z-20 bg-[#f8fafc] dark:bg-slate-900 py-2.5 px-1 text-center min-w-[50px] w-[50px] max-w-[50px] border-b border-slate-100 dark:border-slate-800 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                      Cond
                    </th>

                    {/* Session Columns */}
                    {visibleSessions.map((sessionDate: string, idx: number) => {
                      const formatted = formatDateLabel(sessionDate);
                      const details = sessionDetails[sessionDate] || {};
                      const isCancelled = details.status === "CANCELLED";
                      const hasAdminNote = Boolean(details.note);
                      return (
                        <th
                          key={sessionDate}
                          title={isCancelled ? `Team session cancelled: ${details.cancellationReason || "No reason provided"}` : hasAdminNote ? `Admin note: ${details.note}` : undefined}
                          className={`py-2.5 px-1.5 text-center min-w-[55px] font-semibold border-l relative ${isCancelled ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" : "border-slate-100 dark:border-slate-800/40"}`}
                        >
                          {can("attendance", "edit") && (
                            <button
                              id={`team-day-trigger-${sessionDate}`}
                              type="button"
                              onClick={(event) => handleOpenDayMenu(sessionDate, event)}
                              aria-label={`Actions for ${formatted.day} ${formatted.date}`}
                              aria-expanded={openDayMenu === sessionDate}
                              className="absolute right-0.5 top-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                            >
                              <MoreVertical size={13} />
                            </button>
                          )}
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400 font-bold">
                              {sessions.indexOf(sessionDate) + 1}
                            </span>
                            <span className={isCancelled ? "text-rose-700 dark:text-rose-300" : "text-slate-500"}>{formatted.day}</span>
                            <span className={`font-bold ${isCancelled ? "text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-200"}`}>
                              {formatted.date}
                            </span>
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
                  {players.length > 0 ? (
                    players.map((row: any, idx: number) => (
                      <tr
                        key={row.playerId || idx}
                        className={`group border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${openMenuId === row.playerId ? "relative z-30" : ""
                          }`}
                      >
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1.5 text-center font-bold text-slate-400 text-xs min-w-[35px] w-[35px] max-w-[35px] border-b border-slate-50 dark:border-slate-800/40">
                          {idx + 1}
                        </td>
                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            const pId = row.playerId || row._id;
                            setOpenMenuId(openMenuId === pId ? null : pId);
                          }}
                          className="sticky left-[35px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-2 text-center min-w-[40px] w-[40px] max-w-[40px] border-b border-slate-50 dark:border-slate-800/40 cursor-pointer"
                          title={can("payments", "edit") ? "Open player actions and payment status" : "Open player actions"}
                        >
                          <StatusIcon status={row.paymentStatus || row.status} />
                        </td>

                        {/* Player Details */}
                        <td className="sticky left-[75px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-2 min-w-[180px] w-[180px] max-w-[180px] border-b border-slate-50 dark:border-slate-800/40">
                          {(() => {
                            const playerName =
                              row.playerName ||
                              row.name ||
                              `${row.firstName || ""} ${row.lastName || ""}`.trim() ||
                              "Player";

                            const avatarSrc = getMediaUrl(row.profileImage, getMediaFallback(playerName));

                            return (
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={avatarSrc!}
                                  alt={playerName}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                                  onClick={() => setSelectedPlayer(row)}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = getMediaFallback(playerName);
                                  }}
                                />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span
                                    onClick={() => setSelectedPlayer(row)}
                                    className={`font-bold truncate cursor-pointer transition-colors leading-tight block text-xs ${getPlayerStatusTextClass(row.paymentStatus || row.status)}`}
                                  >
                                    {playerName}
                                  </span>
                                  {row.jerseyNumber && (
                                    <span className="text-[9px] font-bold text-slate-400">
                                      #{row.jerseyNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* DOB */}
                        <td className="sticky left-[255px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1.5 text-center text-slate-600 dark:text-slate-300 font-medium text-[11px] min-w-[90px] w-[90px] max-w-[90px] border-b border-slate-50 dark:border-slate-800/40">
                          {formatDob(row.dob || row.dateOfBirth)}
                        </td>

                        {/* Condition */}
                        <td className="sticky left-[345px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1 text-center min-w-[50px] w-[50px] max-w-[50px] border-b border-slate-50 dark:border-slate-800/40 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                          <span
                            className={`font-semibold ${row.isMedicalCondition === true
                              ? "text-rose-600 font-bold"
                              : "text-slate-400"
                              }`}
                          >
                            {row.isMedicalCondition === true ? "Yes" : "No"}
                          </span>
                        </td>

                        {/* Session Attendance Cells */}
                        {visibleSessions.map((sessionDate: string) => {
                          const details = sessionDetails[sessionDate] || {};
                          const isCancelled = details.status === "CANCELLED";
                          const currentStatus =
                            row.attendance?.[sessionDate] || "NOT_MARKED";
                          const attDetail = row.attendanceDetails?.[sessionDate];
                          const reason = attDetail?.reason || (typeof row.attendance?.[sessionDate] === 'object' ? row.attendance[sessionDate].reason : "");
                          const markedByParent = attDetail?.markedByParent || false;

                          return (
                            <td
                              key={sessionDate}
                              title={isCancelled ? `Team session cancelled: ${details.cancellationReason || "No reason provided"}` : undefined}
                              onClick={can("attendance", "edit") && !isCancelled ? (e) =>
                                handleToggleAttendance(
                                  row.playerId,
                                  sessionDate,
                                  currentStatus,
                                  e,
                                  reason,
                                  markedByParent,
                                  row.playerName || row.name
                                )
                              : undefined}
                              className={`relative py-2 px-1.5 text-center border-l transition-colors group/cell ${isCancelled ? "border-rose-100 bg-rose-50/70 dark:border-rose-900/30 dark:bg-rose-950/20" : "border-slate-50 dark:border-slate-800/40"} ${can("attendance", "edit") && !isCancelled ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : ""}`}
                            >
                              {isCancelled ? (
                                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-300">Cancelled</span>
                              ) : (
                                <>
                                  <AttendanceCellFlag reason={reason} markedByParent={markedByParent} status={currentStatus} />
                                  {renderStatusIcon(currentStatus)}
                                </>
                              )}
                            </td>
                          );
                        })}

                        {/* Action Column */}
                        <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2 px-1 text-center min-w-[40px] w-[40px] max-w-[40px] border-l border-b border-slate-50 dark:border-slate-800/40 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                          <button
                            id={`trigger-${row.playerId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === row.playerId ? null : row.playerId
                              );
                            }}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-none"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>

                          {/* Dropdown Menu Portal */}
                          {openMenuId === row.playerId &&
                            menuPosition &&
                            createPortal(
                              <div
                                id="portal-action-menu-team"
                                style={{
                                  position: "absolute",
                                  top: `${menuPosition.top}px`,
                                  left: `${menuPosition.left}px`,
                                }}
                                className="z-[9999] w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-left"
                              >
                                {can("payments", "edit") && <StatusUpdateMenuList
                                  currentStatus={row.paymentStatus || row.status}
                                  isTeam={true}
                                  onSelectStatus={(newStatus) => {
                                    setOpenMenuId(null);
                                    handleUpdateStatus(row.playerId || row._id, newStatus);
                                  }}
                                />}
                                <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedPlayer(row);
                                  }}
                                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 text-slate-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  View Player Profile
                                </button>

                                {can("communication", "create") && can("parents", "read") && <ChatActionButton
                                  contextLabel={row.playerName || row.name || "Parent"}
                                  ensureRoom={() => openPlayerParentChat(row)}
                                  buttonText="Chat with Parent"
                                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                />}

                                {can("notes", "create") && <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setCoachNotePlayer({
                                      playerId: row.playerId,
                                      name:
                                        row.playerName ||
                                        `${row.firstName || ""} ${row.lastName || ""
                                          }`.trim(),
                                      teamId,
                                    });
                                  }}
                                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 text-amber-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                  Add Coach Note
                                </button>}

                                {can("teams", "edit") && <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setStatsPlayer(row);
                                  }}
                                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                  Edit Team Statistics
                                </button>}

                                {can("invoices", "create") && <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setInvoicePlayer(row);
                                  }}
                                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 text-emerald-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  Generate Invoice
                                </button>}

                                {can("teams", "assign") && <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setUnassignPlayer(row);
                                  }}
                                  className="w-full px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 font-semibold"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 text-rose-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12m.707-14.707a1 1 0 00-1.414 0L12 7.586l-1.293-1.293a1 1 0 00-1.414 1.414L10.586 9l-1.293 1.293a1 1 0 101.414 1.414L12 10.414l1.293 1.293a1 1 0 001.414-1.414L13.414 9l1.293-1.293a1 1 0 000-1.414z"
                                    />
                                  </svg>
                                  Unassign Player
                                </button>}
                              </div>,
                              document.body
                            )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={visibleSessions.length + 6}
                        className="py-12 text-center text-slate-400 font-bold"
                      >
                        No players or session records found for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {can("attendance", "edit") && openDayMenu && dayMenuPos && createPortal(
        <div
          id="portal-team-day-menu"
          style={{ position: "fixed", top: `${dayMenuPos.top}px`, left: `${dayMenuPos.left}px` }}
          className="z-[99999] w-[190px] border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Day actions</span>
            <span className="block text-xs font-bold text-slate-800 dark:text-white">
              {formatDateOnly(openDayMenu, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            {isSessionCancelled(openDayMenu) && (
              <div className="mt-1 rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] leading-snug text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="font-bold">Cancellation reason</span>
                <p className="mt-0.5 break-words">{sessionDetails[openDayMenu]?.cancellationReason || "No reason was recorded."}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedDayFilter((current) => current === openDayMenu ? null : openDayMenu);
              setOpenDayMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Eye size={14} className="text-[#0047FF]" />
            {selectedDayFilter === openDayMenu ? "Show all days" : "View only this day"}
          </button>
          <button
            type="button"
            disabled={!players.length || isSessionCancelled(openDayMenu) || markBulkMutation.isPending}
            onClick={() => {
              const date = openDayMenu;
              setOpenDayMenu(null);
              handleMarkAllPresent(date);
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <CheckCircle2 size={14} className="text-emerald-500" />
            {markBulkMutation.isPending ? "Marking present..." : "Mark all present"}
          </button>
          <button
            type="button"
            onClick={() => openDayActionDialog(openDayMenu, "NOTE")}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileText size={14} className="text-amber-500" />
            {sessionDetails[openDayMenu]?.note ? "Edit admin note" : "Add admin note"}
          </button>
          {isSessionCancelled(openDayMenu) ? (
            <button
              type="button"
              onClick={() => handleRestoreTeamSession(openDayMenu)}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              <CalendarCheck size={14} /> Restore team session
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openDayActionDialog(openDayMenu, "CANCEL")}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-300 dark:hover:bg-rose-950/30"
            >
              <Ban size={14} /> Cancel team session
            </button>
          )}
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
            {dayActionDialog?.action === "CANCEL" ? "Cancel team session" : "Admin note"}
          </h3>
          {dayActionDialog && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatDateOnly(dayActionDialog.sessionDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>}
        </div>
        <label htmlFor="team-day-action-text" className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">
          {dayActionDialog?.action === "CANCEL" ? "Cancellation reason (required)" : "Staff-only note"}
        </label>
        <textarea
          id="team-day-action-text"
          value={dayActionText}
          onChange={(event) => setDayActionText(event.target.value)}
          rows={4}
          maxLength={dayActionDialog?.action === "CANCEL" ? 500 : 1000}
          required={dayActionDialog?.action === "CANCEL"}
          placeholder={dayActionDialog?.action === "CANCEL" ? "For example: Team session is cancelled today due to severe weather." : "Add an internal note for this team session..."}
          className="mt-2 w-full resize-none border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#0047FF] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <div className="mt-1 flex justify-between gap-3 text-[10px] text-slate-400">
          <span>{dayActionDialog?.action === "CANCEL" ? "Parents of team players will receive a team chat message." : "Only staff can see this note."}</span>
          <span className="shrink-0">{dayActionText.length}/{dayActionDialog?.action === "CANCEL" ? 500 : 1000}</span>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <Button variant="outline" onClick={() => setDayActionDialog(null)} disabled={dayActionPending}>Cancel</Button>
          <Button
            onClick={handleSaveDayAction}
            disabled={dayActionPending || (dayActionDialog?.action === "CANCEL" && !dayActionText.trim())}
            className={dayActionDialog?.action === "CANCEL" ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/40" : ""}
          >
            {dayActionPending ? "Saving..." : dayActionDialog?.action === "CANCEL" ? "Cancel session" : "Save note"}
          </Button>
        </div>
      </Modal>

      {/* Player Detail Card Modal */}
      {selectedPlayer && (
        <PlayerDetailCard
          player={selectedPlayer}
          contextYear={schedule.term?.year}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* Invoice Generator Modal */}
      {invoicePlayer && (
        <GenerateInvoiceModal
          isOpen={!!invoicePlayer}
          onClose={() => setInvoicePlayer(null)}
          player={invoicePlayer}
        />
      )}

      {/* Coach Note Modal */}
      {coachNotePlayer && (
        <AddCoachNoteModal
          isOpen={!!coachNotePlayer}
          onClose={() => setCoachNotePlayer(null)}
          playerId={coachNotePlayer.playerId}
          playerName={coachNotePlayer.name}
        />
      )}

      {/* Edit Player Stats Modal */}
      {statsPlayer && (
        <EditPlayerStatsModal
          isOpen={!!statsPlayer}
          onClose={() => setStatsPlayer(null)}
          playerId={statsPlayer.playerId || statsPlayer._id}
          playerName={
            statsPlayer.playerName ||
            statsPlayer.name ||
            `${statsPlayer.firstName || ""} ${statsPlayer.lastName || ""}`.trim() ||
            "Player"
          }
          teamId={teamId}
          initialStats={statsPlayer.statistics || {}}
        />
      )}

      {/* Unassign Player Modal */}
      {unassignPlayer && (
        <ConfirmDeleteModal
          isOpen={!!unassignPlayer}
          onClose={() => setUnassignPlayer(null)}
          onConfirm={() => unassignMutation.mutate(unassignPlayer.playerId || unassignPlayer._id)}
          title="Unassign Player"
          message={`Are you sure you want to unassign ${unassignPlayer.playerName || `${unassignPlayer.firstName || ""} ${unassignPlayer.lastName || ""}`.trim() || "this player"} from ${teamName}?`}
          loading={unassignMutation.isPending}
        />
      )}

      {/* Attendance Dropdown Portal with Reason & Flags */}
      {can("attendance", "edit") && openAttendanceMenu && attendanceMenuPos && (
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
