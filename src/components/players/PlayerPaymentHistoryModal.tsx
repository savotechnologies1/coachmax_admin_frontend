import React, { useState, useMemo } from "react";
import { Player } from "../../types/player";
import { useAdminPlayerDetails, useUpdatePlayerPaymentStatus } from "../../hooks/usePlayers";
import { useTerms } from "../../hooks/useTerms";
import { StatusBadge, StatusDot, getStatusConfig } from "../common/StatusColorCode";
import { 
  X, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  RefreshCw, 
  Filter, 
  CreditCard,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";
import { getMediaUrl, getMediaFallback } from "../../utils/media";

interface PlayerPaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  initialTermId?: string;
}

const VALID_STATUSES = [
  { value: "PAID", label: "PAID" },
  { value: "UNPAID", label: "UNPAID" },
  { value: "TRIAL", label: "TRIAL" },
  { value: "OVER_DUE", label: "OVER DUE" },
  { value: "HANDSHAKE", label: "HANDSHAKE" },
  { value: "TBC", label: "TBC" },
  { value: "EXTRA", label: "EXTRA" },
  { value: "SUBSTITUTE", label: "SUBSTITUTE" },
];

export default function PlayerPaymentHistoryModal({
  isOpen,
  onClose,
  player,
  initialTermId = "All",
}: PlayerPaymentHistoryModalProps) {
  const playerId = player?._id || "";
  const { data: detailsRes, isLoading, refetch } = useAdminPlayerDetails(playerId);
  const { terms = [] } = useTerms({ isEvent: "all" });
  const updatePaymentStatusMutation = useUpdatePlayerPaymentStatus();

  const [selectedTerm, setSelectedTerm] = useState<string>(initialTermId || "All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All");
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Sync initialTermId when modal opens with a different term
  React.useEffect(() => {
    if (initialTermId) {
      setSelectedTerm(initialTermId);
    }
  }, [initialTermId, isOpen]);

  const playerEnvelope = detailsRes?.data;
  const fetchedPlayer = playerEnvelope?.player || player;
  const parent = playerEnvelope?.parent || fetchedPlayer?.parentId;

  // Extract financial data and items
  const financialSummary = playerEnvelope?.paymentFinancialSummary;
  const rawHistory: any[] = useMemo(() => {
    if (financialSummary?.history && Array.isArray(financialSummary.history)) {
      return financialSummary.history;
    }

    // Fallback if backend hasn't populated financialSummary yet
    const assigned = playerEnvelope?.assignedClassesPaymentInfo || [];
    const list: any[] = [];
    assigned.forEach((cls: any) => {
      const isPaid = cls.paymentStatus === "PAID" || cls.paymentStatus === "APPROVED";
      const isUnpaid = cls.paymentStatus === "UNPAID" || cls.paymentStatus === "OVER_DUE";
      const fee = Number(cls.fee || cls.price || 0);
      list.push({
        id: `class-${cls.classId || cls._id}`,
        type: "CLASS",
        classId: cls.classId || cls._id,
        name: cls.className || cls.name || "Class",
        termId: cls.termId || cls.term?._id || null,
        termName: cls.termName || cls.term?.name || "General",
        fee,
        amountReceived: isPaid ? fee : 0,
        amountPending: isUnpaid ? fee : 0,
        paymentStatus: cls.paymentStatus || "UNPAID",
        invoiceNumber: cls.invoiceNumber || null,
        invoiceId: cls.invoiceId || null,
        dayOfWeek: cls.dayOfWeek,
        startTime: cls.startTime,
      });
    });
    return list;
  }, [financialSummary, playerEnvelope]);

  // Filter items based on selectedTerm and selectedStatusFilter
  const filteredHistory = useMemo(() => {
    return rawHistory.filter((item) => {
      // Term filter
      if (selectedTerm && selectedTerm !== "All") {
        const itemTermId = item.termId?.toString();
        const itemTermName = item.termName?.toLowerCase();
        // Check both ID match and name match (in case term name passed)
        const matchId = itemTermId === selectedTerm;
        const matchingTermObj = terms.find((t) => t._id === selectedTerm);
        const matchName = matchingTermObj && itemTermName === matchingTermObj.name?.toLowerCase();
        if (!matchId && !matchName) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter && selectedStatusFilter !== "All") {
        if (item.paymentStatus !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [rawHistory, selectedTerm, selectedStatusFilter, terms]);

  // Compute Totals dynamically based on filtered items
  const totals = useMemo(() => {
    const totalFees = filteredHistory.reduce((sum, item) => sum + (Number(item.fee) || 0), 0);
    const totalReceived = filteredHistory.reduce((sum, item) => sum + (Number(item.amountReceived) || 0), 0);
    const totalPending = filteredHistory.reduce((sum, item) => sum + (Number(item.amountPending) || 0), 0);
    return {
      totalFees,
      totalReceived,
      totalPending,
    };
  }, [filteredHistory]);

  if (!isOpen || !player) return null;

  const handleUpdateItemStatus = async (item: any, newStatus: string) => {
    if (!playerId) return;
    setUpdatingItemId(item.id);
    try {
      const payload: any = { paymentStatus: newStatus };
      if (item.type === "CLASS" && item.classId) {
        payload.classId = item.classId;
      } else if (item.type === "TEAM" && item.teamId) {
        payload.teamId = item.teamId;
      }

      await updatePaymentStatusMutation.mutateAsync({
        userId: playerId,
        payload,
      });

      refetch();
    } catch (err: any) {
      console.error(err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleUpdateOverallStatus = async (newStatus: string) => {
    if (!playerId) return;
    if (!window.confirm(`Update overall player payment status to ${newStatus}? This will apply to all classes.`)) {
      return;
    }
    setUpdatingItemId("all");
    try {
      await updatePaymentStatusMutation.mutateAsync({
        userId: playerId,
        payload: { paymentStatus: newStatus },
      });
      refetch();
    } catch (err: any) {
      console.error(err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const avatar = getMediaUrl(fetchedPlayer?.profileImage, getMediaFallback(fetchedPlayer?.fullName || "Player"));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={avatar}
              alt={fetchedPlayer?.fullName || "Player"}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#0047FF] shadow-xs shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {fetchedPlayer?.fullName}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#0047FF] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 uppercase">
                  Payment History & Status
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                {parent?.fullName && (
                  <span>Parent: <strong className="text-slate-700 dark:text-slate-200">{parent.fullName}</strong></span>
                )}
                {parent?.phone && (
                  <span>• Tel: {parent.phone}</span>
                )}
                {parent?.email && (
                  <span>• {parent.email}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetch()}
              title="Refresh Records"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin text-[#0047FF]" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filters and Quick Actions Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Term Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span className="font-bold text-slate-700 dark:text-slate-300">Term:</span>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:border-[#0047FF]"
              >
                <option value="All">All Terms</option>
                {terms.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} {t.year ? `(${t.year})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400" />
              <span className="font-bold text-slate-700 dark:text-slate-300">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:border-[#0047FF]"
              >
                <option value="All">All Statuses</option>
                {VALID_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Player-Level Status Changer */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
              Set All Status:
            </span>
            <select
              defaultValue=""
              disabled={updatingItemId === "all"}
              onChange={(e) => {
                if (e.target.value) {
                  handleUpdateOverallStatus(e.target.value);
                  e.target.value = "";
                }
              }}
              className="h-8 px-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[#0047FF] dark:text-blue-400 font-bold focus:outline-hidden text-xs"
            >
              <option value="" disabled>
                {updatingItemId === "all" ? "Updating..." : "Change All to..."}
              </option>
              {VALID_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  Set All to {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Financial Cards */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          {/* Total Amount */}
          <div className="p-3.5 bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                Total Fees / Invoiced
              </span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                ${totals.totalFees.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {filteredHistory.length} registered {filteredHistory.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <DollarSign size={18} />
            </div>
          </div>

          {/* Amount Received */}
          <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Amount Received (Paid)
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                ${totals.totalReceived.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-600/80 font-medium">
                {totals.totalFees > 0 
                  ? `${Math.round((totals.totalReceived / totals.totalFees) * 100)}% collected`
                  : "0% collected"}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 size={18} />
            </div>
          </div>

          {/* Amount Pending */}
          <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                Amount Pending (Unpaid)
              </span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                ${totals.totalPending.toFixed(2)}
              </span>
              <span className="text-[10px] text-amber-600/80 font-medium">
                {totals.totalPending > 0 ? "Requires payment" : "Fully cleared"}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300">
              <AlertCircle size={18} />
            </div>
          </div>
        </div>

        {/* Scrollable Records Table */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-[#0047FF] border-r-transparent" />
              <p className="text-xs text-slate-400 font-semibold mt-3">Loading player financial history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 p-8">
              <CreditCard size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Payment Records Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No classes or payment items match the selected term ({selectedTerm === "All" ? "All Terms" : "Filtered"}) and status criteria.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">Class / Item Name</th>
                    <th className="py-2.5 px-3">Term</th>
                    <th className="py-2.5 px-3 text-right">Fee</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Received</th>
                    <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">Pending</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredHistory.map((item, idx) => {
                    const isRowUpdating = updatingItemId === item.id;
                    const st = (item.paymentStatus || "UNPAID").toUpperCase();
                    const config = getStatusConfig(st);

                    return (
                      <tr 
                        key={item.id || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {item.dayOfWeek && <span>{item.dayOfWeek}</span>}
                            {item.startTime && <span>• {item.startTime}</span>}
                            {item.invoiceNumber && (
                              <span className="font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2">
                                {item.invoiceNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {item.termName || "General"}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          ${Number(item.fee || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ${Number(item.amountReceived || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          ${Number(item.amountPending || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold uppercase rounded-none border shadow-xs ${config.badgeClass}`}
                          >
                            <StatusDot status={st} className="w-1.5 h-1.5" />
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <select
                              value={st}
                              disabled={isRowUpdating}
                              onChange={(e) => handleUpdateItemStatus(item, e.target.value)}
                              className={`h-7 px-2 text-[10px] font-bold uppercase rounded-none border transition-all cursor-pointer ${
                                st === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : st === "UNPAID" || st === "OVER_DUE"
                                  ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
                                  : "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                              } focus:outline-hidden`}
                            >
                              {VALID_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            {isRowUpdating && (
                              <RefreshCw size={12} className="animate-spin text-[#0047FF]" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Clicking a status updates it in real-time in the database, recalculating received & pending amounts.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#0047FF] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
