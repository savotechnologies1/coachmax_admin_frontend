import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trophy, User } from "lucide-react";
import { getPlayerStatusTextClass } from "../../../components/common/StatusColorCode";
import { sortPlayersByPaymentStatus } from "../../../utils/paymentStatus";

interface TeamLeaguesViewProps {
  leagues: any[];
}

export const TeamLeaguesView: React.FC<TeamLeaguesViewProps> = ({ leagues }) => {
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);

  // Filter out the null/empty leagues which represent default team enrollment
  const validLeagues = leagues?.filter((l) => l.leagueId) || [];

  if (validLeagues.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center mt-6">
        <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Assigned Leagues</h3>
        <p className="text-xs text-slate-500 mt-1">This team has not been enrolled in any leagues yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
        <Trophy className="w-4 h-4 text-brand-500" />
        Assigned Leagues ({validLeagues.length})
      </h3>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {validLeagues.map((leagueEnrollment: any) => {
          const isExpanded = expandedLeague === leagueEnrollment._id;
          const leagueInfo = leagueEnrollment.league || {};
          const players = sortPlayersByPaymentStatus(
            leagueEnrollment.players || [],
            (player: any) => player.paymentStatus,
            (player: any) => player.player?.fullName || player.fullName || player.name
          );

          return (
            <div key={leagueEnrollment._id} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
              {/* League Header / Toggle */}
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpandedLeague(isExpanded ? null : leagueEnrollment._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm border border-brand-100 dark:border-brand-800">
                    {leagueInfo.logo ? (
                      <img src={leagueInfo.logo} alt={leagueEnrollment.leagueName} className="w-full h-full object-cover" />
                    ) : (
                      <Trophy size={18} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {leagueEnrollment.leagueName || "Unknown League"}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {leagueEnrollment.leagueSeason || "Unknown Season"}
                      </span>
                      <span className="text-xs text-slate-500">
                        • {players.length} Players Enrolled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 sm:mt-0">
                  <div className="flex gap-4 mr-4 text-xs">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fee</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">${leagueEnrollment.teamFee || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
                      <span className={`font-bold ${leagueEnrollment.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {leagueEnrollment.status || "ACTIVE"}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Players List */}
              {isExpanded && (
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-200 dark:border-slate-800">
                  <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Enrolled Players</h5>
                  {players.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No players found in this league enrollment.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {players.map((p: any, idx: number) => {
                        const playerInfo = p.player || p;
                        return (
                          <div key={p.playerId || p._id || idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <User size={14} className="text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`text-xs font-bold truncate ${getPlayerStatusTextClass(p.paymentStatus)}`}>
                                {playerInfo.fullName || playerInfo.name || "Unknown Player"}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {p.paymentStatus || "UNKNOWN STATUS"}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rating</div>
                              <div className="text-xs font-black text-brand-600">{playerInfo.rating || "-"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
