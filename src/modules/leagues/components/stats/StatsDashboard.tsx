import React, { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import {
  Users,
  Calendar,
  CheckCircle2,
  Goal,
  Flame,
  Trophy,
  TrendingUp,
  Award,
  Medal,
  Star,
  Zap,
} from "lucide-react";
import { useLeagueStats } from "../../hooks/useLeagueStats";
import { PlayerLeaderboardEntry } from "../../types/league";
import { getMediaUrl, getMediaFallback } from "../../../../utils/media";

interface StatsDashboardProps {
  leagueId: string;
}

const getImageUrl = (path?: string | null) => {
  if (!path) return "";
  if (
    path.startsWith("data:") ||
    path.startsWith("blob:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  return getMediaUrl(path);
};

const TeamLogoCrest: React.FC<{ logo?: string; name: string; size?: string }> = ({
  logo,
  name,
  size = "w-5 h-5",
}) => {
  const [error, setError] = useState(false);
  const src = getImageUrl(logo);

  const getInitials = (n: string) => {
    const clean = (n || "").replace(/Coach\s*Max/gi, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase() || "TM";
  };

  if (!src || error) {
    return <span className="text-[9px] font-black">{getInitials(name)}</span>;
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className={`${size} object-contain rounded-full`}
    />
  );
};

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ leagueId }) => {
  const { data: stats, isLoading } = useLeagueStats(leagueId);
  const [activePlayerTab, setActivePlayerTab] = useState<"performers" | "scorers" | "assists">("performers");

  if (isLoading || !stats) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mx-auto mb-2" />
        <span className="text-xs font-semibold">Loading League Statistics...</span>
      </div>
    );
  }

  // Cards summary
  const summaryCards = [
    {
      title: "Total Teams",
      value: stats.totalTeams,
      icon: Users,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
    },
    {
      title: "Total Matches",
      value: stats.totalMatches,
      icon: Calendar,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
    },
    {
      title: "Matches Played",
      value: stats.matchesPlayed,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    {
      title: "Goals Scored",
      value: stats.goalsScored,
      icon: Goal,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
    },
    {
      title: "Avg Goals / Match",
      value: stats.avgGoalsPerMatch,
      icon: Flame,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400",
    },
  ];

  // Goals per Team Bar Chart
  const teamVsGoals = stats.teamVsGoals || stats.teamGoals || [];
  const goalsCategories = teamVsGoals.map((t) =>
    t.teamName.replace(/Coach\s*Max\s*/gi, "").slice(0, 14)
  );
  const goalsValues = teamVsGoals.map((t) => t.goals);

  const barChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "45%",
        distributed: true,
      },
    },
    colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#6366F1"],
    dataLabels: { enabled: true, style: { fontSize: "10px", fontWeight: "bold" } },
    legend: { show: false },
    xaxis: {
      categories: goalsCategories,
      labels: {
        rotate: -35,
        style: { fontSize: "10px", fontWeight: 600 },
      },
    },
    yaxis: {
      title: { text: "Goals", style: { fontSize: "11px", fontWeight: 700 } },
    },
    grid: { strokeDashArray: 3 },
  };

  const barChartSeries = [
    {
      name: "Goals Scored",
      data: goalsValues,
    },
  ];

  // Results Distribution Donut Chart
  const donutSeries = [
    stats.resultsDistribution.decisiveWins ?? stats.resultsDistribution.wins ?? 3,
    stats.resultsDistribution.draws ?? 0,
    stats.resultsDistribution.competitiveGames ?? stats.resultsDistribution.losses ?? 2,
  ];

  const donutOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
    },
    labels: ["Decisive Wins", "Draws", "Competitive Games"],
    colors: ["#10B981", "#F59E0B", "#3B82F6"],
    legend: { position: "bottom", fontSize: "12px", fontWeight: 600 },
    dataLabels: { enabled: true },
    stroke: { width: 0 },
  };

  // Player leaderboards data
  const topPerformers = stats.topPerformers || [];
  const topScorers = stats.topScorers || [];
  const topAssists = stats.topAssists || [];

  const currentLeaderboard: PlayerLeaderboardEntry[] =
    activePlayerTab === "performers"
      ? topPerformers
      : activePlayerTab === "scorers"
      ? topScorers
      : topAssists;

  const mvpPlayer = topPerformers[0] || topScorers[0] || null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          League Statistics
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Comprehensive match telemetry, team scoring distributions, and top player performance rankings.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {card.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team vs Goals Chart */}
        <div className="lg:col-span-8 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Team vs Goals
              </h3>
              <p className="text-xs text-slate-500">Total offensive goals scored by team.</p>
            </div>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <Chart options={barChartOptions} series={barChartSeries} type="bar" height={280} />
        </div>

        {/* Results Distribution */}
        <div className="lg:col-span-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Results Distribution
                </h3>
                <p className="text-xs text-slate-500">Wins, draws, and match breakdown.</p>
              </div>
            </div>
            <div className="py-2">
              <Chart options={donutOptions} series={donutSeries} type="donut" height={240} />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PLAYER PERFORMANCE & INDIVIDUAL LEADERBOARDS (NEW)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="text-amber-500 size-5" />
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Individual Player Performance & Telemetry
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live league rankings for Top Scorers (Goals), Playmakers (Assists), and League MVPs with their team.
            </p>
          </div>

          {/* Segmented Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold shrink-0">
            <button
              onClick={() => setActivePlayerTab("performers")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activePlayerTab === "performers"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Zap size={13} className="text-amber-500" />
              <span>Top Performers (MVP)</span>
            </button>
            <button
              onClick={() => setActivePlayerTab("scorers")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activePlayerTab === "scorers"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Goal size={13} className="text-emerald-500" />
              <span>Top Scorers (Goals)</span>
            </button>
            <button
              onClick={() => setActivePlayerTab("assists")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activePlayerTab === "assists"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Star size={13} className="text-purple-500" />
              <span>Top Assists</span>
            </button>
          </div>
        </div>

        {/* MVP Spotlight Banner if available */}
        {mvpPlayer && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 shadow-sm">
            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
              <Trophy size={160} />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-amber-400/80 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    {mvpPlayer.profileImage ? (
                      <img
                        src={getMediaUrl(mvpPlayer.profileImage, getMediaFallback(mvpPlayer.playerName))}
                        alt={mvpPlayer.playerName}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(mvpPlayer.playerName); }}
                      />
                    ) : (
                      <span className="font-black text-lg text-amber-300">
                        {mvpPlayer.playerName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-900 rounded-full p-1 shadow">
                    <Trophy size={11} className="fill-current" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      League Top Performer
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">
                    {mvpPlayer.playerName}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                      <TeamLogoCrest logo={mvpPlayer.teamLogo} name={mvpPlayer.teamName} size="w-4 h-4" />
                    </div>
                    <span className="font-semibold">{mvpPlayer.teamName}</span>
                  </div>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10">
                <div className="text-center px-2">
                  <div className="text-xl font-black text-amber-300">{mvpPlayer.goals}</div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Goals ⚽</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center px-2">
                  <div className="text-xl font-black text-cyan-300">{mvpPlayer.assists}</div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Assists 👟</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center px-2">
                  <div className="text-xl font-black text-white">{mvpPlayer.totalPoints}</div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Total Pts 🔥</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {currentLeaderboard.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <Goal size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Player Match Stats Recorded Yet
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              When entering match scores in the <b>Schedule</b> tab, add which players scored goals and provided assists. Player rankings and telemetry will dynamically calculate here!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Goals ⚽</th>
                  <th className="py-3 px-4 text-center">Assists 👟</th>
                  <th className="py-3 px-4 text-center font-black text-slate-700 dark:text-slate-200">
                    Total Points 🔥
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentLeaderboard.map((item, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr
                      key={item.playerId || idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                            idx === 0
                              ? "bg-amber-400 text-slate-900 shadow-xs"
                              : idx === 1
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white"
                              : idx === 2
                              ? "bg-amber-700 text-white"
                              : "text-slate-500 font-bold"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Player */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 text-[10px] font-black text-slate-600 dark:text-slate-300">
                            {item.profileImage ? (
                              <img
                                src={getMediaUrl(item.profileImage, getMediaFallback(item.playerName))}
                                alt={item.playerName}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(item.playerName); }}
                              />
                            ) : (
                              item.playerName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <span className="font-bold text-xs truncate max-w-[180px]">
                            {item.playerName}
                          </span>
                        </div>
                      </td>

                      {/* Team */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                            <TeamLogoCrest logo={item.teamLogo} name={item.teamName} size="w-5 h-5" />
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs truncate max-w-[160px]">
                            {item.teamName}
                          </span>
                        </div>
                      </td>

                      {/* Goals */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm text-slate-900 dark:text-white">
                        <span className={item.goals > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                          {item.goals}
                        </span>
                      </td>

                      {/* Assists */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm text-slate-900 dark:text-white">
                        <span className={item.assists > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}>
                          {item.assists}
                        </span>
                      </td>

                      {/* Total Points */}
                      <td className="py-3.5 px-4 text-center font-black text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 font-black">
                          {item.totalPoints}
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

      {/* Top Scoring Teams Leaderboard */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Top Scoring Teams Leaderboard
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ranked by Goals For
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.topScoringTeams.map((team, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                    idx === 0
                      ? "bg-amber-500 text-white"
                      : idx === 1
                      ? "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white"
                      : idx === 2
                      ? "bg-amber-700 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {team.teamName}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {team.goals}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Goals</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
