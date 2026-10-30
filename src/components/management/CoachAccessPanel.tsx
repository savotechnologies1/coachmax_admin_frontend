import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../api/apiClient";
import { ACCESS_ACTIONS, ACCESS_MODULES, SUPPORTED_ACTIONS, type AccessAction, type AccessModule, type CoachAccess } from "../../hooks/useCoachAccess";

const emptyAccess = (): CoachAccess => ({
  mode: "PARTIAL",
  permissions: Object.fromEntries(ACCESS_MODULES.map(({ key, assigned }) => [key, {
    scope: assigned ? "ASSIGNED" : "ALL",
    ...Object.fromEntries(ACCESS_ACTIONS.map(({ key: action }) => [action, false])),
  }])) as CoachAccess["permissions"],
});

export default function CoachAccessPanel({ coachId }: { coachId: string }) {
  const client = useQueryClient();
  const { data, isLoading, isError } = useQuery<CoachAccess>({
    queryKey: ["coach-access", coachId],
    queryFn: async () => (await apiClient.get(`/api/admin/coaches/${coachId}/access`)).data,
    enabled: Boolean(coachId),
  });
  const [draft, setDraft] = useState<CoachAccess>(emptyAccess);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (data && !dirty) setDraft({ mode: data.mode, permissions: structuredClone(data.permissions) });
  }, [data, dirty]);

  const save = useMutation({
    mutationFn: async () => (await apiClient.put(`/api/admin/coaches/${coachId}/access`, draft)).data,
    onSuccess: (saved: CoachAccess) => {
      client.setQueryData(["coach-access", coachId], saved);
      setDirty(false);
      toast.success("Coach permissions saved");
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not save permissions"),
  });

  const changeMode = (mode: CoachAccess["mode"]) => { setDraft((current) => ({ ...current, mode })); setDirty(true); };
  const changeScope = (module: AccessModule, scope: "ALL" | "ASSIGNED") => {
    setDraft((current) => ({ ...current, permissions: { ...current.permissions, [module]: {
      ...current.permissions[module], scope,
      ...(module === "leagues" && scope === "ASSIGNED" ? { create: false, delete: false, approve: false } : {}),
    } } }));
    setDirty(true);
  };
  const changeAction = (module: AccessModule, action: AccessAction, checked: boolean) => {
    setDraft((current) => ({ ...current, permissions: { ...current.permissions, [module]: {
      ...current.permissions[module], [action]: checked,
      ...(checked && action !== "read" ? { read: true } : {}),
      ...(!checked && action === "read" ? Object.fromEntries(ACCESS_ACTIONS.map(({ key }) => [key, false])) : {}),
    } } }));
    setDirty(true);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-labelledby="coach-access-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-5 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><ShieldCheck size={21} /></span>
          <div><h2 id="coach-access-title" className="font-bold text-gray-900 dark:text-white">Coach access and permissions</h2><p className="mt-1 text-sm text-gray-500">Changes are enforced on the coach’s next request. Only Admin can change these settings.</p></div>
        </div>
        <button type="button" onClick={() => save.mutate()} disabled={!dirty || save.isPending || isLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#0047FF] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Check size={16} />{save.isPending ? "Saving…" : "Save access"}</button>
      </div>
      {isLoading ? <div className="p-8 text-sm text-gray-500">Loading permissions…</div> : isError ? <div className="p-8 text-sm text-red-600">Permissions could not be loaded.</div> : <div className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${draft.mode === "FULL" ? "border-blue-500 bg-blue-50/70" : "border-gray-200"}`}><input type="radio" name="coach-access-mode" checked={draft.mode === "FULL"} onChange={() => changeMode("FULL")} /><span><strong className="block text-sm text-gray-900">Full access</strong><span className="mt-1 block text-xs text-gray-600">All admin screens, records, reports, and management actions. Permission settings remain Admin-controlled.</span></span></label>
          <label className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${draft.mode === "PARTIAL" ? "border-blue-500 bg-blue-50/70" : "border-gray-200"}`}><input type="radio" name="coach-access-mode" checked={draft.mode === "PARTIAL"} onChange={() => changeMode("PARTIAL")} /><span><strong className="block text-sm text-gray-900">Partial access</strong><span className="mt-1 block text-xs text-gray-600">Choose record scope and View, Add, Edit, Delete, Assign, Approve, and Export for each area.</span></span></label>
        </div>
        {draft.mode === "FULL" ? <p className="mt-5 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><LockKeyhole size={16} /> Full access takes effect when you save. The coach can use all operational screens, including reports and finance.</p> : <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-[1050px] w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-200"><tr><th className="p-3">Area</th><th className="p-3">Records</th>{ACCESS_ACTIONS.map((action) => <th key={action.key} className="p-3 text-center">{action.label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{ACCESS_MODULES.map(({ key, label, assigned }) => <tr key={key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"><th scope="row" className="whitespace-nowrap p-3 font-semibold text-slate-800 dark:text-slate-100">{label}</th><td className="p-3">{key === "notes" ? <span className="text-slate-500">Own notes</span> : <select aria-label={`${label} record scope`} value={assigned ? draft.permissions[key]?.scope || "ASSIGNED" : "ALL"} onChange={(event) => changeScope(key, event.target.value as "ALL" | "ASSIGNED")} disabled={!assigned} className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs disabled:bg-gray-100 dark:border-gray-700 dark:bg-slate-900"><option value="ASSIGNED">Assigned only</option><option value="ALL">All records</option></select>}</td>{ACCESS_ACTIONS.map(({ key: action }) => <td key={action} className="p-3 text-center">{SUPPORTED_ACTIONS[key].includes(action) && !(key === "leagues" && draft.permissions[key]?.scope === "ASSIGNED" && ["create", "delete", "approve"].includes(action)) ? <input type="checkbox" aria-label={`${label}: ${action}`} checked={Boolean(draft.permissions[key]?.[action])} onChange={(event) => changeAction(key, action, event.target.checked)} className="h-4 w-4 accent-blue-600" /> : <span className="text-slate-300" aria-label="Unavailable">—</span>}</td>)}</tr>)}</tbody></table>
        </div>}
        {dirty && <div className="mt-4 flex items-center justify-end gap-3"><button type="button" onClick={() => { if (data) setDraft({ mode: data.mode, permissions: structuredClone(data.permissions) }); setDirty(false); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Discard changes</button><button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="rounded-lg bg-[#0047FF] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save access</button></div>}
      </div>}
    </section>
  );
}
