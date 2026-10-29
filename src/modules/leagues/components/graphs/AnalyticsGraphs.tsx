import React from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { TrendingUp, Activity, BarChart2 } from "lucide-react";
import { useLeagueLadder } from "../../hooks/useLeagueLadder";
import { useLeagueMatches } from "../../hooks/useLeagueMatches";
import { useLeagueGraphs } from "../../hooks/useLeagueGraphs";

interface AnalyticsGraphsProps {
  leagueId: string;
}

export const AnalyticsGraphs: React.FC<AnalyticsGraphsProps> = ({ leagueId }) => {
  const { data: standings = [] } = useLeagueLadder(leagueId);
  const { data: matches = [] } = useLeagueMatches(leagueId);
  const { data: graphsData } = useLeagueGraphs(leagueId);

  // 1. Goals Per Round Bar/Line Chart
  let rounds = [1, 2, 3, 4, 5];
  let roundLabels = rounds.map((r) => `Round ${r}`);
  let roundGoals = [0, 0, 0, 0, 0];

  if (graphsData?.goalsPerRoundTrend && graphsData.goalsPerRoundTrend.length > 0) {
    roundLabels = graphsData.goalsPerRoundTrend.map((g) => g.roundLabel || `Round ${g.round}`);
    roundGoals = graphsData.goalsPerRoundTrend.map((g) => g.totalGoals);
  } else if (matches.some((m) => m.status === "COMPLETED" || m.status === "Completed")) {
    const roundMap: Record<number, number> = {};
    matches.forEach((m) => {
      if (m.status === "COMPLETED" || m.status === "Completed") {
        const g =
          (m.score?.homeScore ?? m.homeScore ?? 0) +
          (m.score?.awayScore ?? m.awayScore ?? 0);
        roundMap[m.round] = (roundMap[m.round] || 0) + g;
      }
    });
    if (Object.keys(roundMap).length > 0) {
      rounds = Object.keys(roundMap).map(Number).sort((a, b) => a - b);
      roundLabels = rounds.map((r) => `Round ${r}`);
      roundGoals = rounds.map((r) => roundMap[r]);
    }
  }

  const goalsTrendOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    colors: ["#3B82F6"],
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: roundLabels,
      labels: { style: { fontSize: "11px", fontWeight: 600 } },
    },
    yaxis: {
      title: { text: "Total Goals Scored", style: { fontSize: "11px", fontWeight: 700 } },
    },
    grid: { strokeDashArray: 3 },
  };

  const goalsTrendSeries = [
    {
      name: "Total Goals Scored",
      data: roundGoals,
    },
  ];

  // 2. Points Progression (Top 5 teams round-wise progression)
  const topTeams = standings.slice(0, 5);
  const pointsProgressionSeries =
    graphsData?.pointsProgression &&
    graphsData.pointsProgression.some((p) => p.progression && p.progression.length > 0)
      ? graphsData.pointsProgression.map((p) => ({
          name: p.teamName.replace(/Coach\s*Max\s*/gi, "").slice(0, 16),
          data: p.progression.map((pr) => pr.points),
        }))
      : topTeams.map((team) => {
          const totalPts = team.points || 0;
          const name = team.team?.teamName || team.teamName || "Team";
          return {
            name: name.replace(/Coach\s*Max\s*/gi, "").slice(0, 16),
            data: [0, 0, 0, 0, totalPts],
          };
        });

  const pointsProgressionOptions: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    colors: ["#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444"],
    stroke: { curve: "straight", width: 2.5 },
    markers: { size: 4 },
    xaxis: {
      categories: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
      labels: { style: { fontSize: "11px", fontWeight: 600 } },
    },
    yaxis: {
      title: { text: "Points Accumulated", style: { fontSize: "11px", fontWeight: 700 } },
    },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px", fontWeight: 600 },
    grid: { strokeDashArray: 3 },
  };

  // 3. Team Performance Trend (Win Rate / Goal Diff Index)
  const perfCategories =
    graphsData?.teamWinEfficiency && graphsData.teamWinEfficiency.length > 0
      ? graphsData.teamWinEfficiency.map((t) =>
          t.teamName.replace(/Coach\s*Max\s*/gi, "").slice(0, 12)
        )
      : standings
          .slice(0, 8)
          .map((s) => (s.team?.teamName || s.teamName || "").replace(/Coach\s*Max\s*/gi, "").slice(0, 12));

  const perfData =
    graphsData?.teamWinEfficiency && graphsData.teamWinEfficiency.length > 0
      ? graphsData.teamWinEfficiency.map((t) => t.winEfficiency)
      : standings.slice(0, 8).map((s) => Math.round((s.won / (s.played || 1)) * 100));

  const perfOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: "55%",
      },
    },
    colors: ["#10B981"],
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}%`,
      style: { fontSize: "11px", fontWeight: "bold" },
    },
    xaxis: {
      categories: perfCategories,
      max: 100,
      labels: {
        formatter: (val) => `${val}%`,
        style: { fontSize: "10px", fontWeight: 600 },
      },
    },
    grid: { strokeDashArray: 3 },
  };

  const perfSeries = [
    {
      name: "Win Percentage",
      data: perfData,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Visual Analytics & Trends
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          In-depth progression tracking, scoring rates, and competitive form analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Progression */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Points Progression
              </h3>
              <p className="text-xs text-slate-500">Cumulative league points across rounds.</p>
            </div>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <Chart options={pointsProgressionOptions} series={pointsProgressionSeries} type="line" height={280} />
        </div>

        {/* Goals Per Round Trend */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Goals Per Round Trend
              </h3>
              <p className="text-xs text-slate-500">Total offensive match output per round.</p>
            </div>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Activity size={16} />
            </div>
          </div>
          <Chart options={goalsTrendOptions} series={goalsTrendSeries} type="area" height={280} />
        </div>
      </div>

      {/* Win Rate Index Bar Chart */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Team Win Efficiency Index
            </h3>
            <p className="text-xs text-slate-500">Winning percentage of top contending teams.</p>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <BarChart2 size={16} />
          </div>
        </div>
        <Chart options={perfOptions} series={perfSeries} type="bar" height={260} />
      </div>
    </div>
  );
};
