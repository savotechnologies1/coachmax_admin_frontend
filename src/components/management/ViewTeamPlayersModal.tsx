import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Modal } from "../ui/modal";
import { Shield, Search, Users, UserPlus, Trash2, X, User, ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unassignPlayersFromTeam } from "../../api/adminApi";
import toast from "react-hot-toast";
import { getMediaUrl, getMediaFallback } from "../../utils/media";

interface ViewTeamPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: any | null;
  onOpenAssign: (teamId: string) => void;
}

export default function ViewTeamPlayersModal({
  isOpen,
  onClose,
  team,
  onOpenAssign,
}: ViewTeamPlayersModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const getImageUrl = (path: string | undefined | null): string | undefined => {
    return getMediaUrl(path) || undefined;
  };

  const players: any[] = useMemo(() => {
    if (!team) return [];
    return Array.isArray(team.players) ? team.players : [];
  }, [team]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.toLowerCase();
    return players.filter((p: any) => {
      const name = (p.fullName || `${p.firstName || ""} ${p.lastName || ""}` || p.name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [players, searchQuery]);

  const removePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      if (!team?._id) return;
      return await unassignPlayersFromTeam(team._id, [playerId]);
    },
    onSuccess: () => {
      toast.success("Player removed from team successfully");
      if (team?._id) {
        queryClient.invalidateQueries({ queryKey: ["team", team._id] });
        queryClient.invalidateQueries({ queryKey: ["teamFullTable", team._id] });
      }
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["teamFullTable"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["availablePlayersForTeam"] });
      queryClient.invalidateQueries({ queryKey: ["availablePlayers"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove player from team");
    },
  });

  if (!isOpen || !team) return null;

  const teamLogo = team.teamLogo ? getImageUrl(team.teamLogo) : (team.logo ? getImageUrl(team.logo) : null);
  const coachName = typeof team.coach === "object" ? team.coach?.name || team.coach?.fullName : team.coach || "Unassigned";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-0 overflow-hidden rounded-xl shadow-2xl">
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#0A1930] px-6 py-4 text-white flex items-center justify-between border-l-4 border-[#0047FF]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-none bg-white/10 flex items-center justify-center text-white overflow-hidden shrink-0 border border-white/20">
              {teamLogo ? (
                <img src={teamLogo} alt={team.teamName} className="w-full h-full object-cover" />
              ) : (
                <Shield className="w-6 h-6 text-[#0047FF]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white leading-tight truncate">
                  {team.teamName}
                </h2>
                {team.ageGroup && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-600 text-white">
                    {team.ageGroup}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300 mt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  Coach: {coachName}
                </span>
                <span className="text-gray-500">•</span>
                <span className="flex items-center gap-1 font-bold text-white">
                  <Users className="w-3.5 h-3.5 text-[#0047FF]" />
                  {players.length} Players
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onClose();
                navigate(`/teams/${team._id}`);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 flex items-center gap-1.5"
              title="Open full dedicated team page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Team Page</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenAssign(team._id);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-[#0047FF] hover:bg-blue-600 text-white transition-colors shadow-sm flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Players</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team roster by name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF] text-slate-800 dark:text-slate-200"
            />
          </div>
          <span className="text-xs font-bold text-slate-500 shrink-0">
            Showing {filteredPlayers.length} of {players.length}
          </span>
        </div>

        {/* Players List Table */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[440px]">
          {players.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No players assigned yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Assign players to this team to build your roster.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAssign(team._id);
                }}
                className="mt-2 px-4 py-2 text-xs font-bold bg-[#0047FF] hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assign Players Now</span>
              </button>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              No players found matching "{searchQuery}".
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player: any, idx: number) => {
                const playerName =
                  player.fullName ||
                  `${player.firstName || ""} ${player.lastName || ""}`.trim() ||
                  player.name ||
                  (player.email ? player.email.split("@")[0] : `Player #${idx + 1}`);

                const avatarSrc = getMediaUrl(player.profileImage, getMediaFallback(playerName));

                return (
                  <div
                    key={player._id || idx}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={avatarSrc}
                        alt={playerName}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getMediaFallback(playerName);
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {playerName}
                        </h4>
                        {player.email && (
                          <span className="text-[11px] text-slate-400 block truncate">
                            {player.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => removePlayerMutation.mutate(player._id)}
                        disabled={removePlayerMutation.isPending}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        title="Remove player from team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800">
          <span className="text-xs text-slate-500 font-medium">
            Total {players.length} player(s) in this squad
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-none hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
