import apiClient from "../api/apiClient";

export interface CreateFixturePayload {
  league: string;
  round: number;
  kickoffTime: string;
  sessionDate?: string;
  venue: string;
  field?: string;
  referee?: string;
  homeTeam: string;
  awayTeam: string;
}

export const leagueService = {
  // Fetch complete league data (all 7 tabs consolidated)
  getLeagueData: async (leagueId: string, tab?: string) => {
    const url = tab
      ? `/api/admin/leagues/${leagueId}?tab=${tab}`
      : `/api/admin/leagues/${leagueId}`;
    const response = await apiClient.get(url);
    return response.data?.data || response.data;
  },

  // Save Configuration (Tab 6 & Header)
  updateLeagueConfig: async (leagueId: string, data: FormData) => {
    const response = await apiClient.put(`/api/admin/leagues/${leagueId}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Add team(s) to league (Tab 3 & 7)
  addTeamToLeague: async (leagueId: string, teamIds: string[]) => {
    const response = await apiClient.post(`/api/admin/leagues/${leagueId}/teams`, {
      teamIds,
    });
    return response.data;
  },

  updateLeagueTeamStatus: async (leagueId: string, teamId: string, status: "ACTIVE" | "INACTIVE") => {
    const response = await apiClient.patch(`/api/admin/leagues/${leagueId}/teams/${teamId}/status`, { status });
    return response.data;
  },

  // Remove team from league (Tab 3 & 7)
  removeTeamFromLeague: async (leagueId: string, teamId: string) => {
    const response = await apiClient.delete(`/api/admin/leagues/${leagueId}/teams/${teamId}`);
    return response.data;
  },

  // Schedule a new fixture (Tab 2)
  createFixture: async (fixtureData: CreateFixturePayload) => {
    if (!fixtureData.league) throw new Error("A league is required.");
    const response = await apiClient.post(`/api/admin/leagues/${fixtureData.league}/fixtures`, fixtureData);
    return response.data;
  },

  // Generate or Regenerate Random Fixtures in-place
  generateRandomFixtures: async (leagueId: string, forceRegenerate = false) => {
    const response = await apiClient.post(
      `/api/admin/leagues/${leagueId}/generate-random-fixtures`,
      {
        randomize: true,
        forceRegenerate,
      }
    );
    return response.data;
  },

  // Manual fixture creation under league
  createManualFixture: async (leagueId: string, payload: any) => {
    const response = await apiClient.post(
      `/api/admin/leagues/${leagueId}/fixtures`,
      payload
    );
    return response.data;
  },

  // Manual fixture edit under league (marks fixtureSource: "MANUAL")
  updateFixtureManually: async (leagueId: string, fixtureId: string, payload: any) => {
    const response = await apiClient.put(`/api/admin/leagues/${leagueId}/fixtures/${fixtureId}`, payload);
    return response.data?.data || response.data;
  },

  // Update fixture or enter result with statistics
  updateFixture: async (fixtureId: string, data: any) => {
    const response = await apiClient.put(`/api/admin/fixtures/${fixtureId}`, data);
    return response.data?.data || response.data;
  },

  // Alias for updateFixture with statistics
  updateFixtureStats: async (
    matchId: string,
    data: {
      homeScore?: number;
      awayScore?: number;
      status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "POSTPONED" | string;
      round?: number;
      venue?: string;
      referee?: string;
      matchStatistics?: Record<string, number>;
    }
  ) => {
    const response = await apiClient.put(`/api/admin/fixtures/${matchId}`, data);
    return response.data?.data || response.data;
  },

  // Complete fixture directly
  completeFixture: async (matchId: string, data: any) => {
    const response = await apiClient.post(`/api/admin/fixtures/${matchId}/complete`, data);
    return response.data?.data || response.data;
  },

  // Delete fixture under league
  deleteLeagueFixture: async (leagueId: string, fixtureId: string) => {
    const response = await apiClient.delete(`/api/admin/leagues/${leagueId}/fixtures/${fixtureId}`);
    return response.data?.data || response.data;
  },

  // Delete all fixtures/matches for a specific round under league
  deleteRound: async (leagueId: string, round: number | string) => {
    const response = await apiClient.delete(
      `/api/admin/leagues/${leagueId}/rounds/${round}`
    );
    return response.data?.data || response.data;
  },

  // Delete fixture
  deleteFixture: async (fixtureId: string) => {
    const response = await apiClient.delete(`/api/admin/fixtures/${fixtureId}`);
    return response.data?.data || response.data;
  },

  // 8. Update Team Statistics for a League (Tab 3 & 7)
  updateLeagueTeamStats: async (
    leagueId: string,
    teamId: string,
    stats: {
      played?: number;
      won?: number;
      drawn?: number;
      lost?: number;
      goalsFor?: number;
      goalsAgainst?: number;
      points?: number;
      goalDifference?: number;
    }
  ) => {
    const response = await apiClient.put(
      `/api/admin/leagues/${leagueId}/teams/${teamId}/statistics`,
      stats
    );
    return response.data?.data || response.data;
  },

  // 9. Update Global Team Statistics
  updateTeamStats: async (
    teamId: string,
    stats: {
      played?: number;
      won?: number;
      drawn?: number;
      lost?: number;
      goalsFor?: number;
      goalsAgainst?: number;
      points?: number;
      goalDifference?: number;
    }
  ) => {
    const response = await apiClient.put(`/api/admin/teams/${teamId}/statistics`, stats);
    return response.data?.data || response.data;
  },

  // 10. Recalculate Ladder on demand (Tab 1 & Header)
  recalculateLadder: async (leagueId: string) => {
    const response = await apiClient.post(
      `/api/admin/leagues/${leagueId}/recalculate-ladder`
    );
    return response.data?.data || response.data;
  },
};

export default leagueService;
