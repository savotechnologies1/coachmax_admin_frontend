import apiClient from "./apiClient";

export interface CloneTermInfo {
  term: { _id: string; name: string; year: number; startDate?: string; endDate?: string; status?: string; isEvent?: boolean };
  counts: { classes: number; leagues: number; teams: number; players: number };
  classes: Array<{ _id: string; name: string; dayOfWeek?: string; startTime?: string; endTime?: string; playerCount: number }>;
  leagues: Array<{ _id: string; name: string; season?: string; teamCount: number }>;
  teams: Array<{ _id: string; name: string; playerCount: number; leagueNames: string[] }>;
}

export const getCloneTermInfo = async (termId: string): Promise<CloneTermInfo> => {
  const response = await apiClient.get(`/api/admin/cloneTerm/term-info/${termId}`);
  return response.data.data;
};

export interface CloneProgress {
  percent: number;
  completed: number;
  total: number;
  remaining: number;
  stage: "preparing" | "classes" | "teams" | "leagues" | "saving" | "complete";
  message: string;
}

export interface CloneTermPayload {
  sourceTermId: string;
  targetTermId: string;
  classes: Array<{ classId: string; players: string[] }>;
  leagues: Array<{ leagueId: string; teams: Array<{ teamId: string; players: string[] }> }>;
}

export interface CloneTermResult {
  success: boolean;
  message: string;
  summary: Record<string, number | boolean>;
}

export const streamCloneTerm = async (
  payload: CloneTermPayload,
  onProgress: (progress: CloneProgress) => void,
): Promise<CloneTermResult> => {
  const baseUrl = String(import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/, "");
  const token = localStorage.getItem("token");
  const response = await fetch(`${baseUrl}/api/admin/cloneTerm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/signin";
    }
    throw new Error(details?.message || `Clone request failed (${response.status}).`);
  }
  if (!response.body) throw new Error("Live clone progress is unavailable. Please check the clone result before trying again.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: CloneTermResult | null = null;
  const handleEvent = (block: string) => {
    const lines = block.split("\n");
    const event = lines.find((line) => line.startsWith("event: "))?.slice(7);
    const data = lines.filter((line) => line.startsWith("data: ")).map((line) => line.slice(6)).join("\n");
    if (!event || !data) return;
    const value = JSON.parse(data);
    if (event === "progress") onProgress(value as CloneProgress);
    if (event === "error") throw new Error(value.message || "Clone failed.");
    if (event === "complete") {
      onProgress({ percent: 100, completed: value.completed, total: value.total, remaining: 0, stage: "complete", message: "Clone saved successfully" });
      result = value as CloneTermResult;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let separator = buffer.indexOf("\n\n");
    while (separator >= 0) {
      handleEvent(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
  if (!result) throw new Error("The clone connection ended before completion. Check the target term before trying again.");
  return result;
};
