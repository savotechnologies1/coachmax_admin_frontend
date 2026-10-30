import { formatDateOnly } from "../../utils/dateTime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Player } from "../../types/player";
import apiClient from "../../api/apiClient";
import {
  ShieldAlert,
  FileText,
  Pencil,
  UserPlus,
  Users,
  Trash2,
} from "lucide-react";
import { getStatusConfig, StatusIcon, getPlayerStatusTextClass } from "../common/StatusColorCode";
import { useUpdatePlayerPaymentStatus } from "../../hooks/usePlayers";
import PlayerPaymentHistoryModal from "./PlayerPaymentHistoryModal";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import ChatActionButton from "../chat/ChatActionButton";
import { chatApi } from "../../services/chatApi";
import { sortPlayersByPaymentStatus } from "../../utils/paymentStatus";

const REQUEST_STATUS_CONFIG: Record<string, { label: string; dotColor: string; textClass: string }> = {
  PENDING: { label: "PENDING", dotColor: "bg-amber-500", textClass: "text-amber-700 dark:text-amber-400" },
  APPROVED: { label: "APPROVED", dotColor: "bg-emerald-600", textClass: "text-emerald-700 dark:text-emerald-400" },
  REJECTED: { label: "REJECTED", dotColor: "bg-rose-600", textClass: "text-rose-700 dark:text-rose-400" },
  CANCELLED: { label: "CANCELLED", dotColor: "bg-slate-500", textClass: "text-slate-600 dark:text-slate-400" },
  COMPLETED: { label: "COMPLETED", dotColor: "bg-blue-600", textClass: "text-blue-700 dark:text-blue-400" },
};

const getRequestStatusConfig = (status?: string) =>
  REQUEST_STATUS_CONFIG[String(status || "PENDING").toUpperCase()] || REQUEST_STATUS_CONFIG.PENDING;

interface PlayerTableProps {
  players: Player[];
  selectedPlayerId: string;
  onSelectPlayer: (player: Player) => void;
  onEditPlayer?: (player: Player) => void;
  onDeletePlayer?: (player: Player) => void;
  onApprovePlayer?: (player: Player) => void;
  onRejectAndDeleteRequest?: (player: Player) => void;
  onAssignClass?: (player: Player) => void;
  onAssignTeam?: (player: Player) => void;
  onGenerateInvoice?: (player: Player) => void;
  onAddCoachNote?: (player: Player) => void;
  showStatusColumn?: boolean;
  showRequestDetails?: boolean;
  showAddedBy?: boolean;
  onRequestSourceClick?: (source: "APP" | "SUPER_ADMIN" | "COACH") => void;
  onOpenRequestedClass?: (player: Player) => void;
  showPaymentStatus?: boolean;
  canEditPaymentStatus?: boolean;
  canChat?: boolean;
  selectedTerm?: string;
  page?: number;
  limit?: number;
  preserveOrder?: boolean;
}

export const resolvePlayerPaymentStatus = (player: Player, selectedTermId?: string): string => {
  const breakdown = getClassPaymentBreakdown(player, selectedTermId);
  if (breakdown.length > 0) {
    if (breakdown.some((s) => s.isUnpaid)) {
      return "UNPAID";
    }
    if (breakdown.every((s) => s.paymentStatus === "PAID" || s.paymentStatus === "ACTIVE" || s.paymentStatus === "APPROVED")) {
      return "PAID";
    }
    if (breakdown.some((s) => s.paymentStatus === "TRIAL")) {
      return "TRIAL";
    }
    if (breakdown.some((s) => s.paymentStatus === "HANDSHAKE")) {
      return "HANDSHAKE";
    }
    return breakdown[0].paymentStatus;
  }

  if (player.paymentStatus) {
    return player.paymentStatus.toUpperCase();
  }

  return "TRIAL";
};

export interface ClassPaymentBreakdownItem {
  classId: string;
  className: string;
  termName?: string;
  paymentStatus: string;
  isUnpaid: boolean;
}

export const getClassPaymentBreakdown = (player: any, selectedTermId?: string): ClassPaymentBreakdownItem[] => {
  const assigned = Array.isArray(player.assignedClasses) ? player.assignedClasses : [];
  const classPaymentStatuses = Array.isArray(player.classPaymentStatuses) ? player.classPaymentStatuses : [];

  const assignedMap = new Map<string, any>();
  assigned.forEach((c: any) => {
    const id = (c._id || c.id || c).toString();
    assignedMap.set(id, c);
  });

  const list: ClassPaymentBreakdownItem[] = [];
  const processedClassIds = new Set<string>();

  const matchesTerm = (termVal: any): boolean => {
    if (!selectedTermId || selectedTermId === "All") return true;
    if (!termVal) return false;
    const tid = (termVal._id || termVal.id || termVal).toString();
    return tid === selectedTermId;
  };

  classPaymentStatuses.forEach((cps: any) => {
    const cid = (cps.class?._id || cps.class || "").toString();
    const assignedDoc = cid ? assignedMap.get(cid) : null;
    const termObj = assignedDoc?.term || cps.class?.term || player.term;

    if (!matchesTerm(termObj)) {
      return;
    }

    const className = assignedDoc?.name || cps.class?.name || (cid ? `Class (${cid.slice(-4)})` : "Class");
    const termName = termObj?.name || (termObj?.year ? `Term (${termObj.year})` : undefined);
    const status = (cps.paymentStatus || player.paymentStatus || "UNPAID").toUpperCase();

    if (cid) processedClassIds.add(cid);

    list.push({
      classId: cid,
      className,
      termName,
      paymentStatus: status,
      isUnpaid: status === "UNPAID" || status === "OVER_DUE",
    });
  });

  assigned.forEach((c: any) => {
    const cid = (c._id || c.id || "").toString();
    const termObj = c.term || player.term;

    if (cid && !processedClassIds.has(cid)) {
      if (!matchesTerm(termObj)) {
        return;
      }

      const status = (c.paymentStatus || player.paymentStatus || "UNPAID").toUpperCase();
      list.push({
        classId: cid,
        className: c.name || "Class",
        termName: termObj?.name || (termObj?.year ? `Term (${termObj.year})` : undefined),
        paymentStatus: status,
        isUnpaid: status === "UNPAID" || status === "OVER_DUE",
      });
    }
  });

  return list;
};

export default function PlayerTable({
  players,
  selectedPlayerId,
  onSelectPlayer,
  onEditPlayer,
  onDeletePlayer,
  onApprovePlayer,
  onRejectAndDeleteRequest,
  onAssignClass,
  onAssignTeam,
  onGenerateInvoice,
  onAddCoachNote,
  showStatusColumn = false,
  showRequestDetails = false,
  showAddedBy = false,
  onRequestSourceClick,
  onOpenRequestedClass,
  showPaymentStatus = true,
  canEditPaymentStatus = true,
  canChat = true,
  selectedTerm = "All",
  page = 1,
  limit = 10,
  preserveOrder = false,
}: PlayerTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteModalPlayer, setDeleteModalPlayer] = useState<Player | null>(null);
  const [paymentHistoryPlayer, setPaymentHistoryPlayer] = useState<Player | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const { isItemRead } = useSidebarBadges();
  const updatePaymentStatusMutation = useUpdatePlayerPaymentStatus();

  const navigate = useNavigate();

  useEffect(() => {
    const handleClose = () => {
      setOpenDropdownId(null);
      setMenuPosition(null);
    };
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, []);

  const toggleDropdown = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    if (openDropdownId === playerId) {
      setOpenDropdownId(null);
      setMenuPosition(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 224; // w-56
    const menuHeight = 380;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > viewportWidth - 10) {
      left = viewportWidth - menuWidth - 10;
    }

    let top = rect.bottom + 4;
    if (rect.bottom + menuHeight > viewportHeight && rect.top - menuHeight > 0) {
      top = rect.top - menuHeight - 4;
    }

    setMenuPosition({ top, left });
    setOpenDropdownId(playerId);
  };

  const openParentChat = (player: Player) => {
    const parentId = player.parentId?._id;
    return parentId
      ? chatApi.openDirectChat(String(parentId))
      : Promise.reject(new Error("No parent contact information found for this player."));
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-none shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <table className="min-w-[1100px] w-full text-left border-collapse text-[11px] [&_th]:border [&_th]:border-slate-700/50 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700 [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead>
            <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
              <th className="py-2.5 px-2 w-[45px] min-w-[45px] text-center">S.No</th>
              {showPaymentStatus && (
                <th className="py-2.5 px-1 min-w-[42px] w-[42px] max-w-[42px] text-center" title="Payment Status">
                  <div className="flex items-center justify-center">
                    <span className="text-sm select-none" title="Payment Status">
                      💰
                    </span>
                  </div>
                </th>
              )}
              {showStatusColumn && <th className="py-2.5 px-2 min-w-[65px] text-center">Status</th>}
              <th className="py-2.5 px-2 min-w-[120px]">Player</th>
              <th className="py-2.5 px-2 min-w-[75px]">DOB</th>
              <th className="py-2.5 px-2 min-w-[80px] text-center">Med Cond</th>
              <th className="py-2.5 px-2 min-w-[50px] text-center">Jersey #</th>
              <th className="py-2.5 px-2 min-w-[70px] text-center">Skill</th>
              <th className="py-2.5 px-2 min-w-[80px] text-center">Category</th>
              <th className="py-2.5 px-2 min-w-[80px] text-center">Program</th>
              {showRequestDetails && <th className="py-2.5 px-2 min-w-[190px]">Requested Class / Term</th>}
              {showAddedBy && <th className="py-2.5 px-2 min-w-[130px]">Requested By</th>}
              <th className="py-2.5 px-2 min-w-[40px] text-center">Foot</th>
              <th className="py-2.5 px-2 min-w-[90px]">Contact</th>
              <th className="py-2.5 px-2 min-w-[110px]">Email</th>
              <th className="py-2.5 px-2 min-w-[90px]">Phone</th>
              <th className="py-2.5 px-2 w-[50px] text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {(preserveOrder ? players : sortPlayersByPaymentStatus(players, (player) => resolvePlayerPaymentStatus(player, selectedTerm))).map((player, index) => {
              const serialNo = (page - 1) * limit + index + 1;
              const isRequest = !!(player as any).requestId || !!(player as any).requestType;
              const reqId = (player as any).requestId || player._id;
              const isUnread =
                (isRequest && !isItemRead("verificationRequests", reqId) && !isItemRead("verificationRequests", player._id) && (player.status === "PENDING")) ||
                ((player as any).playerStatus === "PENDING_APPROVAL" && !isItemRead("temporaryPlayers", reqId) && !isItemRead("temporaryPlayers", player._id));
              const paymentStatus = resolvePlayerPaymentStatus(player, selectedTerm);
              const playerStatus = isRequest ? (player.status || "PENDING") : ((player as any).playerStatus || player.status || "PENDING");
              const avatar = getMediaUrl(player.profileImage, getMediaFallback(player.fullName));
              const isFilteredByTerm = selectedTerm && selectedTerm !== "All";

              return (
                <tr
                  key={player.requestId || player._id}
                  onClick={() => onSelectPlayer(player)}
                  className={`border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-all ${
                    selectedPlayerId === (player.requestId || player._id)
                      ? "bg-slate-50 dark:bg-slate-800/40"
                      : isUnread
                      ? "bg-blue-50/20 dark:bg-blue-950/10 font-bold"
                      : ""
                  }`}
                >
                  <td className="py-3 px-2 text-center font-bold text-slate-500 dark:text-slate-400">
                    {serialNo}
                  </td>
                  {showPaymentStatus && (
                    <td
                      className="py-3 px-1 text-center min-w-[42px] w-[42px] max-w-[42px] relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentHistoryPlayer(player);
                      }}
                    >
                      {(() => {
                        const breakdown = getClassPaymentBreakdown(player, selectedTerm);
                        const unpaidClasses = breakdown.filter((item) => item.isUnpaid);
                        const paidClasses = breakdown.filter((item) => !item.isUnpaid);

                        const plainTooltip = [
                          isFilteredByTerm ? `[FILTERED BY SELECTED TERM]` : '',
                          `Payment Status: ${paymentStatus}`,
                          unpaidClasses.length > 0
                            ? `UNPAID CLASSES:\n${unpaidClasses.map((c) => `• ${c.className}${c.termName ? ` (${c.termName})` : ''} - UNPAID`).join('\n')}`
                            : '',
                          paidClasses.length > 0
                            ? `PAID CLASSES:\n${paidClasses.map((c) => `• ${c.className}${c.termName ? ` (${c.termName})` : ''} - PAID`).join('\n')}`
                            : '',
                        ]
                          .filter(Boolean)
                          .join('\n\n');

                        const isSpecialStatus = ["TRIAL", "TBC", "EXTRA", "OTHERS", "SUBSTITUTE"].includes(paymentStatus);

                        return (
                          <div
                            className="relative inline-flex items-center justify-center group cursor-pointer"
                            title={isSpecialStatus ? paymentStatus : plainTooltip}
                          >
                            <div className="p-1 transition-transform group-hover:scale-125">
                              <StatusIcon status={paymentStatus} size="w-5 h-5" />
                            </div>

                            {/* Floating hover breakdown tooltip card */}
                            {!isSpecialStatus && (
                              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[100] hidden group-hover:flex flex-col pointer-events-none w-64 bg-slate-900/95 dark:bg-slate-950/95 text-white p-2.5 shadow-2xl border border-slate-700/80 text-left rounded-none backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150">
                              {/* Header */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/80 text-[11px] font-bold">
                                <span className="flex items-center gap-1.5">
                                  <StatusIcon status={paymentStatus} size="w-3.5 h-3.5" />
                                  <span className="text-white">{paymentStatus}</span>
                                </span>
                                {isFilteredByTerm && (
                                  <span className="text-[9px] font-semibold text-amber-300 bg-amber-950/80 px-1 py-0.5 border border-amber-700">
                                    Term Filtered
                                  </span>
                                )}
                              </div>

                              {/* Class Breakdown List */}
                              <div className="py-2 space-y-2 text-[10px]">
                                {unpaidClasses.length > 0 && (
                                  <div>
                                    <div className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                      <span>⊖</span>
                                      <span>Unpaid Classes ({unpaidClasses.length}):</span>
                                    </div>
                                    <ul className="mt-1 space-y-1 pl-3 text-slate-300">
                                      {unpaidClasses.map((c, i) => (
                                        <li key={i} className="list-disc leading-tight">
                                          <span className="text-white font-medium">{c.className}</span>
                                          {c.termName && <span className="text-slate-400 text-[9px]"> ({c.termName})</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {paidClasses.length > 0 && (
                                  <div>
                                    <div className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                      <span>✔</span>
                                      <span>Paid Classes ({paidClasses.length}):</span>
                                    </div>
                                    <ul className="mt-1 space-y-1 pl-3 text-slate-300">
                                      {paidClasses.map((c, i) => (
                                        <li key={i} className="list-disc leading-tight">
                                          <span className="text-white font-medium">{c.className}</span>
                                          {c.termName && <span className="text-slate-400 text-[9px]"> ({c.termName})</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {unpaidClasses.length === 0 && paidClasses.length === 0 && (
                                  <div className="text-slate-400 italic">
                                    No class payment records for this player.
                                  </div>
                                )}
                              </div>

                              {/* Footer hint */}
                              <div className="pt-1.5 border-t border-slate-700/80 text-[9px] text-slate-400 flex items-center justify-between">
                                <span>Click icon to open:</span>
                                <span className="text-blue-400 font-bold">Payment History</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                      })()}
                    </td>
                  )}
                  {showStatusColumn && (
                    <td className="py-3 px-2 text-center">
                      {(() => {
                        const config = isRequest ? getRequestStatusConfig(playerStatus) : getStatusConfig(playerStatus);
                        return (
                          <span className={`inline-flex items-center gap-1.5 font-bold ${config.textClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dotColor}`} />
                            {config.label}
                          </span>
                        );
                      })()}
                    </td>
                  )}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span
                          className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                          title="Unread Item"
                        />
                      )}
                      <img
                        src={avatar}
                        alt={player.fullName}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-100"
                      />
                      <div className="min-w-0">
                        <span
                          className={`font-bold truncate max-w-[110px] block transition-colors ${getPlayerStatusTextClass(paymentStatus)}`}
                          title={player.fullName}
                        >
                          {player.fullName}
                        </span>
                        {!isRequest && player.hasPendingRequest && (
                          <span className="mt-0.5 block text-[10px] font-semibold text-amber-700 dark:text-amber-400" title="This active player also has a new request awaiting review">
                            New request pending
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-semibold text-slate-500">
                    {formatDateOnly(player.dob) || "N/A"}
                  </td>
                  <td className="py-3 px-2 text-center" title={player.medicalConditionDetails || player.medicalConditions}>
                    {player.isMedicalCondition === true ? (
                      <span className="text-rose-600 font-bold text-xs">
                        Yes
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-500">No</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {player.jerseyNumber ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#031549] text-white text-[10px] font-bold shadow-sm">
                        {player.jerseyNumber}
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-3 h-3 ${(player.rating || 0) > i
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200 fill-slate-200 dark:text-slate-700 dark:fill-slate-700"
                            }`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-brand-500">
                    <span
                      className="truncate max-w-[95px] block mx-auto text-center"
                      title={player.category?.name || "N/A"}
                    >
                      {player.category?.name || "N/A"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-slate-600 dark:text-slate-400">
                    {player.programs?.length ? (
                      <div className="flex items-center justify-center gap-1.5 relative group cursor-pointer">
                        <span className="truncate max-w-[100px]">{player.programs[0].name}</span>
                        {player.programs.length > 1 && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 whitespace-nowrap">
                            +{player.programs.length - 1}
                          </span>
                        )}

                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-none py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap text-left">
                            <ul className="text-left space-y-1.5">
                              {player.programs.map((p, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0047FF]"></span>
                                  {p.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 rotate-45"></div>
                        </div>
                      </div>
                    ) : (
                      <span
                        className="truncate max-w-[100px] block mx-auto"
                        title={player.program?.name || "-"}
                      >
                        {player.program?.name || "-"}
                      </span>
                    )}
                  </td>
                  {showRequestDetails && <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="font-semibold">{player.preferredTerm?.name || "Term not specified"}</div>
                    {player.preferredClasses?.length ? <button type="button" onClick={(event) => { event.stopPropagation(); onOpenRequestedClass?.(player); }} className="text-blue-600 underline text-left">{player.preferredClasses.map((cls) => cls?.name || "Unavailable class").join(", ")}</button> : <span>No class requested</span>}
                    {player.assignedClasses?.length > 0 && <div className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      {player.assignedClasses.length} existing class{player.assignedClasses.length === 1 ? "" : "es"} · player remains in Players
                      <div className="max-w-[220px] truncate font-normal text-slate-500 dark:text-slate-400" title={player.assignedClasses.map((cls) => cls?.name).filter(Boolean).join(", ")}>
                        {player.assignedClasses.map((cls) => cls?.name).filter(Boolean).slice(0, 2).join(", ")}{player.assignedClasses.filter((cls) => cls?.name).length > 2 ? ` +${player.assignedClasses.filter((cls) => cls?.name).length - 2} more` : ""}
                      </div>
                    </div>}
                    <div className="text-slate-400 mt-1">{player.requestType === "TEMPORARY_PLAYER" || player.requestType === "TEMPORARY" ? "Admin/coach temporary player" : (player.requestType || "").replace(/_/g, " ")}</div>
                  </td>}
                  {showAddedBy && <td className="py-3 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {player.requestedBySource && onRequestSourceClick ? (
                      <button type="button" onClick={(event) => { event.stopPropagation(); onRequestSourceClick(player.requestedBySource!); }} className="text-left text-[#0047FF] underline hover:text-blue-700" title={`Show requests from ${player.addedBy || player.requestedBySource}`}>
                        {player.addedBy || player.requestedBySource}
                      </button>
                    ) : player.addedBy || "Unknown"}
                  </td>}
                  <td className="py-3 px-2 font-bold text-slate-600 dark:text-slate-400 text-center">
                    {(player.preferredFoot || player.prefferedFoot) === "LEFT" ? "L" : (player.preferredFoot || player.prefferedFoot) === "RIGHT" ? "R" : "-"}
                  </td>
                  <td className="py-3 px-2 font-semibold text-slate-705 dark:text-slate-300">
                    <span
                      className="truncate max-w-[95px] block"
                      title={player.parentId?.fullName || "N/A"}
                    >
                      {player.parentId?.fullName || "N/A"}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-medium text-slate-500 dark:text-slate-400">
                    {player.parentId?.email ? (
                      <a
                        href={`mailto:${player.parentId.email}`}
                        className="text-[#0047FF] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors truncate max-w-[115px] block font-semibold"
                        onClick={(e) => e.stopPropagation()}
                        title={player.parentId.email}
                      >
                        {player.parentId.email}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="py-3 px-2 font-semibold text-slate-550 dark:text-slate-400">
                    {player.parentId?.phone ? player.parentId.phone.replace(/^(\+\d{2,3})(\d+)$/, "$1 $2") : "N/A"}
                  </td>
                  <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      id={`trigger-${player.requestId || player._id}`}
                      className={`text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1 border rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs inline-flex items-center justify-center ${openDropdownId === (player.requestId || player._id)
                        ? 'border-[#0047FF] bg-blue-50/50 dark:bg-blue-950/20 text-[#0047FF]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      title="More Options"
                      onClick={(e) => toggleDropdown(e, player.requestId || player._id)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Action Menu dropdown */}
      {openDropdownId && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdownId(null);
              setMenuPosition(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            className="z-[9999] w-56 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-md overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100"
          >
            {players.find(p => (p.requestId || p._id) === openDropdownId) && (() => {
              const player = players.find(p => (p.requestId || p._id) === openDropdownId)!;

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {showPaymentStatus && canEditPaymentStatus && <>
                  {/* UPDATE STATUS Section */}
                  <div className="py-1">
                    <div className="px-4 pt-1.5 pb-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                      UPDATE STATUS
                    </div>
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setMenuPosition(null);
                          updatePaymentStatusMutation.mutate({
                            userId: player._id,
                            payload: { paymentStatus: "PAID" },
                          });
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          <StatusIcon status="PAID" size="w-4 h-4" />
                        </div>
                        <span>PAID</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setMenuPosition(null);
                          updatePaymentStatusMutation.mutate({
                            userId: player._id,
                            payload: { paymentStatus: "HANDSHAKE" },
                          });
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          <StatusIcon status="HANDSHAKE" size="w-4 h-4" />
                        </div>
                        <span>HANDSHAKE</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setMenuPosition(null);
                          updatePaymentStatusMutation.mutate({
                            userId: player._id,
                            payload: { paymentStatus: "UNPAID" },
                          });
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          <StatusIcon status="UNPAID" size="w-4 h-4" />
                        </div>
                        <span>APPROVED (UNPAID)</span>
                      </button>

                      {/* Group 2: Statuses with Colored Text Only (No Icons) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setMenuPosition(null);
                          updatePaymentStatusMutation.mutate({
                            userId: player._id,
                            payload: { paymentStatus: "TRIAL" },
                          });
                        }}
                        className="w-full text-left pl-11 pr-4 py-1.5 text-xs font-bold text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors block"
                      >
                        TRIAL
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setMenuPosition(null);
                          updatePaymentStatusMutation.mutate({
                            userId: player._id,
                            payload: { paymentStatus: "TBC" },
                          });
                        }}
                        className="w-full text-left pl-11 pr-4 py-1.5 text-xs font-bold text-[#b7a9d9] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors block"
                      >
                        TBC
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          setMenuPosition(null);
                          updatePaymentStatusMutation.mutate({
                            userId: player._id,
                            payload: { paymentStatus: "EXTRA" },
                          });
                        }}
                        className="w-full text-left pl-11 pr-4 py-1.5 text-xs font-bold text-[#d6d11a] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors block"
                      >
                        EXTRA
                      </button>
                    </div>
                  </div>

                  </>}

                  {/* Chat */}
                  {canChat && <div>
                    <ChatActionButton
                      contextLabel={player.fullName || "Parent"}
                      ensureRoom={() => openParentChat(player)}
                      buttonText="Chat"
                      className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                    />
                  </div>}

                  {onGenerateInvoice && <>
                  {/* Generate Invoice */}
                  <div>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(null);
                        setMenuPosition(null);
                        if (onGenerateInvoice) {
                          onGenerateInvoice(player);
                        }
                      }}
                    >
                      <FileText size={16} className="text-slate-700 dark:text-slate-300 stroke-[1.8]" />
                      <span>Generate Invoice</span>
                    </button>
                  </div>

                  </>}

                  {onEditPlayer && <>
                  {/* Edit Player */}
                  <div>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(null);
                        setMenuPosition(null);
                        if (onEditPlayer) {
                          onEditPlayer(player);
                        }
                      }}
                    >
                      <Pencil size={16} className="text-slate-700 dark:text-slate-300 stroke-[1.8]" />
                      <span>Edit Player</span>
                    </button>
                  </div>

                  </>}

                  {onAssignClass && (!player.requestId || player.status === "PENDING") && <>
                  {/* Add to Class */}
                  <div>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(null);
                        setMenuPosition(null);
                        if (onAssignClass) {
                          onAssignClass(player);
                        }
                      }}
                    >
                      <UserPlus size={16} className="text-slate-700 dark:text-slate-300 stroke-[1.8]" />
                      <span>Add to Class</span>
                    </button>
                  </div>

                  </>}

                  {!showRequestDetails && <>
                  {/* Add to Team */}
                  <div>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(null);
                        setMenuPosition(null);
                        if (onAssignTeam) {
                          onAssignTeam(player);
                        } else {
                          navigate("/teams");
                        }
                      }}
                    >
                      <Users size={16} className="text-slate-700 dark:text-slate-300 stroke-[1.8]" />
                      <span>Add to Team</span>
                    </button>
                  </div>

                  </>}

                  {onRejectAndDeleteRequest && player.requestId && player.status === "PENDING" && <button type="button" onClick={(event) => { event.stopPropagation(); setOpenDropdownId(null); setMenuPosition(null); onRejectAndDeleteRequest(player); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"><span className="inline-flex items-center gap-3"><Trash2 size={16} />Reject and Delete</span></button>}
                  {onDeletePlayer && <>
                  {/* Delete Player */}
                  <div>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-rose-600 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(null);
                        setMenuPosition(null);
                        setDeleteModalPlayer(player);
                      }}
                    >
                      <Trash2 size={16} className="text-rose-600 stroke-[1.8]" />
                      <span>Delete Player</span>
                    </button>
                  </div>
                  </>}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 p-6 max-w-sm w-full rounded-none border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-none dark:bg-red-500/10 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Delete Player Record</h4>
                <p className="text-xs text-slate-400 mt-1 leading-normal">
                  Are you sure you want to permanently delete the player profile for <span className="font-semibold text-slate-700 dark:text-slate-200">{deleteModalPlayer.fullName}</span>? This action is irreversible.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setDeleteModalPlayer(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                onClick={() => {
                  if (onDeletePlayer) {
                    onDeletePlayer(deleteModalPlayer);
                  }
                  setDeleteModalPlayer(null);
                }}
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History & Status Modal */}
      {paymentHistoryPlayer && (
        <PlayerPaymentHistoryModal
          isOpen={!!paymentHistoryPlayer}
          onClose={() => setPaymentHistoryPlayer(null)}
          player={paymentHistoryPlayer}
          initialTermId={selectedTerm}
        />
      )}
    </div>
  );
}
