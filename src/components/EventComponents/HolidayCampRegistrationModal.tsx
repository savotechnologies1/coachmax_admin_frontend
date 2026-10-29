// src/components/EventComponents/HolidayCampRegistrationModal.tsx
import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  CreditCard,
  Banknote,
  Check
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { registerForEvent } from "../../api/eventApi";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import apiClient from "../../api/apiClient";
import { addDateOnlyDays, formatDateOnly, toDateOnly } from "../../utils/dateTime";

const WEEKDAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const getWeekStartDate = (dateStr: string): string => {
  const dayIndex = WEEKDAY_ORDER.indexOf(formatDateOnly(dateStr, { weekday: "short" }).slice(0, 3).toLowerCase());
  const daysFromMonday = dayIndex === 0 ? 6 : Math.max(0, dayIndex - 1);
  return addDateOnlyDays(dateStr, -daysFromMonday);
};

export interface CampSessionItem {
  _id: string;
  sessionDate: string;
  sessionType: "FULL_DAY" | "HALF_DAY" | "CUSTOM";
  sessionLabel?: string;
  startTime: string;
  endTime: string;
  fee: number;
  capacity?: number | null;
  registeredCount?: number;
  isAvailable: boolean;
}

interface HolidayCampRegistrationModalProps {
  event: any;
  sessions: CampSessionItem[];
  currentUser?: any;
  playersList?: any[]; // children/players belonging to parent or academy
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const HolidayCampRegistrationModal: React.FC<HolidayCampRegistrationModalProps> = ({
  event,
  sessions,
  currentUser,
  playersList = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1); // 1: Select Days, 2: Review, 3: Payment, 4: Confirmed
  const [internalPlayers, setInternalPlayers] = useState<any[]>(playersList);
  const [fetchingPlayers, setFetchingPlayers] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    playersList.length > 0 ? playersList[0]._id : currentUser?._id || ""
  );

  useEffect(() => {
    if (playersList && playersList.length > 0) {
      setInternalPlayers(playersList);
      if (!selectedPlayerId) {
        setSelectedPlayerId(playersList[0]._id);
      }
    }
  }, [playersList]);

  useEffect(() => {
    if (!isOpen) return;

    if (!playersList || playersList.length === 0) {
      const isMounted = true;
      const loadPlayers = async () => {
        setFetchingPlayers(true);
        try {
          let list: any[] = [];
          try {
            const res = await apiClient.get("/api/admin/available-players");
            const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
            if (Array.isArray(data) && data.length > 0) {
              list = data;
            }
          } catch (e) {
            // fallback to getUsers
          }

          if (list.length === 0) {
            const usersRes = await apiClient.get("/api/admin/getUsers", { params: { limit: 200 } });
            const data = Array.isArray(usersRes.data)
              ? usersRes.data
              : usersRes.data?.users || usersRes.data?.data || [];
            if (Array.isArray(data)) {
              list = data;
            }
          }

          if (isMounted) {
            setInternalPlayers(list);
            if (list.length > 0 && !selectedPlayerId) {
              setSelectedPlayerId(list[0]._id);
            }
          }
        } catch (err) {
          console.error("Failed to load players for camp registration:", err);
        } finally {
          if (isMounted) setFetchingPlayers(false);
        }
      };

      loadPlayers();
    }
  }, [isOpen, playersList]);

  useEffect(() => {
    if (!selectedPlayerId && internalPlayers.length > 0) {
      setSelectedPlayerId(internalPlayers[0]._id);
    }
  }, [internalPlayers, selectedPlayerId]);
  // Map of dateStr => selected CampSessionItem._id
  const [selectedSessionMap, setSelectedSessionMap] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("ONLINE");
  const [loading, setLoading] = useState(false);
  const [completedRegistration, setCompletedRegistration] = useState<any>(null);

  // Group sessions by actual Monday-to-Sunday calendar weeks.
  const groupedByWeek = useMemo(() => {
    const dateMap = new Map<string, { dateStr: string; dayLabel: string; dayOfWeek: string; sessions: CampSessionItem[] }>();

    sessions.forEach((s) => {
      const dateStr = toDateOnly(s.sessionDate);
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          dateStr,
          dayLabel: formatDateOnly(dateStr, { weekday: "long", day: "numeric", month: "short", year: "numeric" }),
          dayOfWeek: formatDateOnly(dateStr, { weekday: "short" }),
          sessions: [],
        });
      }
      dateMap.get(dateStr)!.sessions.push(s);
    });

    const distinctDates = Array.from(dateMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    const byWeek = new Map<string, typeof distinctDates>();
    distinctDates.forEach((date) => {
      const weekStart = getWeekStartDate(date.dateStr);
      if (!byWeek.has(weekStart)) byWeek.set(weekStart, []);
      byWeek.get(weekStart)!.push(date);
    });

    return Array.from(byWeek.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, dates], index) => {
        const firstDate = dates[0].dateStr;
        const lastDate = dates[dates.length - 1].dateStr;
        return {
          weekLabel: `Week ${index + 1}`,
          dateRangeLabel: `${formatDateOnly(firstDate, { weekday: "short", day: "numeric", month: "short" })} – ${formatDateOnly(lastDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`,
          dates,
        };
      });
  }, [sessions]);

  // Selected sessions list & total price
  const selectedSessionsList = useMemo(() => {
    const list: CampSessionItem[] = [];
    Object.values(selectedSessionMap).forEach((sessId) => {
      const found = sessions.find((s) => s._id === sessId);
      if (found) list.push(found);
    });
    return list.sort((a, b) => toDateOnly(a.sessionDate).localeCompare(toDateOnly(b.sessionDate)));
  }, [selectedSessionMap, sessions]);

  const totalAmount = useMemo(() => {
    return selectedSessionsList.reduce((acc, s) => acc + (Number(s.fee) || 0), 0);
  }, [selectedSessionsList]);

  const handleSelectSession = (dateStr: string, sessId: string) => {
    setSelectedSessionMap((prev) => {
      const next = { ...prev };
      if (next[dateStr] === sessId) {
        delete next[dateStr]; // Deselect
      } else {
        next[dateStr] = sessId; // Select
      }
      return next;
    });
  };

  const handleSelectAllInWeek = (dates: { dateStr: string; sessions: CampSessionItem[] }[]) => {
    setSelectedSessionMap((prev) => {
      const next = { ...prev };
      const selectableDates = dates.filter((d) => d.sessions.some((session) => session.isAvailable));
      if (selectableDates.length === 0) return next;
      // If all available dates in week already selected, deselect; otherwise select full day (or first session)
      const allSelected = selectableDates.every((d) => next[d.dateStr]);
      if (allSelected) {
        selectableDates.forEach((d) => delete next[d.dateStr]);
      } else {
        selectableDates.forEach((d) => {
          const preferred = d.sessions.find((s) => s.sessionType === "FULL_DAY" && s.isAvailable)
            || d.sessions.find((s) => s.isAvailable);
          if (preferred) {
            next[d.dateStr] = preferred._id;
          }
        });
      }
      return next;
    });
  };

  const selectedPlayer = useMemo(() => {
    const found = internalPlayers.find((p) => p._id === selectedPlayerId);
    if (found) return found;
    if (selectedPlayerId) {
      return { _id: selectedPlayerId, fullName: "Selected Player" };
    }
    return currentUser || (internalPlayers.length > 0 ? internalPlayers[0] : null);
  }, [internalPlayers, selectedPlayerId, currentUser]);

  const handleConfirmRegistration = async () => {
    const effectivePlayerId = selectedPlayerId || selectedPlayer?._id;
    if (!effectivePlayerId) {
      toast.error("Please select a participant/player from the list");
      return;
    }

    if (selectedSessionsList.length === 0) {
      toast.error("Please select at least one camp date/session");
      return;
    }

    setLoading(true);
    try {
      const res = await registerForEvent({
        eventId: event._id,
        playerId: effectivePlayerId,
        selectedSessionIds: selectedSessionsList.map((s) => s._id),
        paymentMethod,
      });

      if (res.success) {
        setCompletedRegistration(res.data);
        setCurrentStep(4);
        toast.success("Camp registration confirmed!");
        await Promise.all(["registrationRequests", "players", "sidebarBadges"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Registration failed. Please check capacity.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-xl sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Steps (matching the phone screenshot step progression) */}
        <div className="p-4 sm:p-5 bg-[#031549] text-white flex items-center justify-between border-b border-[#082269]">
          <div className="flex items-center gap-3">
            {currentStep > 1 && currentStep < 4 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="p-1 hover:bg-white/10 rounded text-white transition-all"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {event.title}
              </h3>
              <p className="text-[11px] text-gray-300 font-medium">Holiday Camp Registration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        {currentStep < 4 && (
          <div className="flex items-center justify-around py-3 px-6 bg-blue-50/70 dark:bg-blue-950/20 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold">
            <div className={`flex items-center gap-2 ${currentStep === 1 ? "text-brand-600 font-bold" : currentStep > 1 ? "text-emerald-600" : "text-gray-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${currentStep > 1 ? "bg-emerald-500" : currentStep === 1 ? "bg-brand-600" : "bg-gray-300"}`}>
                {currentStep > 1 ? <Check size={12} strokeWidth={3} /> : "1"}
              </span>
              <span>Select Days</span>
            </div>
            <div className="w-8 h-[1px] bg-gray-300 dark:bg-gray-700" />
            <div className={`flex items-center gap-2 ${currentStep === 2 ? "text-brand-600 font-bold" : currentStep > 2 ? "text-emerald-600" : "text-gray-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${currentStep > 2 ? "bg-emerald-500" : currentStep === 2 ? "bg-brand-600" : "bg-gray-300"}`}>
                {currentStep > 2 ? <Check size={12} strokeWidth={3} /> : "2"}
              </span>
              <span>Review</span>
            </div>
            <div className="w-8 h-[1px] bg-gray-300 dark:bg-gray-700" />
            <div className={`flex items-center gap-2 ${currentStep === 3 ? "text-brand-600 font-bold" : "text-gray-400"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${currentStep === 3 ? "bg-brand-600" : "bg-gray-300"}`}>
                3
              </span>
              <span>Payment</span>
            </div>
          </div>
        )}

        {/* Body based on current step */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: SELECT DAYS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Participant Selector */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <User size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-white block">
                      Registering Athlete / Player:
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {fetchingPlayers
                        ? "Loading player list..."
                        : `${internalPlayers.length} players available in system`}
                    </span>
                  </div>
                </div>
                <div className="flex-1 sm:max-w-xs">
                  <select
                    id="holiday-camp-player-select-step1"
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>
                      {fetchingPlayers ? "-- Loading players... --" : "-- Select Player from List --"}
                    </option>
                    {internalPlayers.map((p) => {
                      const name = p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || "Player";
                      const extra = p.category?.name || p.phone || p.email || "";
                      return (
                        <option key={p._id} value={p._id}>
                          {name} {extra ? `(${extra})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Weeks & Dates List (matching screenshot #2) */}
              {groupedByWeek.map((week) => (
                <div key={week.weekLabel} className="space-y-3">
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">{week.weekLabel}</h4>
                      <p className="text-[11px] text-gray-400">{week.dateRangeLabel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectAllInWeek(week.dates)}
                      className="px-3 py-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-950/40 rounded transition-all"
                    >
                      Select All Available
                    </button>
                  </div>

                  {/* Dates list */}
                  <div className="space-y-2.5">
                    {week.dates.map((d) => {
                      const fullDaySession = d.sessions.find((s) => s.sessionType === "FULL_DAY");
                      const halfDaySession = d.sessions.find((s) => s.sessionType === "HALF_DAY");
                      const availableSessions = d.sessions.filter((s) => s.isAvailable);
                      const isAvailable = availableSessions.length > 0;
                      const isDateSelected = Boolean(selectedSessionMap[d.dateStr]);

                      return (
                        <div
                          key={d.dateStr}
                          className={`p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${isAvailable ? "bg-gray-50/70 dark:bg-gray-800/40 border-gray-200/80 dark:border-gray-700/80 hover:border-brand-500/30" : "bg-slate-200/80 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700 opacity-75"}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isDateSelected}
                              disabled={!isAvailable}
                              onChange={() => {
                                if (isDateSelected) {
                                  handleSelectSession(d.dateStr, selectedSessionMap[d.dateStr]);
                                } else {
                                  const pref = (fullDaySession?.isAvailable ? fullDaySession : undefined)
                                    || (halfDaySession?.isAvailable ? halfDaySession : undefined)
                                    || availableSessions[0];
                                  if (pref) handleSelectSession(d.dateStr, pref._id);
                                }
                              }}
                              className="w-4 h-4 mt-0.5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-xs text-gray-800 dark:text-white block">
                                {d.dayLabel}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {isAvailable ? `${availableSessions.length} options offered` : "Unavailable"}
                              </span>
                            </div>
                          </div>

                          {/* Sessions Buttons Grid (matching the two blue buttons in screenshot) */}
                          <div className="flex items-center gap-2">
                            {halfDaySession && halfDaySession.isAvailable && (
                              <button
                                type="button"
                                onClick={() => handleSelectSession(d.dateStr, halfDaySession._id)}
                                className={`px-3 py-2 text-xs font-bold rounded border transition-all text-left flex flex-col min-w-[130px] ${
                                  selectedSessionMap[d.dateStr] === halfDaySession._id
                                    ? "bg-[#93c5fd] text-[#1e3a8a] border-[#60a5fa] shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-sky-400"
                                }`}
                              >
                                <span className="text-[10px] opacity-80">8:00am - 2:00pm</span>
                                <span className="text-sm font-extrabold">${halfDaySession.fee}</span>
                              </button>
                            )}

                            {fullDaySession && fullDaySession.isAvailable && (
                              <button
                                type="button"
                                onClick={() => handleSelectSession(d.dateStr, fullDaySession._id)}
                                className={`px-3 py-2 text-xs font-bold rounded border transition-all text-left flex flex-col min-w-[130px] ${
                                  selectedSessionMap[d.dateStr] === fullDaySession._id
                                    ? "bg-[#1d4ed8] text-white border-[#1e40af] shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-600"
                                }`}
                              >
                                <span className="text-[10px] opacity-80">8:00am - 4:00pm</span>
                                <span className="text-sm font-extrabold">${fullDaySession.fee}</span>
                              </button>
                            )}
                            {!isAvailable && <span className="text-[10px] text-slate-500">This day is unavailable.</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2: REVIEW SELECTION (matching screenshot #3) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Participant Summary */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <User size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">
                      Participant: {selectedPlayer?.fullName || selectedPlayer?.name || "Player"}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {selectedPlayer?.email || selectedPlayer?.phone || "Coach Max Academy"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[11px] font-bold text-brand-600 hover:underline"
                >
                  Change Player
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                  Your Selection
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedSessionsList.map((s) => (
                    <div key={s._id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block">
                          {formatDateOnly(s.sessionDate, { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        <span className="text-gray-500 text-[11px]">
                          {s.startTime} – {s.endTime} ({s.sessionType === "FULL_DAY" ? "Full Day" : "Half Day"})
                        </span>
                      </div>
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                        ${s.fee}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Total Days Selected:</span>
                  <span className="font-bold">{selectedSessionsList.length} days</span>
                </div>
                <div className="flex items-center justify-between text-base font-extrabold text-[#031549] dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Total Amount:</span>
                  <span className="text-xl text-brand-600">${totalAmount}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT / CHECKOUT (matching screenshot #4) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Participant info & dropdown selector */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
                    Participant
                  </span>
                  {internalPlayers.length > 0 && (
                    <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded border border-brand-200/50">
                      {internalPlayers.length} Players in List
                    </span>
                  )}
                </div>

                {/* Dropdown to choose / switch player from player list */}
                <div className="space-y-1">
                  <label htmlFor="step3-player-select" className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="text-brand-600" />
                      Select Player from List:
                    </span>
                    {fetchingPlayers && (
                      <span className="text-[10px] text-brand-600 animate-pulse font-normal">Loading players...</span>
                    )}
                  </label>
                  <select
                    id="step3-player-select"
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>
                      {fetchingPlayers ? "-- Loading players list... --" : "-- Select a player from list --"}
                    </option>
                    {internalPlayers.map((p) => {
                      const name = p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || "Player";
                      const extra = p.category?.name || p.phone || p.email || "";
                      return (
                        <option key={p._id} value={p._id}>
                          {name} {extra ? `(${extra})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Participant Details Card */}
                <div className="pt-2 border-t border-blue-100 dark:border-blue-900/40 flex items-center gap-3">
                  {selectedPlayer?.profileImage ? (
                    <img
                      src={getMediaUrl(selectedPlayer.profileImage, getMediaFallback(selectedPlayer.fullName || "Player"))}
                      alt={selectedPlayer.fullName || "Player"}
                      className="w-10 h-10 rounded-full object-cover border border-blue-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getMediaFallback(selectedPlayer.fullName || "Player");
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#031549] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                      {selectedPlayer?.fullName ? selectedPlayer.fullName.charAt(0).toUpperCase() : "P"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white block truncate">
                      {selectedPlayer?.fullName || `${selectedPlayer?.firstName || ""} ${selectedPlayer?.lastName || ""}`.trim() || selectedPlayer?.name || "Player"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                      {selectedPlayer?.email || selectedPlayer?.phone || (selectedPlayer?.category?.name ? `Category: ${selectedPlayer.category.name}` : "Coach Max Academy")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`p-4 border text-left rounded transition-all flex items-center gap-3 ${
                      paymentMethod === "ONLINE"
                        ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 ring-2 ring-brand-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <CreditCard size={20} className={paymentMethod === "ONLINE" ? "text-brand-600" : "text-gray-400"} />
                    <div>
                      <span className="text-xs font-bold block text-gray-900 dark:text-white">Online Bank Transfer</span>
                      <span className="text-[10px] text-gray-500">Invoice proof upload</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("COD")}
                    className={`p-4 border text-left rounded transition-all flex items-center gap-3 ${
                      paymentMethod === "COD"
                        ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 ring-2 ring-brand-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Banknote size={20} className={paymentMethod === "COD" ? "text-brand-600" : "text-gray-400"} />
                    <div>
                      <span className="text-xs font-bold block text-gray-900 dark:text-white">Cash / Offline</span>
                      <span className="text-[10px] text-gray-500">Pay at venue desk</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Final Summary Card */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Selected Sessions:</span>
                  <span className="font-bold">{selectedSessionsList.length}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Camp Event:</span>
                  <span className="font-bold truncate max-w-[200px]">{event.title}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Amount to Invoice:</span>
                  <span className="text-lg text-brand-600">${totalAmount}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {currentStep === 4 && completedRegistration && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle size={36} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Registration Confirmed!</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Thank you! Your holiday camp registration for <strong>{selectedSessionsList.length} sessions</strong> has been officially recorded.
              </p>

              {completedRegistration.invoice && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 max-w-sm mx-auto text-left text-xs space-y-1">
                  <span className="font-bold text-blue-950 dark:text-blue-200 block">
                    Generated Invoice: #{completedRegistration.invoice.invoiceNumber}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 block">
                    Total Amount: ${completedRegistration.totalAmount}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold block">
                    Payment Status: {completedRegistration.invoice.paymentStatus}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          {currentStep === 1 && (
            <>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold">TOTAL</span>
                <span className="text-base font-extrabold text-brand-600">${totalAmount}</span>
              </div>
              <button
                type="button"
                disabled={selectedSessionsList.length === 0}
                onClick={() => setCurrentStep(2)}
                className="px-8 py-2.5 bg-[#031549] hover:bg-brand-600 text-white text-xs font-bold rounded shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                Continue
                <ArrowRight size={14} />
              </button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-8 py-2.5 bg-[#031549] hover:bg-brand-600 text-white text-xs font-bold rounded shadow-md transition-all flex items-center gap-2"
              >
                Continue to Payment
                <ArrowRight size={14} />
              </button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmRegistration}
                className="px-8 py-2.5 bg-[#031549] hover:bg-brand-600 text-white text-xs font-bold rounded shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Processing..." : "Confirm Registration"}
                <CheckCircle size={14} />
              </button>
            </>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#031549] hover:bg-brand-600 text-white text-xs font-bold rounded shadow-md transition-all"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HolidayCampRegistrationModal;
