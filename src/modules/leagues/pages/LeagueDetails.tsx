import { useState } from "react";
import { useParams, Link } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import { useLeague } from "../hooks/useLeague";
import { LeagueHeader } from "../components/LeagueHeader";
import { LeagueTabs, TabKey } from "../components/LeagueTabs";
import { LadderTable } from "../components/ladder/LadderTable";
import { ScheduleView } from "../components/schedule/ScheduleView";
import { TeamsGrid } from "../components/teams/TeamsGrid";
import { StatsDashboard } from "../components/stats/StatsDashboard";
import { AnalyticsGraphs } from "../components/graphs/AnalyticsGraphs";
import { LeagueDetailsInfo } from "../components/details/LeagueDetailsInfo";
import { TeamManagementTable } from "../components/management/TeamManagementTable";
import { Trophy, ArrowLeft } from "lucide-react";

export default function LeagueDetails() {
  const { leagueId = "ejl9" } = useParams<{ leagueId: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("ladder");

  const { data: league, isLoading, error, refetch } = useLeague(leagueId);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500 border-t-transparent mx-auto mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
          Loading League Module...
        </p>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Trophy size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">League Not Found</h3>
        <p className="text-xs text-slate-500 mb-6">
          Unable to locate details for the specified league ID.
        </p>
        <Link
          to="/leagues"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Leagues Management</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`CoachMax | ${league.name || "League Details"}`}
        description={league.description || "Manage fixtures, ladder, teams, and analytics"}
      />

      <div className="space-y-6">
        {/* League Details Header */}
        <LeagueHeader league={league} onRefresh={refetch} />

        {/* Tab Navigation and Content Container */}
        <div className="shadow-sm rounded-xl overflow-hidden">
          {/* 7 Tabs Bar */}
          <LeagueTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Active Tab Panel */}
          {activeTab === "ladder" && (
            <LadderTable leagueId={leagueId} season={league.season} />
          )}

          {activeTab === "schedule" && (
            <ScheduleView leagueId={leagueId} />
          )}

          {activeTab === "teams" && (
            <TeamsGrid leagueId={leagueId} />
          )}

          {activeTab === "stats" && (
            <StatsDashboard leagueId={leagueId} />
          )}

          {activeTab === "graphs" && (
            <AnalyticsGraphs leagueId={leagueId} />
          )}

          {activeTab === "details" && (
            <LeagueDetailsInfo league={league} />
          )}

          {activeTab === "management" && (
            <TeamManagementTable leagueId={leagueId} />
          )}
        </div>
      </div>
    </>
  );
}
