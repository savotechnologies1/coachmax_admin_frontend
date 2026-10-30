import { formatTimestampDate } from "../../utils/dateTime";
import React, { useState, useMemo, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { useCurrentTerm } from "../../hooks/useCurrentTerm";
import { useTermEarnings } from "../../hooks/useTermEarnings";
import { useCoachAccess } from "../../hooks/useCoachAccess";
import { StatusIcon, getPlayerStatusTextClass } from "../../components/common/StatusColorCode";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Search,
  RefreshCw,
  FileSpreadsheet,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Trophy,
  SunMedium,
  Layers,
  ArrowRight,
  Percent,
  Check,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  PAID: {
    label: "Paid",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
  },
  COMPLETED: {
    label: "Paid",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
  },
  HANDSHAKE: {
    label: "Handshake (Scholarship)",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800/60",
    dot: "bg-teal-500",
  },
  TRIAL: {
    label: "Free Trial",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-800/60",
    dot: "bg-cyan-500",
  },
  PENDING: {
    label: "Pending",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800/60",
    dot: "bg-amber-500",
  },
  UNPAID: {
    label: "Unpaid",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800/60",
    dot: "bg-rose-500",
  },
  PARTIAL: {
    label: "Partial",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800/60",
    dot: "bg-blue-500",
  },
  OVERDUE: {
    label: "Overdue",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800/60",
    dot: "bg-rose-500",
  },
  REFUNDED: {
    label: "Refunded",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800/60",
    dot: "bg-purple-500",
  },
};

const STREAM_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  ACADEMY: {
    label: "Academy Classes",
    icon: GraduationCap,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800/60",
  },
  LEAGUES: {
    label: "Leagues & Tournaments",
    icon: Trophy,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/60",
  },
  CAMPS: {
    label: "Holiday Camps & Events",
    icon: SunMedium,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/60",
  },
  STORE: {
    label: "Store Merchandise",
    icon: ShoppingBag,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800/60",
  },
};

export default function TermEarningsPage() {
  const access = useCoachAccess();
  // Scope Mode: Single Term vs Two-Term Comparison vs All-Time Lifetime
  const [scopeMode, setScopeMode] = useState<"SINGLE" | "COMPARE" | "ALL_TIME">("SINGLE");
  const [selectedStream, setSelectedStream] = useState<string>("ALL");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [secondaryTermId, setSecondaryTermId] = useState<string>("");
  const [activeLedgerTab, setActiveLedgerTab] = useState<"ALL_PLAYERS" | "BY_CLASS" | "BY_STREAM">("ALL_PLAYERS");
  const [expandedClassIds, setExpandedClassIds] = useState<Record<string, boolean>>({});

  // Pagination for Master Player Ledger
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Centralized Term & Year selection
  const {
    terms,
    availableYears,
    selectedYear,
    setSelectedYear,
    selectedTerm: selectedTermId,
    setSelectedTerm: setSelectedTermId,
  } = useCurrentTerm();

  const yearOptions = useMemo(() => {
    return availableYears.map((y) => Number(y));
  }, [availableYears]);

  // Set default secondary term for comparison mode
  useEffect(() => {
    if (terms && terms.length > 1 && !secondaryTermId) {
      const otherTerm = terms.find((t: any) => (t._id || t.id) !== selectedTermId);
      if (otherTerm) setSecondaryTermId(otherTerm._id || otherTerm.id);
    }
  }, [terms, selectedTermId, secondaryTermId]);

  // Determine effective termId based on scope mode
  const effectiveTermId = scopeMode === "ALL_TIME" ? "ALL" : selectedTermId;

  // Fetch Term Earnings Data
  const {
    data: earningsResponse,
    isLoading: isEarningsLoading,
    isRefetching,
    refetch,
  } = useTermEarnings(effectiveTermId, {
    classId: selectedClassId,
    status: selectedStatus,
    compareTermId: scopeMode === "COMPARE" ? secondaryTermId : undefined,
    stream: selectedStream,
  });

  const apiData = earningsResponse?.data || earningsResponse || {};
  const currentTermInfo = apiData?.term || null;
  const summary = apiData?.summary || {};
  const rawClasses: any[] = Array.isArray(apiData?.classes) ? apiData.classes : [];
  const allRecords: any[] = Array.isArray(apiData?.allRecords) ? apiData.allRecords : [];
  const comparison = apiData?.comparison || null;
  const streamData = summary?.streams || {};

  // Initialize expanded state for classes
  useEffect(() => {
    if (rawClasses.length > 0) {
      const initial: Record<string, boolean> = {};
      rawClasses.forEach((cls: any) => {
        const id = cls.classId || cls._id;
        initial[id] = true;
      });
      setExpandedClassIds(initial);
    }
  }, [rawClasses.length]);

  const toggleClassExpand = (classId: string) => {
    setExpandedClassIds((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    rawClasses.forEach((cls: any) => {
      all[cls.classId || cls._id] = true;
    });
    setExpandedClassIds(all);
  };

  const collapseAll = () => {
    setExpandedClassIds({});
  };

  // Available classes for dropdown selector
  const availableClasses = useMemo(() => {
    return rawClasses.map((c: any) => ({
      id: c.classId || c._id || c.id,
      name: c.className || c.name || "Class",
      program: c.program || "",
      category: c.category || "",
    }));
  }, [rawClasses]);

  // Format currency helper
  const formatCurrency = (val: number | undefined | null) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Metrics from API summary
  const totalExpected = summary.totalExpected ?? 0;
  const totalHandshake = summary.totalHandshake ?? 0;
  const totalNetExpected = summary.totalNetExpected ?? Math.max(0, totalExpected - totalHandshake);
  const totalPaid = summary.totalPaid ?? 0;
  const totalPending = summary.totalPending ?? summary.totalOutstanding ?? 0;
  const totalTrialPotential = summary.totalTrialPotential ?? 0;
  const totalTrialCount = summary.totalTrialCount ?? 0;
  const totalHandshakeCount = summary.totalHandshakeCount ?? 0;
  const totalEnrolledPlayers = summary.totalPlayers ?? allRecords.length;
  const collectionRate =
    summary.collectionRate ??
    (totalNetExpected > 0 ? Math.round((totalPaid / totalNetExpected) * 100) : 0);

  // Filter master player / order ledger records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allRecords.filter((rec: any) => {
      // Stream filter
      if (selectedStream !== "ALL" && rec.stream !== selectedStream) return false;

      // Status filter
      if (selectedStatus !== "ALL") {
        const itemStatus = (rec.paymentStatus || "UNPAID").toUpperCase();
        if (itemStatus !== selectedStatus.toUpperCase()) return false;
      }

      // Search query filter
      if (q) {
        const matchName = (rec.playerName || "").toLowerCase().includes(q);
        const matchEmail = (rec.playerEmail || "").toLowerCase().includes(q);
        const matchParent = (rec.parentName || "").toLowerCase().includes(q);
        const matchPhone = (rec.parentPhone || "").toLowerCase().includes(q);
        const matchTitle = (rec.title || "").toLowerCase().includes(q);
        const matchProg = (rec.categoryOrProgram || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchParent && !matchPhone && !matchTitle && !matchProg) {
          return false;
        }
      }

      return true;
    });
  }, [allRecords, selectedStream, selectedStatus, searchQuery]);

  // Paginated records for table
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedStream, selectedStatus, searchQuery, scopeMode, selectedTermId]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error("No player or transaction records to export.");
      return;
    }

    const headers = [
      "Record ID",
      "Stream",
      "Player / Customer Name",
      "Player Email",
      "Parent Name",
      "Parent Phone",
      "Activity / Item Title",
      "Program / Category",
      "Term",
      "Gross Nominal Fee ($)",
      "Handshake / Scholarship ($)",
      "Net Payable ($)",
      "Cash Paid ($)",
      "Pending Balance ($)",
      "Payment Status",
      "Date",
    ];

    const termLabel = currentTermInfo?.name || "Term Report";

    const rows = filteredRecords.map((r: any) => [
      `"${r.id || ""}"`,
      `"${r.streamLabel || r.stream || ""}"`,
      `"${r.playerName || ""}"`,
      `"${r.playerEmail || ""}"`,
      `"${r.parentName || ""}"`,
      `"${r.parentPhone || ""}"`,
      `"${r.title || ""}"`,
      `"${r.categoryOrProgram || ""}"`,
      `"${r.termName || termLabel}"`,
      (r.price || 0).toFixed(2),
      (r.handshakeAmount || 0).toFixed(2),
      (r.netAmount || 0).toFixed(2),
      (r.paidAmount || 0).toFixed(2),
      (r.pendingAmount || 0).toFixed(2),
      `"${r.paymentStatus || "UNPAID"}"`,
      `"${r.createdAt ? formatTimestampDate(r.createdAt) : ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `CoachMax_Earnings_${scopeMode}_${termLabel.replace(/\s+/g, "_")}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Comprehensive earnings report exported successfully!");
  };

  const activeTermDisplay =
    scopeMode === "ALL_TIME"
      ? "All-Time Lifetime Earnings"
      : currentTermInfo?.name ||
        terms.find((t: any) => (t._id || t.id) === selectedTermId)?.name ||
        "Academic Term";

  return (
    <>
      <PageMeta
        title={`CoachMax | Revenue & Term Earnings - ${activeTermDisplay}`}
        description="Multi-stream earnings report, Handshake scholarship management, and financial conversion intelligence."
      />

      <div className="space-y-6">
        {/* TOP BAR / BREADCRUMB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <PageBreadcrumb pageTitle="Term Earnings & Revenue Intel" items={[{ name: "Finance", path: "/invoices" }]} />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Financial Intelligence & Term Earnings</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Live Audited
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-stream financial analytics across Academies, Leagues, Camps & Store with Handshake scholarship tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isEarningsLoading || isRefetching}
              className="px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs rounded-none"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-[#0047FF]" : ""}`} />
              <span>Refresh</span>
            </button>

            {access.can("reports", "export") && <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs font-bold bg-[#0047FF] hover:bg-blue-700 text-white rounded-none transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV Audit</span>
            </button>}
          </div>
        </div>

        {/* HERO EXECUTIVE CARD & SCOPE CONTROLS */}
        <div className="bg-[#031549] text-white p-6 lg:p-7 rounded-none border-l-4 border-[#0047FF] shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
            <DollarSign className="w-80 h-80 text-white" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {/* Segmented Scope Switcher */}
                <div className="inline-flex rounded bg-white/10 p-1 border border-white/15">
                  <button
                    onClick={() => setScopeMode("SINGLE")}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded ${
                      scopeMode === "SINGLE"
                        ? "bg-[#0047FF] text-white shadow-xs"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    📅 Single Term
                  </button>
                  <button
                    onClick={() => setScopeMode("COMPARE")}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded ${
                      scopeMode === "COMPARE"
                        ? "bg-[#0047FF] text-white shadow-xs"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    ⚖️ Compare 2 Terms
                  </button>
                  <button
                    onClick={() => setScopeMode("ALL_TIME")}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded ${
                      scopeMode === "ALL_TIME"
                        ? "bg-[#0047FF] text-white shadow-xs"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    🌐 All-Time Lifetime
                  </button>
                </div>

                <span className="text-xs font-semibold text-gray-300 ml-2">
                  {totalEnrolledPlayers} Enrolled Records • {totalTrialCount} Active Trials • {totalHandshakeCount} Handshakes
                </span>
              </div>

              <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                {activeTermDisplay}
              </h2>
              <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
                {scopeMode === "COMPARE"
                  ? "Side-by-side comparative growth analytics between two terms with net delta and player conversion tracking."
                  : scopeMode === "ALL_TIME"
                  ? "Lifetime consolidated financial overview aggregating all academic terms, leagues, holiday camps, and store orders."
                  : "Comprehensive financial overview tracking expected nominal revenue, handshake concessions, approved collections, and prospective trials."}
              </p>
            </div>

            {/* Scope Selection Dropdowns */}
            <div className="flex items-center gap-3 flex-wrap shrink-0">
              {scopeMode !== "ALL_TIME" && (
                <>
                  {/* Year Selector */}
                  <div className="flex items-center gap-2.5 bg-white/10 p-3 rounded-none backdrop-blur-xs border border-white/15">
                    <Calendar className="w-4 h-4 text-blue-300 shrink-0" />
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-300">
                        Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setSelectedClassId("ALL");
                        }}
                        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer pr-3 py-0.5 border-b border-white/20 focus:border-blue-400"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y} className="text-gray-900">
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Term Selector A */}
                  <div className="flex items-center gap-2.5 bg-white/10 p-3 rounded-none backdrop-blur-xs border border-white/15">
                    <GraduationCap className="w-4 h-4 text-blue-300 shrink-0" />
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-300">
                        {scopeMode === "COMPARE" ? "Term A (Baseline)" : "Select Term"}
                      </label>
                      <select
                        value={selectedTermId || ""}
                        onChange={(e) => {
                          setSelectedTermId(e.target.value);
                          setSelectedClassId("ALL");
                        }}
                        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer pr-3 py-0.5 border-b border-white/20 focus:border-blue-400 max-w-[150px] truncate"
                      >
                        {terms.map((t: any) => (
                          <option key={t._id || t.id} value={t._id || t.id} className="text-gray-900">
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Secondary Term Selector for Comparison */}
                  {scopeMode === "COMPARE" && (
                    <div className="flex items-center gap-2.5 bg-indigo-950/60 p-3 rounded-none backdrop-blur-xs border border-indigo-400/30">
                      <Trophy className="w-4 h-4 text-indigo-300 shrink-0" />
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">
                          Term B (Compare)
                        </label>
                        <select
                          value={secondaryTermId}
                          onChange={(e) => setSecondaryTermId(e.target.value)}
                          className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer pr-3 py-0.5 border-b border-indigo-400/40 focus:border-indigo-300 max-w-[150px] truncate"
                        >
                          {terms.map((t: any) => (
                            <option key={t._id || t.id} value={t._id || t.id} className="text-gray-900">
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* PRIMARY KPI METRICS (GRID OF 5 EXECUTIVE CARDS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Expected Gross Revenue */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gross Expected
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(totalExpected)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Nominal value across all 4 streams before concessions.
            </p>
          </div>

          {/* Card 2: Handshakes & Scholarships (Discount Concessions) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-teal-200 dark:border-teal-900/60 shadow-xs relative overflow-hidden bg-gradient-to-br from-teal-50/20 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                Handshakes & Grants
              </span>
              <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center text-sm" title="Handshake scholarship concessions">
                🤝
              </div>
            </div>
            <div className="text-2xl font-black text-teal-700 dark:text-teal-400 tracking-tight">
              {formatCurrency(totalHandshake)}
            </div>
            <p className="text-[10px] text-teal-600 dark:text-teal-500 mt-1 font-semibold">
              {totalHandshakeCount} Handshake Scholarships / Fee Concessions
            </p>
          </div>

          {/* Card 3: Net Invoiced & Cash Collected */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-emerald-200 dark:border-emerald-900/60 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/20 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Cash Received
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(totalPaid)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {collectionRate}%
              </span>
            </div>
          </div>

          {/* Card 4: Pending & Outstanding */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-amber-200 dark:border-amber-900/60 shadow-xs relative overflow-hidden bg-gradient-to-br from-amber-50/20 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Pending Balance
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 font-semibold">
              Unpaid invoices & pending verification
            </p>
          </div>

          {/* Card 5: Trial Conversion Pipeline */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-cyan-200 dark:border-cyan-900/60 shadow-xs relative overflow-hidden bg-gradient-to-br from-cyan-50/20 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                Trial Pipeline
              </span>
              <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-700 dark:text-cyan-400 tracking-tight">
              {formatCurrency(totalTrialPotential)}
            </div>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-500 mt-1 font-semibold">
              {totalTrialCount} Active Trial Students to Convert
            </p>
          </div>
        </div>

        {/* TWO-TERM COMPARISON SCORECARD (Visible when Compare Mode is Active) */}
        {scopeMode === "COMPARE" && comparison && (
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-[#031549] text-white p-6 rounded-none shadow-md border border-indigo-700/40">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-700/50">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-300" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Two-Term Growth & Performance Comparison
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-200">
                  {comparison.termAName} vs {comparison.termBName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                    comparison.growthPercent >= 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                  }`}
                >
                  {comparison.growthPercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {comparison.growthPercent >= 0 ? `+${comparison.growthPercent}%` : `${comparison.growthPercent}%`} Growth
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 p-4 rounded backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                  Cash Collected
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs text-gray-300">{formatCurrency(comparison.termA?.totalPaid)}</span>
                  <span className="text-sm font-semibold text-indigo-300">➔</span>
                  <span className="text-lg font-black text-white">{formatCurrency(comparison.termB?.totalPaid)}</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-semibold mt-1">
                  Delta: {formatCurrency(comparison.growthPaid)}
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                  Expected Gross
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs text-gray-300">{formatCurrency(comparison.termA?.totalExpected)}</span>
                  <span className="text-sm font-semibold text-indigo-300">➔</span>
                  <span className="text-lg font-black text-white">{formatCurrency(comparison.termB?.totalExpected)}</span>
                </div>
                <div className="text-[10px] text-indigo-200 font-semibold mt-1">
                  Delta: {formatCurrency(comparison.growthExpected)}
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                  Handshake Concessions
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs text-gray-300">{formatCurrency(comparison.termA?.totalHandshake)}</span>
                  <span className="text-sm font-semibold text-indigo-300">➔</span>
                  <span className="text-lg font-black text-teal-300">{formatCurrency(comparison.termB?.totalHandshake)}</span>
                </div>
                <div className="text-[10px] text-teal-200 font-semibold mt-1">
                  {comparison.termB?.totalHandshakeCount || 0} Handshake players
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                  Collection Efficiency
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs text-gray-300">{comparison.termA?.collectionRate || 0}%</span>
                  <span className="text-sm font-semibold text-indigo-300">➔</span>
                  <span className="text-lg font-black text-emerald-400">{comparison.termB?.collectionRate || 0}%</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-semibold mt-1">
                  {(comparison.termB?.collectionRate || 0) - (comparison.termA?.collectionRate || 0) >= 0 ? "+" : ""}
                  {(comparison.termB?.collectionRate || 0) - (comparison.termA?.collectionRate || 0)}% rate shift
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIAL FUNNEL & MULTI-STREAM REVENUE DISTRIBUTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual Financial Funnel (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0047FF]" />
                  <span>Financial Flow & Revenue Funnel</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Conversion breakdown from gross potential fees down to realized cash and active trials.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                100% Full Audit
              </span>
            </div>

            {/* Funnel Steps */}
            <div className="space-y-3.5 pt-2">
              {/* Stage 1: Gross Potential */}
              <div className="relative">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>1. Total Gross Potential</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-black">{formatCurrency(totalExpected)}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-none overflow-hidden">
                  <div className="bg-blue-600 h-full w-full" />
                </div>
              </div>

              {/* Stage 2: Handshakes & Scholarships */}
              <div className="relative pl-3 border-l-2 border-teal-400">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                    <span>🤝 2. Handshakes & Scholarships (Concessions)</span>
                  </span>
                  <span className="text-teal-700 dark:text-teal-400 font-bold">
                    - {formatCurrency(totalHandshake)} ({totalExpected > 0 ? Math.round((totalHandshake / totalExpected) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-none overflow-hidden">
                  <div
                    className="bg-teal-500 h-full transition-all"
                    style={{
                      width: `${Math.min(100, totalExpected > 0 ? (totalHandshake / totalExpected) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Stage 3: Net Billed Invoiced Target */}
              <div className="relative">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span>3. Net Invoiced Target (Net Expected)</span>
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{formatCurrency(totalNetExpected)}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-none overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all"
                    style={{
                      width: `${Math.min(100, totalExpected > 0 ? (totalNetExpected / totalExpected) * 100 : 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Stage 4: Split into Cash Collected vs Pending */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Collected */}
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Cash Realized</span>
                    </span>
                    <span>{collectionRate}%</span>
                  </div>
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatCurrency(totalPaid)}
                  </div>
                </div>

                {/* Pending */}
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending Collection</span>
                    </span>
                    <span>{100 - collectionRate}%</span>
                  </div>
                  <div className="text-lg font-black text-amber-700 dark:text-amber-400 mt-1">
                    {formatCurrency(totalPending)}
                  </div>
                </div>
              </div>

              {/* Stage 5: Prospective Trial Pipeline */}
              <div className="p-3 bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40 rounded flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Prospective Free Trial Pipeline</span>
                  </div>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                    {totalTrialCount} prospective players currently testing programs.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-cyan-700 dark:text-cyan-400">
                    +{formatCurrency(totalTrialPotential)}
                  </div>
                  <span className="text-[9px] uppercase font-bold text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 px-1.5 py-0.5 rounded">
                    Unbilled Opportunity
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Stream Breakdown (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#0047FF]" />
                    <span>Revenue Streams</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Contribution per commercial vertical.
                  </p>
                </div>
              </div>

              {/* Stream Cards */}
              <div className="space-y-3">
                {/* 1. Academy Classes */}
                {(() => {
                  const data = streamData.academy || {};
                  const exp = data.expected || 0;
                  const paid = data.paid || 0;
                  const pct = totalExpected > 0 ? Math.round((exp / totalExpected) * 100) : 0;
                  return (
                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded hover:border-blue-300 dark:hover:border-blue-800 transition-all bg-slate-50/50 dark:bg-slate-950/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Academy Classes
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(exp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Paid: {formatCurrency(paid)}</span>
                        <span>{pct}% share</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Leagues & Tournaments */}
                {(() => {
                  const data = streamData.leagues || {};
                  const exp = data.expected || 0;
                  const paid = data.paid || 0;
                  const pct = totalExpected > 0 ? Math.round((exp / totalExpected) * 100) : 0;
                  return (
                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded hover:border-amber-300 dark:hover:border-amber-800 transition-all bg-slate-50/50 dark:bg-slate-950/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Leagues & Tournaments
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(exp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Paid: {formatCurrency(paid)}</span>
                        <span>{pct}% share</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Holiday Camps & Events */}
                {(() => {
                  const data = streamData.camps || {};
                  const exp = data.expected || 0;
                  const paid = data.paid || 0;
                  const pct = totalExpected > 0 ? Math.round((exp / totalExpected) * 100) : 0;
                  return (
                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded hover:border-emerald-300 dark:hover:border-emerald-800 transition-all bg-slate-50/50 dark:bg-slate-950/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <SunMedium className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Holiday Camps & Events
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(exp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Paid: {formatCurrency(paid)}</span>
                        <span>{pct}% share</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Store Merchandise */}
                {(() => {
                  const data = streamData.store || {};
                  const exp = data.expected || 0;
                  const paid = data.paid || 0;
                  const pct = totalExpected > 0 ? Math.round((exp / totalExpected) * 100) : 0;
                  return (
                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded hover:border-purple-300 dark:hover:border-purple-800 transition-all bg-slate-50/50 dark:bg-slate-950/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Store & Merchandise
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(exp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Paid: {formatCurrency(paid)}</span>
                        <span>{pct}% share</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Overall Realized Collection:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalPaid)} ({collectionRate}%)
              </span>
            </div>
          </div>
        </div>

        {/* LEDGER & DETAILED PLAYER ROSTERS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs">
          {/* Header Controls: Search & Filters */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Particular Player & Item Financial Ledger</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {filteredRecords.length} Records
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed individual player records showing gross fee, handshake scholarship discount, net payable, and live payment status.
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="inline-flex rounded-none bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveLedgerTab("ALL_PLAYERS")}
                  className={`px-3 py-1.5 text-xs font-bold transition-all ${
                    activeLedgerTab === "ALL_PLAYERS"
                      ? "bg-white dark:bg-slate-900 text-[#0047FF] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  All Players Ledger
                </button>
                <button
                  onClick={() => setActiveLedgerTab("BY_CLASS")}
                  className={`px-3 py-1.5 text-xs font-bold transition-all ${
                    activeLedgerTab === "BY_CLASS"
                      ? "bg-white dark:bg-slate-900 text-[#0047FF] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Class-by-Class View ({rawClasses.length})
                </button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
              {/* Stream Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "ALL", label: "All Streams" },
                  { id: "ACADEMY", label: "Academy Classes" },
                  { id: "LEAGUES", label: "Leagues" },
                  { id: "CAMPS", label: "Holiday Camps" },
                  { id: "STORE", label: "Store Orders" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStream(s.id)}
                    className={`px-3 py-1 text-xs font-bold transition-all rounded ${
                      selectedStream === s.id
                        ? "bg-[#0047FF] text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Status and Search Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Status Dropdown */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none rounded cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">Paid in Full</option>
                  <option value="HANDSHAKE">Handshake / Scholarship</option>
                  <option value="TRIAL">Free Trial</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="UNPAID">Unpaid Invoices</option>
                  <option value="PARTIAL">Partially Paid</option>
                </select>

                {/* Search Input */}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player, parent, class..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none rounded focus:border-[#0047FF]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: ALL PLAYERS MASTER FINANCIAL LEDGER */}
          {activeLedgerTab === "ALL_PLAYERS" && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Player & Parent</th>
                      <th className="py-3 px-3">Stream & Program</th>
                      <th className="py-3 px-3">Gross Fee</th>
                      <th className="py-3 px-3">Handshake / Concession</th>
                      <th className="py-3 px-3">Net Payable</th>
                      <th className="py-3 px-3">Paid Amount</th>
                      <th className="py-3 px-3">Balance</th>
                      <th className="py-3 px-4 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isEarningsLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0047FF] mb-2" />
                          <span>Loading comprehensive earnings records...</span>
                        </td>
                      </tr>
                    ) : paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                          No matching player or transaction records found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r: any) => {
                        const stConfig =
                          STATUS_CONFIG[r.paymentStatus?.toUpperCase()] || STATUS_CONFIG["UNPAID"];
                        const isHandshake = r.paymentStatus?.toUpperCase() === "HANDSHAKE";
                        const isTrial = r.paymentStatus?.toUpperCase() === "TRIAL";
                        const streamCfg = STREAM_CONFIG[r.stream] || STREAM_CONFIG["ACADEMY"];

                        return (
                          <tr
                            key={r.id}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                              isHandshake ? "bg-teal-50/15 dark:bg-teal-950/5" : ""
                            }`}
                          >
                            {/* Player & Parent */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0 overflow-hidden">
                                  {r.avatar ? (
                                    <img src={r.avatar} alt={r.playerName} className="w-full h-full object-cover" />
                                  ) : (
                                    r.playerName?.charAt(0)?.toUpperCase() || "P"
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className={`font-bold truncate ${getPlayerStatusTextClass(r.paymentStatus)}`}>
                                    {r.playerName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {r.parentName ? `Parent: ${r.parentName}` : r.playerEmail || r.parentPhone || "Direct Student"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Stream & Program */}
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                {r.title}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${streamCfg.bg} ${streamCfg.color} ${streamCfg.border}`}>
                                  {r.streamLabel || r.stream}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                  {r.categoryOrProgram}
                                </span>
                              </div>
                            </td>

                            {/* Gross Fee */}
                            <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              {formatCurrency(r.price)}
                            </td>

                            {/* Handshake Concession */}
                            <td className="py-3.5 px-3">
                              {r.handshakeAmount > 0 || isHandshake ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded">
                                  🤝 -{formatCurrency(r.handshakeAmount || r.price)}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>

                            {/* Net Payable */}
                            <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                              {formatCurrency(r.netAmount)}
                            </td>

                            {/* Paid Amount */}
                            <td className="py-3.5 px-3 font-black text-emerald-600 dark:text-emerald-400">
                              {r.paidAmount > 0 ? formatCurrency(r.paidAmount) : <span className="text-slate-400 font-normal">$0</span>}
                            </td>

                            {/* Balance Pending */}
                            <td className="py-3.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                              {r.pendingAmount > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {formatCurrency(r.pendingAmount)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">$0 (Clear)</span>
                              )}
                            </td>

                            {/* Payment Status Badge */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded border ${stConfig.bg} ${stConfig.text} ${stConfig.border}`}
                              >
                                {isHandshake ? (
                                  <span title="Handshake Deal / Scholarship">🤝</span>
                                ) : isTrial ? (
                                  <span>✨</span>
                                ) : (
                                  <span className={`w-1.5 h-1.5 rounded-full ${stConfig.dot}`} />
                                )}
                                <span>{stConfig.label}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50 cursor-pointer font-bold"
                    >
                      Previous
                    </button>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50 cursor-pointer font-bold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLASS-BY-CLASS ACCORDION DRILL-DOWN */}
          {activeLedgerTab === "BY_CLASS" && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {rawClasses.length} Academic classes in this term
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAll}
                    className="text-xs font-bold text-[#0047FF] hover:underline"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={collapseAll}
                    className="text-xs font-bold text-slate-500 hover:underline"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {rawClasses.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold">
                    No classes associated with this term.
                  </div>
                ) : (
                  rawClasses.map((cls: any) => {
                    const cId = cls.classId || cls._id;
                    const isExpanded = !!expandedClassIds[cId];
                    const players = cls.players || [];

                    return (
                      <div
                        key={cId}
                        className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden"
                      >
                        {/* Class Header Banner */}
                        <div
                          onClick={() => toggleClassExpand(cId)}
                          className="p-4 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center font-bold">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-sm">
                                {cls.className}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {cls.program || "Program"} • Coach: {cls.coach?.name || "Unassigned"} • {players.length} Students
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-black text-slate-900 dark:text-white">
                                {formatCurrency(cls.expectedAmount)}
                              </div>
                              <div className="text-[10px] text-emerald-600 font-bold">
                                Paid: {formatCurrency(cls.paidAmount)}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Nested Class Players */}
                        {isExpanded && (
                          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                            {players.length === 0 ? (
                              <div className="text-center py-4 text-xs text-slate-400">
                                No students currently allocated to this class.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                                      <th className="py-2">Student Name</th>
                                      <th className="py-2">Parent / Contact</th>
                                      <th className="py-2">Price</th>
                                      <th className="py-2">Handshake</th>
                                      <th className="py-2">Paid</th>
                                      <th className="py-2">Pending</th>
                                      <th className="py-2 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {players.map((p: any) => {
                                      const isHandshake = p.paymentStatus === "HANDSHAKE";
                                      const isTrial = p.paymentStatus === "TRIAL";
                                      const stCfg = STATUS_CONFIG[p.paymentStatus] || STATUS_CONFIG["UNPAID"];
                                      return (
                                        <tr key={p.playerId} className="hover:bg-slate-50">
                                          <td className={`py-2.5 font-bold ${getPlayerStatusTextClass(p.paymentStatus)}`}>
                                            {p.playerName}
                                          </td>
                                          <td className="py-2.5 text-slate-500">
                                            {p.parentName || p.playerEmail || "—"}
                                          </td>
                                          <td className="py-2.5 font-semibold text-slate-700">
                                            {formatCurrency(p.expectedAmount)}
                                          </td>
                                          <td className="py-2.5">
                                            {p.handshakeAmount > 0 || isHandshake ? (
                                              <span className="text-teal-600 font-bold">
                                                🤝 -{formatCurrency(p.handshakeAmount || p.expectedAmount)}
                                              </span>
                                            ) : (
                                              "—"
                                            )}
                                          </td>
                                          <td className="py-2.5 font-bold text-emerald-600">
                                            {formatCurrency(p.paidAmount)}
                                          </td>
                                          <td className="py-2.5 font-bold text-amber-600">
                                            {formatCurrency(p.pendingAmount)}
                                          </td>
                                          <td className="py-2.5 text-center">
                                            <span
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded ${stCfg.bg} ${stCfg.text} ${stCfg.border} border`}
                                            >
                                              {stCfg.label}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
