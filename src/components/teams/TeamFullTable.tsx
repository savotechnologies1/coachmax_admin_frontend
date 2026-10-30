import { formatDateOnly } from "../../utils/dateTime";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiClient";
import { unassignPlayersFromTeam } from "../../api/adminApi";
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
import { getPlayerStatusTextClass, StatusIcon, StatusUpdateMenuList } from "../common/StatusColorCode";
import { AttendanceCellFlag, AttendanceStatusDropdown } from "../common/AttendanceReasonMenu";
import { Activity } from "lucide-react";
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
    const records = players.map((p: any) => ({
      player: p.playerId,
      status: "PRESENT",
    }));

    markBulkMutation.mutate({
      sessionDate,
      records,
    });
  };

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
                    {sessions.map((sessionDate: string, idx: number) => {
                      const formatted = formatDateLabel(sessionDate);
                      return (
                        <th
                          key={sessionDate}
                          className="py-2.5 px-1.5 text-center min-w-[55px] font-semibold border-l border-slate-100 dark:border-slate-800/40 relative group"
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400 font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-slate-500">{formatted.day}</span>
                            <span className="text-slate-700 dark:text-slate-200 font-bold">
                              {formatted.date}
                            </span>
                          </div>

                          {/* Hover button: Mark All Present */}
                          {can("attendance", "edit") && <button
                            onClick={() => handleMarkAllPresent(sessionDate)}
                            className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[#0047FF] font-bold text-[10px]"
                            title="Mark all present"
                          >
                            <svg
                              className="w-4 h-4 text-[#0047FF]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>}
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
                        {sessions.map((sessionDate: string) => {
                          const currentStatus =
                            row.attendance?.[sessionDate] || "NOT_MARKED";
                          const attDetail = row.attendanceDetails?.[sessionDate];
                          const reason = attDetail?.reason || (typeof row.attendance?.[sessionDate] === 'object' ? row.attendance[sessionDate].reason : "");
                          const markedByParent = attDetail?.markedByParent || false;

                          return (
                            <td
                              key={sessionDate}
                              onClick={can("attendance", "edit") ? (e) =>
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
                              className={`relative py-2 px-1.5 text-center border-l border-slate-50 dark:border-slate-800/40 transition-colors group/cell ${can("attendance", "edit") ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : ""}`}
                            >
                              <AttendanceCellFlag reason={reason} markedByParent={markedByParent} status={currentStatus} />
                              {renderStatusIcon(currentStatus)}
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
                        colSpan={sessions.length + 6}
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
