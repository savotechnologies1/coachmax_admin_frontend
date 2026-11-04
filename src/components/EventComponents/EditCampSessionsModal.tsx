import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { getEventRegistrationDetails, updateEventRegistrationSessions } from "../../api/eventApi";
import { formatDateOnly, toDateOnly } from "../../utils/dateTime";

interface CampSessionOption {
  _id: string;
  sessionDate: string;
  sessionType: string;
  sessionLabel?: string;
  startTime?: string;
  endTime?: string;
  fee: number;
  capacity?: number | null;
  registeredCount?: number;
  isAvailable: boolean;
  isCancelled?: boolean;
}

interface BookedSession {
  session: string | { _id: string };
  sessionDate: string;
  fee: number;
}

interface EditCampSessionsModalProps {
  player: {
    registrationId: string;
    name: string;
    selectedSessions: BookedSession[];
    totalAmount: number;
  };
  sessions: CampSessionOption[];
  onClose: () => void;
  onSaved: () => void;
}

const sessionIdOf = (booked: BookedSession) =>
  typeof booked.session === "string" ? booked.session : booked.session?._id;
const cents = (amount: number) => Math.round(Number(amount || 0) * 100);
const currency = (amount: number) => `$${amount.toFixed(2)}`;
const selectionMap = (items: BookedSession[]): Record<string, string> => {
  const selected: Record<string, string> = {};
  items.forEach((item) => {
    const date = toDateOnly(item.sessionDate);
    const id = sessionIdOf(item);
    if (date && id) selected[date] = id;
  });
  return selected;
};

export default function EditCampSessionsModal({ player, sessions, onClose, onSaved }: EditCampSessionsModalProps) {
  const [booked, setBooked] = useState<BookedSession[]>(player.selectedSessions || []);
  const [selectedByDate, setSelectedByDate] = useState<Record<string, string>>(() => selectionMap(player.selectedSessions || []));
  const [paidAmount, setPaidAmount] = useState(0);
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError("");
    getEventRegistrationDetails(player.registrationId)
      .then((response) => {
        if (!current) return;
        if (!response.success) throw new Error(response.message || "Could not load this registration");
        if (response.data?.registration?.status !== "REGISTERED") throw new Error("This player is no longer registered for the event");
        const selected = response.data?.registration?.selectedSessions || [];
        if (selected.length === 0 || selected.some((item: BookedSession) => !sessionIdOf(item))) {
          throw new Error("This older registration has no editable session references. Contact support to reconcile it.");
        }
        setBooked(selected);
        setSelectedByDate(selectionMap(selected));
        setPaidAmount(Number(response.data?.billingSummary?.paidAmount || 0));
        setLockedDates(new Set((response.data?.attendanceHistory || [])
          .filter((record: any) => ["PRESENT", "ABSENT", "LATE"].includes(record.status))
          .map((record: any) => toDateOnly(record.sessionDate))));
      })
      .catch((error) => {
        if (current) setLoadError(error?.response?.data?.message || error?.message || "Could not load this registration");
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [player.registrationId, reloadKey]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CampSessionOption[]>();
    sessions.forEach((session) => {
      const date = toDateOnly(session.sessionDate);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(session);
    });
    return [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [sessions]);

  const originalIds = useMemo(() => new Set<string>(booked.map(sessionIdOf).filter((id): id is string => Boolean(id))), [booked]);
  const originalById = useMemo(() => {
    const map = new Map<string, BookedSession>();
    booked.forEach((item) => { const id = sessionIdOf(item); if (id) map.set(id, item); });
    return map;
  }, [booked]);
  const selectedIds = Object.values(selectedByDate);
  const added = selectedIds.filter((id) => !originalIds.has(id));
  const removed = [...originalIds].filter((id) => !selectedIds.includes(id));
  const hasChanges = added.length > 0 || removed.length > 0;
  const newTotal = selectedIds.reduce((sum, id) => {
    const original = originalById.get(id);
    const session = sessions.find((item) => item._id === id);
    return sum + cents(original ? original.fee : Number(session?.fee || 0));
  }, 0) / 100;
  const oldTotal = booked.reduce((sum, item) => sum + cents(item.fee), 0) / 100;
  const balanceDue = Math.max(0, cents(newTotal) - cents(paidAmount)) / 100;
  const creditAmount = Math.max(0, cents(paidAmount) - cents(newTotal)) / 100;

  const toggleSession = (date: string, id: string) => {
    setSelectedByDate((current) => {
      const next = { ...current };
      if (next[date] === id) delete next[date];
      else next[date] = id;
      return next;
    });
  };

  const save = async () => {
    if (!hasChanges || selectedIds.length === 0) return;
    setSaving(true);
    try {
      const response = await updateEventRegistrationSessions(player.registrationId, selectedIds);
      if (!response.success) throw new Error(response.message || "Could not update sessions");
      const billing = response.data?.billingSummary;
      const paymentNote = Number(billing?.creditAmount || 0) > 0
        ? ` · ${currency(Number(billing.creditAmount))} credit to handle`
        : ` · ${currency(Number(billing?.balanceDue || 0))} balance due`;
      toast.success(`Sessions updated: ${added.length} added, ${removed.length} removed${paymentNote}`);
      onClose();
      onSaved();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Could not update sessions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Edit booked sessions for ${player.name}`}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between bg-[#031549] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-white/10"><CalendarDays size={19} /></div>
            <div>
              <h2 className="text-base font-bold">Edit booked sessions</h2>
              <p className="text-xs text-slate-300">{player.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10" aria-label="Close session editor"><X size={19} /></button>
        </div>

        <div className="overflow-y-auto p-5">
          <p className="mb-4 text-xs text-slate-600 dark:text-slate-300">Choose one full or half day session per date. Click a selected option to remove that day.</p>
          {loadError ? (
            <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              <p>{loadError}</p>
              <button type="button" onClick={() => setReloadKey((current) => current + 1)} className="mt-3 border border-red-300 px-3 py-1.5 text-xs font-bold">Retry</button>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading booked sessions...</div>
          ) : (
            <div className="space-y-2">
              {sessionsByDate.map(([date, options]) => (
                <div key={date} className="flex flex-col gap-2 border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-[170px]">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{formatDateOnly(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{lockedDates.has(date) ? "Attendance recorded · locked" : selectedByDate[date] ? "Booked" : "Not booked"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const selected = selectedByDate[date] === option._id;
                      const alreadyBooked = originalIds.has(option._id);
                      const full = option.capacity != null && Number(option.registeredCount || 0) >= option.capacity;
                      const disabled = lockedDates.has(date) || (!selected && !alreadyBooked && (!option.isAvailable || option.isCancelled || full));
                      const label = option.sessionLabel || (option.sessionType === "HALF_DAY" ? "Half day" : option.sessionType === "FULL_DAY" ? "Full day" : "Session");
                      return (
                        <button
                          key={option._id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleSession(date, option._id)}
                          aria-pressed={selected}
                          className={`min-w-[128px] border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-[#0047FF] bg-blue-50 text-[#0039cc] dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-200 text-slate-700 hover:border-[#0047FF] dark:border-slate-700 dark:text-slate-200"}`}
                        >
                          <span className="flex items-center gap-1 font-bold">{selected && <Check size={12} />} {label}</span>
                          <span className="block text-[11px]">{option.startTime}–{option.endTime} · {currency(alreadyBooked ? Number(originalById.get(option._id)?.fee || 0) : Number(option.fee || 0))}</span>
                          {option.isCancelled && <span className="block text-red-600">Cancelled</span>}
                          {!option.isCancelled && full && !alreadyBooked && <span className="block text-red-600">Full</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !loadError && (
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 text-xs dark:border-slate-700 sm:grid-cols-4">
              <div className="bg-slate-50 p-3 dark:bg-slate-800"><span className="block text-slate-500">Current booking</span><strong className="text-sm">{booked.length} sessions · {currency(oldTotal)}</strong></div>
              <div className="bg-blue-50 p-3 dark:bg-blue-950/30"><span className="block text-slate-500">New booking</span><strong className="text-sm text-[#0047FF]">{selectedIds.length} sessions · {currency(newTotal)}</strong></div>
              <div className="bg-emerald-50 p-3 dark:bg-emerald-950/30"><span className="block text-slate-500">Already paid</span><strong className="text-sm">{currency(paidAmount)}</strong></div>
              <div className="bg-amber-50 p-3 dark:bg-amber-950/30"><span className="block text-slate-500">{creditAmount > 0 ? "Credit to handle" : "Balance due"}</span><strong className="text-sm">{currency(creditAmount > 0 ? creditAmount : balanceDue)}</strong></div>
            </div>
          )}
          {!loading && !loadError && hasChanges && (
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{added.length} added, {removed.length} removed. Paid invoices remain unchanged. Additional balance is invoiced; any credit or refund needs separate staff handling.</p>
          )}
          {!loading && !loadError && selectedIds.length === 0 && (
            <p className="mt-3 text-xs font-semibold text-red-600">Keep at least one session. To cancel the whole registration, use Remove player from event.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <button type="button" onClick={onClose} className="border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
          <button type="button" onClick={save} disabled={loading || Boolean(loadError) || saving || !hasChanges || selectedIds.length === 0} className="bg-[#0047FF] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Saving..." : "Save sessions"}
          </button>
        </div>
      </div>
    </div>
  );
}
