import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { getAllTeams, createTeam, updateTeam, deleteTeam, getAllCoaches, getAvailablePlayers } from "../../api/adminApi";
import { getAllTerms } from "../../api/terms";
import { useTerms } from "../../hooks/useTerms";
import { findCurrentTerm } from "../../hooks/useCurrentTerm";
import { toast } from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import { getMediaUrl } from "../../utils/media";
import { User, Shield, Image as ImageIcon, Search } from "lucide-react";
import FormHeader from "../form/FormHeader";
import FormActions from "../form/FormActions";
import ImageCropModal from "../common/ImageCropModal";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import AssignPlayerToTeamModal from "./AssignPlayerToTeamModal";
import AddTemporaryPlayersModal from "./AddTemporaryPlayersModal";
import TeamBroadcastButton from "../teams/TeamBroadcastButton";
import Pagination from "../common/Pagination";
import { todayDateOnly, toDateOnly } from "../../utils/dateTime";
import { z } from "zod";
import { requiredText, validateWithSchema } from "../../utils/formValidation";

const teamFormSchema = z.object({
  teamName: requiredText("Team name"),
  teamType: requiredText("Team category"),
  ageGroup: requiredText("Age group"),
  term: requiredText("Academic term"),
  coach: requiredText("Head coach"),
});

const TeamManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [assignTeamId, setAssignTeamId] = useState<string | null>(null);
  const [tempPlayersTeam, setTempPlayersTeam] = useState<{ id: string; name: string } | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [selectedFilterYear, setSelectedFilterYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedFilterTerm, setSelectedFilterTerm] = useState<string>("");

  const { terms: filterTerms } = useTerms({ year: selectedFilterYear, isEvent: "all" });

  useEffect(() => {
    if (filterTerms && filterTerms.length > 0) {
      const active = findCurrentTerm(filterTerms) || filterTerms[0];
      const termIdToSet = active._id || active.id;
      if (!selectedFilterTerm || !filterTerms.some((t: any) => (t._id || t.id) === selectedFilterTerm)) {
        setSelectedFilterTerm(termIdToSet);
      }
    }
  }, [filterTerms]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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
  const [cropLogoFile, setCropLogoFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedPlayerIdsForAdd, setSelectedPlayerIdsForAdd] = useState<string[]>([]);
  const [selectedPlayerStatusesForAdd, setSelectedPlayerStatusesForAdd] = useState<Record<string, string>>({});
  const [playerSearchQueryForAdd, setPlayerSearchQueryForAdd] = useState("");

  const clearValidationError = (field: string, isValid: boolean) => {
    if (!isValid) return;
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  // Query available players for initial team creation
  const { data: availablePlayersRes } = useQuery({
    queryKey: ["availablePlayersForTeamModal"],
    queryFn: () => getAvailablePlayers(),
    enabled: isModalOpen && !isEditing,
  });
  const availablePlayers: any[] = Array.isArray(availablePlayersRes)
    ? availablePlayersRes
    : availablePlayersRes?.data || [];

  // Unused handlers removed for TS6133

  const getImageUrl = (path: string | undefined | null) => {
    return getMediaUrl(path) || null;
  };

  const getDataArray = (res: any) => {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  };

  const { data: teamsData, isLoading: loading } = useQuery({
    queryKey: ["teams", selectedFilterTerm, page, limit, searchQuery],
    queryFn: () => getAllTeams(selectedFilterTerm, { page, limit, search: searchQuery }),
    enabled: !!selectedFilterTerm,
  });
  const teams = getDataArray(teamsData);
  const totalPages = teamsData?.pagination?.totalPages || 1;
  const totalTeams = teamsData?.pagination?.total ?? 0;
  useEffect(() => setPage(1), [selectedFilterTerm, searchQuery, limit]);
  useEffect(() => { if (page > totalPages) setPage(Math.max(1, totalPages)); }, [page, totalPages]);

  const { data: coachesData } = useQuery({
    queryKey: ["coaches"],
    queryFn: () => getAllCoaches(),
  });
  const coaches = getDataArray(coachesData);

  const { data: termsData } = useQuery({
    queryKey: ["terms", formData.year],
    queryFn: () => getAllTerms(formData.year ? Number(formData.year) : undefined),
  });
  const terms = Array.isArray(termsData) ? termsData : (termsData?.data || termsData?.terms || []);

  const createMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: (res: any) => {
      ["teams", "team", "league", "leagueTeams", "leagueMatches", "leagueLadder"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(res?.message || "Team created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to create team"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTeam(id, data),
    onSuccess: (res: any) => {
      ["teams", "team", "league", "leagueTeams", "leagueMatches", "leagueLadder"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(res?.message || "Team updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to update team"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: (res: any) => {
      ["teams", "team", "league", "leagueTeams", "leagueMatches", "leagueLadder"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(res?.message || "Team archived successfully!");
      setDeleteModalId(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to delete team"),
  });

  const handleOpenAdd = () => {
    setValidationErrors({});
    setFormData({
      teamName: "",
      coach: "",
      assistantCoach: "",
      ageGroup: "",
      fee: "",
      teamFee: "",
      year: selectedFilterYear,
      term: selectedFilterTerm,
      dayOfWeek: "Monday",
      startTime: "17:00",
      endTime: "18:30",
      venue: "",
      location: "",
      teamType: "INTERNAL",
      captain: "",
      viceCaptain: "",
    });
    setCustomSchedules([{ dayOfWeek: "Monday", startTime: "17:00", endTime: "18:30" }]);
    setScheduleMode("ROUNDS");
    setRoundCount(1);
    setSessionDates([todayDateOnly()]);
    setSelectedPlayerIdsForAdd([]);
    setSelectedPlayerStatusesForAdd({});
    setPlayerSearchQueryForAdd("");
    setSelectedFile(null);
    setPreviewImage(null);
    setIsEditing(false);
    setSelectedTeamId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: any) => {
    setValidationErrors({});
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
    setSelectedPlayerIdsForAdd([]);
    setSelectedPlayerStatusesForAdd({});
    setPlayerSearchQueryForAdd("");
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
    setIsEditing(true);
    setSelectedTeamId(team._id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModalId(id);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "logo");
      if (validationError) { toast.error(validationError); e.target.value = ""; return; }
      setCropLogoFile(normalized);
      e.target.value = "";
    }
  };

  const handleLogoCrop = (cropped: File) => {
    setSelectedFile(cropped);
    setPreviewImage(URL.createObjectURL(cropped));
    setCropLogoFile(null);
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateWithSchema(teamFormSchema, formData);
    const errors: Record<string, string> = { ...result.errors };
    if (scheduleMode === "ROUNDS") {
      const validDates = sessionDates.filter(Boolean);
      const rounds = Number(roundCount);
      if (!Number.isInteger(rounds) || rounds < 1) errors.roundCount = "Round count must be a whole number of at least 1.";
      if (validDates.length === 0) errors.sessionDates = "Add at least one session date.";
      else if (Number.isInteger(rounds) && rounds > 0 && validDates.length !== rounds) {
        errors.sessionDates = `Add one session date for each round (${validDates.length} of ${rounds} selected).`;
      }
    }
    setValidationErrors(errors);
    if (Object.keys(errors).length) {
      const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }

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
    const selectedTermYear = terms.find((item: any) => String(item._id || item.id) === String(formData.term))?.year;
    const effectiveYear = formData.year || (selectedTermYear ? String(selectedTermYear) : "");
    if (effectiveYear) payload.append("year", effectiveYear);
    if (formData.term) {
      payload.append("term", formData.term);
    }

    // Schedule: no scheduleType sent as per integration guide
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

    // Initial players assignment on team creation: default to UNPAID for automated tournament fee invoicing
    if (!isEditing && selectedPlayerIdsForAdd.length > 0) {
      const playersPayload = selectedPlayerIdsForAdd.map((playerId) => ({
        player: playerId,
        paymentStatus: selectedPlayerStatusesForAdd[playerId] || "UNPAID",
      }));
      payload.append("players", JSON.stringify(playersPayload));
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

    if (isEditing && selectedTeamId) {
      updateMutation.mutate({ id: selectedTeamId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getCoachName = (coachId: string | any) => {
    if (!coachId) return "Unassigned";
    if (typeof coachId === 'object') return coachId.fullName || coachId.name || "Unassigned";
    const coach = coaches.find((c: any) => c._id === coachId);
    return coach ? (coach.fullName || coach.name) : "Unassigned";
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 min-h-11 w-full rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-0 text-sm outline-none focus:border-brand-500 dark:text-white transition-colors shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year Filter Dropdown */}
          <select
            value={selectedFilterYear}
            onChange={(e) => {
              setSelectedFilterYear(e.target.value);
              setSelectedFilterTerm("");
            }}
            className="h-11 min-h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-0 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-none focus:outline-none focus:border-[#0047FF] shadow-xs cursor-pointer"
          >
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Term Filter Dropdown */}
          <select
            value={selectedFilterTerm}
            onChange={(e) => setSelectedFilterTerm(e.target.value)}
            className="h-11 min-h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-0 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-none focus:outline-none focus:border-[#0047FF] shadow-xs cursor-pointer max-w-[240px]"
          >
            {filterTerms.map((t: any) => (
              <option key={t._id || t.id} value={t._id || t.id}>
                {t.name || t.termName || t.title || "Term"} {t.year ? `(${t.year})` : ""}
              </option>
            ))}
          </select>

          <Button onClick={handleOpenAdd} size="sm" className="!h-11 !min-h-11 !py-0 text-xs font-bold uppercase tracking-wider">Add Team</Button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-visible">
        <div className="overflow-visible no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[200px]">Team Detail</th>
                <th className="py-3 px-4 min-w-[140px]">Year / Term</th>
                <th className="py-3 px-4 min-w-[110px]">Type</th>
                <th className="py-3 px-4 min-w-[150px]">Coach</th>
                <th className="py-3 px-4 min-w-[100px]">Age Group</th>
                <th className="py-3 px-4 min-w-[90px]">Fee</th>
                <th className="py-3 px-4 min-w-[80px] text-center">Players</th>
                <th className="py-3 px-4 w-[50px] text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent shadow-sm"></div>
                    <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Teams...</span>
                  </div>
                </td></tr>
              ) : teams.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-20 text-gray-500 font-medium italic">No teams found.</td></tr>
              ) : (
                teams.map((team: any) => (
                  <tr
                    key={team._id}
                    onClick={() => navigate(`/teams/${team._id}`)}
                    className="border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all cursor-pointer group"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-none bg-brand-50 overflow-hidden flex items-center justify-center text-brand-600 border border-brand-100 shadow-sm shrink-0">
                          {team.teamLogo ? (
                            <img src={getImageUrl(team.teamLogo) as string} alt={team.teamName} className="w-full h-full object-cover" />
                          ) : team.logo ? (
                            <img src={getImageUrl(team.logo) as string} alt={team.teamName} className="w-full h-full object-cover" />
                          ) : (
                            <Shield size={18} />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight group-hover:text-[#0047FF] transition-colors flex items-center gap-1.5">
                            {team.teamName}
                          </span>
                          {team.round ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-[#0047FF] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                                Round {team.round}
                              </span>
                              {team.sessionDates?.length > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {team.sessionDates.length} {team.sessionDates.length === 1 ? "session" : "sessions"}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{team.year || team.term?.year || "Year not set"}</span>
                        <span className="text-slate-500 dark:text-slate-400">{team.term?.name || team.termName || "Term not set"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {(() => {
                        const isExt = team.teamType === "EXTERNAL" || team.isExternal === true;
                        return (
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-none border uppercase tracking-wider ${isExt
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
                            : "bg-blue-50 text-[#0047FF] border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60"
                            }`}>
                            {isExt ? "External Team" : "Our Team"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 font-bold tracking-tight">
                          <User size={12} className="text-gray-400 mt-0.5 shrink-0" />
                          <div className="flex flex-col">
                            <span>{getCoachName(team.coach)}</span>
                            {team.coach?.email && <span className="text-[10px] text-gray-500 font-normal">{team.coach.email}</span>}
                          </div>
                        </div>
                        {team.assistantCoach && (
                          <div className="flex items-start gap-2 text-[10px] text-slate-500 font-semibold tracking-tight mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <User size={10} className="text-gray-300 mt-0.5 shrink-0" />
                            <div className="flex flex-col">
                              <span>Asst: {getCoachName(team.assistantCoach)}</span>
                              {team.assistantCoach?.email && <span className="font-normal">{team.assistantCoach.email}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-none border border-slate-200 dark:border-slate-700">
                        {team.ageGroup || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {(team.teamFee || team.fee) ? `$${team.teamFee || team.fee}` : "N/A"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/teams/${team._id}`);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#0047FF] dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 text-xs font-bold rounded-none border border-blue-200 transition-colors shadow-xs"
                        title="Click to view team details"
                      >
                        {team.players?.length || 0} Players
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-none shadow-sm hover:shadow transition-colors"
                        title="More Options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === team._id ? null : team._id);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {openDropdownId === team._id && (
                        <div className="absolute right-8 top-10 w-40 bg-white dark:bg-slate-800 rounded-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-[#0047FF] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teams/${team._id}`);
                              setOpenDropdownId(null);
                            }}
                          >
                            <span>Team Details</span>
                            <span>→</span>
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(team);
                              setOpenDropdownId(null);
                            }}
                          >
                            Edit Team
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(null);
                              if (team.teamType === "EXTERNAL" || team.isExternal === true) {
                                setTempPlayersTeam({ id: team._id, name: team.teamName });
                              } else {
                                setAssignTeamId(team._id);
                              }
                            }}
                          >
                            {(team.teamType === "EXTERNAL" || team.isExternal === true) ? "+ Temp Players" : "Assign Players"}
                          </button>
                          <div className="border-t border-slate-100 px-2 py-1.5 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                            <TeamBroadcastButton teamId={team._id} teamName={team.teamName} className="w-full justify-center" />
                          </div>
                          <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(team._id);
                              setOpenDropdownId(null);
                            }}
                          >
                            Archive Team
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalTeams}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
        limitOptions={[10, 20, 50, 100]}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-[920px] max-h-[90vh] overflow-y-auto p-6 lg:p-8 rounded-xl shadow-2xl" noBackgroundBlur={true}>
        <FormHeader
          icon={Shield}
          title={isEditing ? "Modify Team Profile" : "Create New Team Profile"}
          description="Configure team details, coaches, schedule, and venue information."
          className="mb-6 -mx-6 -mt-6 rounded-t-lg border-b border-[#082269] lg:-mx-8 lg:-mt-8"
        />
        <form data-coachmax-form noValidate onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="team-name" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Team Name *</label>
                  <input
                    id="team-name"
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, teamName: value }); clearValidationError("teamName", Boolean(value.trim())); }}
                    className={`w-full rounded-none border ${validationErrors.teamName ? "border-error-500 focus:border-error-500" : "border-gray-200 dark:border-gray-700"} bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white`}
                    placeholder="Under 16 Tigers"
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.teamName)}
                    aria-describedby={validationErrors.teamName ? "team-name-error" : undefined}
                  />
                  {validationErrors.teamName && <p id="team-name-error" className="mt-1 text-xs text-error-600" role="alert">{validationErrors.teamName}</p>}
                </div>
                <div>
                  <label htmlFor="team-type" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Team Category *</label>
                  <select
                    id="team-type"
                    value={formData.teamType}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, teamType: value }); clearValidationError("teamType", Boolean(value)); }}
                    className={`w-full rounded-none border ${validationErrors.teamType ? "border-error-500 focus:border-error-500" : "border-gray-200 dark:border-gray-700"} bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white`}
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.teamType)}
                    aria-describedby={validationErrors.teamType ? "team-type-error" : undefined}
                  >
                    <option value="INTERNAL">Our Team (Academy)</option>
                    <option value="EXTERNAL">External Team (Opponent)</option>
                  </select>
                  {validationErrors.teamType && <p id="team-type-error" className="mt-1 text-xs text-error-600" role="alert">{validationErrors.teamType}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="team-age-group" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Age Group *</label>
                  <input
                    id="team-age-group"
                    type="text"
                    list="age-group-options"
                    value={formData.ageGroup}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, ageGroup: value }); clearValidationError("ageGroup", Boolean(value.trim())); }}
                    className={`w-full rounded-none border ${validationErrors.ageGroup ? "border-error-500 focus:border-error-500" : "border-gray-200 dark:border-gray-700"} bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white`}
                    placeholder="e.g. U16"
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.ageGroup)}
                    aria-describedby={validationErrors.ageGroup ? "team-age-group-error" : undefined}
                  />
                  {validationErrors.ageGroup && <p id="team-age-group-error" className="mt-1 text-xs text-error-600" role="alert">{validationErrors.ageGroup}</p>}
                  <datalist id="age-group-options">
                    {Array.from({ length: 29 }, (_, i) => i + 2).map((num) => (
                      <option key={num} value={`U${num}`} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="team-year" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Year</label>
                  <select
                    id="team-year"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value, term: "" })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
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
                  <label htmlFor="team-term" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Academic Term *</label>
                  <select
                    id="team-term"
                    value={formData.term}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, term: value }); clearValidationError("term", Boolean(value)); }}
                    className={`w-full rounded-none border ${validationErrors.term ? "border-error-500 focus:border-error-500" : "border-gray-200 dark:border-gray-700"} bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white`}
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.term)}
                    aria-describedby={validationErrors.term ? "team-term-error" : undefined}
                  >
                    <option value="">Select Academic Term</option>
                    {terms.map((t: any) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.name || t.termName || t.title || "Term"}{t.year ? ` (${t.year})` : ""}
                      </option>
                    ))}
                  </select>
                  {validationErrors.term && <p id="team-term-error" className="mt-1 text-xs text-error-600" role="alert">{validationErrors.term}</p>}
                </div>
              </div>

              {/* Coaches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="team-coach" className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Assigned Head Coach *</label>
                  <select
                    id="team-coach"
                    value={formData.coach}
                    onChange={(e) => { const value = e.target.value; setFormData({ ...formData, coach: value }); clearValidationError("coach", Boolean(value)); }}
                    className={`w-full rounded-none border ${validationErrors.coach ? "border-error-500 focus:border-error-500" : "border-gray-200 dark:border-gray-700"} bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white`}
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.coach)}
                    aria-describedby={validationErrors.coach ? "team-coach-error" : undefined}
                  >
                    <option value="">Select Head Coach</option>
                    {coaches.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.fullName || c.name}</option>
                    ))}
                  </select>
                  {validationErrors.coach && <p id="team-coach-error" className="mt-1 text-xs text-error-600" role="alert">{validationErrors.coach}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Assistant Coach</label>
                  <select
                    value={formData.assistantCoach}
                    onChange={(e) => setFormData({ ...formData, assistantCoach: e.target.value })}
                    className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
                  >
                    <option value="">Select Assistant Coach</option>
                    {coaches.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.fullName || c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isEditing && selectedTeamId && (() => {
                const currentEditingTeam = teams.find((t: any) => t._id === selectedTeamId);
                const teamPlayers = currentEditingTeam?.players || [];
                if (teamPlayers.length === 0) return null;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Team Captain</label>
                      <select
                        value={formData.captain}
                        onChange={(e) => setFormData({ ...formData, captain: e.target.value })}
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
                      >
                        <option value="">-- None --</option>
                        {teamPlayers.map((p: any) => {
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
                        className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
                      >
                        <option value="">-- None --</option>
                        {teamPlayers.map((p: any) => {
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
                );
              })()}
            </div>

            {/* Logo Upload Panel */}
            <div className="md:col-span-4 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/50 p-6 border border-gray-200 dark:border-gray-700">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4 text-center">Team Logo</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={previewImage ? "Replace team logo" : "Upload team logo"}
                className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center bg-white dark:bg-slate-900 cursor-pointer overflow-hidden hover:border-[#0047FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 transition-colors group relative shadow-xs"
              >
                {previewImage ? (
                  <>
                    <img src={previewImage} alt="Team logo preview" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex items-center justify-center text-xs font-semibold text-white">Replace logo</span>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-gray-400 group-hover:text-[#0047FF] transition-colors">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Logo</span>
                  </div>
                )}
              </button>
              {previewImage && <button type="button" onClick={handleRemoveLogo} className="mt-2 text-xs font-semibold text-error-600 hover:underline">Remove logo</button>}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFileChange}
              />
              <span className="text-[10px] text-gray-500 mt-3 text-center">Optional · JPEG, PNG, WebP, HEIC/HEIF · max 2MB</span>
              <span className="text-[10px] text-gray-400 mt-1 text-center">Square crop · 512 × 512 px</span>
            </div>
          </div>

          {/* Venue & Location Section */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
            {/* Venue & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Venue</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white"
                  placeholder="Main Ground"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold focus:bg-white focus:border-brand-500 outline-none transition-all dark:text-white"
                  placeholder="Bhopal Sports Complex"
                />
              </div>
            </div>

            {/* Initial Players Selection (Create Team Mode) */}
            {!isEditing && (
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
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-slate-900">
                  {availablePlayers
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
                          className={`px-3 py-2 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                            isSelected ? "bg-blue-50 dark:bg-blue-950/40 text-[#0047FF]" : "hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded-none text-[#0047FF]"
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
            )}
          </div>

          <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-xl lg:-mx-8 lg:-mb-8">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Discard</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-10 h-12 rounded-none text-xs font-bold uppercase tracking-widest">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Team"}
            </Button>
          </FormActions>
        </form>
      </Modal>

      {cropLogoFile && <ImageCropModal file={cropLogoFile} policy="logo" onCancel={() => setCropLogoFile(null)} onCrop={handleLogoCrop} />}
      <ConfirmDeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={() => {
          if (deleteModalId) {
            deleteMutation.mutate(deleteModalId);
          }
        }}
        title="Archive Team"
        message="Archive this team? Historical matches, attendance and payments will remain available."
      />

      <AssignPlayerToTeamModal
        isOpen={!!assignTeamId}
        onClose={() => setAssignTeamId(null)}
        teamId={assignTeamId}
      />

      {tempPlayersTeam && (
        <AddTemporaryPlayersModal
          isOpen={!!tempPlayersTeam}
          onClose={() => setTempPlayersTeam(null)}
          teamId={tempPlayersTeam.id}
          teamName={tempPlayersTeam.name}
        />
      )}
    </div>
  );
};

export default TeamManagement;
