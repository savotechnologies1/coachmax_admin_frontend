import { useEffect, useMemo, useState, type ReactNode } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { getAdminDashboard, getAdminTermDashboardInsights } from "../../api/adminApi";
import { getTermEarnings } from "../../api/financeApi";
import { useCurrentTerm } from "../../hooks/useCurrentTerm";
import { formatTimestampDate } from "../../utils/dateTime";
import { getMediaFallback, getMediaUrl } from "../../utils/media";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Layers,
  Package,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

type AttendanceGrouping = "daily" | "weekly" | "monthly" | "term";

const currency = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

const compactNumber = (value: number) => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
}).format(Number.isFinite(value) ? value : 0);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function CountUp({ value, formatter = compactNumber }: { value: number; formatter?: (value: number) => string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const target = Number.isFinite(Number(value)) ? Number(value) : 0;
    if (reducedMotion) {
      setShown(target);
      return;
    }

    let frame = 0;
    let startedAt = 0;
    const duration = 850;
    const tick = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(target * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, reducedMotion]);

  return <>{formatter(shown)}</>;
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

function PanelTitle({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">{title}</h2>
        {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  formatter = compactNumber,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  formatter?: (value: number) => string;
  note: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <article className="group border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-950 dark:text-white">
            <CountUp value={value} formatter={formatter} />
          </p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${tone}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">{note}</p>
    </article>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex min-h-32 items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">{children}</div>;
}

const quickActions = [
  { title: "Add Player", description: "Register a player", path: "/add-temporary-players", icon: UserPlus, tone: "bg-blue-50 text-blue-600 dark:bg-blue-950/40" },
  { title: "Add Product", description: "Create a store item", path: "/add-product", icon: Package, tone: "bg-violet-50 text-violet-600 dark:bg-violet-950/40" },
  { title: "Add Event", description: "Schedule an event", path: "/add-event", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" },
  { title: "Add Team", description: "Manage academy teams", path: "/teams", icon: Shield, tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40" },
  { title: "Add League", description: "Manage competitions", path: "/leagues", icon: Trophy, tone: "bg-rose-50 text-rose-600 dark:bg-rose-950/40" },
  { title: "Add Class", description: "Schedule a class", path: "/classes", icon: Layers, tone: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40" },
];

const statusItems = [
  { key: "PAID", label: "Paid", color: "#10B981", dot: "bg-emerald-500" },
  { key: "UNPAID", label: "Unpaid", color: "#F59E0B", dot: "bg-amber-500" },
  { key: "OVER_DUE", label: "Overdue", color: "#EF4444", dot: "bg-red-500" },
  { key: "TRIAL", label: "Trial", color: "#3B82F6", dot: "bg-blue-500" },
  { key: "HANDSHAKE", label: "Handshake", color: "#8B5CF6", dot: "bg-violet-500" },
  { key: "EXTRA", label: "Extra", color: "#06B6D4", dot: "bg-cyan-500" },
  { key: "TBC", label: "TBC", color: "#64748B", dot: "bg-slate-500" },
  { key: "SUBSTITUTE", label: "Substitute", color: "#EC4899", dot: "bg-pink-500" },
];

export default function Home() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const [attendanceGrouping, setAttendanceGrouping] = useState<AttendanceGrouping>("weekly");
  const {
    terms,
    availableYears,
    selectedYear,
    setSelectedYear,
    selectedTerm,
    setSelectedTerm,
    isLoading: isTermsLoading,
  } = useCurrentTerm({ isEvent: "false" });

  const selectedTermDoc = terms.find((term) => String(term._id) === String(selectedTerm));
  const termId = selectedTermDoc?._id || "";

  const { data: overviewResponse } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: getAdminDashboard,
    staleTime: 60_000,
  });
  const overview = overviewResponse?.data || overviewResponse || {};

  const { data: termResponse, isLoading: isTermInsightsLoading, isError: isTermInsightsError } = useQuery({
    queryKey: ["adminDashboardTerm", termId, attendanceGrouping],
    queryFn: () => getAdminTermDashboardInsights(termId, attendanceGrouping),
    enabled: Boolean(termId),
    staleTime: 30_000,
  });
  const { data: earningsResponse, isLoading: isEarningsLoading, isError: isEarningsError } = useQuery({
    queryKey: ["adminDashboardTermEarnings", termId],
    queryFn: () => getTermEarnings(termId),
    enabled: Boolean(termId),
    staleTime: 30_000,
  });

  const insights = termResponse?.data || termResponse || {};
  const earningsData = earningsResponse?.data || earningsResponse || {};
  const termSummary = earningsData.summary || {};
  const streams = termSummary.streams || {};
  const attendance = insights.attendance || {};
  const players = insights.players || {};
  const requests = insights.requests || {};
  const events = insights.events || {};
  const statusCounts = players.statusCounts || {};
  const attendanceSeries = Array.isArray(attendance.series) ? attendance.series : [];
  const recentPlayers = Array.isArray(players.recent) ? players.recent : [];
  const recentRequests = Array.isArray(requests.recent) ? requests.recent : [];
  const recentEvents = Array.isArray(events.recent) ? events.recent : [];

  const activeStreamData = useMemo(() => {
    const campStream = streams.campOnly || streams.camps || {};
    return [
      { key: "academy", label: "Classes", ...streams.academy },
      { key: "leagues", label: "Leagues", ...streams.leagues },
      { key: "campOnly", label: "Camps", ...campStream },
      { key: "sessions", label: "Sessions & events", ...streams.sessions },
      { key: "store", label: "Products", ...streams.store },
    ].map((item) => ({
      ...item,
      paid: Number(item.paid) || 0,
      pending: Number(item.pending) || 0,
      expected: Number(item.expected) || 0,
    }));
  }, [streams]);

  const attendanceChartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: !reducedMotion, speed: 700, animateGradually: { enabled: true, delay: 90 }, dynamicAnimation: { enabled: true, speed: 350 } },
    },
    colors: ["#0047FF"],
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { shadeIntensity: 0.8, opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 90, 100] } },
    markers: { size: 3, colors: ["#0047FF"], strokeColors: "#fff", strokeWidth: 2, hover: { size: 5 } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: attendanceSeries.map((point: any) => point.label),
      axisBorder: { show: false }, axisTicks: { show: false },
      labels: { style: { colors: "#64748B", fontSize: "11px" }, rotate: -20, hideOverlappingLabels: true },
    },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (value) => `${Math.round(value)}%`, style: { colors: "#64748B", fontSize: "11px" } } },
    tooltip: { y: { formatter: (value) => `${Math.round(value)}% attendance` } },
    noData: { text: "Attendance has not been recorded for this term yet", style: { color: "#64748B", fontSize: "13px" } },
  };

  const revenueChartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: !reducedMotion, speed: 700, animateGradually: { enabled: true, delay: 100 }, dynamicAnimation: { enabled: true, speed: 350 } },
    },
    colors: ["#0047FF", "#F59E0B"],
    plotOptions: { bar: { horizontal: false, columnWidth: "48%", borderRadius: 3, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: { categories: activeStreamData.map((item) => item.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#64748B", fontSize: "10px" }, rotate: -15 } },
    yaxis: { labels: { formatter: (value) => currency(value), style: { colors: "#64748B", fontSize: "10px" } } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px", markers: { size: 4 } },
    tooltip: { y: { formatter: (value) => currency(value) } },
    noData: { text: "No term earnings recorded yet", style: { color: "#64748B", fontSize: "13px" } },
  };

  const visibleStatusItems = statusItems.map((item) => ({ ...item, value: Number(statusCounts[item.key]) || 0 }));
  const statusSeries = visibleStatusItems.map((item) => item.value);
  const statusTotal = statusSeries.reduce((sum, value) => sum + value, 0);
  const statusChartOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "donut", animations: { enabled: !reducedMotion, speed: 650 } },
    labels: visibleStatusItems.map((item) => item.label),
    colors: visibleStatusItems.map((item) => item.color),
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: { pie: { donut: { size: "72%", labels: { show: true, total: { show: true, label: "Enrolments", formatter: () => compactNumber(statusTotal), color: "#64748B", fontSize: "12px" } } } } },
    tooltip: { y: { formatter: (value) => `${value} enrolments` } },
  };

  const attendanceSeriesData = [{ name: "Attendance rate", data: attendanceSeries.map((point: any) => Number(point.rate) || 0) }];
  const revenueSeriesData = [
    { name: "Collected", data: activeStreamData.map((item) => item.paid) },
    { name: "Outstanding", data: activeStreamData.map((item) => item.pending) },
  ];

  const totalPaid = Number(termSummary.totalPaid) || 0;
  const totalExpected = Number(termSummary.totalNetExpected ?? termSummary.totalExpected) || 0;
  const classCount = Number(insights.academics?.classes ?? termSummary.totalClasses) || 0;
  const enrolledPlayers = Number(insights.academics?.players ?? termSummary.totalPlayers) || 0;
  const attendanceRate = Number(attendance.rate) || 0;
  const pendingRequestCount = Number(requests.byType?.NEW_PLAYER || 0) + Number(requests.byType?.TEMPORARY_PLAYER || 0);

  const getRequestPlayerName = (request: any) => request.player?.fullName
    || [request.player?.firstName, request.player?.lastName].filter(Boolean).join(" ")
    || "Player registration";

  return (
    <div className="-m-4 min-h-[calc(100vh-76px)] bg-slate-50 p-4 dark:bg-slate-950 md:-m-6 md:p-6">
      <PageMeta title="Dashboard | CoachMax Admin" description="Term-based CoachMax academy dashboard" />

      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live overview
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Attendance, collections, registrations and activity for one term.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="dashboard-year">Academic year</label>
          <select id="dashboard-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="h-10 min-w-28 border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <label className="sr-only" htmlFor="dashboard-term">Term</label>
          <select id="dashboard-term" value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)} className="h-10 min-w-52 border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" disabled={isTermsLoading || terms.length === 0}>
            {terms.length === 0 && <option value="">No terms available</option>}
            {terms.map((term) => <option key={term._id} value={term._id}>{term.name}{term.year ? ` (${term.year})` : ""}</option>)}
          </select>
        </div>
      </header>

      <section aria-label="Quick actions" className="mb-6 border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick actions</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Common admin tasks, one click away.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {quickActions.map(({ title, description, path, icon: Icon, tone }) => (
            <button key={title} type="button" onClick={() => navigate(path)} className="group flex min-h-[68px] items-center gap-2.5 border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:border-blue-800 dark:hover:bg-slate-800">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center ${tone}`}><Icon size={17} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">{description}</span></span>
              <ArrowRight size={13} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {!isTermsLoading && !termId ? (
        <Panel><EmptyState>No academy terms are available yet. Create a term to see term-based dashboard data.</EmptyState></Panel>
      ) : (
        <>
          {(isTermInsightsError || isEarningsError) && <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">Some term dashboard data could not be loaded. Try refreshing the page.</div>}

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Enrolled players" value={enrolledPlayers} note={`${classCount} classes in ${selectedTermDoc?.name || "selected term"}`} icon={Users} tone="bg-blue-50 text-blue-600 dark:bg-blue-950/40" />
            <MetricCard label="New player registrations" value={Number(players.newThisTerm) || 0} note={`${pendingRequestCount} new or temporary requests`} icon={UserPlus} tone="bg-violet-50 text-violet-600 dark:bg-violet-950/40" />
            <MetricCard label="Attendance rate" value={attendanceRate} formatter={(value) => `${Math.round(value)}%`} note={`${Number(attendance.sessions) || 0} attendance sessions recorded`} icon={Activity} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" />
            <MetricCard label="Unpaid amount" value={Number(players.unpaidAmount) || 0} formatter={currency} note={`${Number(statusCounts.UNPAID || 0) + Number(statusCounts.OVER_DUE || 0)} unpaid or overdue enrolments`} icon={Wallet} tone="bg-amber-50 text-amber-600 dark:bg-amber-950/40" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Panel className="xl:col-span-7">
              <PanelTitle title="Attendance overview" detail={`${selectedTermDoc?.name || "Selected term"} · class attendance only`} action={
                <select aria-label="Attendance grouping" value={attendanceGrouping} onChange={(event) => setAttendanceGrouping(event.target.value as AttendanceGrouping)} className="h-9 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="term">Whole term</option>
                </select>
              } />
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="bg-slate-50 px-3 py-2 dark:bg-slate-800/70"><p className="text-[10px] uppercase tracking-wide text-slate-500">Present</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white"><CountUp value={Number(attendance.present) || 0} /></p></div>
                <div className="bg-slate-50 px-3 py-2 dark:bg-slate-800/70"><p className="text-[10px] uppercase tracking-wide text-slate-500">Late</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white"><CountUp value={Number(attendance.late) || 0} /></p></div>
                <div className="bg-slate-50 px-3 py-2 dark:bg-slate-800/70"><p className="text-[10px] uppercase tracking-wide text-slate-500">Absent</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white"><CountUp value={Number(attendance.absent) || 0} /></p></div>
              </div>
              {isTermInsightsLoading ? <div className="h-[290px] animate-pulse bg-slate-100 dark:bg-slate-800" /> : attendanceSeries.length ? <Chart options={attendanceChartOptions} series={attendanceSeriesData} type="area" height={280} /> : <EmptyState>No attendance records are available for this term.</EmptyState>}
            </Panel>

            <Panel className="xl:col-span-5">
              <PanelTitle title="Term earnings by stream" detail="Collected and outstanding amounts for the selected term" />
              <div className="mb-2 grid grid-cols-2 gap-3">
                <div className="border-l-2 border-blue-600 bg-slate-50 px-3 py-2 dark:bg-slate-800/70"><p className="text-[10px] uppercase tracking-wide text-slate-500">Collected</p><p className="mt-1 text-xl font-bold text-slate-950 dark:text-white"><CountUp value={totalPaid} formatter={currency} /></p></div>
                <div className="border-l-2 border-amber-500 bg-slate-50 px-3 py-2 dark:bg-slate-800/70"><p className="text-[10px] uppercase tracking-wide text-slate-500">Net expected</p><p className="mt-1 text-xl font-bold text-slate-950 dark:text-white"><CountUp value={totalExpected} formatter={currency} /></p></div>
              </div>
              {isEarningsLoading ? <div className="h-[275px] animate-pulse bg-slate-100 dark:bg-slate-800" /> : <Chart options={revenueChartOptions} series={revenueSeriesData} type="bar" height={275} />}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-3">
                {activeStreamData.map((stream) => (
                  <div key={stream.key} className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">{stream.label}</p>
                    <p className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white">{currency(stream.paid)} <span className="font-normal text-slate-400">collected</span></p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Panel className="lg:col-span-5">
              <PanelTitle title="Player payment status" detail="Current enrolment status across classes in this term" />
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,1.25fr)_auto] items-center gap-x-2 gap-y-1 xl:grid-cols-[minmax(0,1fr)_minmax(170px,1.45fr)_auto]">
                <div className="space-y-2 text-xs">
                  {visibleStatusItems.map((item) => (
                    <div key={item.key} className="flex min-h-4 items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  {statusTotal > 0 ? <Chart options={statusChartOptions} series={statusSeries} type="donut" height={245} /> : <EmptyState>No class enrolments found for this term.</EmptyState>}
                </div>
                <div className="space-y-2 text-right text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                  {visibleStatusItems.map((item) => <div key={item.key} className="min-h-4"> <CountUp value={item.value} /></div>)}
                </div>
                <div className="col-span-3 mt-1 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Extra and TBC are shown as payment-status counts. Unpaid amount is calculated from remaining active class invoices.
                </div>
              </div>
            </Panel>

            <Panel className="lg:col-span-7">
              <PanelTitle title="Unpaid balance & discounts" detail="Class invoices and special payment arrangements for this term" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Unpaid balance</p><p className="mt-2 text-xl font-bold text-slate-950 dark:text-white"><CountUp value={Number(players.unpaidAmount) || 0} formatter={currency} /></p></div>
                <div className="border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/50 dark:bg-violet-950/20"><p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Invoice discounts</p><p className="mt-2 text-xl font-bold text-slate-950 dark:text-white"><CountUp value={Number(players.invoiceDiscounts) || 0} formatter={currency} /></p></div>
                <div className="border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">Handshake waived</p><p className="mt-2 text-xl font-bold text-slate-950 dark:text-white"><CountUp value={Number(players.handshakeWaivedAmount) || 0} formatter={currency} /></p><p className="mt-1 text-[10px] text-slate-500">{Number(statusCounts.HANDSHAKE) || 0} handshake enrolments</p></div>
                <div className="border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Trial players</p><p className="mt-2 text-xl font-bold text-slate-950 dark:text-white"><CountUp value={Number(statusCounts.TRIAL) || 0} /></p><p className="mt-1 text-[10px] text-slate-500">{Number(statusCounts.EXTRA) || 0} Extra · {Number(statusCounts.TBC) || 0} TBC</p></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Expected collections: <strong className="text-slate-800 dark:text-slate-200">{currency(totalExpected)}</strong></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Still outstanding: <strong className="text-slate-800 dark:text-slate-200">{currency(Number(termSummary.totalPending) || 0)}</strong></p>
                <button type="button" onClick={() => navigate("/term-earnings")} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">Open earnings report <ArrowRight size={13} /></button>
              </div>
            </Panel>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Panel className="lg:col-span-4">
              <PanelTitle title="Latest requests" detail={`${Number(requests.total) || 0} requests created in this term`} action={<button type="button" onClick={() => navigate("/new-registration-request")} className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">Manage</button>} />
              <div className="space-y-2">
                {recentRequests.length ? recentRequests.slice(0, 6).map((request: any) => (
                  <button key={request._id} type="button" onClick={() => navigate("/new-registration-request")} className="flex w-full items-start gap-3 border border-slate-100 p-3 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-blue-900 dark:hover:bg-slate-800/60">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-amber-50 text-amber-600 dark:bg-amber-950/40"><FileText size={15} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{getRequestPlayerName(request)}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{String(request.requestType || "Request").replace(/_/g, " ")} · {request.status || "Pending"}</span></span>
                    <span className="shrink-0 text-[10px] text-slate-400">{request.createdAt ? formatTimestampDate(request.createdAt) : ""}</span>
                  </button>
                )) : <EmptyState>No term registration requests found.</EmptyState>}
              </div>
            </Panel>

            <Panel className="lg:col-span-4">
              <PanelTitle title="Term events" detail={`${Number(events.registrations) || 0} registrations · ${Number(events.total) || 0} events`} action={<button type="button" onClick={() => navigate("/events")} className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">View events</button>} />
              <div className="space-y-2">
                {recentEvents.length ? recentEvents.slice(0, 6).map((event: any) => (
                  <button key={event._id} type="button" onClick={() => navigate("/events")} className="flex w-full items-center gap-3 border border-slate-100 p-3 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-blue-900 dark:hover:bg-slate-800/60">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><CalendarDays size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{event.title}</span><span className="mt-1 block text-[10px] text-slate-500">{event.startDate ? formatTimestampDate(event.startDate) : "Date not set"} · {event.eventType || "Event"}</span></span>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-500">{event.totalRegistered || 0} players</span>
                  </button>
                )) : <EmptyState>No events are linked to this term.</EmptyState>}
              </div>
            </Panel>

            <Panel className="lg:col-span-4">
              <PanelTitle title="New player registrations" detail={`${Number(players.newThisTerm) || 0} players joined during the term`} action={<button type="button" onClick={() => navigate("/players")} className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">Manage players</button>} />
              <div className="space-y-2">
                {recentPlayers.length ? recentPlayers.slice(0, 6).map((player: any) => {
                  const fullName = player.fullName || [player.firstName, player.lastName].filter(Boolean).join(" ") || "Player";
                  const avatar = getMediaUrl(player.profileImage, getMediaFallback(fullName));
                  return (
                    <button key={player._id} type="button" onClick={() => navigate(`/player/${player._id}`)} className="flex w-full items-center gap-3 border border-slate-100 p-3 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-blue-900 dark:hover:bg-slate-800/60">
                      <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getMediaFallback(fullName); }} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{fullName}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{player.category?.name || "New player"} · {player.playerStatus || "ACTIVE"}</span></span>
                      <span className="shrink-0 text-[10px] text-slate-400">{player.createdAt ? formatTimestampDate(player.createdAt) : ""}</span>
                    </button>
                  );
                }) : <EmptyState>No players registered during this term yet.</EmptyState>}
              </div>
            </Panel>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Data scoped to {selectedTermDoc?.name || "the selected term"}.</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> Coaches on record: {Number(overview.staff?.totalCoaches) || 0}</span>
          </div>
        </>
      )}
    </div>
  );
}
