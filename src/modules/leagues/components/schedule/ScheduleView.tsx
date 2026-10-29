import DateInput from "../../../../components/form/DateInput";
import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeamPlayers } from "../../../../api/adminApi";
import { getMediaUrl } from "../../../../utils/media";
import {
  CalendarDays,
  Plus,
  Download,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  Trophy,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Zap,
  AlertTriangle,
  X,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Match, MatchStatus, GenerateFixturesResponse, MatchGoal } from "../../types/league";
import {
  useLeagueMatches,
  useCreateMatch,
  useUpdateMatch,
  useDeleteMatch,
  useDeleteRound,
  useGenerateFixtures,
} from "../../hooks/useLeagueMatches";
import { getLeagueById } from "../../api/leagueApi";
import { useLeagueTeams } from "../../hooks/useLeagueTeams";
import { useLeaguePermissions } from "../../hooks/useLeaguePermissions";
import { Modal } from "../../../../components/ui/modal";
import Button from "../../../../components/ui/button/Button";
import { toast } from "react-hot-toast";
import { APP_TIME_ZONE, formatTimestampDate, formatDateOnly, formatTime, todayDateOnly, toDateOnly, zonedDateTimeToUtcISOString } from "../../../../utils/dateTime";

interface ScheduleViewProps {
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

const TeamLogoCrest: React.FC<{ logo?: string; name: string }> = ({ logo, name }) => {
  const [error, setError] = useState(false);
  const src = getImageUrl(logo);

  const getInitials = (n: string) => {
    const clean = n.replace(/Coach\s*Max/gi, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase() || "TM";
  };

  if (!src || error) {
    return <span>{getInitials(name)}</span>;
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

const getGoalScorerName = (scorer: any) => {
  if (!scorer) return "Goal Scorer";
  if (typeof scorer === "string") return scorer;
  if (scorer.fullName) return scorer.fullName;
  if (scorer.firstName || scorer.lastName) {
    return `${scorer.firstName || ""} ${scorer.lastName || ""}`.trim();
  }
  if (scorer.name) return scorer.name;
  return "Goal Scorer";
};

const getGoalAssistName = (assist: any) => {
  if (!assist) return null;
  if (typeof assist === "string") return assist;
  if (assist.fullName) return assist.fullName;
  if (assist.firstName || assist.lastName) {
    return `${assist.firstName || ""} ${assist.lastName || ""}`.trim();
  }
  if (assist.name) return assist.name;
  return null;
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({ leagueId }) => {
  const { data: matches = [], isLoading } = useLeagueMatches(leagueId);
  const { data: teams = [] } = useLeagueTeams(leagueId);
  const { data: leagueDetails } = useQuery({ queryKey: ["league", leagueId], queryFn: () => getLeagueById(leagueId), enabled: !!leagueId });
  const fieldOptions = Array.from({ length: Math.max(1, Number(leagueDetails?.numberOfFields || 1)) }, (_, i) => `Field ${i + 1}`);
  const { canManageMatches, canEnterResults } = useLeaguePermissions();

  const createMatchMutation = useCreateMatch(leagueId);
  const updateMatchMutation = useUpdateMatch(leagueId);
  const deleteMatchMutation = useDeleteMatch(leagueId);
  const deleteRoundMutation = useDeleteRound(leagueId);
  const generateFixturesMutation = useGenerateFixtures(leagueId);

  // Round Deletion State
  const [deleteRoundTarget, setDeleteRoundTarget] = useState<{ round: number; roundName: string; matchCount: number } | null>(null);

  // Generation Audit Summary & Force Overwrite State
  const [generationSummary, setGenerationSummary] = useState<GenerateFixturesResponse["data"] | null>(null);
  const [isConfirmForceOpen, setIsConfirmForceOpen] = useState(false);
  const [protectedCount, setProtectedCount] = useState<number>(0);

  const handleGenerateFixtures = (force = false) => {
    generateFixturesMutation.mutate(force, {
      onSuccess: (res) => {
        if (res?.data) {
          setGenerationSummary(res.data);
        }
        setIsConfirmForceOpen(false);
        const updatedCount = res?.data?.updated ?? 0;
        if (updatedCount > 0) {
          toast.success(
            `Fixtures regenerated in-place! ${res.data.fixtures} matches reconciled without duplicates.`
          );
        } else {
          toast.success(
            `Fixtures generated successfully! ${res.data?.fixtures || 0} matches created.`
          );
        }
      },
      onError: (err: any) => {
        const protectedFixtures = err?.response?.data?.protectedFixtures;
        const msg = err?.response?.data?.message || err?.message || "Failed to generate fixtures";
        if (protectedFixtures) {
          setProtectedCount(protectedFixtures);
          setIsConfirmForceOpen(true);
        } else {
          toast.error(msg);
        }
      },
    });
  };

  // Filter & Accordion State
  const [roundFilter, setRoundFilter] = useState<string>("ALL");
  const [collapsedRounds, setCollapsedRounds] = useState<Record<number, boolean>>({});
  const [expandedMatchIds, setExpandedMatchIds] = useState<Record<string, boolean>>({});
  const [isFormGoalsOpen, setIsFormGoalsOpen] = useState(true);

  const toggleMatchExpanded = (matchId: string) => {
    setExpandedMatchIds((prev) => ({
      ...prev,
      [matchId]: !prev[matchId],
    }));
  };

  const [actionMenu, setActionMenu] = useState<{
    match: Match;
    top: number;
    left: number;
  } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Add Match Form
  const [addForm, setAddForm] = useState({
    round: 1,
    matchDate: todayDateOnly(),
    matchDateFormatted: "",
    time: "2:00 pm",
    field: "Field 1",
    venue: "Main Stadium",
    homeTeamId: "",
    awayTeamId: "",
    referee: "",
    status: "Scheduled" as MatchStatus,
    notes: "",
  });

  // Edit Match Form
  const [editForm, setEditForm] = useState({
    round: 1,
    matchDate: "",
    time: "",
    field: "",
    venue: "",
    homeTeamId: "",
    awayTeamId: "",
    homeScore: 0,
    awayScore: 0,
    status: "Scheduled" as MatchStatus,
    referee: "",
    notes: "",
  });

  // Result Entry Form with Statistics
  const [resultForm, setResultForm] = useState({
    homeScore: 0,
    awayScore: 0,
    status: "Completed" as MatchStatus,
    showStats: false,
    homePossession: 50,
    awayPossession: 50,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeYellowCards: 0,
    awayYellowCards: 0,
    goals: [] as MatchGoal[],
  });

  // Fetch team players for Goals & Assists UI when modal is open
  const eligibleTeams = (round: number | string, excludedFixtureId?: string) => {
    const used = new Set(matches.filter((match) => Number(match.round) === Number(round) && match._id !== excludedFixtureId).flatMap((match) => [match.homeTeam?._id, match.awayTeam?._id]));
    return teams.filter((team) => !used.has(team._id));
  };

  const { data: homeTeamPlayers } = useQuery({
    queryKey: ["teamPlayers", selectedMatch?.homeTeam?._id],
    queryFn: () => getTeamPlayers(selectedMatch!.homeTeam._id),
    enabled: !!selectedMatch?.homeTeam?._id && isResultModalOpen,
  });

  const { data: awayTeamPlayers } = useQuery({
    queryKey: ["teamPlayers", selectedMatch?.awayTeam?._id],
    queryFn: () => getTeamPlayers(selectedMatch!.awayTeam._id),
    enabled: !!selectedMatch?.awayTeam?._id && isResultModalOpen,
  });

  const homePlayers = useMemo(() => {
    if (!homeTeamPlayers) return [];
    if (Array.isArray(homeTeamPlayers)) return homeTeamPlayers;
    if (Array.isArray(homeTeamPlayers.data)) return homeTeamPlayers.data;
    if (Array.isArray(homeTeamPlayers.players)) return homeTeamPlayers.players;
    if (Array.isArray(homeTeamPlayers.data?.players)) return homeTeamPlayers.data.players;
    return [];
  }, [homeTeamPlayers]);

  const awayPlayers = useMemo(() => {
    if (!awayTeamPlayers) return [];
    if (Array.isArray(awayTeamPlayers)) return awayTeamPlayers;
    if (Array.isArray(awayTeamPlayers.data)) return awayTeamPlayers.data;
    if (Array.isArray(awayTeamPlayers.players)) return awayTeamPlayers.players;
    if (Array.isArray(awayTeamPlayers.data?.players)) return awayTeamPlayers.data.players;
    return [];
  }, [awayTeamPlayers]);

  // Group matches by round
  const groupedRounds = useMemo(() => {
    const map: Record<number, { round: number; roundName: string; dateFormatted: string; matches: Match[] }> = {};

    matches.forEach((m) => {
      if (!map[m.round]) {
        map[m.round] = {
          round: m.round,
          roundName: m.roundName || `Round ${m.round}`,
          dateFormatted: m.matchDateFormatted || m.matchDate || "Upcoming",
          matches: [],
        };
      }
      map[m.round].matches.push(m);
    });

    return Object.values(map).sort((a, b) => a.round - b.round);
  }, [matches]);

  const roundsList = useMemo(() => {
    return Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  }, [matches]);

  const filteredRounds = useMemo(() => {
    if (roundFilter === "ALL") return groupedRounds;
    return groupedRounds.filter((r) => r.round.toString() === roundFilter);
  }, [groupedRounds, roundFilter]);

  const selectedRoundNum = roundFilter !== "ALL" ? Number(roundFilter) : null;
  const byeTeams = useMemo(() => {
    if (!selectedRoundNum) return [];
    const currentRoundMatches = matches.filter((m) => m.round === selectedRoundNum);
    const playingIds = new Set<string>();
    currentRoundMatches.forEach((m) => {
      if (m.homeTeam?._id) playingIds.add(m.homeTeam._id.toString());
      if (m.awayTeam?._id) playingIds.add(m.awayTeam._id.toString());
    });
    return teams.filter((t) => !playingIds.has(t._id.toString()));
  }, [matches, teams, selectedRoundNum]);

  const toggleRoundCollapse = (round: number) => {
    setCollapsedRounds((prev) => ({
      ...prev,
      [round]: !prev[round],
    }));
  };

  // Close floating menus on outside click, window resize, or scroll
  useEffect(() => {
    if (!actionMenu && !isDownloadOpen) return;

    const handleDismiss = () => {
      if (actionMenu) setActionMenu(null);
      if (isDownloadOpen) setIsDownloadOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActionMenu(null);
        setIsDownloadOpen(false);
      }
    };

    window.addEventListener("click", handleDismiss);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleDismiss);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionMenu, isDownloadOpen]);

  // Open Edit Match
  const handleOpenEdit = (match: Match) => {
    setSelectedMatch(match);
    setEditForm({
      round: match.round,
      matchDate: match.matchDate || (match.kickoffTime ? toDateOnly(formatTimestampDate(match.kickoffTime, APP_TIME_ZONE)) : ""),
      time: match.time || (match.kickoffTime ? formatTime(match.kickoffTime, APP_TIME_ZONE) : ""),
      field: match.field || match.venue || "",
      venue: match.venue || "",
      homeTeamId: match.homeTeam._id,
      awayTeamId: match.awayTeam._id,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      status: match.status,
      referee: match.referee || "",
      notes: match.notes || "",
    });
    setActionMenu(null);
    setIsEditModalOpen(true);
  };

  // Open Result Entry
  const handleOpenResult = (match: Match) => {
    setSelectedMatch(match);
    const ms = match.matchStatistics;
    const initialGoals: MatchGoal[] = (match.goals || []).map((g: any) => ({
      id: g._id || g.id || Math.random().toString(),
      teamId: typeof g.team === 'object' && g.team ? g.team._id : (g.teamId || g.team),
      scorerId: typeof g.scorer === 'object' && g.scorer ? g.scorer._id : (g.scorerId || g.scorer),
      assistId: typeof g.assist === 'object' && g.assist ? g.assist._id : (g.assistId || g.assist),
      minute: g.minute ?? 1,
    }));

    const homeGoalsCount = initialGoals.filter(g => g.teamId === match.homeTeam._id).length;
    const awayGoalsCount = initialGoals.filter(g => g.teamId === match.awayTeam._id).length;

    const rawHomeScore = match.score?.homeScore ?? match.homeScore ?? 0;
    const rawAwayScore = match.score?.awayScore ?? match.awayScore ?? 0;

    setResultForm({
      homeScore: initialGoals.length > 0 ? homeGoalsCount : rawHomeScore,
      awayScore: initialGoals.length > 0 ? awayGoalsCount : rawAwayScore,
      status: "COMPLETED",
      showStats: !!ms,
      homePossession: ms?.homePossession ?? 50,
      awayPossession: ms?.awayPossession ?? 50,
      homeShots: ms?.homeShots ?? 0,
      awayShots: ms?.awayShots ?? 0,
      homeShotsOnTarget: ms?.homeShotsOnTarget ?? 0,
      awayShotsOnTarget: ms?.awayShotsOnTarget ?? 0,
      homeCorners: ms?.homeCorners ?? 0,
      awayCorners: ms?.awayCorners ?? 0,
      homeFouls: ms?.homeFouls ?? 0,
      awayFouls: ms?.awayFouls ?? 0,
      homeYellowCards: ms?.homeYellowCards ?? 0,
      awayYellowCards: ms?.awayYellowCards ?? 0,
      goals: initialGoals,
    });
    setActionMenu(null);
    setIsResultModalOpen(true);
  };

  // Helper to add goal and auto-sync scores
  const handleAddGoal = (teamId: string) => {
    if (!selectedMatch) return;
    const newGoals = [
      ...resultForm.goals,
      { id: Math.random().toString(), teamId, scorerId: "", minute: 1 },
    ];
    const newHomeScore = newGoals.filter(g => g.teamId === selectedMatch.homeTeam._id).length;
    const newAwayScore = newGoals.filter(g => g.teamId === selectedMatch.awayTeam._id).length;
    setResultForm({
      ...resultForm,
      goals: newGoals,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    });
  };

  // Helper to delete goal and auto-sync scores
  const handleDeleteGoal = (goalToDelete: MatchGoal) => {
    if (!selectedMatch) return;
    const newGoals = resultForm.goals.filter((g) => g !== goalToDelete && g.id !== goalToDelete.id);
    const newHomeScore = newGoals.filter(g => g.teamId === selectedMatch.homeTeam._id).length;
    const newAwayScore = newGoals.filter(g => g.teamId === selectedMatch.awayTeam._id).length;
    setResultForm({
      ...resultForm,
      goals: newGoals,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    });
  };

  // Submit Add Match
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addForm.homeTeamId === addForm.awayTeamId) {
      toast.error("Home and Away team cannot be the same");
      return;
    }

    const homeTeamObj = teams.find((t) => t._id === addForm.homeTeamId);
    const awayTeamObj = teams.find((t) => t._id === addForm.awayTeamId);

    const dateFormatted = addForm.matchDate
      ? formatDateOnly(addForm.matchDate)
      : addForm.matchDate;

    let kickoffIso: string;
    try { kickoffIso = zonedDateTimeToUtcISOString(addForm.matchDate, addForm.time); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Enter a valid date and time."); return; }
    if (!homeTeamObj || !awayTeamObj || !eligibleTeams(addForm.round).some((t) => t._id === homeTeamObj._id) || !eligibleTeams(addForm.round).some((t) => t._id === awayTeamObj._id)) { toast.error("Select two available teams for this round."); return; }

    createMatchMutation.mutate(
      {
        round: Number(addForm.round),
        roundName: `Round ${addForm.round}`,
        kickoffTime: kickoffIso,
        matchDate: addForm.matchDate,
        sessionDate: addForm.matchDate,
        matchDateFormatted: dateFormatted,
        time: addForm.time,
        field: addForm.field,
        venue: addForm.venue || addForm.field || "Field 1",
        homeTeam: {
          _id: homeTeamObj?._id || addForm.homeTeamId,
          name: homeTeamObj?.teamName || homeTeamObj?.name || "Home Team",
          teamName: homeTeamObj?.teamName || homeTeamObj?.name || "Home Team",
          logo: homeTeamObj?.logo,
        },
        awayTeam: {
          _id: awayTeamObj?._id || addForm.awayTeamId,
          name: awayTeamObj?.teamName || awayTeamObj?.name || "Away Team",
          teamName: awayTeamObj?.teamName || awayTeamObj?.name || "Away Team",
          logo: awayTeamObj?.logo,
        },
        status: addForm.status,
        referee: addForm.referee,
        notes: addForm.notes,
        homeScore: addForm.status === "Completed" ? 0 : null,
        awayScore: addForm.status === "Completed" ? 0 : null,
        fixtureSource: "MANUAL",
        isManuallyModified: true,
      },
      {
        onSuccess: () => {
          setIsAddModalOpen(false);
          toast.success("Match created manually (Protected from random regeneration)");
          setAddForm({
            round: 1,
            matchDate: todayDateOnly(),
            matchDateFormatted: "",
            time: "2:00 pm",
            field: "Field 1",
            venue: "Main Stadium",
            homeTeamId: "",
            awayTeamId: "",
            referee: "",
            status: "Scheduled",
            notes: "",
          });
        },
      }
    );
  };

  // Submit Edit Match
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (editForm.homeTeamId === editForm.awayTeamId) {
      toast.error("Home and Away team cannot be the same");
      return;
    }

    const homeTeamObj = teams.find((t) => t._id === editForm.homeTeamId);
    const awayTeamObj = teams.find((t) => t._id === editForm.awayTeamId);

    let kickoffIso: string | undefined = undefined;
    if (editForm.matchDate) {
      try {
        kickoffIso = zonedDateTimeToUtcISOString(editForm.matchDate, editForm.time);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Enter a valid date and time."); return; }
    }

    updateMatchMutation.mutate(
      {
        matchId: selectedMatch._id,
        data: {
          version: selectedMatch.version,
          sessionDate: editForm.matchDate,
          round: Number(editForm.round),
          roundName: `Round ${editForm.round}`,
          kickoffTime: kickoffIso,
          matchDate: editForm.matchDate,
          time: editForm.time,
          field: editForm.field,
          venue: editForm.venue || editForm.field,
          homeTeam: {
            _id: homeTeamObj?._id || editForm.homeTeamId,
            name: homeTeamObj?.teamName || homeTeamObj?.name || selectedMatch.homeTeam.teamName || selectedMatch.homeTeam.name || "Home Team",
            teamName: homeTeamObj?.teamName || homeTeamObj?.name || selectedMatch.homeTeam.teamName || selectedMatch.homeTeam.name || "Home Team",
            logo: homeTeamObj?.logo || selectedMatch.homeTeam.logo,
          },
          awayTeam: {
            _id: awayTeamObj?._id || editForm.awayTeamId,
            name: awayTeamObj?.teamName || awayTeamObj?.name || selectedMatch.awayTeam.teamName || selectedMatch.awayTeam.name || "Away Team",
            teamName: awayTeamObj?.teamName || awayTeamObj?.name || selectedMatch.awayTeam.teamName || selectedMatch.awayTeam.name || "Away Team",
            logo: awayTeamObj?.logo || selectedMatch.awayTeam.logo,
          },
          homeScore: editForm.status === "Completed" ? Number(editForm.homeScore) : null,
          awayScore: editForm.status === "Completed" ? Number(editForm.awayScore) : null,
          status: editForm.status,
          referee: editForm.referee,
          notes: editForm.notes,
          fixtureSource: "MANUAL",
          isManuallyModified: true,
        },
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          toast.success("Match fixture updated manually (Protected from random regeneration)");
        },
      }
    );
  };

  // Submit Result Entry (with optional keepOpen parameter for "Submit Goal" button)
  const executeResultSave = (keepOpen = false) => {
    if (!selectedMatch) return;

    // Check if any goals have empty scorerId
    const invalidGoal = resultForm.goals.find((g) => !g.scorerId);
    if (invalidGoal) {
      toast.error("Please select a player for all added goals before saving");
      return;
    }

    const matchStatisticsPayload = resultForm.showStats
      ? {
        homePossession: Number(resultForm.homePossession),
        awayPossession: Number(resultForm.awayPossession),
        homeShots: Number(resultForm.homeShots),
        awayShots: Number(resultForm.awayShots),
        homeShotsOnTarget: Number(resultForm.homeShotsOnTarget),
        awayShotsOnTarget: Number(resultForm.awayShotsOnTarget),
        homeCorners: Number(resultForm.homeCorners),
        awayCorners: Number(resultForm.awayCorners),
        homeFouls: Number(resultForm.homeFouls),
        awayFouls: Number(resultForm.awayFouls),
        homeYellowCards: Number(resultForm.homeYellowCards),
        awayYellowCards: Number(resultForm.awayYellowCards),
      }
      : undefined;

    let payloadHomeScore = Number(resultForm.homeScore);
    let payloadAwayScore = Number(resultForm.awayScore);
    let payloadGoals: MatchGoal[] | undefined = undefined;

    if (resultForm.goals && resultForm.goals.length > 0) {
      // Force scores to match goal objects to prevent 400 Bad Request
      payloadHomeScore = resultForm.goals.filter(g => g.teamId === selectedMatch.homeTeam._id).length;
      payloadAwayScore = resultForm.goals.filter(g => g.teamId === selectedMatch.awayTeam._id).length;
      payloadGoals = resultForm.goals;
    } else {
      // If no goals are provided but scores are > 0, omit the goals array completely
      // If scores are 0-0, we can safely send an empty array to clear any existing goals
      if (payloadHomeScore === 0 && payloadAwayScore === 0) {
        payloadGoals = [];
      } else {
        payloadGoals = undefined;
      }
    }

    updateMatchMutation.mutate(
      {
        matchId: selectedMatch._id,
        data: {
          version: selectedMatch.version,
          homeScore: payloadHomeScore,
          awayScore: payloadAwayScore,
          status: keepOpen ? "LIVE" : "COMPLETED",
          matchStatistics: matchStatisticsPayload,
          goals: payloadGoals,
        },
      },
      {
        onSuccess: (saved) => {
          setSelectedMatch({ ...selectedMatch, ...saved });
          if (keepOpen) {
            toast.success("Goals & scores updated!");
          } else {
            setIsResultModalOpen(false);
            toast.success("Match result & statistics updated! Standings automatically refreshed.");
          }
        },
      }
    );
  };

  const handleResultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeResultSave(false);
  };

  // Download Schedule
  const handleExport = (type: "CSV" | "EXCEL" | "PDF") => {
    setIsDownloadOpen(false);
    if (type === "CSV" || type === "EXCEL") {
      const headers = ["Round", "Date", "Time", "Field", "Home Team", "Home Score", "Away Score", "Away Team", "Status", "Venue", "Referee"];
      const rows = matches.map((m) => {
        const hName = m.homeTeam?.teamName || m.homeTeam?.name || "Home Team";
        const aName = m.awayTeam?.teamName || m.awayTeam?.name || "Away Team";
        const mStatus = (m.status || "").toUpperCase();
        const isStarted = mStatus === "COMPLETED" || mStatus === "LIVE";
        const mScore = m.score?.homeScore ?? m.homeScore;
        const aScore = m.score?.awayScore ?? m.awayScore;
        const hasScore = mScore !== null && mScore !== undefined && aScore !== null && aScore !== undefined;
        const hasNonZero = hasScore && (Number(mScore) > 0 || Number(aScore) > 0);
        const showScore = hasScore && (isStarted || hasNonZero);

        return [
          m.round,
          `"${m.matchDateFormatted || m.matchDate || ""}"`,
          `"${m.time || ""}"`,
          `"${m.field || m.venue || ""}"`,
          `"${hName.replace(/"/g, '""')}"`,
          showScore ? mScore : "-",
          showScore ? aScore : "-",
          `"${aName.replace(/"/g, '""')}"`,
          m.status,
          `"${m.venue || ""}"`,
          `"${m.referee || ""}"`,
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `League_Schedule_${type === "EXCEL" ? "Export.csv" : "Export.csv"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${type} schedule exported successfully`);
    } else {
      window.print();
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "COMPLETED":
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            Completed
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
            Scheduled
          </span>
        );
      case "LIVE":
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 animate-pulse">
            Live
          </span>
        );
      case "CANCELLED":
      case "CANCELED":
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300">
            Cancelled
          </span>
        );
      case "POSTPONED":
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
            Postponed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
            {status || "Scheduled"}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
      {/* Top Header & Actions Bar (Matches Screenshot 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Schedule
          </h2>

          {/* All Rounds Dropdown Selector */}
          <div className="relative">
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer shadow-xs"
            >
              <option value="ALL">All Rounds</option>
              {roundsList.map((r) => (
                <option key={r} value={r.toString()}>
                  Round {r}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Right Buttons: Download & Add Match */}
        <div className="flex items-center gap-2.5">
          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs cursor-pointer transition-all"
            >
              <Download size={13} className="text-slate-500" />
              <span>Download</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {isDownloadOpen && (
              <div className="absolute right-0 top-10 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 text-xs">
                <button
                  onClick={() => handleExport("CSV")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <FileText size={13} className="text-blue-500" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => handleExport("EXCEL")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <FileSpreadsheet size={13} className="text-emerald-500" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => handleExport("PDF")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <FileText size={13} className="text-rose-500" />
                  <span>Print / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Generate / Regenerate Random Fixtures Button */}
          {canManageMatches && (
            <button
              onClick={() => handleGenerateFixtures(false)}
              disabled={generateFixturesMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm cursor-pointer transition-all disabled:opacity-50"
              title={
                matches.length > 0
                  ? "Regenerate fixtures in-place while preserving manual modifications"
                  : "Generate random round-robin fixtures"
              }
            >
              {generateFixturesMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Zap size={14} className="fill-amber-300 text-amber-300" />
                  <span>
                    {matches.length > 0 ? "⚡ Regenerate Random Fixtures" : "⚡ Generate Random Fixtures"}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Add Match Button */}
          {canManageMatches && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer transition-all"
            >
              <Plus size={14} />
              <span>Add Match</span>
            </button>
          )}
        </div>
      </div>

      {/* Generation Audit KPI Banner */}
      {generationSummary && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl mb-4 text-xs animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
              <CheckCircle2 size={13} />
              Schedule Generated In-Place
            </span>
            <span className="text-slate-400 font-bold">•</span>
            <span className="font-bold">{generationSummary.rounds} Rounds</span>
            <span className="text-slate-400 font-bold">•</span>
            <span className="font-bold">{generationSummary.fixtures} Fixtures</span>
            <span className="text-slate-400 font-bold">•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
              Updated in-place: {generationSummary.updated}
            </span>
            {generationSummary.created > 0 && (
              <>
                <span className="text-slate-400 font-bold">•</span>
                <span className="text-blue-700 dark:text-blue-400 font-bold">
                  Created: {generationSummary.created}
                </span>
              </>
            )}
            {generationSummary.manualFixturesPreserved > 0 && (
              <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50">
                🛡️ {generationSummary.manualFixturesPreserved} Manual Fixtures Protected
              </span>
            )}
            {generationSummary.byes > 0 && (
              <span className="font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800/50">
                {generationSummary.byes} BYEs
              </span>
            )}
          </div>

          <button
            onClick={() => setGenerationSummary(null)}
            className="self-end sm:self-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Round Quick Navigation Tabs */}
      {roundsList.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 mb-4 border-b border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setRoundFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${roundFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
          >
            All Rounds ({matches.length})
          </button>
          {roundsList.map((r) => {
            const count = matches.filter((m) => m.round === r).length;
            const isSelected = roundFilter === r.toString();
            return (
              <button
                key={r}
                onClick={() => setRoundFilter(r.toString())}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                Round {r} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Virtual BYE Notification for Selected Round */}
      {selectedRoundNum && byeTeams.length > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl mb-4 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in shadow-xs">
          <Info size={16} className="text-amber-600 shrink-0" />
          <div>
            <span className="font-extrabold mr-1.5">BYE this round:</span>
            <span className="font-semibold underline decoration-amber-400 decoration-2">
              {byeTeams.map((t) => t.teamName || t.name || (t as any).title).join(", ")}
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 ml-1.5">
              (Odd number of participating teams; no match scheduled for this team in Round {selectedRoundNum})
            </span>
          </div>
        </div>
      )}

      {/* Rounds Grouping Accordions */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mx-auto mb-2" />
            <span className="text-xs font-semibold">Loading Schedule...</span>
          </div>
        ) : filteredRounds.length === 0 ? (
          matches.length === 0 ? (
            <div className="py-12 sm:py-16 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 max-w-2xl mx-auto my-4 space-y-6">
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <CalendarDays size={28} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  No Matches Scheduled Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Start organizing your league schedule. Choose whether you'd like to auto-generate random fixtures or create matches manually.
                </p>
              </div>

              {canManageMatches ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left pt-1">
                  {/* Option 1: Random / Auto Generate Fixtures */}
                  <div
                    onClick={() => !generateFixturesMutation.isPending && handleGenerateFixtures(false)}
                    className="group relative p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                        {generateFixturesMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Zap size={20} className="fill-amber-300 text-amber-300" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Random Generate Fixtures
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          Automatically calculate round-robin schedule and match pairings for all enrolled teams.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={generateFixturesMutation.isPending}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {generateFixturesMutation.isPending ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={13} className="fill-amber-300 text-amber-300" />
                          <span>Generate Random Fixtures</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Option 2: Add Match Manually */}
                  <div
                    onClick={() => setIsAddModalOpen(true)}
                    className="group relative p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                        <Plus size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Add Match Manually
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          Create individual fixtures manually with custom dates, kick-off times, venues, fields, and opponents.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Manually Add Match</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No matches have been scheduled yet for this league.</p>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <CalendarDays size={32} className="mx-auto text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No matches found for Round {roundFilter}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  You can add a fixture to this round or switch back to view all rounds.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRoundFilter("ALL")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  View All Rounds
                </button>
                {canManageMatches && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((prev) => ({ ...prev, round: Number(roundFilter) || 1 }));
                      setIsAddModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Add Match to Round {roundFilter}</span>
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          filteredRounds.map((roundGroup) => {
            const isCollapsed = !!collapsedRounds[roundGroup.round];

            // Round BYE calculation for this round group
            const roundMatchList = roundGroup.matches;
            const pIds = new Set<string>();
            roundMatchList.forEach((m) => {
              if (m.homeTeam?._id) pIds.add(m.homeTeam._id.toString());
              if (m.awayTeam?._id) pIds.add(m.awayTeam._id.toString());
            });
            const rByes = teams.filter((t) => !pIds.has(t._id.toString()));

            return (
              <div
                key={roundGroup.round}
                className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900"
              >
                {/* Accordion Header (Matches Screenshot 2: "Round 1 - Saturday 25 July 2026") */}
                <div
                  onClick={() => toggleRoundCollapse(roundGroup.round)}
                  className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {roundGroup.roundName}
                    </span>
                    <span className="text-slate-400 font-bold">-</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {roundGroup.dateFormatted}
                    </span>
                    {rByes.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        BYE: {rByes.map((t) => t.teamName || t.name).join(", ")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canManageMatches && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteRoundTarget({
                            round: roundGroup.round,
                            roundName: roundGroup.roundName,
                            matchCount: roundGroup.matches.length,
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title={`Delete ${roundGroup.roundName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="text-slate-400 hover:text-slate-600 p-1">
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                  </div>
                </div>

                {/* Match Table inside Round */}
                {!isCollapsed && (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4 min-w-[90px]">Time</th>
                          <th className="py-3 px-4 min-w-[90px]">Field</th>
                          <th className="py-3 px-4 min-w-[200px]">Home Team</th>
                          <th className="py-3 px-4 min-w-[90px] text-center">Score</th>
                          <th className="py-3 px-4 min-w-[200px]">Away Team</th>
                          <th className="py-3 px-4 min-w-[100px]">Source</th>
                          <th className="py-3 px-4 min-w-[110px]">Status</th>
                          <th className="py-3 px-4 w-12 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {roundGroup.matches.map((match) => {
                          const homeName = match.homeTeam.teamName || match.homeTeam.name || "Home";
                          const awayName = match.awayTeam.teamName || match.awayTeam.name || "Away";
                          const homeLogo = match.homeTeam.logo;
                          const awayLogo = match.awayTeam.logo;
                          const fieldVenue = [match.field, match.venue && !match.venue.includes(match.field || "Field ") ? match.venue : ""].filter(Boolean).join(" · ") || "Field not assigned";
                          const matchTime =
                            match.time ||
                            (match.kickoffTime
                              ? formatTime(match.kickoffTime)
                              : "2:00 pm");
                          const homeScore = match.score?.homeScore ?? match.homeScore;
                          const awayScore = match.score?.awayScore ?? match.awayScore;
                          const statusUpper = (match.status || "").toUpperCase();
                          const isStartedOrCompleted =
                            statusUpper === "COMPLETED" ||
                            statusUpper === "LIVE";
                          const hasScore =
                            homeScore !== null &&
                            awayScore !== null &&
                            homeScore !== undefined &&
                            awayScore !== undefined;
                          const hasNonZeroScore =
                            hasScore && (Number(homeScore) > 0 || Number(awayScore) > 0);
                          const shouldShowScore =
                            hasScore && (isStartedOrCompleted || hasNonZeroScore);

                          const isMatchExpanded = !!expandedMatchIds[match._id];
                          const matchGoals = Array.isArray(match.goals) ? match.goals : [];
                          const homeMatchGoals = matchGoals.filter((g: any) => {
                            const gTeamId = g.teamId || (typeof g.team === "object" ? g.team?._id : g.team);
                            return String(gTeamId) === String(match.homeTeam._id);
                          });
                          const awayMatchGoals = matchGoals.filter((g: any) => {
                            const gTeamId = g.teamId || (typeof g.team === "object" ? g.team?._id : g.team);
                            return String(gTeamId) === String(match.awayTeam._id);
                          });

                          return (
                            <React.Fragment key={match._id}>
                              <tr
                                onClick={() => canEnterResults && handleOpenResult(match)}
                                className={`transition-colors ${canEnterResults ? "cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"}`}
                              >
                                {/* Time */}
                                <td className="py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {matchTime}
                                </td>

                                {/* Field */}
                                <td className="py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {fieldVenue}
                                </td>

                                {/* Home Team */}
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-[9px] font-bold text-slate-700 dark:text-slate-200">
                                      <TeamLogoCrest logo={homeLogo} name={homeName} />
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                      {homeName}
                                    </span>
                                  </div>
                                </td>

                                {/* Score (e.g. "4 - 1" or "- - -") */}
                                <td className="py-4 px-4 text-center">
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    {shouldShowScore ? (
                                      <span className="font-black text-sm text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                        {homeScore} - {awayScore}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-bold tracking-widest text-xs">
                                        - - -
                                      </span>
                                    )}

                                    {/* Goals Accordion Toggle Button */}
                                    {matchGoals.length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleMatchExpanded(match._id);
                                        }}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all shadow-xs cursor-pointer ${
                                          isMatchExpanded
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                        }`}
                                        title={isMatchExpanded ? "Collapse goal scorers & assists" : "View goal scorers & assists"}
                                      >
                                        <span>⚽ {matchGoals.length} {matchGoals.length === 1 ? "Goal" : "Goals"}</span>
                                        {isMatchExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                      </button>
                                    ) : (
                                      (statusUpper === "COMPLETED" || hasScore) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMatchExpanded(match._id);
                                          }}
                                          className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                            isMatchExpanded
                                              ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                          }`}
                                          title="Match telemetry breakdown"
                                        >
                                          <span>Telemetry</span>
                                          {isMatchExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </td>

                                {/* Away Team */}
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-[9px] font-bold text-slate-700 dark:text-slate-200">
                                      <TeamLogoCrest logo={awayLogo} name={awayName} />
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                      {awayName}
                                    </span>
                                  </div>
                                </td>

                                {/* Source */}
                                <td className="py-4 px-4 whitespace-nowrap">
                                  {match.fixtureSource === "MANUAL" || match.isManuallyModified ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-xs"
                                      title="Manually modified: Protected from random fixture overwrites"
                                    >
                                      <ShieldCheck size={11} className="text-amber-600 dark:text-amber-400" />
                                      <span>MANUAL</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 shadow-xs"
                                      title="Generated via random round-robin scheduler"
                                    >
                                      <span>GENERATED</span>
                                    </span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="py-4 px-4">
                                  {getStatusBadge(match.status)}
                                </td>

                                {/* Actions Dropdown */}
                                <td className="py-4 px-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (actionMenu?.match._id === match._id) {
                                        setActionMenu(null);
                                        return;
                                      }
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const menuHeight = 135;
                                      const menuWidth = 160;
                                      // Open upwards if not enough space below
                                      const openUpwards =
                                        window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
                                      const top = openUpwards ? rect.top - menuHeight : rect.bottom + 4;
                                      const left = Math.max(12, rect.right - menuWidth);

                                      setActionMenu({ match, top, left });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Match Actions"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                </td>
                              </tr>

                              {/* Match Goals & Assists Accordion Panel */}
                              {isMatchExpanded && (
                                <tr className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                                  <td colSpan={8} className="py-3 px-6">
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 p-4 shadow-xs">
                                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            Match Telemetry — Goal Scorers & Assist Playmakers
                                          </h4>
                                        </div>
                                        {canEnterResults && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenResult(match);
                                            }}
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                                          >
                                            <Edit2 size={12} />
                                            <span>Edit Goals & Assists</span>
                                          </button>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Home Team Goals */}
                                        <div className="rounded-lg bg-slate-50/60 dark:bg-slate-800/40 p-3 border border-slate-100 dark:border-slate-800">
                                          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold">
                                              <TeamLogoCrest logo={homeLogo} name={homeName} />
                                            </div>
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                              {homeName}
                                            </span>
                                            <span className="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                              {homeMatchGoals.length} {homeMatchGoals.length === 1 ? "Goal" : "Goals"}
                                            </span>
                                          </div>

                                          {homeMatchGoals.length > 0 ? (
                                            <div className="space-y-2">
                                              {homeMatchGoals.map((g: any, gIdx: number) => {
                                                const scorerName = getGoalScorerName(g.scorer || g.scorerId);
                                                const assistName = getGoalAssistName(g.assist || g.assistId);
                                                const minuteStr = g.minute ? `${g.minute}'` : "";
                                                return (
                                                  <div
                                                    key={g.id || g._id || gIdx}
                                                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-xs"
                                                  >
                                                    <div className="flex items-center gap-2 truncate">
                                                      <span className="text-sm">⚽</span>
                                                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {scorerName}
                                                      </span>
                                                      {minuteStr && (
                                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                          {minuteStr}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                                                      {assistName ? (
                                                        <>
                                                          <span className="text-[10px] font-medium text-slate-400">👟 Assist:</span>
                                                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {assistName}
                                                          </span>
                                                        </>
                                                      ) : (
                                                        <span className="text-slate-400 text-[10px] italic">Unassisted</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 font-medium italic">
                                              No goals recorded for {homeName}
                                            </div>
                                          )}
                                        </div>

                                        {/* Away Team Goals */}
                                        <div className="rounded-lg bg-slate-50/60 dark:bg-slate-800/40 p-3 border border-slate-100 dark:border-slate-800">
                                          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold">
                                              <TeamLogoCrest logo={awayLogo} name={awayName} />
                                            </div>
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                              {awayName}
                                            </span>
                                            <span className="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                              {awayMatchGoals.length} {awayMatchGoals.length === 1 ? "Goal" : "Goals"}
                                            </span>
                                          </div>

                                          {awayMatchGoals.length > 0 ? (
                                            <div className="space-y-2">
                                              {awayMatchGoals.map((g: any, gIdx: number) => {
                                                const scorerName = getGoalScorerName(g.scorer || g.scorerId);
                                                const assistName = getGoalAssistName(g.assist || g.assistId);
                                                const minuteStr = g.minute ? `${g.minute}'` : "";
                                                return (
                                                  <div
                                                    key={g.id || g._id || gIdx}
                                                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-xs"
                                                  >
                                                    <div className="flex items-center gap-2 truncate">
                                                      <span className="text-sm">⚽</span>
                                                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {scorerName}
                                                      </span>
                                                      {minuteStr && (
                                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                          {minuteStr}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                                                      {assistName ? (
                                                        <>
                                                          <span className="text-[10px] font-medium text-slate-400">👟 Assist:</span>
                                                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {assistName}
                                                          </span>
                                                        </>
                                                      ) : (
                                                        <span className="text-slate-400 text-[10px] italic">Unassisted</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 font-medium italic">
                                              No goals recorded for {awayName}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ================= FLOATING ACTION MENU PORTAL ================= */}
      {actionMenu &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${actionMenu.top}px`,
              left: `${actionMenu.left}px`,
              zIndex: 99999,
            }}
            className="w-40 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs text-left animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {canEnterResults && (
              <button
                onClick={() => {
                  const m = actionMenu.match;
                  setActionMenu(null);
                  handleOpenResult(m);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5 text-emerald-600 font-semibold cursor-pointer transition-colors"
              >
                <CheckCircle2 size={14} />
                <span>Enter Result</span>
              </button>
            )}

            {canManageMatches && (
              <>
                <button
                  onClick={() => {
                    const m = actionMenu.match;
                    setActionMenu(null);
                    handleOpenEdit(m);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer transition-colors"
                >
                  <Edit2 size={14} className="text-blue-500" />
                  <span>Edit Match</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                  <button
                    onClick={() => {
                      const m = actionMenu.match;
                      setActionMenu(null);
                      if (confirm("Are you sure you want to delete this match?")) {
                        deleteMatchMutation.mutate(m._id);
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 text-rose-600 font-semibold cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete Match</span>
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body
        )}

      {/* ================= ADD MATCH MODAL ================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        className="max-w-[600px] p-6 rounded-xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
            <Plus size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Match Fixture</h3>
            <p className="text-xs text-slate-500">Schedule a new match between participating teams.</p>
          </div>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Round Number *
              </label>
              <input
                type="number"
                min={1}
                value={addForm.round}
                onChange={(e) => setAddForm({ ...addForm, round: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Match Date *
              </label>
              <DateInput
                type="date"
                value={addForm.matchDate}
                onChange={(e) => setAddForm({ ...addForm, matchDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Kickoff Time *
              </label>
              <input
                type="text"
                placeholder="e.g. 2:00 pm"
                value={addForm.time}
                onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Field / Pitch
              </label>
              <select value={addForm.field} onChange={(e) => setAddForm({ ...addForm, field: e.target.value })} className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500" required>{fieldOptions.map((field) => <option key={field} value={field}>{field}</option>)}</select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Home Team *
              </label>
              <select
                value={addForm.homeTeamId}
                onChange={(e) => setAddForm({ ...addForm, homeTeamId: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
                required
              >
                <option value="" className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800">
                  Select Home Team
                </option>
                {eligibleTeams(addForm.round).filter((t) => t._id !== addForm.awayTeamId).map((t) => {
                  const teamName = t.teamName || t.name || (t as any).title || "Unnamed Team";
                  return (
                    <option
                      key={t._id}
                      value={t._id}
                      className="text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                    >
                      {teamName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Away Team *
              </label>
              <select
                value={addForm.awayTeamId}
                onChange={(e) => setAddForm({ ...addForm, awayTeamId: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
                required
              >
                <option value="" className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800">
                  Select Away Team
                </option>
                {eligibleTeams(addForm.round).filter((t) => t._id !== addForm.homeTeamId).map((t) => {
                  const teamName = t.teamName || t.name || (t as any).title || "Unnamed Team";
                  return (
                    <option
                      key={t._id}
                      value={t._id}
                      className="text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                    >
                      {teamName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Referee
              </label>
              <input
                type="text"
                placeholder="Referee name"
                value={addForm.referee}
                onChange={(e) => setAddForm({ ...addForm, referee: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Initial Status
              </label>
              <select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value as MatchStatus })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="Scheduled" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Scheduled</option>
                <option value="Live" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Live</option>
                <option value="Completed" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Ground rules, weather check"
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" size="sm" disabled={createMatchMutation.isPending}>
              {createMatchMutation.isPending ? "Creating..." : "Schedule Match"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= EDIT MATCH MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-[600px] p-6 rounded-xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
            <Edit2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Match Details</h3>
            <p className="text-xs text-slate-500">Update match timings, teams, venue, and score.</p>
          </div>
        </div>

        {/* Notice of Manual Protection */}
        <div className="mb-4 p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p>
            Editing this fixture manually tags it as <strong>MANUAL</strong> and automatically protects it from being overwritten during future random fixture regenerations.
          </p>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Round
              </label>
              <input
                type="number"
                value={editForm.round}
                onChange={(e) => setEditForm({ ...editForm, round: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as MatchStatus })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="Scheduled" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Scheduled</option>
                <option value="Live" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Live</option>
                <option value="Completed" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Completed</option>
                <option value="Postponed" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Postponed</option>
                <option value="Cancelled" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Home Team *
              </label>
              <select
                value={editForm.homeTeamId}
                onChange={(e) => setEditForm({ ...editForm, homeTeamId: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
                required
              >
                <option value="" className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800">
                  Select Home Team
                </option>
                {eligibleTeams(editForm.round, selectedMatch?._id).filter((t) => t._id !== editForm.awayTeamId).map((t) => {
                  const teamName = t.teamName || t.name || (t as any).title || "Unnamed Team";
                  return (
                    <option
                      key={t._id}
                      value={t._id}
                      className="text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                    >
                      {teamName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Away Team *
              </label>
              <select
                value={editForm.awayTeamId}
                onChange={(e) => setEditForm({ ...editForm, awayTeamId: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
                required
              >
                <option value="" className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800">
                  Select Away Team
                </option>
                {eligibleTeams(editForm.round, selectedMatch?._id).filter((t) => t._id !== editForm.homeTeamId).map((t) => {
                  const teamName = t.teamName || t.name || (t as any).title || "Unnamed Team";
                  return (
                    <option
                      key={t._id}
                      value={t._id}
                      className="text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                    >
                      {teamName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Match Date
              </label>
              <DateInput
                type="date"
                value={editForm.matchDate}
                onChange={(e) => setEditForm({ ...editForm, matchDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Kickoff Time
              </label>
              <input
                type="text"
                value={editForm.time}
                onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Field
              </label>
              <select value={editForm.field} onChange={(e) => setEditForm({ ...editForm, field: e.target.value })} className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700" required>{fieldOptions.map((field) => <option key={field} value={field}>{field}</option>)}</select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Referee
              </label>
              <input
                type="text"
                value={editForm.referee}
                onChange={(e) => setEditForm({ ...editForm, referee: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {editForm.status === "Completed" && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 mb-2">
                Match Score
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Home Score
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.homeScore}
                    onChange={(e) => setEditForm({ ...editForm, homeScore: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Away Score
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.awayScore}
                    onChange={(e) => setEditForm({ ...editForm, awayScore: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" size="sm" disabled={updateMatchMutation.isPending}>
              {updateMatchMutation.isPending ? "Saving..." : "Save Match"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MATCH RESULT ENTRY MODAL ================= */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        className="max-w-[800px] p-6 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Match Result & Statistics</h3>
            <p className="text-xs text-slate-500">
              Entering scores automatically updates standings, points, and statistics.
            </p>
          </div>
        </div>

        {selectedMatch && (
          <form onSubmit={handleResultSubmit} className="space-y-5">
            {/* Match Status */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Match Status
              </label>
              <p className="text-xs text-slate-600 dark:text-slate-300">Save Final Result marks the match Completed, including 0–0. Submit Goal keeps the match Live.</p>
            </div>

            {/* Score Entry Box */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              {/* Home Team */}
              <div className="flex-1 flex flex-col items-center">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2 line-clamp-1">
                  {selectedMatch.homeTeam.teamName || selectedMatch.homeTeam.name}
                </span>
                <input
                  type="number"
                  min={0}
                  value={resultForm.homeScore}
                  onChange={(e) => setResultForm({ ...resultForm, homeScore: Number(e.target.value) })}
                  className="w-16 h-12 text-center text-xl font-black rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Home</span>
              </div>

              <div className="px-3 font-black text-slate-400 text-lg">VS</div>

              {/* Away Team */}
              <div className="flex-1 flex flex-col items-center">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2 line-clamp-1">
                  {selectedMatch.awayTeam.teamName || selectedMatch.awayTeam.name}
                </span>
                <input
                  type="number"
                  min={0}
                  value={resultForm.awayScore}
                  onChange={(e) => setResultForm({ ...resultForm, awayScore: Number(e.target.value) })}
                  className="w-16 h-12 text-center text-xl font-black rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Away</span>
              </div>
            </div>

            {/* Goals & Assists Section (Accordion Toggle) */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsFormGoalsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚽</span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                      Goals & Assists Telemetry
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400">
                      Record specific goal scorers, minutes, and assist playmakers
                    </span>
                  </div>
                  {resultForm.goals.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {resultForm.goals.length} Recorded
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold group-hover:text-slate-700 dark:group-hover:text-slate-200">
                  <span>{isFormGoalsOpen ? "Collapse Form" : "Expand Form"}</span>
                  {isFormGoalsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {isFormGoalsOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/40 dark:bg-slate-800/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {/* Home Team Goals */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold">
                        <TeamLogoCrest logo={selectedMatch.homeTeam.logo} name={selectedMatch.homeTeam.teamName || selectedMatch.homeTeam.name || "Home"} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {selectedMatch.homeTeam.teamName || selectedMatch.homeTeam.name || "Home Team"}
                      </h4>
                    </div>
                    
                    {/* Goals Table */}
                    <div className="space-y-2 mb-3">
                      <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="col-span-5">Player</div>
                        <div className="col-span-2 text-center">Min</div>
                        <div className="col-span-4">Assist</div>
                        <div className="col-span-1 text-center">Act</div>
                      </div>
                      {resultForm.goals.filter(g => g.teamId === selectedMatch.homeTeam._id).map((goal, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                          <div className="col-span-5">
                            <select
                              value={goal.scorerId}
                              onChange={(e) => {
                                const newGoals = [...resultForm.goals];
                                const gIdx = newGoals.findIndex(g => g === goal);
                                if (gIdx > -1) newGoals[gIdx].scorerId = e.target.value;
                                setResultForm({ ...resultForm, goals: newGoals });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                            >
                              <option value="">Select Player</option>
                              {homePlayers.map((p: any) => (
                                <option key={p._id || p.id} value={p._id || p.id}>
                                  {p.fullName || (p.firstName ? `${p.firstName} ${p.lastName}` : "") || p.name || "Unknown Player"}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              min={1}
                              value={goal.minute}
                              onChange={(e) => {
                                const newGoals = [...resultForm.goals];
                                const gIdx = newGoals.findIndex(g => g === goal);
                                if (gIdx > -1) newGoals[gIdx].minute = Number(e.target.value);
                                setResultForm({ ...resultForm, goals: newGoals });
                              }}
                              className="w-full text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="col-span-4">
                            <select
                              value={goal.assistId || ""}
                              onChange={(e) => {
                                const newGoals = [...resultForm.goals];
                                const gIdx = newGoals.findIndex(g => g === goal);
                                if (gIdx > -1) newGoals[gIdx].assistId = e.target.value;
                                setResultForm({ ...resultForm, goals: newGoals });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                            >
                              <option value="">None</option>
                              {homePlayers.map((p: any) => (
                                <option key={p._id || p.id} value={p._id || p.id}>
                                  {p.fullName || (p.firstName ? `${p.firstName} ${p.lastName}` : "") || p.name || "Unknown Player"}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteGoal(goal)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={13} className="mx-auto" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {resultForm.goals.filter(g => g.teamId === selectedMatch.homeTeam._id).length === 0 && (
                        <div className="text-center py-3 text-xs font-semibold text-slate-400">No goals added</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 text-xs py-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      onClick={() => handleAddGoal(selectedMatch.homeTeam._id)}
                    >
                      + Add Goal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        updateMatchMutation.isPending ||
                        resultForm.goals.filter(g => g.teamId === selectedMatch.homeTeam._id).some(g => !g.scorerId) ||
                        resultForm.goals.filter(g => g.teamId === selectedMatch.homeTeam._id).length === 0
                      }
                      className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => executeResultSave(true)}
                    >
                      {updateMatchMutation.isPending ? "Saving..." : "Submit Goal"}
                    </Button>
                  </div>
                </div>

                {/* Away Team Goals */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold">
                        <TeamLogoCrest logo={selectedMatch.awayTeam.logo} name={selectedMatch.awayTeam.teamName || selectedMatch.awayTeam.name || "Away"} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {selectedMatch.awayTeam.teamName || selectedMatch.awayTeam.name || "Away Team"}
                      </h4>
                    </div>
                    
                    {/* Goals Table */}
                    <div className="space-y-2 mb-3">
                      <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="col-span-5">Player</div>
                        <div className="col-span-2 text-center">Min</div>
                        <div className="col-span-4">Assist</div>
                        <div className="col-span-1 text-center">Act</div>
                      </div>
                      {resultForm.goals.filter(g => g.teamId === selectedMatch.awayTeam._id).map((goal, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                          <div className="col-span-5">
                            <select
                              value={goal.scorerId}
                              onChange={(e) => {
                                const newGoals = [...resultForm.goals];
                                const gIdx = newGoals.findIndex(g => g === goal);
                                if (gIdx > -1) newGoals[gIdx].scorerId = e.target.value;
                                setResultForm({ ...resultForm, goals: newGoals });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                            >
                              <option value="">Select Player</option>
                              {awayPlayers.map((p: any) => (
                                <option key={p._id || p.id} value={p._id || p.id}>
                                  {p.fullName || (p.firstName ? `${p.firstName} ${p.lastName}` : "") || p.name || "Unknown Player"}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              min={1}
                              value={goal.minute}
                              onChange={(e) => {
                                const newGoals = [...resultForm.goals];
                                const gIdx = newGoals.findIndex(g => g === goal);
                                if (gIdx > -1) newGoals[gIdx].minute = Number(e.target.value);
                                setResultForm({ ...resultForm, goals: newGoals });
                              }}
                              className="w-full text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="col-span-4">
                            <select
                              value={goal.assistId || ""}
                              onChange={(e) => {
                                const newGoals = [...resultForm.goals];
                                const gIdx = newGoals.findIndex(g => g === goal);
                                if (gIdx > -1) newGoals[gIdx].assistId = e.target.value;
                                setResultForm({ ...resultForm, goals: newGoals });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                            >
                              <option value="">None</option>
                              {awayPlayers.map((p: any) => (
                                <option key={p._id || p.id} value={p._id || p.id}>
                                  {p.fullName || (p.firstName ? `${p.firstName} ${p.lastName}` : "") || p.name || "Unknown Player"}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteGoal(goal)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={13} className="mx-auto" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {resultForm.goals.filter(g => g.teamId === selectedMatch.awayTeam._id).length === 0 && (
                        <div className="text-center py-3 text-xs font-semibold text-slate-400">No goals added</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 text-xs py-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      onClick={() => handleAddGoal(selectedMatch.awayTeam._id)}
                    >
                      + Add Goal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        updateMatchMutation.isPending ||
                        resultForm.goals.filter(g => g.teamId === selectedMatch.awayTeam._id).some(g => !g.scorerId) ||
                        resultForm.goals.filter(g => g.teamId === selectedMatch.awayTeam._id).length === 0
                      }
                      className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => executeResultSave(true)}
                    >
                      {updateMatchMutation.isPending ? "Saving..." : "Submit Goal"}
                    </Button>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Auto-calculation preview */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">Auto-calculation preview: </span>
              {resultForm.homeScore > resultForm.awayScore ? (
                <span>{selectedMatch.homeTeam.teamName || selectedMatch.homeTeam.name} wins (+3 pts).</span>
              ) : resultForm.homeScore < resultForm.awayScore ? (
                <span>{selectedMatch.awayTeam.teamName || selectedMatch.awayTeam.name} wins (+3 pts).</span>
              ) : (
                <span>Draw (+1 pt to each team).</span>
              )}
            </div>

            {/* Toggle Match Statistics Section */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Match Telemetry & Statistics
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Record possession, shots, fouls, and yellow cards
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="toggle-stats-entry"
                  checked={resultForm.showStats}
                  onChange={(e) => setResultForm({ ...resultForm, showStats: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                />
              </div>

              {resultForm.showStats && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div className="grid grid-cols-3 gap-2 items-center text-center font-bold text-[11px] text-slate-500 mb-1">
                    <span>Home</span>
                    <span>Metric</span>
                    <span>Away</span>
                  </div>

                  {/* Possession */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={resultForm.homePossession}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        setResultForm({ ...resultForm, homePossession: h, awayPossession: Math.max(0, 100 - h) });
                      }}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <span className="text-center font-semibold text-slate-600 dark:text-slate-300">Possession %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={resultForm.awayPossession}
                      onChange={(e) => {
                        const a = Number(e.target.value);
                        setResultForm({ ...resultForm, awayPossession: a, homePossession: Math.max(0, 100 - a) });
                      }}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>

                  {/* Total Shots */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      value={resultForm.homeShots}
                      onChange={(e) => setResultForm({ ...resultForm, homeShots: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <span className="text-center font-semibold text-slate-600 dark:text-slate-300">Total Shots</span>
                    <input
                      type="number"
                      min={0}
                      value={resultForm.awayShots}
                      onChange={(e) => setResultForm({ ...resultForm, awayShots: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>

                  {/* Shots on Target */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      value={resultForm.homeShotsOnTarget}
                      onChange={(e) => setResultForm({ ...resultForm, homeShotsOnTarget: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <span className="text-center font-semibold text-slate-600 dark:text-slate-300">Shots on Target</span>
                    <input
                      type="number"
                      min={0}
                      value={resultForm.awayShotsOnTarget}
                      onChange={(e) => setResultForm({ ...resultForm, awayShotsOnTarget: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>

                  {/* Corners */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      value={resultForm.homeCorners}
                      onChange={(e) => setResultForm({ ...resultForm, homeCorners: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <span className="text-center font-semibold text-slate-600 dark:text-slate-300">Corners</span>
                    <input
                      type="number"
                      min={0}
                      value={resultForm.awayCorners}
                      onChange={(e) => setResultForm({ ...resultForm, awayCorners: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>

                  {/* Fouls */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      value={resultForm.homeFouls}
                      onChange={(e) => setResultForm({ ...resultForm, homeFouls: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <span className="text-center font-semibold text-slate-600 dark:text-slate-300">Fouls</span>
                    <input
                      type="number"
                      min={0}
                      value={resultForm.awayFouls}
                      onChange={(e) => setResultForm({ ...resultForm, awayFouls: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>

                  {/* Yellow Cards */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      value={resultForm.homeYellowCards}
                      onChange={(e) => setResultForm({ ...resultForm, homeYellowCards: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <span className="text-center font-semibold text-slate-600 dark:text-slate-300">Yellow Cards</span>
                    <input
                      type="number"
                      min={0}
                      value={resultForm.awayYellowCards}
                      onChange={(e) => setResultForm({ ...resultForm, awayYellowCards: Number(e.target.value) })}
                      className="px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const hasIncompleteGoals = resultForm.goals.some(g => !g.scorerId);
              const isSaveDisabled = updateMatchMutation.isPending || hasIncompleteGoals;
              return (
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {hasIncompleteGoals && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        * Please select a player for each added goal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsResultModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSaveDisabled}
                      className="disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {updateMatchMutation.isPending ? "Updating..." : "Save Final Result"}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </form>
        )}
      </Modal>

      {/* ================= CONFIRM FORCE REGENERATION MODAL ================= */}
      <Modal
        isOpen={isConfirmForceOpen}
        onClose={() => setIsConfirmForceOpen(false)}
        className="max-w-[460px] p-6 rounded-xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-rose-600">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Protected Matches Detected</h3>
            <p className="text-xs text-slate-500">Completed or scored matches require confirmation</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 mb-6">
          <p>
            The system detected <strong>{protectedCount} match(es)</strong> that already have recorded scores or are marked as <strong>COMPLETED</strong>.
          </p>
          <p className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-lg text-rose-700 dark:text-rose-400 font-medium">
            ⚠️ Force regenerating will overwrite pairings, times, or score records for these fixtures. Are you sure you want to proceed?
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsConfirmForceOpen(false)}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleGenerateFixtures(true)}
            disabled={generateFixturesMutation.isPending}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {generateFixturesMutation.isPending ? "Regenerating..." : "Force Overwrite & Regenerate"}
          </button>
        </div>
      </Modal>

      {/* ================= CONFIRM DELETE ROUND MODAL ================= */}
      <Modal
        isOpen={!!deleteRoundTarget}
        onClose={() => setDeleteRoundTarget(null)}
        className="max-w-md p-6 rounded-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Delete {deleteRoundTarget?.roundName}?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Are you sure you want to delete this round? All scheduled matches in {deleteRoundTarget?.roundName} will be permanently removed. This action cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-none"
              onClick={() => setDeleteRoundTarget(null)}
              disabled={deleteRoundMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-none bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              onClick={() => {
                if (deleteRoundTarget) {
                  deleteRoundMutation.mutate(deleteRoundTarget.round, {
                    onSuccess: () => {
                      setDeleteRoundTarget(null);
                    },
                  });
                }
              }}
              disabled={deleteRoundMutation.isPending}
            >
              {deleteRoundMutation.isPending ? "Deleting..." : "Delete Round"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
