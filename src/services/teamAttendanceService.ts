import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, "") || "";

const getHeaders = (token?: string) => {
  const authToken = token || localStorage.getItem("token") || "";
  return {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      "ngrok-skip-browser-warning": "true",
    },
  };
};

export interface PlayerStatistics {
  appearances?: number;
  goals?: number;
  assists?: number;
  cleanSheets?: number;
  yellowCards?: number;
  redCards?: number;
  minutesPlayed?: number;
}

export interface TeamAttendanceRecord {
  player: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "TRIAL" | string;
  comment?: string;
  reason?: string;
}

export const teamAttendanceService = {
  /**
   * 1. Create Team (supports round and dates)
   * @param teamData - { teamName, round, date: ["25-09-2026", "26-09-2026"], logoFile, ... }
   */
  async createTeam(teamData: any, token?: string) {
    if (teamData instanceof FormData) {
      const res = await axios.post(`${API_BASE}/api/admin/teams`, teamData, {
        headers: {
          ...getHeaders(token).headers,
        },
      });
      return res.data;
    }

    if (teamData.logoFile || teamData.teamLogo instanceof File) {
      const formData = new FormData();
      Object.keys(teamData).forEach((key) => {
        if (key === "date" || key === "dates" || key === "sessionDates") {
          formData.append("date", Array.isArray(teamData[key]) ? JSON.stringify(teamData[key]) : teamData[key]);
        } else if (key === "players") {
          formData.append("players", JSON.stringify(teamData[key]));
        } else if (key === "logoFile" || key === "teamLogo") {
          if (teamData[key] instanceof File) {
            formData.append("teamLogo", teamData[key]);
          }
        } else if (teamData[key] !== undefined && teamData[key] !== null) {
          formData.append(key, teamData[key]);
        }
      });
      const res = await axios.post(`${API_BASE}/api/admin/teams`, formData, {
        headers: {
          ...getHeaders(token).headers,
        },
      });
      return res.data;
    } else {
      const res = await axios.post(`${API_BASE}/api/admin/teams`, teamData, getHeaders(token));
      return res.data;
    }
  },

  /**
   * 2. Update Team
   */
  async updateTeam(teamId: string, updateData: any, token?: string) {
    if (updateData instanceof FormData) {
      const res = await axios.put(`${API_BASE}/api/admin/teams/${teamId}`, updateData, {
        headers: {
          ...getHeaders(token).headers,
        },
      });
      return res.data;
    }
    const res = await axios.put(`${API_BASE}/api/admin/teams/${teamId}`, updateData, getHeaders(token));
    return res.data;
  },

  /**
   * 3. Get Team Sessions (Admin/Coach)
   */
  async getTeamSessions(teamId: string, token?: string) {
    const res = await axios.get(`${API_BASE}/api/admin/getTeamSessions/${teamId}`, getHeaders(token));
    return res.data;
  },

  /**
   * 4. Get Team Full Roster & Attendance Matrix (Admin)
   */
  async getTeamFullTable(teamId: string, termId: string | null = null, token?: string) {
    const params: any = { teamId };
    if (termId) params.termId = termId;
    const res = await axios.get(`${API_BASE}/api/admin/getTeamFullTable`, {
      ...getHeaders(token),
      params,
    });
    return res.data;
  },

  /**
   * 5. Mark Team Attendance (Admin/Coach)
   * @param teamId
   * @param sessionDate - Canonical 'YYYY-MM-DD' calendar date (displayed DD/MM/YYYY)
   * @param records - [{ player: 'id', status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED', comment: '' }]
   */
  async markTeamAttendance(teamId: string, sessionDate: string, records: TeamAttendanceRecord[], token?: string) {
    const res = await axios.post(
      `${API_BASE}/api/admin/markTeamAttendance/${teamId}`,
      { sessionDate, records },
      getHeaders(token)
    );
    return res.data;
  },

  /**
   * 6. Update Player Statistics in Team (Admin)
   */
  async updatePlayerStatistics(teamId: string, playerId: string, statistics: PlayerStatistics, token?: string) {
    const res = await axios.put(
      `${API_BASE}/api/admin/teams/${teamId}/players/${playerId}/statistics`,
      statistics,
      getHeaders(token)
    );
    return res.data;
  },

  /**
   * 7. Get Player Statistics in Team (Admin)
   */
  async getPlayerStatistics(teamId: string, playerId: string, token?: string) {
    const res = await axios.get(
      `${API_BASE}/api/admin/teams/${teamId}/players/${playerId}/statistics`,
      getHeaders(token)
    );
    return res.data;
  },

  /**
   * 8. Get Player/Parent Team Attendance (User Mobile/Web App)
   */
  async getMyTeamAttendance(teamId: string, userToken?: string) {
    const res = await axios.get(
      `${API_BASE}/api/users/getMyAttendanceByTeam/${teamId}`,
      getHeaders(userToken)
    );
    return res.data;
  },
};

export default teamAttendanceService;
