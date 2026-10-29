import React, { useState, useMemo, useEffect } from "react";
import { Download, Search, ChevronDown, ArrowUpDown, RefreshCw } from "lucide-react";
import { TeamStanding } from "../../types/league";
import { useLeagueLadder, useRecalculateLadder } from "../../hooks/useLeagueLadder";
import { getMediaUrl } from "../../../../utils/media";

interface LadderTableProps {
  leagueId: string;
  season?: string;
}

const getLogoUrl = (url?: string) => {
  if (!url) return "";
  return getMediaUrl(url);
};

const TeamLogoCrest: React.FC<{ logo?: string; name: string }> = ({ logo, name }) => {
  const [error, setError] = useState(false);
  const src = getLogoUrl(logo);

  const getTeamInitials = (n: string) => {
    const clean = n.replace(/Coach\s*Max/gi, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase() || "TM";
  };

  if (!src || error) {
    return <span>{getTeamInitials(name)}</span>;
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="w-full h-full object-cover"
    />
  );
};

export const LadderTable: React.FC<LadderTableProps> = ({ leagueId, season = "Season 2026" }) => {
  const { data: standings = [], isLoading } = useLeagueLadder(leagueId);
  const recalculateMutation = useRecalculateLadder(leagueId);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(season);
  const [sortField, setSortField] = useState<keyof TeamStanding>("position");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (season) {
      setSelectedSeason(season);
    }
  }, [season]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: keyof TeamStanding) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "position" || field === "teamName" ? "asc" : "desc");
    }
  };

  const filteredStandings = useMemo(() => {
    return standings.filter((s) => {
      const name = s.team?.teamName || s.teamName || "";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [standings, searchQuery]);

  const sortedStandings = useMemo(() => {
    const list = [...filteredStandings];
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });
    return list;
  }, [filteredStandings, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedStandings.length / pageSize) || 1;
  const paginatedStandings = sortedStandings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportCSV = () => {
    const headers = ["Position", "Team", "Played", "Won", "Draw", "Lost", "Goal Difference", "Points"];
    const rows = sortedStandings.map((s) => [
      s.position,
      `"${(s.team?.teamName || s.teamName || "Team").replace(/"/g, '""')}"`,
      s.played,
      s.won,
      s.draw,
      s.lost,
      s.goalDifference,
      s.points,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `League_Ladder_${selectedSeason.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
      {/* Top Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Ladder
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            League standings & rankings dynamically updated from match results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500 w-36 sm:w-48 transition-all"
            />
          </div>

          {/* Season Dropdown */}
          <div className="relative inline-block">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer shadow-xs"
            >
              {selectedSeason && !["Season 2026", "Season 2025", "Term 4 2026"].includes(selectedSeason) && (
                <option value={selectedSeason}>{selectedSeason}</option>
              )}
              <option value="Season 2026">Season 2026</option>
              <option value="Season 2025">Season 2025</option>
              <option value="Term 4 2026">Term 4 2026</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
          </div>

          {/* Recalculate Ladder Button */}
          <button
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100/70 dark:hover:bg-amber-900/50 shadow-xs cursor-pointer transition-all disabled:opacity-60"
            title="Recalculate Ladder from match results"
          >
            <RefreshCw
              size={13}
              className={recalculateMutation.isPending ? "animate-spin text-amber-600" : "text-amber-600"}
            />
            <span>{recalculateMutation.isPending ? "Calculating..." : "Recalculate Ladder"}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs cursor-pointer transition-all"
            title="Export CSV"
          >
            <Download size={13} className="text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto no-scrollbar rounded-lg border border-slate-100 dark:border-slate-800/80">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <th
                onClick={() => handleSort("position")}
                className="py-3 px-4 w-14 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>#</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>

              <th
                onClick={() => handleSort("teamName")}
                className="py-3 px-4 min-w-[240px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>Team</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>

              <th
                onClick={() => handleSort("played")}
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>P</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>

              <th
                onClick={() => handleSort("won")}
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>W</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>

              <th
                onClick={() => handleSort("draw")}
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>D</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>

              <th
                onClick={() => handleSort("lost")}
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>L</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>

              <th
                onClick={() => handleSort("goalDifference")}
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>+/-</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>

              <th
                onClick={() => handleSort("points")}
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 font-black text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Pts</span>
                  <ArrowUpDown size={11} className="opacity-40" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-brand-500 border-t-transparent" />
                    <span className="text-xs font-semibold">Calculating Standings...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedStandings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-medium italic">
                  No teams found in standings.
                </td>
              </tr>
            ) : (
              paginatedStandings.map((team, idx) => {
                const teamName = team.team?.teamName || team.teamName || "Team";
                const teamLogo = team.team?.logo || team.teamLogo;
                const rankNum = team.rank || team.position || idx + 1;
                const draws = team.drawn !== undefined ? team.drawn : (team.draw || 0);

                return (
                  <tr
                    key={team.standingId || team.teamId || team.team?._id || idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Position Badge - Amber circular badge matching Screenshot 1 */}
                    <td className="py-3.5 px-4 font-bold">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                        {rankNum}
                      </div>
                    </td>

                    {/* Team Crest & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-700 dark:text-slate-200 font-bold text-[10px]">
                          <TeamLogoCrest logo={teamLogo} name={teamName} />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs tracking-tight">
                          {teamName}
                        </span>
                      </div>
                    </td>

                    {/* Played */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-300">
                      {team.played}
                    </td>

                    {/* Won */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-300">
                      {team.won}
                    </td>

                    {/* Draw */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-300">
                      {draws}
                    </td>

                    {/* Lost */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-300">
                      {team.lost}
                    </td>

                    {/* Goal Difference (+/-) */}
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {team.goalDifference > 0
                        ? `${team.goalDifference}`
                        : team.goalDifference}
                    </td>

                    <td className="py-3.5 px-4 text-center font-black text-sm text-slate-900 dark:text-white">
                      {team.points}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 font-medium">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedStandings.length)} of{" "}
            {sortedStandings.length} teams
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-bold"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                  currentPage === i + 1
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
