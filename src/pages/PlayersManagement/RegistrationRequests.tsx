import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageMeta from "../../components/common/PageMeta";
import { Player } from "../../types/player";
import PlayerTable from "../../components/players/PlayerTable";
import PlayerDetailCard from "../../components/players/PlayerDetailCard";
import AssignClassModal from "../../components/players/AssignClassModal";
import { useRegistrationRequests } from "../../hooks/useRegistrationRequests";
import { rejectAndDeleteVerificationRequest } from "../../api/verificationApi";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { useTerms } from "../../hooks/useTerms";
import { Users, GraduationCap, School, Sun, CalendarDays, Layers } from "lucide-react";

const REQUEST_METRICS = [
  { key: "ALL", label: "All requests", icon: Users, color: "text-blue-600 bg-blue-50" },
  { key: "ACADEMY", label: "Academy", icon: GraduationCap, color: "text-violet-600 bg-violet-50" },
  { key: "SCHOOL", label: "School", icon: School, color: "text-cyan-600 bg-cyan-50" },
  { key: "HOLIDAY", label: "Holiday / Camp", icon: Sun, color: "text-amber-600 bg-amber-50" },
  { key: "EVENT", label: "Events", icon: CalendarDays, color: "text-emerald-600 bg-emerald-50" },
  { key: "OTHER", label: "Other programs", icon: Layers, color: "text-slate-600 bg-slate-100" },
] as const;

const REQUEST_SOURCES = [
  { key: "ALL", label: "All submitters" },
  { key: "APP", label: "App" },
  { key: "SUPER_ADMIN", label: "Super Admin" },
  { key: "COACH", label: "Coach" },
] as const;

export default function RegistrationRequests() {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<(typeof REQUEST_METRICS)[number]["key"]>("ALL");
  const [submittedBy, setSubmittedBy] = useState<(typeof REQUEST_SOURCES)[number]["key"]>("ALL");
  const [medical, setMedical] = useState("");
  const [term, setTerm] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [playerToAssign, setPlayerToAssign] = useState<Player | null>(null);
  const [playerToRejectAndDelete, setPlayerToRejectAndDelete] = useState<Player | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { terms } = useTerms({ isEvent: "all" });
  const queryClient = useQueryClient();
  const { markItemAsRead } = useSidebarBadges();
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchQuery); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [searchQuery]);
  const { data, isLoading, isError, error, refetch } = useRegistrationRequests(page, limit, { search, status: "PENDING", group, submittedBy, isMedicalCondition: medical, term, ageGroup });
  const totalRequests = data?.total ?? 0;
  const totalPages = Math.max(1, data?.totalPages || 1);
  const firstVisiblePage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const visiblePages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstVisiblePage + index);
  const firstRequest = totalRequests === 0 ? 0 : (page - 1) * limit + 1;
  const lastRequest = Math.min(page * limit, totalRequests);
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);
  const players = data?.users || [];
  const selectPlayer = (player: Player) => { if (player.requestId) markItemAsRead("verificationRequests", player.requestId); setSelectedPlayer(player); };
  const rejectAndDelete = useMutation({
    mutationFn: () => rejectAndDeleteVerificationRequest(playerToRejectAndDelete!.requestId!, rejectionReason.trim()),
    onSuccess: async (response) => {
      await Promise.all(["registrationRequests", "coachTemporaryPlayers", "players", "playerStats", "sidebarBadges", "unallocatedPlayers", "allocatedPlayers"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(response.message || "Request rejected and deleted; player profile and history were retained");
      setPlayerToRejectAndDelete(null);
      setRejectionReason("");
      if (selectedPlayer?.requestId === playerToRejectAndDelete?.requestId) setSelectedPlayer(null);
    },
    onError: (failure: any) => { if (!failure._handled) toast.error(failure.response?.data?.message || failure.message); },
  });
  const controlClass = "border border-slate-200 p-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700";
  return <>
    <PageMeta title="Verification Requests | CoachMax" description="Review parent registrations and admin/coach temporary-player requests" />
    <div className="mb-5"><h1 className="text-2xl font-bold dark:text-white">Verification Requests</h1><p className="text-sm text-slate-500">Review pending player requests by program. Each request is reviewed separately.</p></div>
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Request categories">
      {REQUEST_METRICS.map((metric) => {
        const Icon = metric.icon;
        return <button key={metric.key} type="button" aria-pressed={group === metric.key} onClick={() => { setGroup(metric.key); setPage(1); }} className={`flex min-h-[78px] items-center gap-3 border bg-white px-3 py-3 text-left shadow-sm transition-colors dark:bg-slate-900 ${group === metric.key ? "border-[#0047FF] ring-1 ring-[#0047FF]" : "border-slate-200 hover:border-blue-300 dark:border-slate-700"}`}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center ${metric.color}`}><Icon size={18} /></span>
          <span className="min-w-0"><span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{metric.label}</span><strong className="block text-xl leading-6 text-slate-900 dark:text-white">{data?.metrics?.[metric.key] ?? 0}</strong></span>
        </button>;
      })}
    </div>
    <div className="flex flex-wrap gap-2 mb-4">
      <input aria-label="Search requests" placeholder="Search player, parent, email or phone" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className={`${controlClass} flex-1 min-w-52`} />
      <select aria-label="Requested by" value={submittedBy} onChange={(event) => { setSubmittedBy(event.target.value as (typeof REQUEST_SOURCES)[number]["key"]); setPage(1); }} className={`${controlClass} min-w-[180px]`}>
        {REQUEST_SOURCES.map((item) => <option key={item.key} value={item.key}>{item.label} ({data?.sourceMetrics?.[item.key] ?? 0})</option>)}
      </select>
      <select aria-label="Medical conditions" value={medical} onChange={(event) => { setMedical(event.target.value); setPage(1); }} className={controlClass}><option value="">Medical: all</option><option value="true">Medical: YES</option><option value="false">Medical: NO</option></select>
      <select aria-label="Requested term" value={term} onChange={(event) => { setTerm(event.target.value); setPage(1); }} className={controlClass}><option value="">All requested terms</option>{terms.map((item) => <option key={item._id} value={item._id}>{item.year} · {item.name}</option>)}</select>
      <select aria-label="U group" value={ageGroup} onChange={(event) => { setAgeGroup(event.target.value); setPage(1); }} className={controlClass}><option value="">All U groups</option>{Array.from({ length: 20 }, (_, index) => index + 3).map((group) => <option key={group} value={`U${group}`}>U{group}</option>)}</select>
    </div>
    <p className="text-sm text-slate-500 mb-3">{totalRequests} requests · U groups use {term ? "the selected term year" : "the current year"}.</p>
    <div className="flex flex-col xl:flex-row gap-3 items-start">
      <div className="flex-1 w-full min-w-0">
        {isLoading ? <p className="p-8 text-center">Loading requests…</p> : isError ? <div role="alert" className="p-6 border text-red-600">{error.message}<button onClick={() => refetch()} className="ml-3 underline">Retry</button></div> : !players.length ? <p className="p-8 border text-center text-slate-500">No requests match these filters.</p> : <PlayerTable players={players} selectedPlayerId={selectedPlayer?.requestId || ""} onSelectPlayer={selectPlayer} onAssignClass={(player) => { selectPlayer(player); setPlayerToAssign(player); }} onOpenRequestedClass={(player) => setPlayerToAssign(player)} onRejectAndDeleteRequest={(player) => { setRejectionReason(""); setPlayerToRejectAndDelete(player); }} onRequestSourceClick={(value) => { setSubmittedBy(value); setPage(1); }} showStatusColumn showRequestDetails showAddedBy showPaymentStatus={false} page={page} limit={limit} preserveOrder />}
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-slate-500">
            <span>Showing {firstRequest}–{lastRequest} of {totalRequests}</span>
            <label className="flex items-center gap-2">Rows per page
              <select aria-label="Rows per page" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className={controlClass}>
                {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>
          <nav aria-label="Verification request pages" className="flex flex-wrap items-center gap-1">
            <button aria-label="First page" disabled={page <= 1 || isLoading} onClick={() => setPage(1)} className="border px-2.5 py-2 disabled:opacity-40 dark:border-slate-700">First</button>
            <button aria-label="Previous page" disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="border px-2.5 py-2 disabled:opacity-40 dark:border-slate-700">Previous</button>
            {firstVisiblePage > 1 && <><button onClick={() => setPage(1)} className="border px-3 py-2 dark:border-slate-700">1</button>{firstVisiblePage > 2 && <span className="px-1 text-slate-400">…</span>}</>}
            {visiblePages.map((pageNumber) => <button key={pageNumber} aria-label={`Page ${pageNumber}`} aria-current={pageNumber === page ? "page" : undefined} onClick={() => setPage(pageNumber)} className={`min-w-9 border px-3 py-2 dark:border-slate-700 ${pageNumber === page ? "border-blue-700 bg-blue-700 text-white dark:bg-blue-700" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{pageNumber}</button>)}
            {visiblePages[visiblePages.length - 1] < totalPages && <>{visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}<button onClick={() => setPage(totalPages)} className="border px-3 py-2 dark:border-slate-700">{totalPages}</button></>}
            <button aria-label="Next page" disabled={isLoading || page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="border px-2.5 py-2 disabled:opacity-40 dark:border-slate-700">Next</button>
            <button aria-label="Last page" disabled={isLoading || page >= totalPages} onClick={() => setPage(totalPages)} className="border px-2.5 py-2 disabled:opacity-40 dark:border-slate-700">Last</button>
          </nav>
        </div>
      </div>
      {selectedPlayer && <PlayerDetailCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} onAssignClass={(player) => { setSelectedPlayer(null); setPlayerToAssign(player); }} isRegistrationRequest />}
    </div>
    {playerToAssign && <AssignClassModal player={playerToAssign} onClose={() => setPlayerToAssign(null)} />}
    {playerToRejectAndDelete && <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-delete-title"><div className="w-full max-w-md border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"><h2 id="reject-delete-title" className="font-bold text-slate-900 dark:text-white">Reject and delete {playerToRejectAndDelete.fullName}’s request?</h2><p className="my-3 text-sm text-slate-600 dark:text-slate-300">This permanently deletes this verification request after rejecting it. The linked player profile, other requests, enrollments, and history will remain.</p><label htmlFor="rejection-reason" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Rejection reason <span className="text-rose-600">*</span></label><textarea id="rejection-reason" aria-label="Rejection reason" placeholder="Enter the reason for rejection" value={rejectionReason} maxLength={2000} onChange={(event) => setRejectionReason(event.target.value)} className="min-h-24 w-full resize-y border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800" /><p className="mt-1 text-xs text-slate-500">Required, up to 2,000 characters.</p><div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => { setPlayerToRejectAndDelete(null); setRejectionReason(""); }} disabled={rejectAndDelete.isPending} className="border px-4 py-2">Cancel</button><button type="button" onClick={() => rejectAndDelete.mutate()} disabled={!rejectionReason.trim() || rejectAndDelete.isPending} className="bg-rose-600 px-4 py-2 text-white disabled:opacity-50">{rejectAndDelete.isPending ? "Rejecting…" : "Reject and Delete"}</button></div></div></div>}
  </>;
}
