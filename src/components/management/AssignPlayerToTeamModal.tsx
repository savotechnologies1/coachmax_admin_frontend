import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../ui/modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignPlayerToTeam } from "../../api/adminApi";
import apiClient from "../../api/apiClient";
import { toast } from "react-hot-toast";
import { Search, Users, Check, X, Shield, UserCheck, SlidersHorizontal, Layers } from "lucide-react";
import { getMediaUrl, getMediaFallback } from "../../utils/media";

interface AssignPlayerToTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string | null;
  leagueId?: string | null;
}

type AssignmentFilter = "ALL" | "AVAILABLE" | "ASSIGNED";
type StatusApplyMode = "ALL" | "INDIVIDUAL";

export interface AssignmentStatusOption {
  value: string;
  label: string;
  desc: string;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
}

export const ASSIGNMENT_STATUSES: AssignmentStatusOption[] = [
  {
    value: "TRIAL",
    label: "TRIAL",
    desc: "Trial Session",
    activeClass: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500",
    inactiveClass: "border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-500/[0.03] text-slate-600 dark:text-slate-300",
    badgeClass: "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  },
  {
    value: "UNPAID",
    label: "APPROVED",
    desc: "Assign & Allocate Fee (Auto)",
    activeClass: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500",
    inactiveClass: "border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-500/[0.03] text-slate-600 dark:text-slate-300",
    badgeClass: "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  {
    value: "EXTRA",
    label: "EXTRA",
    desc: "Extra Status",
    activeClass: "border-[#d6d11a] bg-[#d6d11a]/20 text-[#8a8c23] dark:text-[#dee08b] ring-2 ring-[#d6d11a]",
    inactiveClass: "border-slate-200 dark:border-slate-700 hover:border-[#d6d11a]/50 hover:bg-[#d6d11a]/10 text-slate-600 dark:text-slate-300",
    badgeClass: "bg-[#d6d11a]/15 text-[#8a8c23] dark:text-[#dee08b] border border-[#d6d11a]/40",
  },
  {
    value: "TBC",
    label: "TBC",
    desc: "To Be Confirmed",
    activeClass: "border-slate-500 bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-400 ring-2 ring-slate-400",
    inactiveClass: "border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 text-slate-600 dark:text-slate-300",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  {
    value: "SUBSTITUTE",
    label: "SUBSTITUTE",
    desc: "Team Substitute",
    activeClass: "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500",
    inactiveClass: "border-slate-200 dark:border-slate-700 hover:border-sky-300 hover:bg-sky-500/[0.03] text-slate-600 dark:text-slate-300",
    badgeClass: "bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
  },
];

export default function AssignPlayerToTeamModal({ isOpen, onClose, teamId, leagueId }: AssignPlayerToTeamModalProps) {
  const queryClient = useQueryClient();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("ALL");

  // Payment Status Assignment States
  const [statusApplyMode, setStatusApplyMode] = useState<StatusApplyMode>("ALL");
  const [selectedAssignStatus, setSelectedAssignStatus] = useState<string>("TRIAL");
  const [playerStatusMap, setPlayerStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayerIds([]);
      setSearchQuery("");
      setAssignmentFilter("ALL");
      setStatusApplyMode("ALL");
      setSelectedAssignStatus("TRIAL");
      setPlayerStatusMap({});
    }
  }, [isOpen]);

  const { data: playersResponse, isLoading } = useQuery({
    queryKey: ["availablePlayersForTeam", teamId, leagueId],
    queryFn: async () => {
      const res = await apiClient.get('/api/admin/available-players', { params: { teamId, leagueId } });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
    enabled: isOpen && !!teamId,
  });

  const players: any[] = useMemo(() => {
    return Array.isArray(playersResponse) ? playersResponse : playersResponse?.data || [];
  }, [playersResponse]);

  const availableCount = useMemo(() => players.filter(p => !p.isAssigned).length, [players]);
  const assignedCount = useMemo(() => players.filter(p => !!p.isAssigned).length, [players]);

  const filteredPlayers = useMemo(() => {
    let list = players;

    // Filter by assignment status
    if (assignmentFilter === "AVAILABLE") {
      list = list.filter(p => !p.isAssigned);
    } else if (assignmentFilter === "ASSIGNED") {
      list = list.filter(p => !!p.isAssigned);
    }

    // Filter by search query
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p: any) => {
      const name = (p.fullName || `${p.firstName || ''} ${p.lastName || ''}`).toLowerCase();
      const email = (p.email || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const category = (p.category?.name || p.category || '').toLowerCase();
      const team = (p.assignedTeam?.teamName || '').toLowerCase();
      const programs = (p.programs || []).map((pr: any) => pr.name || '').join(" ").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        category.includes(q) ||
        team.includes(q) ||
        programs.includes(q)
      );
    });
  }, [players, searchQuery, assignmentFilter]);

  const allFilteredSelected =
    filteredPlayers.length > 0 && filteredPlayers.every((p: any) => selectedPlayerIds.includes(p._id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredPlayers.map((p: any) => p._id));
      setSelectedPlayerIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set(selectedPlayerIds);
      const newStatusMap = { ...playerStatusMap };
      filteredPlayers.forEach((p: any) => {
        newIds.add(p._id);
        if (!newStatusMap[p._id]) {
          newStatusMap[p._id] = selectedAssignStatus;
        }
      });
      setSelectedPlayerIds(Array.from(newIds));
      setPlayerStatusMap(newStatusMap);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      const isSelected = prev.includes(playerId);
      if (isSelected) {
        return prev.filter(id => id !== playerId);
      } else {
        setPlayerStatusMap(m => ({
          ...m,
          [playerId]: m[playerId] || selectedAssignStatus,
        }));
        return [...prev, playerId];
      }
    });
  };

  // Handle changing status for ALL selected players
  const handleSelectStatusForAll = (statusValue: string) => {
    setSelectedAssignStatus(statusValue);
    setPlayerStatusMap(prev => {
      const updated = { ...prev };
      selectedPlayerIds.forEach(id => {
        updated[id] = statusValue;
      });
      return updated;
    });
  };

  // Handle individual status change for a single player
  const handleIndividualStatusChange = (playerId: string, statusValue: string) => {
    setPlayerStatusMap(prev => ({
      ...prev,
      [playerId]: statusValue,
    }));
  };

  const assignMutation = useMutation({
    mutationFn: async ({
      tId,
      pIds,
      primaryStatus,
      statusMap,
    }: {
      tId: string;
      pIds: string[];
      primaryStatus: string;
      statusMap: Record<string, string>;
    }) => {
      // 1. Primary backend call POST /api/admin/teams/:tId/assign
      // Sends clean payload: { players: [ { playerId, paymentStatus }, ... ] }
      const res = await assignPlayerToTeam(tId, pIds, primaryStatus, statusMap, leagueId || undefined);

      // 2. Sync any player with a custom individual status differing from primaryStatus
      const diffIds = pIds.filter(id => statusMap[id] && statusMap[id] !== primaryStatus);
      if (diffIds.length > 0) {
        await Promise.allSettled(
          diffIds.map(id =>
            apiClient.put(`/api/admin/updatePaymentStatus/${id}`, {
              paymentStatus: statusMap[id],
              teamId: tId,
            })
          )
        );
      }

      return res;
    },
    onSuccess: (res, variables) => {
      toast.success(res?.message || "Players assigned successfully!");
      if (variables?.tId || teamId) {
        const targetId = variables?.tId || teamId;
        queryClient.invalidateQueries({ queryKey: ["team", targetId] });
        queryClient.invalidateQueries({ queryKey: ["teamFullTable", targetId] });
      }
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["teamFullTable"] });
      ["teams", "team", "leagueTeams", "league", "leagueStats", "leagueLadder", "teamPlayers", "invoices", "teamFullTable"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: ["availablePlayers"] });
      queryClient.invalidateQueries({ queryKey: ["availablePlayersForTeam"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["registrationRequests"] });
      queryClient.invalidateQueries({ queryKey: ["sidebarBadges"] });
      onClose();
      setSelectedPlayerIds([]);
      setPlayerStatusMap({});
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to assign players");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      toast.error("No team selected");
      return;
    }
    if (selectedPlayerIds.length === 0) {
      toast.error("Please select at least one player");
      return;
    }

    assignMutation.mutate({
      tId: teamId,
      pIds: selectedPlayerIds,
      primaryStatus: selectedAssignStatus,
      statusMap: playerStatusMap,
    });
  };

  const getAvatarUrl = (profileImage: string | null | undefined, name = "Player") => {
    return getMediaUrl(profileImage, getMediaFallback(name));
  };

  const getStatusBadge = (statusKey?: string) => {
    const opt = ASSIGNMENT_STATUSES.find(s => s.value === statusKey) || ASSIGNMENT_STATUSES[0];
    return (
      <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-none tracking-wider ${opt.badgeClass}`}>
        {opt.label}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl lg:max-w-4xl p-0 overflow-hidden rounded-xl shadow-2xl">
      <div className="flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0A1930] px-6 py-4 text-white flex items-center justify-between border-l-4 border-[#0047FF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Assign Players to Team</h2>
              <p className="text-xs text-gray-300 mt-0.5">
                Select players to assign or reassign to this team
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs & Search Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 space-y-3">
          {/* Assignment Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <button
              type="button"
              onClick={() => setAssignmentFilter("ALL")}
              className={`px-3 py-1 text-xs font-bold transition-all border-b-2 ${
                assignmentFilter === "ALL"
                  ? "border-[#0047FF] text-[#0047FF] dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All Players ({players.length})
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter("AVAILABLE")}
              className={`px-3 py-1 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                assignmentFilter === "AVAILABLE"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Available / Unassigned ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter("ASSIGNED")}
              className={`px-3 py-1 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                assignmentFilter === "ASSIGNED"
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Assigned to Other Teams ({assignedCount})
            </button>
          </div>

          {/* Search & Bulk Select Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, team, category, program..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF] text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  disabled={filteredPlayers.length === 0}
                  className="w-4 h-4 text-[#0047FF] rounded-none border-slate-300 focus:ring-[#0047FF] cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select All ({filteredPlayers.length})
                </span>
              </label>

              {selectedPlayerIds.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-[#0047FF] text-white rounded-none shadow-xs">
                  {selectedPlayerIds.length} Selected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Body: Player List + Assignment Status Picker */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Player Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar max-h-[290px]">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#0047FF] border-r-transparent mb-2" />
                <p>Loading available players...</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                {searchQuery ? "No players match your search query." : "No players found in this category."}
              </div>
            ) : (
              filteredPlayers.map((player: any) => {
                const isSelected = selectedPlayerIds.includes(player._id);
                const playerName = player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || "Unnamed Player";
                const avatarSrc = getAvatarUrl(player.profileImage, playerName);
                const categoryName = player.category?.name || player.category || "";
                const termName = player.term?.name || player.term || "";
                const programs = player.programs || [];
                const currentStatus = playerStatusMap[player._id] || selectedAssignStatus;

                return (
                  <div
                    key={player._id}
                    onClick={() => togglePlayerSelection(player._id)}
                    className={`p-3 border transition-all cursor-pointer select-none rounded-none flex items-center justify-between gap-4 ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/30 border-[#0047FF] shadow-xs ring-1 ring-[#0047FF]"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Left: Checkbox + Avatar + Player Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="flex items-center justify-center shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#0047FF] rounded-none border-slate-300 focus:ring-[#0047FF] pointer-events-none"
                        />
                      </div>

                      {/* Profile Image / Avatar */}
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={playerName}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getMediaFallback(playerName);
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0A1930] text-white flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200 dark:border-slate-700">
                          {playerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {playerName}
                          </h4>

                          {categoryName && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {categoryName}
                            </span>
                          )}

                          {isSelected && (
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(currentStatus)}
                            </div>
                          )}
                        </div>

                        {/* Programs & Term Tags */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          {programs.length > 0 && (
                            <span className="font-semibold text-[#0047FF] dark:text-blue-400 truncate max-w-[280px]">
                              {programs.map((pr: any) => pr.name).join(", ")}
                            </span>
                          )}

                          {termName && (
                            <span className="text-slate-400 font-medium">
                              • {termName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Team Assignment Flag / Badge + Status Control */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {player.isAssigned && player.assignedTeam ? (
                        <div className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60 flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Assigned: {player.assignedTeam.teamName}</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/60 flex items-center gap-1.5">
                          <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Available</span>
                        </div>
                      )}

                      {/* Individual Status Selector on Card if Selected & Individual Mode */}
                      {isSelected && statusApplyMode === "INDIVIDUAL" ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Status:</span>
                          <select
                            value={currentStatus}
                            onChange={(e) => handleIndividualStatusChange(player._id, e.target.value)}
                            className="text-[10px] font-bold py-1 px-2 bg-white dark:bg-slate-800 border border-[#0047FF] text-[#0047FF] dark:text-blue-400 rounded-none focus:outline-none cursor-pointer"
                          >
                            {ASSIGNMENT_STATUSES.map(s => (
                              <option key={s.value} value={s.value}>
                                {s.label} ({s.desc})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : player.email ? (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {player.email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* SELECT ASSIGNMENT STATUS SECTION */}
          <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {/* Status Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0047FF]" />
                  Select Assignment Status
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  ({statusApplyMode === "ALL" ? "Apply to all selected" : "Individual status per player"})
                </span>
              </div>

              {/* Mode Toggle Pills: Apply on All vs Selected Individual Change */}
              <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 self-start sm:self-auto shadow-2xs">
                <button
                  type="button"
                  onClick={() => setStatusApplyMode("ALL")}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    statusApplyMode === "ALL"
                      ? "bg-[#0047FF] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Apply on All {selectedPlayerIds.length > 0 ? `(${selectedPlayerIds.length})` : ""}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusApplyMode("INDIVIDUAL")}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    statusApplyMode === "INDIVIDUAL"
                      ? "bg-[#0047FF] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Individual Change</span>
                </button>
              </div>
            </div>

            {/* 5 Status Cards Grid: TRIAL | APPROVED | EXTRA | TBC | SUBSTITUTE */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {ASSIGNMENT_STATUSES.map((status) => {
                const isSelected = selectedAssignStatus === status.value;
                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => {
                      if (statusApplyMode === "ALL") {
                        handleSelectStatusForAll(status.value);
                      } else {
                        setSelectedAssignStatus(status.value);
                      }
                    }}
                    className={`p-3 border text-center rounded-none transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
                      isSelected
                        ? status.activeClass + " font-extrabold shadow-xs"
                        : status.inactiveClass + " bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wide leading-tight">
                      {status.label}
                    </span>
                    <span className="text-[9px] font-bold opacity-80 leading-tight">
                      {status.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mode Explanation / Individual Players Status Strip */}
            {statusApplyMode === "ALL" ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
                <span>Status for all selected players:</span>
                {getStatusBadge(selectedAssignStatus)}
              </div>
            ) : selectedPlayerIds.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span>Selected Players ({selectedPlayerIds.length})</span>
                  <span>Click to change status for individual player</span>
                </div>
                <div className="space-y-1.5">
                  {selectedPlayerIds.map((id) => {
                    const p = players.find(x => x._id === id);
                    const name = p?.fullName || `${p?.firstName || ''} ${p?.lastName || ''}`.trim() || "Player";
                    const currentSt = playerStatusMap[id] || selectedAssignStatus;
                    return (
                      <div
                        key={id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {name}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {ASSIGNMENT_STATUSES.map(s => {
                            const isCurrent = currentSt === s.value;
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => handleIndividualStatusChange(id, s.value)}
                                className={`px-2 py-0.5 text-[9px] font-bold uppercase border transition-all ${
                                  isCurrent
                                    ? s.badgeClass + " font-black ring-1"
                                    : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                                }`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
              <strong className="text-slate-900 dark:text-white">{selectedPlayerIds.length}</strong> of {players.length} players selected
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-none hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assignMutation.isPending || selectedPlayerIds.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-blue-700 rounded-none disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {assignMutation.isPending ? (
                  "Assigning..."
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Assign {selectedPlayerIds.length > 0 ? `(${selectedPlayerIds.length}) ` : ""}Player{selectedPlayerIds.length === 1 ? "" : "s"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
