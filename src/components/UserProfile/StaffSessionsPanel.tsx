import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Laptop, Smartphone, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import apiClient from "../../api/apiClient";
import { formatDateTime } from "../../utils/dateTime";

type Session = { id: string; source: "Web" | "App" | "Unknown"; device: string; ipAddress: string; signedInAt: string | null; lastSeenAt: string | null; current: boolean };
const date = (value: string | null) => value ? formatDateTime(value, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not recorded";

export default function StaffSessionsPanel({ coachId }: { coachId?: string }) {
  const endpoint = coachId ? `/api/admin/coaches/${coachId}/sessions` : "/api/admin/sessions";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery<{ data: Session[]; total: number }>({
    queryKey: ["staff-sessions", coachId || "self"],
    queryFn: async () => (await apiClient.get(endpoint)).data,
    refetchInterval: 60_000,
  });

  const signedOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    queryClient.clear();
    navigate("/signin", { replace: true });
  };
  const revoke = async (id?: string) => {
    const key = id || "all";
    setBusyId(key);
    try {
      const response = await apiClient.delete(id ? `${endpoint}/${id}` : endpoint);
      if (response.data?.currentRevoked) { signedOut(); return; }
      await queryClient.invalidateQueries({ queryKey: ["staff-sessions", coachId || "self"] });
      toast.success(id ? "Device signed out" : "All devices signed out");
    } catch {
      // The shared API client shows the server error.
    } finally { setBusyId(null); }
  };

  return <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"><ShieldCheck size={20} /> Active devices</h3>
        <p className="mt-1 text-sm text-gray-500">{coachId ? "Devices signed in to this coach account" : "Your signed-in devices"} · {data?.total ?? 0} active</p>
        {coachId && <Link to={`/audit-logs?userId=${encodeURIComponent(coachId)}`} className="mt-1 inline-block text-xs font-semibold text-blue-700 hover:underline">View this coach’s activity and sign-ins</Link>}</div>
      {!!data?.total && <button type="button" disabled={!!busyId} onClick={() => revoke()} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Sign out all devices</button>}
    </div>
    {isLoading ? <p className="mt-5 text-sm text-gray-500">Loading devices…</p> : isError ? <p className="mt-5 text-sm text-red-600">Could not load active devices.</p> : !data?.data?.length ? <p className="mt-5 text-sm text-gray-500">No active devices.</p> :
      <div className="mt-5 divide-y divide-gray-100 dark:divide-gray-800">{data.data.map((session) => <div key={session.id} className="flex flex-wrap items-center gap-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">{session.source === "App" ? <Smartphone size={20} /> : <Laptop size={20} />}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-gray-900 dark:text-white">{session.device}</strong>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800">{session.source}</span>
          {session.current && <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">This device</span>}</div>
          <p className="mt-1 text-xs text-gray-500">IP {session.ipAddress || "Not recorded"} · Signed in {date(session.signedInAt)} · Last active {date(session.lastSeenAt)}</p></div>
        <button type="button" disabled={!!busyId} onClick={() => revoke(session.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"><LogOut size={14} />{busyId === session.id ? "Signing out…" : "Sign out"}</button>
      </div>)}</div>}
  </section>;
}
