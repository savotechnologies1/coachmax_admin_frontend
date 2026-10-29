import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeagueTeams,
  addTeamToLeague,
  removeTeamFromLeague,
  toggleTeamStatus,
  updateLeagueTeamStats,
} from "../api/leagueApi";
import { LeagueTeam, TeamRecord } from "../types/league";
import { toast } from "react-hot-toast";

export const useLeagueTeams = (leagueId: string) => {
  return useQuery<LeagueTeam[]>({
    queryKey: ["leagueTeams", leagueId],
    queryFn: () => getLeagueTeams(leagueId),
    enabled: !!leagueId,
  });
};

export const useAddTeamToLeague = (leagueId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string[] | string | Partial<LeagueTeam>) => {
      let teamIds: string[] = [];
      if (Array.isArray(input)) {
        teamIds = input;
      } else if (typeof input === "string") {
        teamIds = [input];
      } else if (input && input._id) {
        teamIds = [input._id];
      }
      return addTeamToLeague(leagueId, teamIds);
    },
    onSuccess: () => {
      ["league", "leagueMaster", "leagueTeams", "leagueLadder", "leagueSchedule", "leagueStats", "leagueGraphs", "leagueMatches"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key, leagueId] }));
      ["teams", "team", "teamPlayers", "playerProfile", "players", "registrationRequests", "sidebarBadges"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueLadder", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueStats", leagueId] });
      toast.success("Team added to league");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to add team");
    },
  });
};

export const useRemoveTeamFromLeague = (leagueId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) => removeTeamFromLeague(leagueId, teamId),
    onSuccess: () => {
      ["league", "leagueMaster", "leagueTeams", "leagueLadder", "leagueSchedule", "leagueStats", "leagueGraphs", "leagueMatches"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key, leagueId] }));
      ["teams", "team", "teamPlayers", "playerProfile", "players"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueLadder", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueStats", leagueId] });
      toast.success("Team removed from league");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove team");
    },
  });
};

export const useToggleTeamStatus = (leagueId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, status }: { teamId: string; status: "ACTIVE" | "INACTIVE" }) =>
      toggleTeamStatus(leagueId, teamId, status),
    onSuccess: () => {
      ["league", "leagueMaster", "leagueTeams", "leagueLadder", "leagueSchedule", "leagueStats", "leagueGraphs", "leagueMatches"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key, leagueId] }));
      ["teams", "team", "teamPlayers", "playerProfile", "players"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      toast.success("Team status updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update team status");
    },
  });
};

export const useUpdateLeagueTeamStats = (leagueId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, stats }: { teamId: string; stats: Partial<TeamRecord> }) =>
      updateLeagueTeamStats(leagueId, teamId, stats),
    onSuccess: () => {
      ["league", "leagueMaster", "leagueTeams", "leagueLadder", "leagueSchedule", "leagueStats", "leagueGraphs", "leagueMatches"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key, leagueId] }));
      ["teams", "team", "teamPlayers", "playerProfile", "players"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueLadder", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueStats", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueGraphs", leagueId] });
      toast.success("Team league statistics updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update team statistics");
    },
  });
};
