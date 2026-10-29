import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeagueLadder, recalculateLeagueLadder } from "../api/leagueApi";
import { TeamStanding } from "../types/league";
import { toast } from "react-hot-toast";

export const useLeagueLadder = (leagueId: string) => {
  return useQuery<TeamStanding[]>({
    queryKey: ["leagueLadder", leagueId],
    queryFn: () => getLeagueLadder(leagueId),
    enabled: !!leagueId,
  });
};

export const useRecalculateLadder = (leagueId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => recalculateLeagueLadder(leagueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueLadder", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueStats", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagueGraphs", leagueId] });
      toast.success("Ladder recalculated successfully from match results");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to recalculate ladder");
    },
  });
};
