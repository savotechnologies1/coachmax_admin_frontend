// src/components/EventComponents/HolidayCampAttendanceDashboard.tsx
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  X,
  Search,
  Filter,
  Users,
  ChevronDown,
  ChevronRight,
  Sun,
  Clock,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Edit,
  Save,
  CheckCircle2,
  XCircle,
  FileText,
  MoreVertical,
  Eye,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getEventAttendanceGrid,
  markEventSingleAttendance,
  markEventBulkAttendance,
  getEventRegistrationDetails,
  updateEventRegistrationPaymentStatus,
  updateCampDayNote,
  removeEventRegistration
} from "../../api/eventApi";
import {
  StatusIcon,
  getPlayerStatusTextClass,
  StatusUpdateMenuList,
  StatusColorCode
} from "../common/StatusColorCode";
import { AttendanceCellFlag, AttendanceStatusDropdown } from "../common/AttendanceReasonMenu";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { addDateOnlyDays, formatDateOnly, toDateOnly, todayDateOnly } from "../../utils/dateTime";
import { sortPlayersByPaymentStatus } from "../../utils/paymentStatus";
import EventDayBroadcastButton from "./EventDayBroadcastButton";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";

interface HolidayCampAttendanceDashboardProps {
  eventId: string;
  onRosterChange?: () => void;
}

const WEEKDAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const getWeekStartDate = (dateStr: string): string => {
  const weekday = formatDateOnly(dateStr, { weekday: "short" }).slice(0, 3).toLowerCase();
  const dayIndex = WEEKDAY_ORDER.indexOf(weekday);
  const daysFromMonday = dayIndex === 0 ? 6 : Math.max(0, dayIndex - 1);
  return addDateOnlyDays(dateStr, -daysFromMonday);
};

export const HolidayCampAttendanceDashboard: React.FC<HolidayCampAttendanceDashboardProps> = ({ eventId, onRosterChange }) => {
  const { markItemAsRead, isItemRead } = useSidebarBadges();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDayFilter, setSelectedDayFilter] = useState("all");
  const [viewingRegistration, setViewingRegistration] = useState<any>(null);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const [openAttendanceMenu, setOpenAttendanceMenu] = useState<{
    playerId: string;
    sessionId: string;
    sessionDate: string;
    currentStatus: string;
    currentReason?: string;
    markedByParent?: boolean;
    playerName?: string;
  } | null>(null);
  const [attendanceMenuPos, setAttendanceMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [openDayMenu, setOpenDayMenu] = useState<string | null>(null);
  const [dayMenuPos, setDayMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [bulkUpdatingDate, setBulkUpdatingDate] = useState<string | null>(null);
  const [dayNoteEditor, setDayNoteEditor] = useState<{ date: string; note: string } | null>(null);
  const [savingDayNote, setSavingDayNote] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<any>(null);
  const [removingPlayer, setRemovingPlayer] = useState(false);

  const updatePosition = () => {
    if (!openMenuId) return;
    const trigger = document.getElementById(`trigger-${openMenuId}`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 240;
    const menuEl = document.getElementById("portal-action-menu");
    const menuHeight = menuEl ? menuEl.offsetHeight : 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + window.scrollY;
    let placement: 'top' | 'bottom' = 'bottom';

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      top = rect.top - menuHeight + window.scrollY;
      placement = 'top';
    }

    let left = rect.right - menuWidth + window.scrollX;
    if (left < 10) left = 10;

    setMenuPosition({ top, left, placement });
  };

  useEffect(() => {
    if (openMenuId) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest("#portal-action-menu") && !target.closest(`[id^="trigger-"]`)) {
          setOpenMenuId(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    } else {
      setMenuPosition(null);
    }
  }, [openMenuId]);

  useEffect(() => {
    if (!openDayMenu) {
      setDayMenuPos(null);
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#portal-day-menu") && !target.closest(`[id^="day-trigger-"]`)) {
        setOpenDayMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDayMenu]);

  const handleUpdatePaymentStatus = async (registrationId: string, playerId: string, newStatus: string) => {
    try {
      if (registrationId) {
        markItemAsRead("eventRegistrations", registrationId);
      }
      await updateEventRegistrationPaymentStatus(registrationId, newStatus, { eventId, playerId });
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((pl: any) =>
            pl.playerId === playerId ? { ...pl, paymentStatus: newStatus } : pl
          ),
        };
      });
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update payment status");
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await getEventAttendanceGrid(eventId);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load holiday camp attendance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchAttendance();
    }
  }, [eventId]);

  const handleOpenAttendanceMenu = (
    playerId: string,
    sessionId: string,
    dateStr: string,
    currentStatus: string,
    currentReason: string,
    markedByParent: boolean,
    playerName: string,
    e: React.MouseEvent
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
      sessionId,
      sessionDate: dateStr,
      currentStatus,
      currentReason: currentReason || "",
      markedByParent: markedByParent || false,
      playerName: playerName || "",
    });
  };

  const handleSetAttendanceStatus = async (status: string, reason?: string) => {
    if (!openAttendanceMenu) return;
    const { playerId, sessionId, sessionDate } = openAttendanceMenu;
    setOpenAttendanceMenu(null);

    const cellKey = `${playerId}_${sessionId}`;
    setUpdatingCell(cellKey);

    try {
      await markEventSingleAttendance(eventId, {
        sessionDate,
        campSessionId: sessionId,
        playerId,
        status,
        reason,
      });

      // Optimistic update
      setData((prev: any) => {
        if (!prev) return prev;
        const newPlayers = prev.players.map((p: any) => {
          if (p.playerId === playerId) {
            return {
              ...p,
              attendance: {
                ...p.attendance,
                [sessionId]: {
                  ...p.attendance[sessionId],
                  status,
                  reason: reason !== undefined ? reason : p.attendance[sessionId]?.reason,
                },
              },
            };
          }
          return p;
        });

        // Update session summary counts
        const newSummaries = prev.sessionSummaries.map((s: any) => {
          if (s.sessionId === sessionId) {
            let presentCount = 0;
            let absentCount = 0;
            newPlayers.forEach((p: any) => {
              const att = p.attendance[sessionId];
              if (att && att.isRegistered) {
                if (att.status === "PRESENT" || att.status === "LATE") presentCount++;
                if (att.status === "ABSENT") absentCount++;
              }
            });
            return { ...s, presentCount, absentCount };
          }
          return s;
        });

        return { ...prev, players: newPlayers, sessionSummaries: newSummaries };
      });

      toast.success(
        reason
          ? `Attendance updated to ${status} with reason`
          : `Attendance updated to ${status}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update attendance");
    } finally {
      setUpdatingCell(null);
    }
  };

  const handleToggleAttendance = async (playerId: string, sessionId: string, dateStr: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PRESENT" ? "ABSENT" : currentStatus === "ABSENT" ? "NOT_MARKED" : "PRESENT";
    const cellKey = `${playerId}_${sessionId}`;
    setUpdatingCell(cellKey);

    try {
      await markEventSingleAttendance(eventId, {
        sessionDate: dateStr,
        campSessionId: sessionId,
        playerId,
        status: nextStatus,
      });

      // Optimistic update
      setData((prev: any) => {
        if (!prev) return prev;
        const newPlayers = prev.players.map((p: any) => {
          if (p.playerId === playerId) {
            return {
              ...p,
              attendance: {
                ...p.attendance,
                [sessionId]: {
                  ...p.attendance[sessionId],
                  status: nextStatus,
                },
              },
            };
          }
          return p;
        });

        // Update session summary counts
        const newSummaries = prev.sessionSummaries.map((s: any) => {
          if (s.sessionId === sessionId) {
            let presentCount = 0;
            let absentCount = 0;
            newPlayers.forEach((p: any) => {
              const att = p.attendance[sessionId];
              if (att && att.isRegistered) {
                if (att.status === "PRESENT") presentCount++;
                if (att.status === "ABSENT") absentCount++;
              }
            });
            return { ...s, presentCount, absentCount };
          }
          return s;
        });

        return { ...prev, players: newPlayers, sessionSummaries: newSummaries };
      });

      toast.success(`Marked as ${nextStatus.toLowerCase()}`, { duration: 1500 });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update attendance");
    } finally {
      setUpdatingCell(null);
    }
  };

  const handleOpenRegistrationDetails = async (regId: string) => {
    try {
      if (regId) {
        markItemAsRead("eventRegistrations", regId);
      }
      const res = await getEventRegistrationDetails(regId);
      if (res.success) {
        setViewingRegistration(res.data);
      }
    } catch (e) {
      toast.error("Failed to load registration details");
    }
  };

  // Distinct dates across all sessions for column headers
  const distinctDates = useMemo(() => {
    if (!data?.sessions) return [];
    const map = new Map<string, { dateStr: string; dayOfWeek: string; formattedDay: string; sessions: any[]; isAvailable: boolean }>();

    data.sessions.forEach((s: any) => {
      const dStr = toDateOnly(s.sessionDate);
      if (!map.has(dStr)) {
        map.set(dStr, {
          dateStr: dStr,
          dayOfWeek: formatDateOnly(dStr, { weekday: "short" }).toUpperCase(),
          formattedDay: formatDateOnly(dStr, { day: "numeric", month: "numeric" }),
          sessions: [],
          isAvailable: false,
        });
      }
      map.get(dStr)!.sessions.push(s);
      if (s.isAvailable !== false) map.get(dStr)!.isAvailable = true;
    });

    return Array.from(map.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [data?.sessions]);

  // Group by the actual Monday-to-Sunday calendar week. This keeps a weekend
  // or a missing day from shifting all following dates into the wrong week.
  const groupedSessionsByWeek = useMemo(() => {
    const byWeek = new Map<string, { weekStart: string; dates: string[]; sessions: any[] }>();
    distinctDates.forEach((date) => {
      const weekStart = getWeekStartDate(date.dateStr);
      if (!byWeek.has(weekStart)) byWeek.set(weekStart, { weekStart, dates: [], sessions: [] });
      byWeek.get(weekStart)!.dates.push(date.dateStr);
      byWeek.get(weekStart)!.sessions.push(...date.sessions);
    });

    return Array.from(byWeek.values())
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .map((week, index) => {
        const firstDate = week.dates[0];
        const lastDate = week.dates[week.dates.length - 1];
        return {
          ...week,
          weekLabel: `Week ${index + 1}`,
          dateRangeLabel: `${formatDateOnly(firstDate, { weekday: "short", day: "numeric", month: "short" })} - ${formatDateOnly(lastDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`,
        };
      });
  }, [distinctDates]);

  const visibleDates = useMemo(
    () => selectedDayFilter === "all" ? distinctDates : distinctDates.filter((date) => date.dateStr === selectedDayFilter),
    [distinctDates, selectedDayFilter]
  );

  const visibleDateSet = useMemo(() => new Set(visibleDates.map((date) => date.dateStr)), [visibleDates]);
  const currentDate = todayDateOnly();
  const visibleWeeks = useMemo(
    () => groupedSessionsByWeek
      .map((week) => ({
        ...week,
        dates: week.dates.filter((dateStr) => visibleDateSet.has(dateStr)),
        sessions: week.sessions.filter((session) => visibleDateSet.has(toDateOnly(session.sessionDate))),
      }))
      .filter((week) => week.dates.length > 0),
    [groupedSessionsByWeek, visibleDateSet]
  );

  // Filter players
  const filteredPlayers = useMemo(() => {
    if (!data?.players) return [];
    const matchingPlayers = data.players.filter((p: any) => {
      const matchesSearch = !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const st = (p.paymentStatus || "").toUpperCase();
      const filterUpper = statusFilter.toUpperCase();

      const matchesStatus =
        statusFilter === "all" ||
        st === filterUpper ||
        (statusFilter === "paid" && (st === "PAID" || st === "APPROVED" || st === "ACTIVE")) ||
        (statusFilter === "unpaid" && st !== "PAID" && st !== "APPROVED" && st !== "ACTIVE");

      return matchesSearch && matchesStatus;
    });
    return sortPlayersByPaymentStatus(matchingPlayers, (player: any) => player.paymentStatus, (player: any) => player.name)
      .map((player: any, index: number) => ({ ...player, rowNumber: index + 1 }));
  }, [data?.players, searchQuery, statusFilter]);

  const handleOpenDayMenu = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDayMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: Math.max(8, rect.right + window.scrollX - 190),
    });
    setOpenDayMenu((current) => current === dateStr ? null : dateStr);
  };

  const handleMarkAllPresent = async (date: (typeof distinctDates)[number]) => {
    const session = date.sessions.find((item: any) => item.isAvailable !== false && item.sessionType === "FULL_DAY")
      || date.sessions.find((item: any) => item.isAvailable !== false);
    if (!session?._id) {
      toast.error("No available session for this day");
      return;
    }
    // Bulk actions must cover every player registered for this day, even when
    // the table is narrowed by search or payment filters.
    const records = (data?.players || []).flatMap((player: any) => {
      const registeredSession = date.sessions.find((item: any) => item.isAvailable !== false && player.attendance?.[item._id.toString()]?.isRegistered);
      return registeredSession ? [{ player: player.playerId, status: "PRESENT" }] : [];
    });
    if (!records.length) {
      toast.error("No registered players for this day");
      return;
    }
    setBulkUpdatingDate(date.dateStr);
    try {
      await markEventBulkAttendance(eventId, {
        sessionDate: date.dateStr,
        campSessionId: session._id.toString(),
        records,
      });
      await fetchAttendance();
      toast.success(`Marked ${records.length} player${records.length === 1 ? "" : "s"} present`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to mark all present");
    } finally {
      setBulkUpdatingDate(null);
      setOpenDayMenu(null);
    }
  };

  const handleSaveDayNote = async () => {
    if (!dayNoteEditor) return;
    setSavingDayNote(true);
    try {
      const result = await updateCampDayNote(eventId, dayNoteEditor.date, dayNoteEditor.note);
      const note = result?.data?.dayNote ?? dayNoteEditor.note.trim();
      setData((previous: any) => previous ? {
        ...previous,
        sessions: previous.sessions.map((session: any) =>
          toDateOnly(session.sessionDate) === dayNoteEditor.date ? { ...session, dayNote: note } : session
        ),
        sessionSummaries: (previous.sessionSummaries || []).map((summary: any) =>
          summary.date === dayNoteEditor.date ? { ...summary, dayNote: note } : summary
        ),
      } : previous);
      toast.success("Day note saved");
      setDayNoteEditor(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save day note");
    } finally {
      setSavingDayNote(false);
    }
  };

  const handleRemovePlayer = async () => {
    if (!playerToRemove?.registrationId) return;
    setRemovingPlayer(true);
    try {
      await removeEventRegistration(playerToRemove.registrationId);
      toast.success(`${playerToRemove.name || "Player"} removed from the event`);
      setPlayerToRemove(null);
      await fetchAttendance();
      onRosterChange?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not remove player from the event");
    } finally {
      setRemovingPlayer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent" />
      </div>
    );
  }

  if (!data || !data.sessions || data.sessions.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <Calendar size={36} className="mx-auto text-gray-400 mb-2" />
        <h4 className="text-base font-bold text-gray-800 dark:text-white">No Camp Sessions Configured</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
          This holiday camp does not currently have any configured dates or sessions. Edit the event to enable dates and Full Day / Half Day pricing.
        </p>
      </div>
    );
  }

  const event = data.event;

  return (
    <div className="space-y-3">
      {/* Top Banner Card (matching screenshot top bar) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shrink-0">
            <Sun size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm md:text-base font-bold text-[#031549] dark:text-white leading-tight">{event.title}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Registrations Open
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-brand-500" />
                {formatDateOnly(event.startDate, { weekday: "short", day: "numeric", month: "short" })} - {formatDateOnly(event.endDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span>•</span>
              <span>{event.venueName || event.address}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white w-44 focus:w-56 transition-all outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white outline-none font-medium"
          >
            <option value="all">All Payments</option>
            <option value="PAID">PAID</option>
            <option value="HANDSHAKE">HANDSHAKE</option>
            <option value="UNPAID">APPROVED (UNPAID)</option>
            <option value="TRIAL">TRIAL</option>
            <option value="TBC">TBC</option>
            <option value="EXTRA">EXTRA</option>
          </select>
          <select
            value={selectedDayFilter}
            onChange={(e) => setSelectedDayFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white outline-none font-medium"
            aria-label="Filter attendance by day"
          >
            <option value="all">All Days</option>
            {distinctDates.map((date, index) => (
              <option key={date.dateStr} value={date.dateStr}>
                Day {index + 1} · {date.dayOfWeek} {date.formattedDay}{date.dateStr === currentDate ? " · Today" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Full-Width Player Attendance Matrix */}
      <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            {/* Header: Week Grouping */}
            <thead>
              <tr className="bg-[#031549] text-white">
                <th className="py-2 px-2 w-10 text-center border-r border-[#082269]">#</th>
                <th className="py-2 px-3 w-56 text-left border-r border-[#082269]">PLAYER</th>
                <th className="py-2 px-2 w-20 text-center border-r border-[#082269]">DOB</th>
                <th className="py-2 px-2 w-20 text-center border-r border-[#082269]">COND</th>
                {visibleWeeks.map((week, idx) => (
                  <th
                    key={week.weekLabel}
                    colSpan={week.dates.length || 1}
                    className={`py-1.5 px-2 text-center font-bold tracking-wider ${
                      week.dates.every((dateStr) => distinctDates.find((date) => date.dateStr === dateStr)?.isAvailable === false)
                        ? "bg-slate-700"
                        : idx % 2 === 0 ? "bg-[#031549]" : "bg-[#06206d]"
                    } border-r border-[#082269]`}
                  >
                    <div className="text-xs">{week.weekLabel}</div>
                    <div className="text-[9px] font-normal text-gray-300">{week.dateRangeLabel}</div>
                  </th>
                ))}
                <th className="py-2 px-2 w-14 text-center">ACTION</th>
              </tr>

              {/* Sub-header: Individual Dates */}
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-[10px] border-b border-gray-200 dark:border-gray-700">
                <th className="py-1 px-1 border-r border-gray-200 dark:border-gray-700"></th>
                <th className="py-1 px-1 border-r border-gray-200 dark:border-gray-700"></th>
                <th className="py-1 px-1 border-r border-gray-200 dark:border-gray-700"></th>
                <th className="py-1 px-1 border-r border-gray-200 dark:border-gray-700"></th>
                {visibleDates.map((d) => (
                  <th key={d.dateStr} className={`relative py-1 px-1 text-center border-r border-gray-200 dark:border-gray-700 min-w-[65px] ${d.isAvailable ? "" : "bg-slate-200/80 dark:bg-slate-950/80 text-slate-500"}`}>
                    <button
                      id={`day-trigger-${d.dateStr}`}
                      type="button"
                      onClick={(e) => handleOpenDayMenu(d.dateStr, e)}
                      className="absolute right-0.5 top-0.5 p-0.5 rounded hover:bg-slate-300/70 dark:hover:bg-slate-700"
                      aria-label={`Actions for ${d.dayOfWeek} ${d.formattedDay}`}
                    >
                      <MoreVertical size={12} />
                    </button>
                    <div className="text-[9px] text-gray-400 font-medium">{d.dayOfWeek}</div>
                    <div className="text-[11px] font-bold text-gray-800 dark:text-white">{d.formattedDay}</div>
                    {d.sessions.some((session: any) => session.dayNote) && <div className="text-[8px] font-bold text-amber-600">Note</div>}
                    {!d.isAvailable && <div className="text-[8px] uppercase tracking-wide text-slate-500">Unavailable</div>}
                  </th>
                ))}
                <th className="py-1 px-1"></th>
              </tr>
            </thead>

            {/* Body: Player Rows */}
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((p: any) => (
                  <tr key={p.playerId} className="hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-colors">
                    {/* Row Number */}
                    <td className="py-2 px-2 text-center text-gray-400 font-medium border-r border-gray-100 dark:border-gray-800">
                      {p.rowNumber}
                    </td>

                    {/* Player Info - Program Style with Status Icon and Color */}
                    <td className="py-2 px-3 border-r border-gray-100 dark:border-gray-800 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        {/* Program-style Payment Status Icon Indicator & Unread Indicator */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!isItemRead("eventRegistrations", p.registrationId) && (
                            <span
                              className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                              title="Unread registration"
                            />
                          )}
                          <div 
                            className="w-4 h-4 flex items-center justify-center shrink-0"
                            title={["TRIAL", "TBC", "EXTRA", "OTHERS", "SUBSTITUTE"].includes((p.paymentStatus || "").toUpperCase()) ? (p.paymentStatus || "").toUpperCase() : undefined}
                          >
                            <StatusIcon status={p.paymentStatus} size="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="w-7 h-7 rounded-full bg-[#031549] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                        </div>
                        <div className="truncate min-w-0 flex-1">
                          <span
                            onClick={() => handleOpenRegistrationDetails(p.registrationId)}
                            title={p.name}
                            className={`font-bold hover:underline cursor-pointer truncate block text-xs leading-tight ${getPlayerStatusTextClass(p.paymentStatus)}`}
                          >
                            {p.name}
                          </span>
                          <span className="text-[10px] text-gray-400 block truncate">{p.email || p.phone || "Participant"}</span>
                        </div>
                      </div>
                    </td>

                    {/* DOB */}
                    <td className="py-2 px-2 text-center text-gray-500 dark:text-gray-400 font-medium border-r border-gray-100 dark:border-gray-800 whitespace-nowrap text-xs">
                      {p.dob ? formatDateOnly(p.dob, { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                    </td>

                    <td
                      className="py-2 px-2 text-center border-r border-gray-100 dark:border-gray-800 whitespace-nowrap text-xs"
                      title={p.isMedicalCondition ? (p.medicalConditionDetails || "Medical condition recorded") : "No medical condition recorded"}
                    >
                      <span className={p.isMedicalCondition ? "font-bold text-rose-600" : "text-emerald-600"}>
                        {p.isMedicalCondition ? "Yes" : "No"}
                      </span>
                    </td>

                    {/* Date Cells */}
                    {visibleDates.map((d) => {
                      const matchingSession = d.sessions.find((s: any) => {
                        const att = p.attendance[s._id.toString()];
                        return att && att.isRegistered;
                      }) || d.sessions[0];

                      const sessId = matchingSession?._id?.toString();
                      const att = sessId ? p.attendance[sessId] : null;
                      const isRegistered = att?.isRegistered;
                      const sessionType = att?.sessionType || matchingSession?.sessionType || "FULL_DAY";
                      const status = att?.status || "NOT_REGISTERED";
                      const isUpdating = updatingCell === `${p.playerId}_${sessId}`;

                      return (
                        <td
                          key={d.dateStr}
                          className={`relative py-1 px-1 text-center border-r border-gray-100 dark:border-gray-800 align-middle group/cell ${d.isAvailable ? "" : "bg-slate-100 dark:bg-slate-950/70"}`}
                        >
                          {!d.isAvailable ? (
                            <div className="w-8 h-8 mx-auto flex items-center justify-center text-[9px] font-semibold text-slate-400 dark:text-slate-600">N/A</div>
                          ) : isRegistered ? (
                            <div className="relative inline-block">
                              <AttendanceCellFlag
                                reason={att?.reason}
                                markedByParent={att?.markedByParent}
                                status={status}
                              />
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) =>
                                  handleOpenAttendanceMenu(
                                    p.playerId,
                                    sessId,
                                    d.dateStr,
                                    status,
                                    att?.reason || "",
                                    att?.markedByParent || false,
                                    p.name,
                                    e
                                  )
                                }
                                title={`${sessionType === "FULL_DAY" ? "Full Day (8am-4pm)" : "Half Day (8am-2pm)"} - Status: ${status}${att?.reason ? ` (Reason: ${att.reason})` : ''} - Click to update`}
                                className={`w-8 h-8 mx-auto flex items-center justify-center rounded transition-all transform active:scale-90 ${
                                  sessionType === "FULL_DAY"
                                    ? "bg-[#1d4ed8] text-white hover:bg-[#1e40af]"
                                    : "bg-[#93c5fd] text-[#1e3a8a] hover:bg-[#60a5fa]"
                                } ${isUpdating ? "opacity-40 animate-pulse" : ""}`}
                              >
                                {status === "PRESENT" && (
                                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                    <Check size={11} strokeWidth={3} />
                                  </div>
                                )}
                                {status === "ABSENT" && (
                                  <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm">
                                    <X size={11} strokeWidth={3} />
                                  </div>
                                )}
                                {status === "LATE" && (
                                  <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                                    <Clock size={11} strokeWidth={3} />
                                  </div>
                                )}
                                {(status === "NOT_MARKED" || status === "NOT_REGULAR") && (
                                  <span className="text-[10px] font-bold opacity-80">
                                    {sessionType === "FULL_DAY" ? "FD" : "HD"}
                                  </span>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="w-8 h-8 mx-auto flex items-center justify-center text-gray-300 dark:text-gray-600 font-bold text-xs bg-gray-50/50 dark:bg-gray-800/20 rounded">
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Three-Dot Action Button for Payment Status Update */}
                    <td className="py-1 px-1 text-center border-l border-gray-100 dark:border-gray-800 min-w-[46px] w-[46px]">
                      <div className="flex items-center justify-center relative">
                        <button
                          id={`trigger-${p.playerId}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === p.playerId ? null : p.playerId);
                          }}
                          className={`p-1 border rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm inline-flex items-center justify-center ${
                            openMenuId === p.playerId
                              ? "border-[#0047FF] bg-blue-50/50 dark:bg-blue-950/20 text-[#0047FF]"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                          title="Update Payment Status / View Details"
                        >
                          <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleDates.length + 5} className="py-8 text-center text-gray-400 text-xs">
                    No participants match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer: TOTAL REGISTERED & Summary counts per date */}
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-bold border-t-2 border-gray-300 dark:border-gray-700">
                <td colSpan={4} className="py-2 px-3 text-left tracking-wider text-xs border-r border-gray-200 dark:border-gray-700">
                  TOTAL REGISTERED
                </td>
                {visibleDates.map((d) => {
                  let totalDateReg = 0;
                  let fullDayReg = 0;
                  let halfDayReg = 0;

                  d.sessions.forEach((s: any) => {
                    const summary = (data.sessionSummaries || []).find((ss: any) => ss.sessionId === s._id.toString());
                    const regCount = summary?.registeredCount || 0;
                    totalDateReg += regCount;
                    if (s.sessionType === "FULL_DAY") fullDayReg += regCount;
                    if (s.sessionType === "HALF_DAY") halfDayReg += regCount;
                  });

                  return (
                    <td key={d.dateStr} className={`py-1 px-1 text-center border-r border-gray-200 dark:border-gray-700 ${d.isAvailable ? "" : "bg-slate-200/60 dark:bg-slate-950/80"}`}>
                      {d.isAvailable ? <>
                        <div className="text-xs font-black text-[#031549] dark:text-white">{totalDateReg}</div>
                        <div className="text-[8px] text-sky-600 dark:text-sky-400 font-semibold leading-tight">
                          {halfDayReg} (2pm)
                        </div>
                        <div className="text-[8px] text-blue-700 dark:text-blue-300 font-semibold leading-tight">
                          {fullDayReg} (4pm)
                        </div>
                      </> : <span className="text-[9px] text-slate-500">Unavailable</span>}
                    </td>
                  );
                })}
                <td className="py-1 px-1"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Color Legend & Program Status Legend */}
        <div className="p-2.5 px-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#93c5fd] inline-block shadow-sm" />
              <span>8:00am - 2:00pm ($70 Half Day)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#1d4ed8] inline-block shadow-sm" />
              <span>8:00am - 4:00pm ($90 Full Day)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-gray-100 border border-gray-300 dark:bg-gray-800 dark:border-gray-700 inline-block text-center text-gray-400 leading-4 text-[10px]">
                -
              </span>
              <span>No registration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check size={10} strokeWidth={3} />
              </div>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Present (Attendance marked)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Clock size={10} strokeWidth={3} />
              </div>
              <span className="text-amber-700 dark:text-amber-400 font-bold">Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center">
                <X size={10} strokeWidth={3} />
              </div>
              <span className="text-red-700 dark:text-red-400 font-bold">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
              <span className="text-gray-600 dark:text-gray-400 font-bold">Reason Attached (Hover flag to view)</span>
            </div>
          </div>

          {/* Program Status Color Code Legend */}
          <div className="pt-1.5 border-t border-gray-200/60 dark:border-gray-700/60">
            <StatusColorCode />
          </div>
        </div>
      </div>

      {/* Portal Menu for 3-Dot Payment Status Update (Program style) */}
      {openMenuId && menuPosition && (() => {
        const activePlayer = data?.players?.find((pl: any) => pl.playerId === openMenuId);
        if (!activePlayer) return null;
        return createPortal(
          <div
            id="portal-action-menu"
            style={{
              position: "absolute",
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: "240px",
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-[99999] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 rounded-none flex flex-col"
          >
            {/* Header: Player Name & Current Status */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50">
              <span className="text-xs font-bold text-gray-800 dark:text-white block truncate">
                {activePlayer.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-400">Payment Status:</span>
                <span className={`text-[10px] font-bold uppercase ${getPlayerStatusTextClass(activePlayer.paymentStatus)}`}>
                  {activePlayer.paymentStatus}
                </span>
              </div>
            </div>

            {/* Status Update Menu List from StatusColorCode */}
            <StatusUpdateMenuList
              currentStatus={activePlayer.paymentStatus}
              onSelectStatus={(newStatus) => {
                setOpenMenuId(null);
                handleUpdatePaymentStatus(activePlayer.registrationId, activePlayer.playerId, newStatus);
              }}
            />

            <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  handleOpenRegistrationDetails(activePlayer.registrationId);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2"
              >
                <FileText size={14} className="text-brand-500" />
                View Registration & Invoice
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  setPlayerToRemove(activePlayer);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} /> Remove player from event
              </button>
            </div>
          </div>,
          document.body
        );
      })()}

      {openDayMenu && dayMenuPos && (() => {
        const activeDate = distinctDates.find((date) => date.dateStr === openDayMenu);
        if (!activeDate) return null;
        return createPortal(
          <div
            id="portal-day-menu"
            style={{ position: "absolute", top: `${dayMenuPos.top}px`, left: `${dayMenuPos.left}px` }}
            className="w-[190px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-[99999] py-1 rounded"
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Day actions</span>
              <span className="block text-xs font-bold text-slate-800 dark:text-white">{activeDate.dayOfWeek} {activeDate.formattedDay}</span>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedDayFilter(activeDate.dateStr); setOpenDayMenu(null); }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <Eye size={14} className="text-brand-500" />
              View only this day
            </button>
            <button
              type="button"
              disabled={!activeDate.isAvailable || bulkUpdatingDate === activeDate.dateStr}
              onClick={() => handleMarkAllPresent(activeDate)}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle2 size={14} className="text-emerald-500" />
              {bulkUpdatingDate === activeDate.dateStr ? "Marking present..." : "Mark all present"}
            </button>
            {activeDate.isAvailable && (
                <EventDayBroadcastButton
                  eventId={eventId}
                  sessionDate={activeDate.dateStr}
                  dayLabel={`${activeDate.dayOfWeek} ${activeDate.formattedDay}`}
                  className="w-full justify-start border-0 border-t border-slate-100 rounded-none bg-transparent px-3 py-2 text-xs shadow-none hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                />
            )}
            <button
              type="button"
              disabled={!activeDate.isAvailable}
              onClick={() => {
                const note = activeDate.sessions.find((item: any) => item.dayNote !== undefined)?.dayNote || "";
                setDayNoteEditor({ date: activeDate.dateStr, note });
                setOpenDayMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileText size={14} className="text-amber-500" />
              Add/edit note
            </button>
          </div>,
          document.body
        );
      })()}

      {dayNoteEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Edit event day note">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Day note</h3>
                <p className="text-xs text-slate-500">{formatDateOnly(dayNoteEditor.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <button type="button" onClick={() => setDayNoteEditor(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <textarea
              value={dayNoteEditor.note}
              onChange={(event) => setDayNoteEditor((current) => current ? { ...current, note: event.target.value } : current)}
              rows={4}
              maxLength={1000}
              placeholder="Add a note for this event day..."
              className="w-full resize-none rounded border border-slate-200 p-3 text-sm outline-none focus:border-[#0047FF] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDayNoteEditor(null)} className="rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleSaveDayNote} disabled={savingDayNote} className="rounded bg-[#0047FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingDayNote ? "Saving..." : "Save note"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Details & Invoice Modal */}
      {viewingRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 bg-[#031549] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-brand-400" />
                  Player Registration & Camp Invoice
                </h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  {viewingRegistration.registration?.user?.fullName} — {event.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingRegistration(null)}
                className="p-1 hover:bg-white/10 rounded text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Status</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-white">
                    {viewingRegistration.registration?.status}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Payment Status</span>
                  <span
                    className={`text-sm font-bold ${
                      viewingRegistration.registration?.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {viewingRegistration.registration?.paymentStatus}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Amount</span>
                  <span className="text-sm font-bold text-[#031549] dark:text-brand-400">
                    ${viewingRegistration.registration?.totalAmount || 0}
                  </span>
                </div>
              </div>

              {/* Booked Sessions Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Booked Camp Sessions
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  {(viewingRegistration.registration?.selectedSessions || []).map((s: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-800 dark:text-white block">
                      {formatDateOnly(s.sessionDate, { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          {s.sessionType === "FULL_DAY" ? "Full Day" : "Half Day"} • {s.startTime} - {s.endTime}
                        </span>
                      </div>
                      <span className="font-bold text-gray-800 dark:text-white text-sm">
                        ${s.fee}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Associated Invoice Link */}
              {viewingRegistration.registration?.invoice && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-950 dark:text-blue-200 block">
                      Invoice #{viewingRegistration.registration.invoice.invoiceNumber}
                    </span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-400">
                      Total: ${viewingRegistration.registration.invoice.totalAmount} • Status: {viewingRegistration.registration.invoice.paymentStatus}
                    </span>
                  </div>
                  <a
                    href={`/invoices/${viewingRegistration.registration.invoice._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#031549] text-white hover:bg-brand-600 text-xs font-bold transition-all shadow-sm"
                  >
                    View Invoice
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRegistration(null)}
                className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-white text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Status & Reason Dropdown (Portal) */}
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
      <ConfirmDeleteModal
        isOpen={Boolean(playerToRemove)}
        onClose={() => setPlayerToRemove(null)}
        onConfirm={handleRemovePlayer}
        loading={removingPlayer}
        title="Remove player from event?"
        message={`This will cancel ${playerToRemove?.name || "this player's"} active registration and free their booked places. Attendance and invoice history will be retained; paid amounts are not refunded automatically.`}
      />
    </div>
  );
};

export default HolidayCampAttendanceDashboard;
