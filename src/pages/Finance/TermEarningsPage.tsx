import { formatTimestampDate } from "../../utils/dateTime";
import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AnimatedNumber from "../../components/common/AnimatedNumber";
import TermEarningsVisuals from "./TermEarningsVisuals";
import "./termEarnings.css";
import { useCurrentTerm } from "../../hooks/useCurrentTerm";
import { useTermEarnings } from "../../hooks/useTermEarnings";
import { useCoachAccess } from "../../hooks/useCoachAccess";
import { getPlayerStatusTextClass } from "../../components/common/StatusColorCode";
import {
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
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Home,
} from "lucide-react";
import toast from "react-hot-toast";

const earningsCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

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
    label: "Tournaments",
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
    return earningsCurrencyFormatter.format(val || 0);
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

  const kpiCards = [
    {
      label: "Gross Expected", value: totalExpected, icon: TrendingUp,
      panel: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100/80 dark:border-blue-900 dark:from-blue-950/50 dark:via-slate-900 dark:to-slate-900",
      tone: "text-[#0b3d9b] dark:text-blue-300", iconTone: "bg-blue-100 text-[#1257ed] dark:bg-blue-900/70 dark:text-blue-300",
      bar: "bg-[#1257ed]", width: 100, detail: "Total value across all streams",
    },
    {
      label: "Cash Received", value: totalPaid, icon: CheckCircle2,
      panel: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 dark:border-emerald-900 dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-900",
      tone: "text-emerald-700 dark:text-emerald-300", iconTone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/70 dark:text-emerald-300",
      bar: "bg-emerald-500", width: collectionRate, detail: <><AnimatedNumber value={collectionRate} />% of net expected</>,
    },
    {
      label: "Pending Balance", value: totalPending, icon: Clock,
      panel: "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-100/70 dark:border-orange-900 dark:from-orange-950/50 dark:via-slate-900 dark:to-slate-900",
      tone: "text-orange-700 dark:text-orange-300", iconTone: "bg-orange-100 text-orange-600 dark:bg-orange-900/70 dark:text-orange-300",
      bar: "bg-orange-500", width: totalNetExpected > 0 ? (totalPending / totalNetExpected) * 100 : 0, detail: "Awaiting collection or verification",
    },
    {
      label: "Handshakes & Grants", value: totalHandshake, icon: Award,
      panel: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-100/70 dark:border-violet-900 dark:from-violet-950/50 dark:via-slate-900 dark:to-slate-900",
      tone: "text-violet-700 dark:text-violet-300", iconTone: "bg-violet-100 text-violet-600 dark:bg-violet-900/70 dark:text-violet-300",
      bar: "bg-violet-500", width: totalExpected > 0 ? (totalHandshake / totalExpected) * 100 : 0, detail: <><AnimatedNumber value={totalHandshakeCount} /> scholarship concessions</>,
    },
    {
      label: "Trial Pipeline", value: totalTrialPotential, icon: Sparkles,
      panel: "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-cyan-100/70 dark:border-cyan-900 dark:from-cyan-950/50 dark:via-slate-900 dark:to-slate-900",
      tone: "text-cyan-700 dark:text-cyan-300", iconTone: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/70 dark:text-cyan-300",
      bar: "bg-cyan-500", width: totalExpected > 0 ? (totalTrialPotential / totalExpected) * 100 : 0, detail: <><AnimatedNumber value={totalTrialCount} /> active trial students</>,
    },
  ];

  return (
    <>
      <PageMeta
        title={`CoachMax | Revenue & Term Earnings - ${activeTermDisplay}`}
        description="Multi-stream earnings report, Handshake scholarship management, and financial conversion intelligence."
      />

      <div className="space-y-6">
        {/* Header and actions */}
        <header className="finance-enter flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-[#0047FF] dark:bg-blue-950/60">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <Link to="/" className="inline-flex items-center gap-1 hover:text-[#0047FF]"><Home size={12} /> Home</Link>
                <ChevronRight size={12} aria-hidden="true" />
                <Link to="/invoices" className="hover:text-[#0047FF]">Finance</Link>
                <ChevronRight size={12} aria-hidden="true" />
                <span className="font-bold text-[#0047FF]">Term Earnings</span>
              </nav>
              <h1 className="text-2xl font-black tracking-tight text-[#071b4e] dark:text-white sm:text-3xl">Financial Intelligence Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track expected fees, collections and concessions across every revenue stream.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
            <button type="button" onClick={() => refetch()} disabled={isEarningsLoading || isRefetching} title="Refresh live data"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#0047FF] disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <RefreshCw className={"h-4 w-4 " + (isRefetching ? "animate-spin" : "")} />Refresh
            </button>
            {access.can("reports", "export") && <button type="button" onClick={handleExportCSV}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1257ed] px-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(18,87,237,.2)] transition hover:-translate-y-0.5 hover:bg-[#0047FF] motion-reduce:transform-none">
              <FileSpreadsheet className="h-4 w-4" />Export CSV
            </button>}
          </div>
        </header>

        {/* Report controls */}
        <section aria-label="Report scope and term" className="finance-enter rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_26px_rgba(7,27,78,.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#eef3ff] p-1 dark:bg-slate-800" role="group" aria-label="Report view">
                  <button type="button" aria-pressed={scopeMode === "SINGLE"} onClick={() => setScopeMode("SINGLE")}
                    className={"rounded-lg px-3 py-2 text-xs font-bold transition " + (scopeMode === "SINGLE" ? "bg-[#1257ed] text-white shadow-sm" : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700")}>Single term</button>
                  <button type="button" aria-pressed={scopeMode === "COMPARE"} onClick={() => setScopeMode("COMPARE")}
                    className={"rounded-lg px-3 py-2 text-xs font-bold transition " + (scopeMode === "COMPARE" ? "bg-[#1257ed] text-white shadow-sm" : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700")}>Compare 2 terms</button>
                  <button type="button" aria-pressed={scopeMode === "ALL_TIME"} onClick={() => setScopeMode("ALL_TIME")}
                    className={"rounded-lg px-3 py-2 text-xs font-bold transition " + (scopeMode === "ALL_TIME" ? "bg-[#1257ed] text-white shadow-sm" : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700")}>All time</button>
                </div>
                <span className="min-w-0 truncate rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-[#0b3d9b] dark:bg-blue-950/40 dark:text-blue-300">{activeTermDisplay}</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <AnimatedNumber value={totalEnrolledPlayers} /> enrolled records <span className="mx-1.5 text-slate-300">•</span> <AnimatedNumber value={totalTrialCount} /> active trials <span className="mx-1.5 text-slate-300">•</span> <AnimatedNumber value={totalHandshakeCount} /> handshakes
              </p>
            </div>
            {scopeMode !== "ALL_TIME" && <div className="flex flex-wrap items-end gap-2.5">
              <label className="flex min-w-[110px] flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Year
                <span className="relative flex items-center"><Calendar className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#1257ed]" />
                  <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedClassId("ALL"); }}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-7 text-xs font-bold normal-case text-[#071b4e] outline-none focus:border-[#1257ed] dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select><ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-500" /></span>
              </label>
              <label className="flex min-w-[170px] flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {scopeMode === "COMPARE" ? "Term A (baseline)" : "Select term"}
                <span className="relative flex items-center"><GraduationCap className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#1257ed]" />
                  <select value={selectedTermId || ""} onChange={(e) => { setSelectedTermId(e.target.value); setSelectedClassId("ALL"); }}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-7 text-xs font-bold normal-case text-[#071b4e] outline-none focus:border-[#1257ed] dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    {terms.map((t: any) => <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>)}
                  </select><ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-500" /></span>
              </label>
              {scopeMode === "COMPARE" && <label className="flex min-w-[170px] flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Term B (compare)
                <span className="relative flex items-center"><Trophy className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#1257ed]" />
                  <select value={secondaryTermId} onChange={(e) => setSecondaryTermId(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-7 text-xs font-bold normal-case text-[#071b4e] outline-none focus:border-[#1257ed] dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    {terms.map((t: any) => <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>)}
                  </select><ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-500" /></span>
              </label>}
            </div>}
          </div>
        </section>
        {/* Executive metrics */}
        <section aria-label="Financial summary" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card, index) => (
            <div key={card.label} className={"finance-kpi-card finance-enter group relative flex min-h-[158px] flex-col overflow-hidden rounded-2xl border p-4 shadow-[0_8px_25px_rgba(7,27,78,.05)] transition hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(7,27,78,.11)] motion-reduce:transform-none " + card.panel}
              style={{ animationDelay: (index * 75) + "ms" }}>
              <div className="relative z-10 flex items-start justify-between gap-2">
                <span className={"flex h-10 w-10 items-center justify-center rounded-xl " + card.iconTone}><card.icon className="h-5 w-5" /></span>
                <ArrowUpRight className={"h-4 w-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none " + card.tone} aria-hidden="true" />
              </div>
              <p className="relative z-10 mt-3 text-[11px] font-bold tracking-wide text-slate-600 dark:text-slate-300">{card.label}</p>
              <AnimatedNumber value={card.value} formatter={formatCurrency}
                className={"relative z-10 mt-0.5 block text-[27px] font-black leading-tight tracking-tight tabular-nums " + card.tone} />
              <p className="relative z-10 mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.detail}</p>
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-white/60 dark:bg-slate-800">
                <div className={"finance-progress h-full origin-left " + card.bar}
                  style={{ width: Math.min(100, Math.max(0, card.width)) + "%" }} />
              </div>
            </div>
          ))}
        </section>
        {/* TWO-TERM COMPARISON SCORECARD (Visible when Compare Mode is Active) */}
        {scopeMode === "COMPARE" && comparison && (
          <div className="finance-enter rounded-2xl border border-indigo-700/40 bg-gradient-to-r from-indigo-900 via-blue-900 to-[#031549] p-5 text-white shadow-[0_10px_30px_rgba(7,27,78,.14)] sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-700/50 pb-3">
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

        <TermEarningsVisuals summary={summary} formatCurrency={formatCurrency} />

        {/* Detailed financial ledger */}
        <section aria-label="Player financial ledger" className="finance-enter overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(18,41,91,.06)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 bg-gradient-to-r from-[#071b50] via-[#082862] to-[#0a3674] px-5 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex flex-wrap items-center gap-2.5 text-base font-bold tracking-tight">
                <Users className="h-4 w-4 text-sky-200" />
                Player Financial Ledger
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-50">{filteredRecords.length} records</span>
              </h2>
              <p className="mt-1 text-[11px] text-blue-100/80">Fees, concessions, collections and balances for each player or order.</p>
            </div>
            <div className="inline-flex self-start rounded-xl border border-white/15 bg-white/10 p-1 lg:self-auto" role="group" aria-label="Ledger view">
              <button type="button" aria-pressed={activeLedgerTab === "ALL_PLAYERS"} onClick={() => setActiveLedgerTab("ALL_PLAYERS")}
                className={"rounded-lg px-3 py-1.5 text-[11px] font-bold transition " + (activeLedgerTab === "ALL_PLAYERS" ? "bg-white text-[#0b3d9b] shadow-sm" : "text-blue-100 hover:bg-white/10")}>All players</button>
              <button type="button" aria-pressed={activeLedgerTab === "BY_CLASS"} onClick={() => setActiveLedgerTab("BY_CLASS")}
                className={"rounded-lg px-3 py-1.5 text-[11px] font-bold transition " + (activeLedgerTab === "BY_CLASS" ? "bg-white text-[#0b3d9b] shadow-sm" : "text-blue-100 hover:bg-white/10")}>By class ({rawClasses.length})</button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by stream">
              {[
                { id: "ALL", label: "All streams" },
                { id: "ACADEMY", label: "Academy classes" },
                { id: "LEAGUES", label: "Tournaments" },
                { id: "CAMPS", label: "Holiday camps" },
                { id: "STORE", label: "Store orders" },
              ].map((stream) => (
                <button key={stream.id} type="button" aria-pressed={selectedStream === stream.id} onClick={() => setSelectedStream(stream.id)}
                  className={"rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition " + (selectedStream === stream.id
                    ? "border-[#1257ed] bg-[#1257ed] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-[#1257ed] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                  {stream.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="earnings-payment-status">Filter by payment status</label>
              <select id="earnings-payment-status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-[#1257ed] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <option value="ALL">All statuses</option>
                <option value="PAID">Paid in full</option>
                <option value="HANDSHAKE">Handshake / Scholarship</option>
                <option value="TRIAL">Free trial</option>
                <option value="PENDING">Pending approval</option>
                <option value="UNPAID">Unpaid invoices</option>
                <option value="PARTIAL">Partially paid</option>
              </select>
              <div className="relative min-w-[210px] flex-1 lg:w-[230px] lg:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input aria-label="Search financial ledger" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search player, parent, class..." className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-[11px] text-slate-900 outline-none focus:border-[#1257ed] dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700">×</button>}
              </div>
            </div>
          </div>
          {/* TAB 1: ALL PLAYERS MASTER FINANCIAL LEDGER */}
          {activeLedgerTab === "ALL_PLAYERS" && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs dark:border-slate-800">
                  <div className="text-slate-400">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold transition hover:border-blue-300 hover:text-[#1257ed] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                    >
                      Previous
                    </button>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Page {page} of {totalPages}
                    </span>
                    <button type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold transition hover:border-blue-300 hover:text-[#1257ed] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
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
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        {/* Class Header Banner */}
                        <div
                          onClick={() => toggleClassExpand(cId)}
                          className="flex cursor-pointer items-center justify-between gap-3 bg-slate-50 p-4 transition-colors hover:bg-blue-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-800"
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
        </section>
      </div>
    </>
  );
}
