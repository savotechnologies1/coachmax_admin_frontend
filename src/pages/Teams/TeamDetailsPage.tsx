import DateInput from "../../components/form/DateInput";
import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeamById,
  deleteTeam,
  updateTeam,
  getAllCoaches,
  unassignPlayersFromTeam,
  getTemporaryPlayersForTeam,
  deleteTemporaryPlayerFromTeam
} from "../../api/adminApi";
import { getAllTerms } from "../../api/terms";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import AssignPlayerToTeamModal from "../../components/management/AssignPlayerToTeamModal";
import AddTemporaryPlayersModal from "../../components/management/AddTemporaryPlayersModal";
import EditTemporaryPlayerModal from "../../components/management/EditTemporaryPlayerModal";
import { TeamLeaguesView } from "./components/TeamLeaguesView";
import TeamFullTable from "../../components/teams/TeamFullTable";
import TeamBroadcastButton from "../../components/teams/TeamBroadcastButton";
import {
  Shield,
  User,
  Calendar,
  UserPlus,
  Trash2,
  Edit,
  ArrowLeft,
  Mail,
  Phone,
  AlertCircle,
  Clock,
  MapPin,
  Plus,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { addDateOnlyDays, formatDateTime, todayDateOnly, toDateOnly } from "../../utils/dateTime";

export default function TeamDetailsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAddTempModalOpen, setIsAddTempModalOpen] = useState(false);
  const [editTempPlayer, setEditTempPlayer] = useState<any | null>(null);
  const [tempPlayerToDelete, setTempPlayerToDelete] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<any | null>(null);

  // Edit Team Form state
  const [formData, setFormData] = useState({
    teamName: "",
    coach: "",
    assistantCoach: "",
    ageGroup: "",
    fee: "",
    teamFee: "",
    year: new Date().getFullYear().toString(),
    term: "",
    dayOfWeek: "Monday",
    startTime: "17:00",
    endTime: "18:30",
    venue: "",
    location: "",
    teamType: "INTERNAL",
    captain: "",
    viceCaptain: "",
  });
  const [scheduleMode, setScheduleMode] = useState<"ROUNDS" | "TERM">("ROUNDS");
  const [roundCount, setRoundCount] = useState<number | string>(1);
  const [sessionDates, setSessionDates] = useState<string[]>([
    todayDateOnly(),
  ]);
  const [, setCustomSchedules] = useState<{ dayOfWeek: string; startTime: string; endTime: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleAddSessionDate = () => {
    const lastDate = sessionDates[sessionDates.length - 1];
    let nextDateStr = todayDateOnly();
    if (lastDate) {
      try {
        nextDateStr = addDateOnlyDays(lastDate, 7);
      } catch { }
    }
    const updated = [...sessionDates, nextDateStr];
    setSessionDates(updated);
    setRoundCount(updated.length);
  };

  const handleRemoveSessionDate = (idx: number) => {
    if (sessionDates.length <= 1) {
      setSessionDates([""]);
      setRoundCount(1);
      return;
    }
    const updated = sessionDates.filter((_, i) => i !== idx);
    setSessionDates(updated);
    setRoundCount(updated.length);
  };

  const handleSessionDateChange = (idx: number, val: string) => {
    const updated = [...sessionDates];
    updated[idx] = val;
    setSessionDates(updated);
  };

  const handleRoundCountChange = (val: string | number) => {
    setRoundCount(val);
    const count = Number(val);
    if (!isNaN(count) && count > 0 && count <= 50) {
      if (count > sessionDates.length) {
        const toAdd = count - sessionDates.length;
        const newDates = [...sessionDates];
        for (let i = 0; i < toAdd; i++) {
          try {
            const lastD = newDates[newDates.length - 1] || todayDateOnly();
            newDates.push(addDateOnlyDays(lastD, 7));
          } catch {
            newDates.push("");
          }
        }
        setSessionDates(newDates);
      } else if (count < sessionDates.length) {
        setSessionDates(sessionDates.slice(0, count));
      }
    }
  };

  const getImageUrl = (path: string | undefined | null) => {
    return getMediaUrl(path) || null;
  };

  // Fetch Team Details
  const { data: teamData, isLoading, error } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => getTeamById(teamId!),
    enabled: !!teamId,
  });

  const team = teamData?.team || teamData?.data || teamData || null;

  // Fetch Coaches for edit modal
  const { data: coachesData } = useQuery({
    queryKey: ["coaches"],
    queryFn: () => getAllCoaches(),
    enabled: isEditModalOpen,
  });

  const coaches = Array.isArray(coachesData) ? coachesData : (coachesData?.data || []);

  // Fetch Terms for edit modal
  const { data: termsData } = useQuery({
    queryKey: ["terms", formData.year],
    queryFn: () => getAllTerms(formData.year ? Number(formData.year) : undefined),
    enabled: isEditModalOpen,
  });
  const terms = Array.isArray(termsData) ? termsData : (termsData?.data || termsData?.terms || []);

  // Update Team Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTeam(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(res?.message || "Team updated successfully!");
      setIsEditModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update team"),
  });

  // Delete Team Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(res?.message || "Team archived successfully!");
      navigate("/teams");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to delete team"),
  });

  // Unassign / Remove Players Mutation (POST /api/admin/teams/:teamId/unassign)
  const removePlayersMutation = useMutation({
    mutationFn: async (playerIds: string | string[]) => {
      if (!teamId) return;
      return await unassignPlayersFromTeam(teamId, playerIds);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Player(s) unassigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["availablePlayersForTeam"] });
      queryClient.invalidateQueries({ queryKey: ["availablePlayers"] });
      setPlayerToRemove(null);
      setIsBulkDeleteModalOpen(false);
      setSelectedPlayerIds([]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to unassign player(s)");
    },
  });

  const handleOpenEdit = () => {
    if (!team) return;
    const feeVal = team.fee || team.teamFee || "";
    const yearVal = team.year || team.term?.year || new Date().getFullYear();
    setFormData({
      teamName: team.teamName || "",
      coach: team.coach?._id || team.coach || "",
      assistantCoach: team.assistantCoach?._id || team.assistantCoach || "",
      ageGroup: team.ageGroup || "",
      fee: feeVal,
      teamFee: feeVal,
      year: yearVal ? yearVal.toString() : "",
      term: team.term?._id || team.term || "",
      dayOfWeek: team.dayOfWeek || "Monday",
      startTime: team.startTime || "17:00",
      endTime: team.endTime || "18:30",
      venue: team.venue || "",
      location: team.location || "",
      teamType: team.teamType || (team.isExternal ? "EXTERNAL" : "INTERNAL"),
      captain: team.captain?._id || team.captain || "",
      viceCaptain: team.viceCaptain?._id || team.viceCaptain || "",
    });
    if (Array.isArray(team.schedule) && team.schedule.length > 0) {
      setCustomSchedules(team.schedule);
    } else {
      setCustomSchedules([{ dayOfWeek: "Monday", startTime: "17:00", endTime: "18:30" }]);
    }

    const hasRounds = (team.round !== undefined && team.round !== null) || (Array.isArray(team.sessionDates) && team.sessionDates.length > 0);
    if (hasRounds) {
      setScheduleMode("ROUNDS");
      const formattedDates = (team.sessionDates || []).map((d: string) => {
        try {
          return toDateOnly(d);
        } catch {
          return d;
        }
      });
      const validDates = formattedDates.length > 0 ? formattedDates : [todayDateOnly()];
      setSessionDates(validDates);
      setRoundCount(team.round || validDates.length || 1);
    } else {
      setScheduleMode("TERM");
      setRoundCount(1);
      setSessionDates([todayDateOnly()]);
    }

    setSelectedFile(null);
    setPreviewImage(team.teamLogo ? getImageUrl(team.teamLogo) : (team.logo ? getImageUrl(team.logo) : null));
    setIsEditModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "logo");
      if (validationError) { toast.error(validationError); e.target.value = ""; return; }
      setSelectedFile(normalized);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(normalized);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    const payload = new FormData();
    payload.append("teamName", formData.teamName);
    if (formData.coach) payload.append("coach", formData.coach);
    if (formData.assistantCoach) {
      payload.append("assistantCoach", formData.assistantCoach);
    }
    payload.append("ageGroup", formData.ageGroup);

    const effectiveFee = formData.fee || formData.teamFee;
    if (effectiveFee) {
      payload.append("fee", effectiveFee);
      payload.append("teamFee", effectiveFee);
    }

    if (formData.teamType) {
      payload.append("teamType", formData.teamType);
      payload.append("isExternal", formData.teamType === "EXTERNAL" ? "true" : "false");
    }

    if (formData.year) {
      payload.append("year", formData.year);
    }

    if (formData.term) {
      payload.append("term", formData.term);
    }

    if (scheduleMode === "ROUNDS") {
      const validDates = sessionDates.filter(Boolean);
      const effectiveRound = Number(roundCount) || (validDates.length > 0 ? validDates.length : 1);
      payload.append("round", String(effectiveRound));
      payload.append("date", JSON.stringify(validDates));
      payload.append("sessionDates", JSON.stringify(validDates));
      if (formData.dayOfWeek) payload.append("dayOfWeek", formData.dayOfWeek);
      if (formData.startTime) payload.append("startTime", formData.startTime);
      if (formData.endTime) payload.append("endTime", formData.endTime);
    } else {
      if (formData.dayOfWeek) payload.append("dayOfWeek", formData.dayOfWeek);
      if (formData.startTime) payload.append("startTime", formData.startTime);
      if (formData.endTime) payload.append("endTime", formData.endTime);
    }

    if (formData.venue) payload.append("venue", formData.venue);
    if (formData.location) payload.append("location", formData.location);

    if (formData.captain) {
      payload.append("captain", formData.captain);
    }
    if (formData.viceCaptain) {
      payload.append("viceCaptain", formData.viceCaptain);
    }
    if (selectedFile) {
      payload.append("teamLogo", selectedFile);
    }
    updateMutation.mutate({ id: teamId, data: payload });
  };

  // Delete Temporary Player Mutation
  const deleteTempPlayerMutation = useMutation({
    mutationFn: (tempPlayerId: string) => deleteTemporaryPlayerFromTeam(teamId!, tempPlayerId),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Temporary player deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["temporaryPlayers", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setTempPlayerToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete temporary player");
    },
  });

  const isExternalTeam = team?.teamType === "EXTERNAL" || team?.isExternal === true;

  // Fetch Temporary Players if external team
  const { data: tempPlayersData } = useQuery({
    queryKey: ["temporaryPlayers", teamId],
    queryFn: () => getTemporaryPlayersForTeam(teamId!),
    enabled: !!teamId && isExternalTeam,
  });

  const rawTempArray = Array.isArray(tempPlayersData)
    ? tempPlayersData
    : (tempPlayersData?.data || tempPlayersData?.players || tempPlayersData?.temporaryPlayers || []);

  const players: any[] = isExternalTeam
    ? (rawTempArray.length > 0 ? rawTempArray : (team?.temporaryPlayers || team?.players || []))
    : (team?.players || []);

  const totalGoals = team?.statistics?.goalsFor ?? players.reduce((sum: number, p: any) => sum + (p.statistics?.goals || p.goals || 0), 0);
  const totalAssists = players.reduce((sum: number, p: any) => sum + (p.statistics?.assists || p.assists || 0), 0);
  const totalMatches = team?.statistics?.played ?? players.reduce((sum: number, p: any) => sum + (p.statistics?.appearances || p.appearances || 0), 0);



  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-3 border-[#0047FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Loading Team Profile...
        </p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Team Details" />
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Team Not Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The team you are looking for does not exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/teams")} size="sm">
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  const teamLogoSrc = team.teamLogo ? getImageUrl(team.teamLogo) : (team.logo ? getImageUrl(team.logo) : null);
  const headCoach = typeof team.coach === "object" ? team.coach : null;
  const asstCoach = typeof team.assistantCoach === "object" ? team.assistantCoach : null;

  return (
    <>
      <PageMeta
        title={`CoachMax | ${team.teamName || "Team Details"}`}
        description={`Team management, roster and coaches for ${team.teamName}`}
      />

      <div className="space-y-6">
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teams")}
              className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#0047FF] hover:border-[#0047FF] transition-colors rounded-none shadow-xs cursor-pointer"
              title="Back to Teams"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Link to="/teams" className="hover:text-slate-600 dark:hover:text-slate-200">
                  Teams Management
                </Link>
                <span>/</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">{team.teamName}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {team.teamName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                if (isExternalTeam) {
                  setIsAddTempModalOpen(true);
                } else {
                  setIsAssignModalOpen(true);
                }
              }}
              className="px-4 py-2 text-xs font-bold bg-[#0047FF] hover:bg-blue-700 text-white rounded-none transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isExternalTeam ? "+ Add Temporary Players" : "Assign Players"}</span>
            </button>
            <button
              onClick={handleOpenEdit}
              className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-none shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Team</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 transition-colors rounded-none flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* HERO BANNER CARD */}
        <div className="bg-[#0A1930] text-white p-6 lg:p-8 rounded-none border-l-4 border-[#0047FF] shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-5 pointer-events-none">
            <Shield className="w-80 h-80 text-white" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            {/* Team Crest & Header Details */}
            <div className="lg:col-span-6 flex items-center gap-5">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-none bg-white/10 flex items-center justify-center text-white overflow-hidden shrink-0 border-2 border-white/20 shadow-md">
                {teamLogoSrc ? (
                  <img
                    src={teamLogoSrc}
                    alt={team.teamName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "";
                    }}
                  />
                ) : (
                  <Shield className="w-12 h-12 text-[#0047FF]" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl lg:text-2xl font-black text-white leading-tight tracking-tight">
                    {team.teamName}
                  </h2>
                  {(() => {
                    const isExt = team.teamType === "EXTERNAL" || team.isExternal === true;
                    return (
                      <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${isExt ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                        }`}>
                        {isExt ? "External Team" : "Our Team"}
                      </span>
                    );
                  })()}
                  {team.ageGroup && (
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-[#0047FF] text-white tracking-wider">
                      {team.ageGroup}
                    </span>
                  )}
                  {(team.fee || team.teamFee) && (
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-emerald-600 text-white tracking-wider">
                      Fee: ${team.fee || team.teamFee}
                    </span>
                  )}
                  {team.term && (
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-purple-600 text-white tracking-wider">
                      Term: {typeof team.term === 'object' ? (team.term.name || team.term.termName) : "Assigned"}
                    </span>
                  )}
                  {team.round ? (
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-blue-500 text-white tracking-wider">
                      Round {team.round}
                    </span>
                  ) : null}
                  {team.sessionDates?.length > 0 ? (
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-indigo-600 text-white tracking-wider">
                      {team.sessionDates.length} {team.sessionDates.length === 1 ? "Session" : "Sessions"}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-4 flex-wrap text-xs text-gray-300 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Created{" "}
                      {formatDateTime(team.createdAt)}
                    </span>
                  </span>

                  {(team.venue || team.location) && (
                    <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{[team.venue, team.location].filter(Boolean).join(" • ")}</span>
                    </span>
                  )}

                  {(team.teamFee || team.fee) && (
                    <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <span>Fee: ${team.teamFee || team.fee}</span>
                    </span>
                  )}

                  {team.sessionDates?.length > 0 ? (
                    <span className="flex items-center gap-1.5 text-blue-300 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {team.round ? `Round ${team.round} • ` : ""}{team.sessionDates.length} {team.sessionDates.length === 1 ? "Session" : "Sessions"}
                        {team.startTime ? ` (${team.startTime}-${team.endTime || ""})` : ""}
                      </span>
                    </span>
                  ) : (team.dayOfWeek || team.startTime) ? (
                    <span className="flex items-center gap-1.5 text-blue-300 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {[team.dayOfWeek, team.startTime && team.endTime ? `${team.startTime}-${team.endTime}` : team.startTime].filter(Boolean).join(" • ")}
                      </span>
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 border border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Squad
                  </span>
                  <span className="text-xs font-semibold text-gray-300">
                    ID: <code className="text-gray-400 text-[11px]">{team._id.substring(0, 10)}...</code>
                  </span>
                </div>
              </div>
            </div>

            {/* Squad Stats Counters */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-none backdrop-blur-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Players
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {players.length}
                </span>
                <span className="text-[10px] text-gray-400">Total Enrolled</span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-none backdrop-blur-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Goals
                </span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {totalGoals}
                </span>
                <span className="text-[10px] text-gray-400">Team Scored</span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-none backdrop-blur-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Assists
                </span>
                <span className="text-2xl font-black text-blue-400 mt-1 block">
                  {totalAssists}
                </span>
                <span className="text-[10px] text-gray-400">Team Assists</span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-none backdrop-blur-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Matches
                </span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">
                  {totalMatches}
                </span>
                <span className="text-[10px] text-gray-400">Appearances</span>
              </div>
            </div>
          </div>
        </div>

        {/* COACHING STAFF CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Head Coach Card */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {headCoach?.profileImage ? (
                <img
                  src={getMediaUrl(headCoach.profileImage, getMediaFallback(headCoach.name || headCoach.fullName || "Coach"))}
                  alt={headCoach.name}
                  className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-slate-200 dark:border-slate-700"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getMediaFallback(headCoach.name || headCoach.fullName || "Coach");
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#0A1930] text-white flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-[#0047FF]" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#0047FF] uppercase tracking-wider block">
                  Head Coach
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {(headCoach?.name || headCoach?.fullName || team.coach || "Unassigned").trim()}
                </h4>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {headCoach?.email && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      {headCoach.email}
                    </span>
                  )}
                  {(headCoach?.mobile || headCoach?.phone) && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      {headCoach.mobile || headCoach.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-blue-50 text-[#0047FF] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shrink-0">
              Lead Coach
            </span>
          </div>

          {/* Assistant Coach Card */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {asstCoach?.profileImage ? (
                <img
                  src={getMediaUrl(asstCoach.profileImage, getMediaFallback(asstCoach.name || asstCoach.fullName || "Assistant"))}
                  alt={asstCoach.name}
                  className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-slate-200 dark:border-slate-700"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getMediaFallback(asstCoach.name || asstCoach.fullName || "Assistant");
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Assistant Coach
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {(asstCoach?.name || asstCoach?.fullName || "None Assigned").trim()}
                </h4>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {asstCoach?.email ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      {asstCoach.email}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No email assigned</span>
                  )}
                  {(asstCoach?.mobile || asstCoach?.phone) && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      {asstCoach.mobile || asstCoach.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
              Assistant
            </span>
          </div>
        </div>

        {/* TEAM ATTENDANCE MATRIX & FULL TABLE */}
        <div className="mb-3 flex justify-end">
          <TeamBroadcastButton teamId={teamId!} teamName={team.teamName} />
        </div>
        <TeamFullTable teamId={teamId!} teamName={team.teamName} />

        {/* TEAM ASSIGNED LEAGUES VIEW */}
        <TeamLeaguesView leagues={team.leagues} />
      </div>

      {/* ASSIGN PLAYERS MODAL */}
      <AssignPlayerToTeamModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        teamId={teamId || null}
      />

      {/* EDIT TEAM MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-[920px] max-h-[90vh] overflow-y-auto p-6 lg:p-8 rounded-none shadow-2xl"
        noBackgroundBlur={true}
      >
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-brand-50 dark:bg-brand-500/10 rounded-none text-[#0047FF]">
            <Shield size={22} />
          </div>
          <div>
            <h4 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Edit Team Profile
            </h4>
            <p className="text-xs text-slate-500 font-medium">Update team credentials, academic term, schedule, and venue details.</p>
          </div>
        </div>

        <form onSubmit={handleSaveEdit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Team Name *</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all dark:text-white"
                    placeholder="Under 16 Tigers"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Team Category *</label>
                  <select
                    value={formData.teamType}
                    onChange={(e) => setFormData({ ...formData, teamType: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all appearance-none cursor-pointer dark:text-white"
                    required
                  >
                    <option value="INTERNAL">Our Team (Academy)</option>
                    <option value="EXTERNAL">External Team (Opponent)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Age Group *</label>
                  <input
                    type="text"
                    list="age-group-options"
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all dark:text-white"
                    placeholder="e.g. U16"
                    required
                  />
                  <datalist id="age-group-options">
                    {Array.from({ length: 29 }, (_, i) => i + 2).map((num) => (
                      <option key={num} value={`U${num}`} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Team Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value, teamFee: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all dark:text-white"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value, term: "" })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all appearance-none cursor-pointer dark:text-white"
                  >
                    <option value="">All Years</option>
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Academic Term</label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all appearance-none cursor-pointer dark:text-white"
                  >
                    <option value="">Select Academic Term</option>
                    {terms.map((t: any) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.name || t.termName || t.title || "Term"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coaches & Leadership */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Assigned Head Coach *</label>
                  <select
                    value={formData.coach}
                    onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all appearance-none cursor-pointer dark:text-white"
                  >
                    <option value="">Select Head Coach</option>
                    {coaches.map((c: any) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Assistant Coach</label>
                  <select
                    value={formData.assistantCoach}
                    onChange={(e) => setFormData({ ...formData, assistantCoach: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all appearance-none cursor-pointer dark:text-white"
                  >
                    <option value="">Select Assistant Coach</option>
                    {coaches.map((c: any) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {players.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Team Captain</label>
                    <select
                      value={formData.captain}
                      onChange={(e) => setFormData({ ...formData, captain: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all appearance-none cursor-pointer dark:text-white"
                    >
                      <option value="">-- None --</option>
                      {players.map((p: any) => {
                        const pName = p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || p.email;
                        return (
                          <option key={p._id || p} value={p._id || p}>
                            {pName} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Vice Captain</label>
                    <select
                      value={formData.viceCaptain}
                      onChange={(e) => setFormData({ ...formData, viceCaptain: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all appearance-none cursor-pointer dark:text-white"
                    >
                      <option value="">-- None --</option>
                      {players.map((p: any) => {
                        const pName = p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || p.email;
                        return (
                          <option key={p._id || p} value={p._id || p}>
                            {pName} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Logo Upload Panel */}
            <div className="md:col-span-4 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/50 p-6 border border-gray-200 dark:border-gray-700">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4 text-center">Team Logo</label>
              <div
                onClick={() => {
                  const input = document.getElementById("team-details-logo-input");
                  if (input) input.click();
                }}
                className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center bg-white dark:bg-slate-900 cursor-pointer overflow-hidden hover:border-[#0047FF] transition-colors group relative shadow-xs"
              >
                {previewImage ? (
                  <>
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit className="text-white w-7 h-7" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-gray-400 group-hover:text-[#0047FF] transition-colors">
                    <Shield className="w-8 h-8 mb-2 text-[#0047FF]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Logo</span>
                  </div>
                )}
              </div>
              <input
                id="team-details-logo-input"
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFileChange}
              />
              <span className="text-[10px] text-gray-400 mt-3 text-center">JPEG, PNG, WebP, HEIC/HEIF · max 2MB</span>
            </div>
          </div>

          {/* Schedule & Location Section */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock size={15} className="text-[#0047FF]" />
                {formData.teamType === "EXTERNAL" ? "Venue & Location Details" : "Session Schedule & Round Configuration"}
              </h5>
              {formData.teamType !== "EXTERNAL" && (
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-none border border-gray-200 dark:border-gray-700 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("ROUNDS")}
                    className={`px-3 py-1 transition-all ${scheduleMode === "ROUNDS"
                        ? "bg-[#0047FF] text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                      }`}
                  >
                    By Round & Dates (Dynamic)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("TERM")}
                    className={`px-3 py-1 transition-all ${scheduleMode === "TERM"
                        ? "bg-[#0047FF] text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                      }`}
                  >
                    Term Schedule (Recurring)
                  </button>
                </div>
              )}
            </div>

            {formData.teamType !== "EXTERNAL" && scheduleMode === "ROUNDS" && (
              <div className="bg-blue-50/40 dark:bg-slate-800/60 p-4 border border-blue-100 dark:border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100/80 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Calendar size={14} className="text-[#0047FF]" />
                      Configured Rounds & Session Dates
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Backend generates exactly these session dates for attendance tracking and player statistics.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      Rounds:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={roundCount}
                      onChange={(e) => handleRoundCountChange(e.target.value)}
                      className="w-16 rounded-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-bold text-center dark:text-white focus:border-[#0047FF] outline-none"
                    />
                  </div>
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-bold text-slate-400">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleRoundCountChange(1)}
                    className={`px-2.5 py-1 text-[11px] font-bold border transition-colors ${Number(roundCount) === 1
                        ? "bg-[#0047FF] text-white border-[#0047FF]"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                      }`}
                  >
                    Single Round (1 Date)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoundCountChange(3)}
                    className={`px-2.5 py-1 text-[11px] font-bold border transition-colors ${Number(roundCount) === 3
                        ? "bg-[#0047FF] text-white border-[#0047FF]"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                      }`}
                  >
                    3 Rounds (3 Dates)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoundCountChange(5)}
                    className={`px-2.5 py-1 text-[11px] font-bold border transition-colors ${Number(roundCount) === 5
                        ? "bg-[#0047FF] text-white border-[#0047FF]"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                      }`}
                  >
                    5 Rounds (5 Dates)
                  </button>
                </div>

                {/* Dynamic Date Inputs for each Round */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {sessionDates.map((dateVal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-1.5 min-w-[90px]">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0047FF] dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Round {idx + 1}
                        </span>
                      </div>

                      <div className="relative flex-1 flex items-center">
                        <DateInput
                          id={`team-details-round-date-${idx}`}
                          type="date"
                          value={dateVal}
                          onChange={(e) => handleSessionDateChange(idx, e.target.value)}
                          onClick={(e) => {
                            try {
                              if (typeof (e.currentTarget as any).showPicker === 'function') {
                                (e.currentTarget as any).showPicker();
                              }
                            } catch { }
                          }}
                          className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 pl-3 pr-10 py-1.5 text-xs font-bold dark:text-white focus:bg-white focus:border-[#0047FF] outline-none cursor-pointer"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(`team-details-round-date-${idx}`) as HTMLInputElement;
                            if (el) {
                              try {
                                if (typeof el.showPicker === 'function') {
                                  el.showPicker();
                                } else {
                                  el.focus();
                                }
                              } catch {
                                el.focus();
                              }
                            }
                          }}
                          className="absolute right-2 text-slate-400 hover:text-[#0047FF] transition-colors p-1"
                          title="Choose Date"
                        >
                          <Calendar size={15} />
                        </button>
                      </div>

                      {sessionDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSessionDate(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove date"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={handleAddSessionDate}
                    className="text-xs font-bold text-[#0047FF] hover:underline flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Another Session Date
                  </button>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Total: {sessionDates.filter(Boolean).length} Session {sessionDates.filter(Boolean).length === 1 ? "Date" : "Dates"}
                  </span>
                </div>

                {/* Time slots for the sessions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-100/80 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      Session Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      Session End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.teamType !== "EXTERNAL" && scheduleMode === "TERM" && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 px-3 py-2 flex items-start gap-2.5">
                  <div className="p-1 bg-[#0047FF]/10 text-[#0047FF] dark:text-blue-400 shrink-0">
                    <Info size={14} />
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider mr-1.5 text-[10px]">Term Schedule:</span>
                    Select the weekly recurring training day and session times for the active term.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-800/40 p-4 border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Day of Week</label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold outline-none dark:text-white"
                    >
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Venue & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Venue</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all dark:text-white"
                  placeholder="Main Ground"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold focus:bg-white focus:border-[#0047FF] outline-none transition-all dark:text-white"
                  placeholder="Bhopal Sports Complex"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE TEAM MODAL */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (teamId) deleteMutation.mutate(teamId);
        }}
        title="Archive Team"
        message={`Archive this team? Historical matches, attendance and payments will remain available.`}
      />

      {/* CONFIRM REMOVE SINGLE PLAYER MODAL */}
      <ConfirmDeleteModal
        isOpen={!!playerToRemove}
        onClose={() => setPlayerToRemove(null)}
        onConfirm={() => {
          if (playerToRemove) removePlayersMutation.mutate([playerToRemove._id]);
        }}
        title="Unassign Player from Team"
        message={`Are you sure you want to unassign ${playerToRemove?.fullName || playerToRemove?.name || "this player"
          } from ${team.teamName}?`}
      />

      {/* CONFIRM REMOVE MULTIPLE / BULK PLAYERS MODAL */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={() => {
          if (selectedPlayerIds.length > 0) {
            removePlayersMutation.mutate(selectedPlayerIds);
          }
        }}
        title="Unassign Selected Players"
        message={`Are you sure you want to unassign ${selectedPlayerIds.length} selected player(s) from ${team.teamName}?`}
      />

      {/* ADD TEMPORARY AWAY PLAYERS MODAL (EXTERNAL TEAM) */}
      {teamId && (
        <AddTemporaryPlayersModal
          isOpen={isAddTempModalOpen}
          onClose={() => setIsAddTempModalOpen(false)}
          teamId={teamId}
          teamName={team.teamName}
        />
      )}

      {/* EDIT TEMPORARY AWAY PLAYER MODAL (EXTERNAL TEAM) */}
      {teamId && (
        <EditTemporaryPlayerModal
          isOpen={!!editTempPlayer}
          onClose={() => setEditTempPlayer(null)}
          teamId={teamId}
          player={editTempPlayer}
        />
      )}

      {/* CONFIRM DELETE TEMPORARY PLAYER MODAL */}
      <ConfirmDeleteModal
        isOpen={!!tempPlayerToDelete}
        onClose={() => setTempPlayerToDelete(null)}
        onConfirm={() => {
          const id = tempPlayerToDelete?._id || tempPlayerToDelete?.id;
          if (id) deleteTempPlayerMutation.mutate(id);
        }}
        loading={deleteTempPlayerMutation.isPending}
        title="Delete Temporary Player"
        message={`Are you sure you want to permanently delete ${tempPlayerToDelete?.name || tempPlayerToDelete?.fullName || "this temporary player"
          } from ${team.teamName}?`}
      />
    </>
  );
}
