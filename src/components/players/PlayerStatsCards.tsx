import type { ReactNode } from "react";

export type PlayerMetric = "ALL" | "ELITE" | "SCHOOL" | "BOTH" | "UNASSIGNED";

interface PlayerStatsCardsProps {
  totalCount: number;
  approvedCount: number;
  pendingCount?: number;
  rejectedCount: number;
  eliteCount: number;
  schoolCount: number;
  bothCount?: number;
  unassignedCount?: number;
  showPendingCount?: boolean;
  showAssignmentMetrics?: boolean;
  activeMetric?: PlayerMetric;
  onMetricClick?: (metric: PlayerMetric) => void;
}

interface StatCard {
  title: string;
  metric?: PlayerMetric;
  value: number;
  color: string;
  icon: ReactNode;
}

const icons = {
  players: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  approved: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pending: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rejected: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  elite: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  school: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    </svg>
  ),
  both: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 7l3-3M8 7l3 3M16 17H4m12 0l-3-3m3 3l-3 3" />
    </svg>
  ),
  unassigned: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function PlayerStatsCards({
  totalCount,
  approvedCount,
  pendingCount = 0,
  rejectedCount,
  eliteCount,
  schoolCount,
  bothCount = 0,
  unassignedCount = 0,
  showPendingCount = false,
  showAssignmentMetrics = false,
  activeMetric,
  onMetricClick,
}: PlayerStatsCardsProps) {
  const assignmentStats: StatCard[] = [
    { title: "Total Players", metric: "ALL", value: totalCount, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20", icon: icons.players },
    { title: "Elite Only", metric: "ELITE", value: eliteCount, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20", icon: icons.elite },
    { title: "School Only", metric: "SCHOOL", value: schoolCount, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20", icon: icons.school },
    { title: "Both Assigned", metric: "BOTH", value: bothCount, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20", icon: icons.both },
    { title: "Not Assigned", metric: "UNASSIGNED", value: unassignedCount, color: "text-slate-600 bg-slate-100 dark:bg-slate-800", icon: icons.unassigned },
  ];

  const statusStats: StatCard[] = [
    { title: "Total Players", metric: "ALL", value: totalCount, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20", icon: icons.players },
    { title: "Approved", value: approvedCount, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20", icon: icons.approved },
    ...(showPendingCount ? [{ title: "Pending", metric: "ALL" as const, value: pendingCount, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20", icon: icons.pending }] : []),
    { title: "Rejected", value: rejectedCount, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/20", icon: icons.rejected },
    { title: "Elite Players", metric: "ELITE", value: eliteCount, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20", icon: icons.elite },
    { title: "Schools Players", metric: "SCHOOL", value: schoolCount, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20", icon: icons.school },
  ];

  const stats = showAssignmentMetrics ? assignmentStats : statusStats;

  return (
    <div className={`grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 ${showAssignmentMetrics ? "lg:grid-cols-5" : showPendingCount ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
      {stats.map((stat) => {
        const cardClass = `p-4 bg-white border rounded-none shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 flex items-center gap-3 text-left ${
          onMetricClick
            ? `transition-colors hover:border-[#0047FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047FF] ${activeMetric === stat.metric ? "border-[#0047FF] ring-1 ring-[#0047FF]" : "border-slate-100"}`
            : "border-slate-100"
        }`;
        const cardContent = (
          <>
            <div className={`p-2.5 rounded-none shrink-0 ${stat.color}`}>{stat.icon}</div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">{stat.title}</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stat.value}</span>
            </div>
          </>
        );

        return onMetricClick && stat.metric ? (
          <button key={stat.title} type="button" aria-pressed={activeMetric === stat.metric} onClick={() => onMetricClick(stat.metric!)} className={cardClass}>
            {cardContent}
          </button>
        ) : (
          <div key={stat.title} className={cardClass}>{cardContent}</div>
        );
      })}
    </div>
  );
}
