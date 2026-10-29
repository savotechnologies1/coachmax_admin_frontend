import React, { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Download,
  Search,
  UserCheck,
  Users,
  Sliders,
  ChevronRight,
  Calendar,
  Shield,
  Image as ImageIcon,
  User,
  ArrowLeft,
} from "lucide-react";
import {
  useLeagueTeams,
  useAddTeamToLeague,
  useRemoveTeamFromLeague,
  useToggleTeamStatus,
  useUpdateLeagueTeamStats,
} from "../../hooks/useLeagueTeams";
import { useLeague } from "../../hooks/useLeague";
import { LeagueTeam } from "../../types/league";
import { useLeaguePermissions } from "../../hooks/useLeaguePermissions";
import { Modal } from "../../../../components/ui/modal";
import ImageCropModal from "../../../../components/common/ImageCropModal";
import Button from "../../../../components/ui/button/Button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllTeams, createTeam, getAllCoaches, getAvailablePlayers } from "../../../../api/adminApi";
import { getAllTerms } from "../../../../api/terms";
import { toast } from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../../../utils/fileValidation";
import { getMediaUrl } from "../../../../utils/media";
import { sortPlayersByPaymentStatus } from "../../../../utils/paymentStatus";
import TeamFullTable from "../../../../components/teams/TeamFullTable";
import TeamBroadcastButton from "../../../../components/teams/TeamBroadcastButton";
import AssignPlayerToTeamModal from "../../../../components/management/AssignPlayerToTeamModal";
import FormHeader from "../../../../components/form/FormHeader";
import { useNavigate } from "react-router";

interface TeamManagementTableProps {
  leagueId: string;
}

export const TeamManagementTable: React.FC<TeamManagementTableProps> = ({ leagueId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: leagueData } = useLeague(leagueId);
  const leagueTerm = leagueData?.term && typeof leagueData.term === "object" ? leagueData.term : null;
  const leagueTermId = leagueTerm?._id || (typeof leagueData?.term === "string" ? leagueData.term : "");
  const leagueTermYear = leagueTerm?.year ? String(leagueTerm.year) : "";

  const { data: teams = [], isLoading } = useLeagueTeams(leagueId);
  const { canManageTeams } = useLeaguePermissions();

  const addTeamMutation = useAddTeamToLeague(leagueId);
  const removeTeamMutation = useRemoveTeamFromLeague(leagueId);
  const toggleStatusMutation = useToggleTeamStatus(leagueId);
  const updateStatsMutation = useUpdateLeagueTeamStats(leagueId);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [expandedTeamIds, setExpandedTeamIds] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedTeamForStats, setSelectedTeamForStats] = useState<LeagueTeam | null>(null);
  const [statsForm, setStatsForm] = useState({
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  });

  // Assign Players Modal State
  const [isAssignPlayersModalOpen, setIsAssignPlayersModalOpen] = useState(false);
  const [selectedTeamForAssign, setSelectedTeamForAssign] = useState<string | null>(null);

  // Add Team Modal States
  const [addModalTab, setAddModalTab] = useState<"EXISTING" | "CREATE">("EXISTING");
  const [existingTeamsSearch, setExistingTeamsSearch] = useState("");
  const [selectedExistingTeamIds, setSelectedExistingTeamIds] = useState<string[]>([]);

  // Create Team form state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [previewLogoImage, setPreviewLogoImage] = useState<string | null>(null);
  const [pendingLogoCrop, setPendingLogoCrop] = useState<File | null>(null);
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingCreateTeam, setIsSubmittingCreateTeam] = useState(false);

  const [createFormData, setCreateFormData] = useState({
    teamName: "",
    teamType: "INTERNAL",
    ageGroup: "",
    year: new Date().getFullYear().toString(),
    term: "",
    coach: "",
    assistantCoach: "",
    venue: "",
    location: "",
  });

  const [selectedPlayerIdsForAdd, setSelectedPlayerIdsForAdd] = useState<string[]>([]);
  const [selectedPlayerStatusesForAdd, setSelectedPlayerStatusesForAdd] = useState<Record<string, string>>({});
  const [playerSearchQueryForAdd, setPlayerSearchQueryForAdd] = useState("");

  const { data: allTeamsData, isLoading: isLoadingAcademyTeams } = useQuery({
    queryKey: ["allAcademyTeams", leagueId, leagueTermId],
    queryFn: () => getAllTeams(leagueTermId),
    enabled: isAddModalOpen && Boolean(leagueTermId),
  });
  const fetchedAcademyTeams: any[] = Array.isArray(allTeamsData)
    ? allTeamsData
    : allTeamsData?.data || [];
  const allAcademyTeams = fetchedAcademyTeams.filter((team: any) => {
    const teamTermId = typeof team.term === "object" ? team.term?._id : team.term;
    return Boolean(leagueTermId) && String(teamTermId || "") === String(leagueTermId);
  });
  const filteredAcademyTeams = allAcademyTeams.filter((team: any) => {
    const name = (team.teamName || team.name || "").toLowerCase();
    const coachName = (typeof team.coach === "object" && team.coach?.name ? team.coach.name : typeof team.coach === "string" ? team.coach : "").toLowerCase();
    const ageGroup = (team.ageGroup || "").toLowerCase();
    const query = existingTeamsSearch.toLowerCase();
    return name.includes(query) || coachName.includes(query) || ageGroup.includes(query);
  });

  const { data: coachesData } = useQuery({
    queryKey: ["coaches"],
    queryFn: () => getAllCoaches(),
    enabled: isAddModalOpen && addModalTab === "CREATE",
  });
  const coaches: any[] = Array.isArray(coachesData) ? coachesData : coachesData?.data || [];

  const { data: termsData } = useQuery({
    queryKey: ["terms", leagueTermYear || "all", leagueTermId],
    queryFn: () => getAllTerms(leagueTermYear ? Number(leagueTermYear) : undefined),
    enabled: isAddModalOpen && addModalTab === "CREATE" && Boolean(leagueTermId),
  });
  const fetchedTerms: any[] = Array.isArray(termsData) ? termsData : (termsData?.data || termsData?.terms || []);
  const terms = fetchedTerms.filter((item: any) => String(item._id || item.id || "") === String(leagueTermId));
  const leagueTermLabel = leagueTerm?.name || terms[0]?.name || terms[0]?.termName || terms[0]?.title || "League term";
  const displayedLeagueYear = leagueTermYear || (terms[0]?.year ? String(terms[0].year) : "");

  const { data: availablePlayersRes } = useQuery({
    queryKey: ["availablePlayersForTeamModal"],
    queryFn: () => getAvailablePlayers(),
    enabled: isAddModalOpen && addModalTab === "CREATE",
  });
  const availablePlayers: any[] = Array.isArray(availablePlayersRes)
    ? availablePlayersRes
    : availablePlayersRes?.data || [];

  const resetCreateForm = () => {
    setCreateFormData({
      teamName: "",
      teamType: "INTERNAL",
      ageGroup: "",
      year: leagueTermYear || String(terms[0]?.year || new Date().getFullYear()),
      term: leagueTermId,
      coach: "",
      assistantCoach: "",
      venue: "",
      location: "",
    });
    setSelectedLogoFile(null);
    setPreviewLogoImage(null);
    setPendingLogoCrop(null);
    setCreateFormErrors({});
    setSelectedPlayerIdsForAdd([]);
    setSelectedPlayerStatusesForAdd({});
    setPlayerSearchQueryForAdd("");
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "logo");
      if (validationError) { toast.error(validationError); e.target.value = ""; return; }
      setPendingLogoCrop(normalized);
      e.target.value = "";
    }
  };

  const handleLogoCrop = (cropped: File) => {
    setSelectedLogoFile(cropped);
    setPreviewLogoImage(URL.createObjectURL(cropped));
    setPendingLogoCrop(null);
  };

  const filteredTeams = teams.filter((t) => {
    const tName = t.teamName || t.name || "";
    const coachStr = typeof t.coach === "object" && t.coach?.name ? t.coach.name : typeof t.coach === "string" ? t.coach : "";
    return (
      tName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coachStr.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleSelectAll = () => {
    if (selectedTeamIds.length === filteredTeams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(filteredTeams.map((t) => t._id));
    }
  };

  const toggleSelectTeam = (id: string) => {
    if (selectedTeamIds.includes(id)) {
      setSelectedTeamIds(selectedTeamIds.filter((tId) => tId !== id));
    } else {
      setSelectedTeamIds([...selectedTeamIds, id]);
    }
  };

  const toggleTeamAccordion = (teamId: string) => {
    setExpandedTeamIds((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  // Bulk Actions
  const handleBulkActivate = async () => {
    const outcomes = await Promise.allSettled(selectedTeamIds.map((teamId) => toggleStatusMutation.mutateAsync({ teamId, status: "ACTIVE" })));
    if (outcomes.every((result) => result.status === "fulfilled")) setSelectedTeamIds([]);
  };

  const handleBulkDeactivate = async () => {
    const outcomes = await Promise.allSettled(selectedTeamIds.map((teamId) => toggleStatusMutation.mutateAsync({ teamId, status: "INACTIVE" })));
    if (outcomes.every((result) => result.status === "fulfilled")) setSelectedTeamIds([]);
  };

  const handleBulkRemove = async () => {
    if (!confirm(`Remove ${selectedTeamIds.length} selected teams from the league?`)) return;
    const outcomes = await Promise.allSettled(selectedTeamIds.map((id) => removeTeamMutation.mutateAsync(id)));
    if (outcomes.every((result) => result.status === "fulfilled")) setSelectedTeamIds([]);
  };

  const handleExportSelected = () => {
    const listToExport = teams.filter(
      (t) => selectedTeamIds.length === 0 || selectedTeamIds.includes(t._id)
    );

    const headers = ["Team Name", "Coach", "Players Count", "Wins", "Draws", "Losses", "Status"];
    const rows = listToExport.map((t) => {
      const tName = t.teamName || t.name || "Team";
      const coachStr = typeof t.coach === "object" && t.coach?.name ? t.coach.name : typeof t.coach === "string" ? t.coach : "";
      const wins = t.record?.won ?? t.wins ?? 0;
      const draws = t.record?.drawn ?? t.draws ?? 0;
      const losses = t.record?.lost ?? t.losses ?? 0;
      return [
        `"${tName.replace(/"/g, '""')}"`,
        `"${coachStr.replace(/"/g, '""')}"`,
        t.playersCount || 0,
        wins,
        draws,
        losses,
        t.status || "ACTIVE",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `League_Teams_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAssignExistingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExistingTeamIds.length === 0) {
      toast.error("Please select at least one team to assign");
      return;
    }

    try {
      await addTeamMutation.mutateAsync(selectedExistingTeamIds);
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueLadder", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueStats", leagueId] });
      setSelectedExistingTeamIds([]);
      setIsAddModalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign teams");
    }
  };

  const handleCreateAndAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!createFormData.teamName.trim()) errors.teamName = "Team name is required.";
    if (!createFormData.ageGroup.trim()) errors.ageGroup = "Age group is required.";
    if (!leagueTermId) errors.term = "Select a term for this league before creating a team.";
    if (!createFormData.coach) errors.coach = "Select an assigned head coach.";
    setCreateFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsSubmittingCreateTeam(true);
      const payload = new FormData();
      payload.append("teamName", createFormData.teamName.trim());
      payload.append("coach", createFormData.coach);
      if (createFormData.assistantCoach) {
        payload.append("assistantCoach", createFormData.assistantCoach);
      }
      payload.append("ageGroup", createFormData.ageGroup.trim());
      payload.append("teamType", createFormData.teamType);
      payload.append("isExternal", createFormData.teamType === "EXTERNAL" ? "true" : "false");
      payload.append("term", leagueTermId);
      payload.append("year", displayedLeagueYear || createFormData.year || String(new Date().getFullYear()));
      if (createFormData.venue) payload.append("venue", createFormData.venue);
      if (createFormData.location) payload.append("location", createFormData.location);

      if (selectedPlayerIdsForAdd.length > 0) {
        const playersPayload = selectedPlayerIdsForAdd.map((playerId) => ({
          player: playerId,
          paymentStatus: selectedPlayerStatusesForAdd[playerId] || "UNPAID",
        }));
        payload.append("players", JSON.stringify(playersPayload));
      }

      if (selectedLogoFile) {
        payload.append("teamLogo", selectedLogoFile);
      }

      const res = await createTeam(payload);
      const newTeamId = res?.data?._id || res?.team?._id || res?._id || res?.data?.id || res?.id;

      if (!newTeamId) {
        toast.error("Team created but could not retrieve ID to assign to league.");
        setIsSubmittingCreateTeam(false);
        return;
      }

      await addTeamMutation.mutateAsync([newTeamId]);

      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueLadder", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueStats", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["allAcademyTeams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });

      toast.success(`Team "${createFormData.teamName}" created and assigned to league!`);
      resetCreateForm();
      setIsAddModalOpen(false);
      setAddModalTab("EXISTING");
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to create team");
    } finally {
      setIsSubmittingCreateTeam(false);
    }
  };

  const handleOpenStatsModal = (t: LeagueTeam) => {
    setSelectedTeamForStats(t);
    setStatsForm({
      played: t.record?.played ?? (t.wins || 0) + (t.losses || 0) + (t.draws || 0),
      won: t.record?.won ?? t.wins ?? 0,
      drawn: t.record?.drawn ?? t.draws ?? 0,
      lost: t.record?.lost ?? t.losses ?? 0,
      goalsFor: t.record?.goalsFor ?? 0,
      goalsAgainst: t.record?.goalsAgainst ?? 0,
      points: t.record?.points ?? 0,
    });
    setIsStatsModalOpen(true);
  };

  const handleStatsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamForStats) return;

    updateStatsMutation.mutate(
      {
        teamId: selectedTeamForStats._id,
        stats: {
          played: Number(statsForm.played),
          won: Number(statsForm.won),
          drawn: Number(statsForm.drawn),
          lost: Number(statsForm.lost),
          goalsFor: Number(statsForm.goalsFor),
          goalsAgainst: Number(statsForm.goalsAgainst),
          points: Number(statsForm.points),
        },
      },
      {
        onSuccess: () => {
          setIsStatsModalOpen(false);
          setSelectedTeamForStats(null);
        },
      }
    );
  };

  const getTeamInitials = (name: string) => {
    const clean = name.replace(/Coach\s*Max/gi, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase() || "TM";
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Team Participation Management
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage rosters, statuses, eligibility, and team permissions for this league.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search team or coach..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500 w-44 sm:w-52 transition-all"
            />
          </div>

          <button
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs cursor-pointer transition-all"
          >
            <Download size={13} className="text-slate-500" />
            <span>Export Teams</span>
          </button>

          {canManageTeams && (
            <button
              onClick={() => {
                setAddModalTab("EXISTING");
                setSelectedExistingTeamIds([]);
                setExistingTeamsSearch("");
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer transition-all"
            >
              <Plus size={14} />
              <span>Add Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedTeamIds.length > 0 && canManageTeams && (
        <div className="flex items-center justify-between p-3 mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs">
          <span className="font-bold text-blue-900 dark:text-blue-300">
            {selectedTeamIds.length} team(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkActivate}
              className="px-2.5 py-1 rounded font-bold bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-200 hover:bg-emerald-50 cursor-pointer shadow-xs"
            >
              Activate
            </button>
            <button
              onClick={handleBulkDeactivate}
              className="px-2.5 py-1 rounded font-bold bg-white dark:bg-slate-800 text-amber-600 border border-amber-200 hover:bg-amber-50 cursor-pointer shadow-xs"
            >
              Deactivate
            </button>
            <button
              onClick={handleBulkRemove}
              className="px-2.5 py-1 rounded font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
            >
              Remove Selected
            </button>
          </div>
        </div>
      )}

      {/* Teams Table */}
      <div className="overflow-x-auto no-scrollbar rounded-lg border border-slate-100 dark:border-slate-800/80">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {canManageTeams && (
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredTeams.length > 0 && selectedTeamIds.length === filteredTeams.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600"
                  />
                </th>
              )}
              <th className="py-3 px-4 min-w-[220px]">Team</th>
              <th className="py-3 px-4 min-w-[150px]">Coach</th>
              <th className="py-3 px-4 text-center">Players</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right min-w-[120px]">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                  Loading Team Management...
                </td>
              </tr>
            ) : filteredTeams.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium italic">
                  No teams found.
                </td>
              </tr>
            ) : (
              filteredTeams.map((team) => {
                const tName = team.teamName || team.name || "Academy Team";
                const coachStr =
                  typeof team.coach === "object" && team.coach?.name
                    ? team.coach.name
                    : typeof team.coach === "string"
                      ? team.coach
                      : "Unassigned";
                const isExpanded = !!expandedTeamIds[team._id];

                return (
                  <React.Fragment key={team._id}>
                    <tr
                      className={`transition-colors ${isExpanded
                        ? "bg-[#031549] text-white border-b border-[#031549] shadow-md"
                        : "border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-slate-900 dark:text-white"
                        }`}
                    >
                      {canManageTeams && (
                        <td className={`px-4 ${isExpanded ? "py-2" : "py-3.5"}`}>
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(team._id)}
                            onChange={() => toggleSelectTeam(team._id)}
                            className="w-4 h-4 rounded border-slate-300 text-brand-600"
                          />
                        </td>
                      )}

                      {/* Team with Accordion Toggle */}
                      <td className={`px-4 ${isExpanded ? "py-2" : "py-3.5"}`}>
                        <div className="flex items-center gap-2.5">
                          <div
                            onClick={() => toggleTeamAccordion(team._id)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden font-bold text-[10px] text-slate-700 dark:text-slate-200">
                              {team.logo ? (
                                <img
                                  src={
                                    getMediaUrl(team.logo)
                                  }
                                  alt={tName}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                    const fallback = (e.target as HTMLElement).parentElement?.querySelector(".fallback-initials");
                                    if (fallback) (fallback as HTMLElement).style.display = "inline";
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <span
                                className="fallback-initials"
                                style={{ display: team.logo ? "none" : "inline" }}
                              >
                                {getTeamInitials(tName)}
                              </span>
                            </div>
                            <div>
                              <span className={`font-bold block transition-colors ${isExpanded ? "text-white hover:text-blue-200" : "text-slate-900 dark:text-white hover:text-[#0047FF]"}`}>
                                {tName}
                              </span>
                              {isExpanded && (
                                <span className="text-[10px] text-blue-300 font-semibold">
                                  Attendance Active
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coach */}
                      <td className={`px-4 ${isExpanded ? "py-2" : "py-3.5"}`}>
                        <div className={`flex items-center gap-1.5 font-semibold ${isExpanded ? "text-slate-300" : "text-slate-700 dark:text-slate-300"}`}>
                          <UserCheck size={13} className={isExpanded ? "text-slate-400" : "text-slate-400"} />
                          <span>{coachStr}</span>
                        </div>
                      </td>

                      {/* Players Count (Clickable to view/manage attendance) */}
                      <td className={`px-4 text-center ${isExpanded ? "py-2" : "py-3.5"}`}>
                        <button
                          type="button"
                          onClick={() => toggleTeamAccordion(team._id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${isExpanded ? "text-white bg-white/10 hover:bg-white/20" : "text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-blue-50 hover:text-[#0047FF] dark:bg-slate-800 dark:hover:bg-slate-700"}`}
                          title="Click to view player attendance roster"
                        >
                          <Users size={12} className={isExpanded ? "text-slate-300" : "text-slate-400"} />
                          <span>{team.playersCount}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className={`px-4 text-center ${isExpanded ? "py-2" : "py-3.5"}`}>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${team.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                        >
                          {team.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className={`px-4 text-right ${isExpanded ? "py-2" : "py-3.5"}`}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Attendance Accordion Toggle Button */}
                          <button
                            type="button"
                            onClick={() => toggleTeamAccordion(team._id)}
                            className={`px-2 py-1 text-[11px] font-bold rounded border flex items-center gap-1 transition-colors cursor-pointer ${isExpanded
                              ? "bg-[#0047FF] text-white border-[#0047FF] shadow-xs"
                              : "bg-blue-50 text-[#0047FF] border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                              }`}
                            title={isExpanded ? "Hide Attendance" : "View & Manage Attendance Matrix"}
                          >
                            <Calendar size={12} />
                            <span>{isExpanded ? "Close" : "Attendance"}</span>
                          </button>

                          {canManageTeams && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTeamForAssign(team._id);
                                  setIsAssignPlayersModalOpen(true);
                                }}
                                className={`px-2 py-1 text-[11px] font-bold rounded border flex items-center gap-1 transition-colors cursor-pointer ${isExpanded
                                  ? "bg-white/10 text-white border-white/20 hover:bg-white/20"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                                  }`}
                                title="Add/Assign Players"
                              >
                                <Plus size={12} />
                                <span>Add Players</span>
                              </button>

                              <button
                                onClick={() => navigate(`/teams/${team._id}`)}
                                className={`px-2 py-1 text-[11px] font-bold rounded border flex items-center gap-1 transition-colors cursor-pointer ${isExpanded
                                  ? "bg-white/10 text-white border-white/20 hover:bg-white/20"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                                  }`}
                                title="View full team details and profile"
                              >
                                <ArrowLeft size={12} className="rotate-180" />
                                <span>View Details</span>
                              </button>

                              <button
                                onClick={() => handleOpenStatsModal(team)}
                                className="px-2 py-1 text-[11px] font-bold rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Edit Team League Statistics"
                              >
                                <Sliders size={12} />
                                <span>Stats</span>
                              </button>

                              <button
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    teamId: team._id,
                                    status: team.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                  })
                                }
                                className={`px-2 py-1 text-[11px] font-bold rounded border transition-colors ${team.status === "ACTIVE"
                                  ? "text-amber-600 hover:bg-amber-50 border-amber-200"
                                  : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                                  }`}
                              >
                                {team.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${tName} from this league?`)) {
                                    removeTeamMutation.mutate(team._id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                                title="Remove Team"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}

                          <div className={`w-px h-6 mx-1 ${isExpanded ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}></div>
                          
                          <button
                            type="button"
                            onClick={() => toggleTeamAccordion(team._id)}
                            className={`p-1 rounded transition-all cursor-pointer ${isExpanded ? "text-white hover:bg-white/10" : "text-slate-400 hover:text-[#0047FF] hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                            title={isExpanded ? "Collapse team attendance" : "Expand team attendance"}
                          >
                            <ChevronRight
                              size={15}
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Row: Team Attendance Matrix & Roster Management */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td
                          colSpan={canManageTeams ? 6 : 5}
                          className="border-b-4 border-slate-200 dark:border-slate-800 w-full"
                        >
                          <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
                            <div className="flex justify-end border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                              <TeamBroadcastButton teamId={team._id} teamName={tName} />
                            </div>
                            <TeamFullTable
                              teamId={team._id}
                              leagueId={leagueId}
                              teamName={tName}
                              hideHeader={true}
                              className="w-full mb-0 border-0 shadow-none rounded-none bg-white dark:bg-slate-900"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Team Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        className={addModalTab === "CREATE" ? "max-w-[920px] max-h-[90vh] overflow-y-auto p-6 lg:p-8 rounded-lg shadow-2xl" : "max-w-[620px] p-6 rounded-xl shadow-2xl"}
        noBackgroundBlur={addModalTab === "CREATE"}
      >
        {addModalTab === "EXISTING" && (
          <>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign Teams to League</h3>
                  <p className="text-xs text-slate-500">Select existing teams to participate in this league.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setAddModalTab("CREATE");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0047FF] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg transition-colors border border-blue-200 dark:border-blue-900/60 shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Create New Team</span>
              </button>
            </div>

            <form data-coachmax-form onSubmit={handleAssignExistingSubmit} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search existing teams..."
                  value={existingTeamsSearch}
                  onChange={(e) => setExistingTeamsSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {leagueTermId ? `Showing teams for ${leagueTermLabel}${displayedLeagueYear ? ` ${displayedLeagueYear}` : ""}.` : "Select a term for this league before adding teams."}
              </p>

              <div className="max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 custom-scrollbar">
                {!leagueTermId ? (
                  <div className="p-6 text-center text-xs text-slate-500">This league does not have a selected term.</div>
                ) : isLoadingAcademyTeams ? (
                  <div className="p-6 text-center text-xs text-slate-500">Loading teams for {leagueTermLabel}…</div>
                ) : filteredAcademyTeams.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No teams found for {leagueTermLabel}{displayedLeagueYear ? ` ${displayedLeagueYear}` : ""}.</div>
                ) : filteredAcademyTeams.map((t: any) => {
                    const isAlreadyInLeague = teams.some((leagueTeam) => leagueTeam._id === t._id);
                    const isSelected = selectedExistingTeamIds.includes(t._id);

                    return (
                      <div
                        key={t._id}
                        onClick={() => {
                          if (isAlreadyInLeague) return;
                          setSelectedExistingTeamIds(prev =>
                            prev.includes(t._id) ? prev.filter(id => id !== t._id) : [...prev, t._id]
                          );
                        }}
                        className={`flex items-center gap-3 p-3 transition-colors ${isAlreadyInLeague
                          ? "opacity-60 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed"
                          : isSelected
                            ? "bg-blue-50/50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected || isAlreadyInLeague}
                          disabled={isAlreadyInLeague}
                          readOnly
                          className="w-4 h-4 rounded border-slate-300 text-brand-600 cursor-pointer disabled:cursor-not-allowed mt-0.5"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden font-bold text-[10px] text-slate-700 dark:text-slate-200">
                              {t.teamLogo || t.logo ? (
                                <img
                                  src={getMediaUrl(t.teamLogo || t.logo)}
                                  alt="Logo"
                                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaUrl(); }}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{getTeamInitials(t.teamName || t.name || "Team")}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                {t.teamName || t.name || "Academy Team"}
                                {t.ageGroup && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">{t.ageGroup}</span>}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                                <span className="flex items-center gap-1"><UserCheck size={10} /> {typeof t.coach === 'object' && t.coach?.name ? t.coach.name : typeof t.coach === 'string' ? t.coach : "No Coach"}</span>
                                <span className="flex items-center gap-1"><Users size={10} /> {t.playersCount || t.players?.length || 0} Players</span>
                              </div>
                            </div>
                          </div>

                          {isAlreadyInLeague && (
                            <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
                              Already in League
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500">
                  {selectedExistingTeamIds.length} team(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button type="submit" size="sm" disabled={addTeamMutation.isPending || selectedExistingTeamIds.length === 0}>
                    {addTeamMutation.isPending ? "Assigning..." : "Assign Selected Teams"}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}

        {addModalTab === "CREATE" && (
          <>
            <FormHeader
              icon={Shield}
              title="Create New Team Profile"
              description="Configure team details, coaches, schedule, and venue information."
              className="mb-6 -mx-6 -mt-6 rounded-t-lg border-b border-[#082269]"
              actions={<button
                type="button"
                onClick={() => setAddModalTab("EXISTING")}
                className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Existing Teams</span>
              </button>}
            />

            <form data-coachmax-form noValidate onSubmit={handleCreateAndAssignTeam} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="league-team-name" className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Team Name *</label>
                      <input
                        id="league-team-name"
                        type="text"
                        value={createFormData.teamName}
                        onChange={(e) => { setCreateFormData({ ...createFormData, teamName: e.target.value }); setCreateFormErrors((previous) => ({ ...previous, teamName: "" })); }}
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white"
                        placeholder="Under 16 Tigers"
                        aria-required="true"
                        aria-invalid={Boolean(createFormErrors.teamName)}
                        aria-describedby={createFormErrors.teamName ? "league-team-name-error" : undefined}
                      />
                      {createFormErrors.teamName && <p id="league-team-name-error" role="alert" className="mt-1 text-sm text-error-600">{createFormErrors.teamName}</p>}
                    </div>
                    <div>
                      <label htmlFor="league-team-type" className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Team Category *</label>
                      <select
                        id="league-team-type"
                        value={createFormData.teamType}
                        onChange={(e) => setCreateFormData({ ...createFormData, teamType: e.target.value })}
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
                        required
                      >
                        <option value="INTERNAL">Our Team (Academy)</option>
                        <option value="EXTERNAL">External Team (Opponent)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="league-team-age-group" className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Age Group *</label>
                      <input
                        id="league-team-age-group"
                        type="text"
                        list="age-group-options"
                        value={createFormData.ageGroup}
                        onChange={(e) => { setCreateFormData({ ...createFormData, ageGroup: e.target.value }); setCreateFormErrors((previous) => ({ ...previous, ageGroup: "" })); }}
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white"
                        placeholder="e.g. U16"
                        aria-required="true"
                        aria-invalid={Boolean(createFormErrors.ageGroup)}
                        aria-describedby={createFormErrors.ageGroup ? "league-team-age-error" : undefined}
                      />
                      {createFormErrors.ageGroup && <p id="league-team-age-error" role="alert" className="mt-1 text-sm text-error-600">{createFormErrors.ageGroup}</p>}
                      <datalist id="age-group-options">
                        {Array.from({ length: 29 }, (_, i) => i + 2).map((num) => (
                          <option key={num} value={`U${num}`} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label htmlFor="league-team-year" className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Year</label>
                      <input
                        id="league-team-year"
                        type="text"
                        value={displayedLeagueYear || createFormData.year}
                        readOnly
                        aria-label="League year"
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label htmlFor="league-team-term" className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Academic Term <span className="text-error-600">*</span></label>
                      <select
                        id="league-team-term"
                        value={leagueTermId}
                        disabled={!leagueTermId}
                        aria-label="League academic term"
                        aria-required="true"
                        aria-invalid={Boolean(createFormErrors.term)}
                        aria-describedby={createFormErrors.term ? "league-team-term-error" : undefined}
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-300 cursor-not-allowed"
                      >
                        {leagueTermId ? <option value={leagueTermId}>{leagueTermLabel}</option> : <option value="">No term selected for this league</option>}
                      </select>
                      {createFormErrors.term && <p id="league-team-term-error" role="alert" className="mt-1 text-sm text-error-600">{createFormErrors.term}</p>}
                    </div>
                  </div>

                  {/* Coaches */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="league-team-coach" className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Assigned Head Coach *</label>
                      <select
                        id="league-team-coach"
                        value={createFormData.coach}
                        onChange={(e) => { setCreateFormData({ ...createFormData, coach: e.target.value }); setCreateFormErrors((previous) => ({ ...previous, coach: "" })); }}
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
                        aria-required="true"
                        aria-invalid={Boolean(createFormErrors.coach)}
                        aria-describedby={createFormErrors.coach ? "league-team-coach-error" : undefined}
                      >
                        <option value="">Select Head Coach</option>
                        {coaches.map((c: any) => (
                          <option key={c._id} value={c._id}>{c.fullName || c.name}</option>
                        ))}
                      </select>
                      {createFormErrors.coach && <p id="league-team-coach-error" role="alert" className="mt-1 text-sm text-error-600">{createFormErrors.coach}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Assistant Coach</label>
                      <select
                        value={createFormData.assistantCoach}
                        onChange={(e) => setCreateFormData({ ...createFormData, assistantCoach: e.target.value })}
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
                      >
                        <option value="">Select Assistant Coach</option>
                        {coaches.map((c: any) => (
                          <option key={c._id} value={c._id}>{c.fullName || c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Logo Upload Panel */}
                <div className="md:col-span-4 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/50 p-6 border border-gray-200 dark:border-gray-700">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-4 text-center">Team Logo <span className="normal-case font-normal">(optional)</span></label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={previewLogoImage ? "Replace team logo" : "Upload team logo"}
                    className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center bg-white dark:bg-slate-900 cursor-pointer overflow-hidden hover:border-[#0047FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 transition-colors group relative shadow-xs"
                  >
                    {previewLogoImage ? (
                      <>
                        <img src={previewLogoImage} alt="Team logo preview" className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex items-center justify-center text-xs font-semibold text-white">Replace logo</span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-[#0047FF] transition-colors">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload Logo</span>
                      </div>
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={handleLogoFileChange}
                  />
                  <span className="text-[10px] text-gray-500 mt-3 text-center">JPEG, PNG, WebP, HEIC/HEIF · max 2MB</span>
                  <span className="text-[10px] text-gray-400 mt-1 text-center">Square crop · 512 × 512 px</span>
                </div>
              </div>

              {/* Venue & Location Section */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Venue</label>
                    <input
                      type="text"
                      value={createFormData.venue}
                      onChange={(e) => setCreateFormData({ ...createFormData, venue: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white"
                      placeholder="Main Ground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Location</label>
                    <input
                      type="text"
                      value={createFormData.location}
                      onChange={(e) => setCreateFormData({ ...createFormData, location: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white"
                      placeholder="Bhopal Sports Complex"
                    />
                  </div>
                </div>

                {/* Initial Players Selection */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <User size={15} className="text-[#0047FF]" />
                        Assign Initial Players (Automated Fee Invoicing)
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Assigned players default to UNPAID payment status so tournament fee invoices trigger automatically upon paid league assignment.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-[#0047FF] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {selectedPlayerIdsForAdd.length} Selected
                    </span>
                  </div>

                  {/* Player Search Bar */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search available players..."
                      value={playerSearchQueryForAdd}
                      onChange={(e) => setPlayerSearchQueryForAdd(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 outline-none focus:border-[#0047FF] dark:text-white"
                    />
                  </div>

                  {/* Player List */}
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-slate-900 custom-scrollbar">
                    {sortPlayersByPaymentStatus(
                      availablePlayers,
                      (player: any) => player.paymentStatus,
                      (player: any) => player.fullName || player.name
                    )
                      .filter((p: any) => {
                        const name = p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || "";
                        return name.toLowerCase().includes(playerSearchQueryForAdd.toLowerCase());
                      })
                      .slice(0, 30)
                      .map((player: any) => {
                        const pId = player._id || player.id;
                        const pName = player.fullName || `${player.firstName || ""} ${player.lastName || ""}`.trim() || player.name || "Player";
                        const isSelected = selectedPlayerIdsForAdd.includes(pId);

                        return (
                          <div
                            key={pId}
                            onClick={() => {
                              setSelectedPlayerIdsForAdd((prev) =>
                                prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
                              );
                            }}
                            className={`px-3 py-2 flex items-center justify-between cursor-pointer text-xs transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-950/40 text-[#0047FF]" : "hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="rounded-none text-[#0047FF] cursor-pointer"
                              />
                              <span className="font-semibold">{pName}</span>
                              {player.gender && (
                                <span className="text-[10px] text-gray-400 capitalize">({player.gender})</span>
                              )}
                            </div>
                            {isSelected ? (
                              <select
                                value={selectedPlayerStatusesForAdd[pId] || "UNPAID"}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedPlayerStatusesForAdd((prev) => ({ ...prev, [pId]: e.target.value }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border rounded-none outline-none cursor-pointer ${
                                  (selectedPlayerStatusesForAdd[pId] || "UNPAID") === "PAID"
                                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                    : (selectedPlayerStatusesForAdd[pId] || "UNPAID") === "TRIAL"
                                    ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
                                    : "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                                }`}
                              >
                                <option value="UNPAID">UNPAID</option>
                                <option value="PAID">PAID</option>
                                <option value="TRIAL">TRIAL</option>
                              </select>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-1.5 py-0.5 border border-slate-200 dark:border-slate-700">
                                NOT ASSIGNED
                              </span>
                            )}
                          </div>
                        );
                      })}
                    {availablePlayers.length === 0 && (
                      <div className="py-6 text-center text-xs text-gray-400 italic">No available players found</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button variant="outline" type="button" onClick={() => setAddModalTab("EXISTING")}>Discard</Button>
                <button
                  type="submit"
                  disabled={isSubmittingCreateTeam || addTeamMutation.isPending}
                  className="px-10 h-10 bg-[#0047FF] hover:bg-blue-700 text-white rounded-none text-xs font-bold uppercase tracking-widest disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                >
                  {isSubmittingCreateTeam || addTeamMutation.isPending ? "Saving..." : "Save Team"}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* ================= EDIT TEAM LEAGUE STATS MODAL ================= */}
      <Modal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        className="max-w-[480px] p-6 rounded-xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600">
            <Sliders size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Edit Team League Statistics
            </h3>
            <p className="text-xs text-slate-500">
              {selectedTeamForStats?.teamName || selectedTeamForStats?.name || "Team"}
            </p>
          </div>
        </div>

        <form data-coachmax-form onSubmit={handleStatsSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Played (P)
              </label>
              <input
                type="number"
                min={0}
                value={statsForm.played}
                onChange={(e) => setStatsForm({ ...statsForm, played: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">
                Won (W)
              </label>
              <input
                type="number"
                min={0}
                value={statsForm.won}
                onChange={(e) => setStatsForm({ ...statsForm, won: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">
                Drawn (D)
              </label>
              <input
                type="number"
                min={0}
                value={statsForm.drawn}
                onChange={(e) => setStatsForm({ ...statsForm, drawn: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5">
                Lost (L)
              </label>
              <input
                type="number"
                min={0}
                value={statsForm.lost}
                onChange={(e) => setStatsForm({ ...statsForm, lost: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Goals For (GF)
              </label>
              <input
                type="number"
                min={0}
                value={statsForm.goalsFor}
                onChange={(e) => setStatsForm({ ...statsForm, goalsFor: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Goals Against (GA)
              </label>
              <input
                type="number"
                min={0}
                value={statsForm.goalsAgainst}
                onChange={(e) =>
                  setStatsForm({ ...statsForm, goalsAgainst: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-600 mb-1.5">
                Points (Pts)
              </label>
              <input
                type="number"
                min={0}
                value={statsForm.points}
                onChange={(e) => setStatsForm({ ...statsForm, points: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>
              Goal Difference (+/-): <strong>{statsForm.goalsFor - statsForm.goalsAgainst}</strong>
            </span>
            <span>
              Win Rate:{" "}
              <strong>
                {statsForm.played > 0
                  ? Math.round((statsForm.won / statsForm.played) * 100)
                  : 0}
                %
              </strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsStatsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" size="sm" disabled={updateStatsMutation.isPending}>
              {updateStatsMutation.isPending ? "Saving..." : "Save Statistics"}
            </Button>
          </div>
        </form>
      </Modal>
      {pendingLogoCrop && <ImageCropModal file={pendingLogoCrop} policy="logo" onCancel={() => setPendingLogoCrop(null)} onCrop={handleLogoCrop} />}

      {/* Assign Players Modal */}
      {isAssignPlayersModalOpen && (
        <AssignPlayerToTeamModal
          isOpen={isAssignPlayersModalOpen}
          onClose={() => {
            setIsAssignPlayersModalOpen(false);
            setSelectedTeamForAssign(null);
          }}
          teamId={selectedTeamForAssign}
          leagueId={leagueId}
        />
      )}
    </div>
  );
};
