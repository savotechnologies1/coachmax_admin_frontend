import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Activity, CalendarDays, CheckCircle2, ChevronDown, Clock3, ExternalLink, FileText, Receipt, Trophy, XCircle } from "lucide-react";
import { useCoachNotes, useUpdatePlayerPaymentStatus } from "../../hooks/usePlayers";
import { formatDateOnly, toDateOnly } from "../../utils/dateTime";

type Item = Record<string, any>;
type Tab = "overview" | "attendance" | "finance" | "competition" | "notes";
type Props = { data: Item; player: Item; termId: string; termLabel: string };
const id = (value: unknown) => String((value as Item)?._id || value || "");
const itemTerm = (item: Item) => id(item.termId || item.term?._id || item.event?.termId?._id);
const shownDate = (value?: string | Date) => value ? formatDateOnly(value) || "—" : "—";
const money = (value?: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value) || 0);
const label = (value?: string) => String(value || "Not recorded").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const tone = (value?: string) => {
  const status = String(value || "").toUpperCase();
  if (["PAID", "APPROVED", "PRESENT", "ACTIVE"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["ABSENT", "REJECTED", "FAILED", "REFUNDED"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["LATE", "PENDING", "UNPAID", "PAYMENT_PENDING", "OVER_DUE"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
};

function Badge({ value }: { value?: string }) {
  return <span className={`inline-flex whitespace-nowrap border px-2 py-0.5 text-[11px] font-semibold ${tone(value)}`}>{label(value)}</span>;
}
function Panel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return <section className="min-w-0 border border-gray-200 bg-white"><header className="flex items-center justify-between border-b border-gray-200 px-4 py-3"><h3 className="text-sm font-bold text-[#07194f]">{title}</h3>{count !== undefined && <span className="text-xs font-semibold text-gray-500">{count}</span>}</header>{children}</section>;
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="px-4 py-7 text-center text-sm text-gray-500">{children}</p>; }
function Metric({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return <div className="border border-gray-200 bg-white px-4 py-3"><p className="text-xs text-gray-500">{title}</p><strong className="mt-1 block text-xl text-[#07194f]">{value}</strong>{hint && <p className="text-xs text-gray-500">{hint}</p>}</div>;
}
function LinkRow({ title, subtitle, badge, onClick }: { title: string; subtitle?: string; badge?: string; onClick?: () => void }) {
  const content = <><span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900">{title}</span>{subtitle && <span className="mt-0.5 block text-xs text-gray-500">{subtitle}</span>}</span><span className="flex shrink-0 items-center gap-2">{badge && <Badge value={badge} />}{onClick && <ExternalLink size={13} className="text-blue-600" />}</span></>;
  return onClick ? <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-0 hover:bg-blue-50/40">{content}</button> : <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0">{content}</div>;
}

export default function PlayerTermDashboard({ data, player, termId, termLabel }: Props) {
  const navigate = useNavigate();
  const updatePaymentStatus = useUpdatePlayerPaymentStatus();
  const [tab, setTab] = useState<Tab>("overview");
  const [notesPage, setNotesPage] = useState(1);
  useEffect(() => setNotesPage(1), [termId]);
  const inTerm = (item: Item) => termId === "ALL" || (termId === "NO_TERM" ? !itemTerm(item) : itemTerm(item) === termId);
  const classes: Item[] = (data.assignedClassesPaymentInfo || []).filter(inTerm);
  const teams: Item[] = (data.assignedTeamsPaymentInfo || []).filter(inTerm);
  const attendance: Item[] = (data.perDayAttendance || []).filter(inTerm);
  const charges: Item[] = (data.paymentFinancialSummary?.history || []).filter(inTerm);
  const transactions: Item[] = (data.paymentTransactions || []).filter(inTerm);
  const events: Item[] = (data.eventRegistrations || []).filter((item: Item) => inTerm({ termId: item.event?.termId?._id || item.event?.termId }));
  const leagues: Item[] = (() => {
    const records = new Map<string, Item>();
    (data.assignedLeagueInfo || []).forEach((item: Item) => records.set(`${item.leagueId}:${item.teamId}`, item));
    (data.leagueStatistics || []).forEach((item: Item) => {
      const key = `${item.leagueId}:${item.teamId}`;
      const previous = records.get(key);
      records.set(key, { ...previous, ...item, statistics: { ...(previous?.statistics || {}), ...(item.statistics || {}) } });
    });
    return [...records.values()].filter(inTerm);
  })();
  const marked = attendance.filter((item) => ["PRESENT", "ABSENT", "LATE"].includes(String(item.status).toUpperCase()));
  const attended = marked.filter((item) => ["PRESENT", "LATE"].includes(String(item.status).toUpperCase())).length;
  const absent = marked.filter((item) => String(item.status).toUpperCase() === "ABSENT").length;
  const rate = marked.length ? Math.round(attended * 100 / marked.length) : 0;
  const received = charges.reduce((sum, item) => sum + (Number(item.amountReceived) || 0), 0);
  const due = charges.reduce((sum, item) => sum + (Number(item.amountPending) || 0), 0);
  const awaiting = charges.reduce((sum, item) => sum + (Number(item.amountAwaitingApproval) || 0), 0);
  const goals = leagues.reduce((sum, item) => sum + (Number(item.statistics?.goals) || 0), 0);
  const appearances = leagues.reduce((sum, item) => sum + (Number(item.statistics?.appearances) || 0), 0);
  const groupedAttendance = (() => {
    const groups = new Map<string, { key: string; name: string; termName: string; rows: Item[] }>();
    attendance.forEach((item) => {
      const key = `${item.contextType || "CLASS"}:${id(item.contextId || item.class?._id || item.contextName || item.className)}:${itemTerm(item)}`;
      if (!groups.has(key)) groups.set(key, { key, name: item.contextName || item.className || "Activity", termName: item.termName || "No term linked", rows: [] });
      groups.get(key)!.rows.push(item);
    });
    return [...groups.values()].map((group) => ({ ...group, rows: group.rows.sort((a, b) => toDateOnly(b.sessionDate).localeCompare(toDateOnly(a.sessionDate))) }));
  })();
  const noteScope = termId === "ALL" ? undefined : termId === "NO_TERM" ? { noTerm: true } : { termId };
  const { data: notesResponse, isLoading: notesLoading } = useCoachNotes(String(player._id), notesPage, 10, noteScope);
  const notes: Item[] = notesResponse?.data || [];
  const openClass = (item: Item) => navigate("/program/academy", { state: { classId: item.classId || item.contextId, day: item.dayOfWeek } });
  const openCharge = (item: Item) => {
    if (item.eventId) navigate(`/event-details/${id(item.eventId)}`);
    else if (item.leagueId) navigate(`/leagues/${id(item.leagueId)}`);
    else if (item.teamId) navigate(`/teams/${id(item.teamId)}`);
    else if (item.classId) openClass(item);
  };

  const tabs: { key: Tab; title: string; icon: typeof Activity; count?: number }[] = [
    { key: "overview", title: "Overview", icon: Activity },
    { key: "attendance", title: "Attendance", icon: CalendarDays, count: attendance.length },
    { key: "finance", title: "Payments & orders", icon: Receipt, count: charges.length },
    { key: "competition", title: "Teams & leagues", icon: Trophy, count: leagues.length },
    { key: "notes", title: "Notes", icon: FileText },
  ];

  return <div className="space-y-4">
    <nav aria-label="Player details sections" className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 pt-1">{tabs.map(({ key, title, icon: Icon, count }) => <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-blue-700"}`}><Icon size={15} />{title}{count !== undefined && <span className="text-[10px] text-gray-400">{count}</span>}</button>)}</nav>

    {tab === "overview" && <div className="space-y-3"><div className="grid grid-cols-2 gap-2 lg:grid-cols-4"><Metric title="Classes" value={classes.length} hint={termLabel} /><Metric title="Attendance" value={marked.length ? `${rate}%` : "—"} hint={`${attended} attended · ${absent} absent`} /><Metric title="Amount due" value={money(due)} /><Metric title="League goals" value={goals} hint={`${appearances} appearances`} /></div><div className="grid gap-3 xl:grid-cols-2">
      <Panel title="Classes" count={classes.length}>{classes.length ? classes.map((item) => <div key={id(item.classId)} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0"><button type="button" onClick={() => openClass(item)} className="min-w-0 text-left hover:text-blue-700"><span className="block truncate text-sm font-semibold">{item.className}</span><span className="block text-xs text-gray-500">{[item.dayOfWeek, item.startTime, item.location].filter(Boolean).join(" · ") || item.termName || "Class"}</span></button><select aria-label={`Payment status for ${item.className}`} value={String(item.paymentStatus || "UNPAID").toUpperCase()} onChange={(event) => updatePaymentStatus.mutate({ userId: String(player._id), payload: { paymentStatus: event.target.value, classId: id(item.classId) } })} disabled={updatePaymentStatus.isPending} className="max-w-28 border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"><option value="PAID">Paid</option><option value="UNPAID">Unpaid</option><option value="TRIAL">Trial</option><option value="OVER_DUE">Overdue</option><option value="HANDSHAKE">Handshake</option><option value="TBC">TBC</option><option value="EXTRA">Extra</option><option value="SUBSTITUTE">Substitute</option></select></div>) : <Empty>No classes in this term.</Empty>}</Panel>
      <div className="space-y-3"><Panel title="Teams and leagues" count={teams.length + leagues.length}>{teams.length + leagues.length ? <>{teams.map((item) => <LinkRow key={id(item.teamId)} title={item.teamName || "Team"} subtitle="Team" badge={item.paymentStatus} onClick={() => navigate(`/teams/${id(item.teamId)}`)} />)}{leagues.map((item) => <LinkRow key={`${item.leagueId}:${item.teamId}`} title={item.leagueName || "League"} subtitle={`${item.teamName || "Team"} · ${item.statistics?.goals || 0} goals`} badge={item.paymentStatus} onClick={() => navigate(`/leagues/${id(item.leagueId)}`)} />)}</> : <Empty>No teams or leagues in this term.</Empty>}</Panel><Panel title="Events and holiday programs" count={events.length}>{events.length ? events.map((item) => <LinkRow key={id(item._id)} title={item.event?.title || "Event"} subtitle={`${shownDate(item.event?.startDate)} · ${item.event?.category || item.event?.eventType || "Event"}`} badge={item.paymentStatus || item.status} onClick={() => navigate(`/event-details/${id(item.event?._id)}`)} />) : <Empty>No events in this term.</Empty>}</Panel></div>
    </div></div>}

    {tab === "attendance" && <div className="space-y-3"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric title="Attendance rate" value={marked.length ? `${rate}%` : "—"} /><Metric title="Attended" value={attended} /><Metric title="Absent" value={absent} /><Metric title="Sessions" value={attendance.length} /></div><Panel title="Attendance by activity" count={groupedAttendance.length}>{groupedAttendance.length ? groupedAttendance.map((group) => {
      const counted = group.rows.filter((item) => ["PRESENT", "ABSENT", "LATE"].includes(String(item.status).toUpperCase()));
      const came = counted.filter((item) => ["PRESENT", "LATE"].includes(String(item.status).toUpperCase())).length;
      return <details key={group.key} className="group border-b border-gray-100 last:border-0"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"><span className="min-w-0"><strong className="block truncate text-sm text-gray-900">{group.name}</strong><span className="text-xs text-gray-500">{group.termName} · {group.rows.length} sessions</span></span><span className="flex shrink-0 items-center gap-3 text-xs font-semibold text-gray-700">{counted.length ? `${came}/${counted.length} attended` : "Not marked"}<ChevronDown size={16} className="text-gray-400 group-open:rotate-180" /></span></summary><div className="border-t border-gray-100 bg-gray-50/50">{group.rows.map((item, index) => {
        const status = String(item.status || "NOT_MARKED").toUpperCase();
        const Icon = status === "PRESENT" ? CheckCircle2 : status === "ABSENT" ? XCircle : status === "LATE" ? Clock3 : null;
        return <div key={id(item.attendanceId) || index} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5 last:border-0"><span className="flex min-w-0 items-center gap-3"><span className="w-24 shrink-0 text-xs font-semibold text-gray-700">{shownDate(item.sessionDate)}</span><span className="truncate text-xs text-gray-500">{item.note || item.reason || item.remarks || item.comment || ""}</span></span><span className="flex shrink-0 items-center gap-1.5">{Icon && <Icon size={15} className={status === "PRESENT" ? "text-emerald-600" : status === "ABSENT" ? "text-rose-600" : "text-amber-600"} />}<Badge value={status} /></span></div>;
      })}</div></details>;
    }) : <Empty>No attendance in this term.</Empty>}</Panel></div>}

    {tab === "finance" && <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric title="Received" value={money(received)} />
        <Metric title="Amount due" value={money(due)} />
        <Metric title="Awaiting approval" value={money(awaiting)} />
        <Metric title="Transactions" value={transactions.length} />
      </div>
      <Panel title="Charges, invoices and orders" count={charges.length}>
        {charges.length ? <div className="max-h-[440px] overflow-y-auto">
          {charges.map((item) => <div key={item.id} className="grid gap-2 border-b border-gray-100 px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{item.name || "Charge"}</p>
              <p className="text-xs text-gray-500">{label(item.type)} · {shownDate(item.createdAt || item.dueDate)}{item.householdPurchase ? " · Family purchase" : ""}{item.orderStatus ? ` · Order ${label(item.orderStatus)}` : ""}</p>
              {item.products?.length > 0 && <p className="truncate text-xs text-gray-500">{item.products.map((product: Item) => `${product.name} ×${product.quantity}`).join(", ")}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span><strong className="text-gray-900">{money(item.fee)}</strong><span className="block text-[11px] text-gray-500">{money(item.amountPending)} due</span></span>
              <Badge value={item.paymentStatus} />
              {item.invoiceId && <button onClick={() => navigate(`/invoices/${id(item.invoiceId)}`)} className="font-semibold text-blue-700 hover:underline">Invoice {item.invoiceNumber || "Open"}</button>}
              {item.orderId && <button onClick={() => navigate(`/orders/${id(item.orderId)}`)} className="font-semibold text-blue-700 hover:underline">Order <ExternalLink size={12} className="inline" /></button>}
              {!item.invoiceId && !item.orderId && (item.eventId || item.leagueId || item.teamId || item.classId) && <button onClick={() => openCharge(item)} className="font-semibold text-blue-700 hover:underline">Open</button>}
            </div>
          </div>)}
        </div> : <Empty>No charges, invoices or orders in this term.</Empty>}
      </Panel>
      <Panel title="Transactions" count={transactions.length}>
        {transactions.length ? <div className="max-h-[320px] overflow-y-auto">
          {transactions.map((item) => <LinkRow key={id(item.id)} title={`${money(item.amount)} · ${item.name}`} subtitle={`${shownDate(item.createdAt)} · ${label(item.method)}${item.transactionId ? ` · ${item.transactionId}` : ""}${item.invoiceNumber ? ` · ${item.invoiceNumber}` : ""}`} badge={item.status} onClick={item.invoiceId ? () => navigate(`/invoices/${id(item.invoiceId)}`) : undefined} />)}
        </div> : <Empty>No transactions in this term.</Empty>}
      </Panel>
      {termId !== "ALL" && termId !== "NO_TERM" && <p className="text-xs text-gray-500">Family orders without a term appear under All terms or No term linked.</p>}
    </div>}

    {tab === "competition" && <div className="space-y-3"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric title="Leagues" value={leagues.length} /><Metric title="Appearances" value={appearances} /><Metric title="Goals" value={goals} /><Metric title="Assists" value={leagues.reduce((sum, item) => sum + (Number(item.statistics?.assists) || 0), 0)} /></div><Panel title="League performance" count={leagues.length}>{leagues.length ? leagues.map((item) => <div key={`${item.leagueId}:${item.teamId}`} className="border-b border-gray-100 px-4 py-3 last:border-0"><div className="flex flex-wrap items-center justify-between gap-2"><button onClick={() => navigate(`/leagues/${id(item.leagueId)}`)} className="text-left text-sm font-bold text-blue-700 hover:underline">{item.leagueName} <ExternalLink size={12} className="inline" /></button><Badge value={item.paymentStatus} /></div><p className="mt-1 text-xs text-gray-500">{item.teamName || "Team"} · {item.season || termLabel}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-700"><span><strong>{item.statistics?.appearances || 0}</strong> appearances</span><span><strong>{item.statistics?.goals || 0}</strong> goals</span><span><strong>{item.statistics?.assists || 0}</strong> assists</span><span><strong>{item.statistics?.cleanSheets || 0}</strong> clean sheets</span><span><strong>{item.statistics?.yellowCards || 0}</strong> yellow cards</span><span><strong>{item.statistics?.redCards || 0}</strong> red cards</span><span><strong>{item.statistics?.minutesPlayed || 0}</strong> minutes</span></div></div>) : <Empty>No league statistics in this term.</Empty>}</Panel><Panel title="Team assignments" count={teams.length}>{teams.length ? teams.map((item) => <LinkRow key={id(item.teamId)} title={item.teamName || "Team"} subtitle={item.termName || termLabel} badge={item.paymentStatus} onClick={() => navigate(`/teams/${id(item.teamId)}`)} />) : <Empty>No team assignments in this term.</Empty>}</Panel>{termId === "ALL" && player.statistics && <Panel title="Career totals"><div className="flex flex-wrap gap-x-5 gap-y-2 px-4 py-3 text-xs text-gray-700"><span>{player.statistics.appearances || 0} appearances</span><span>{player.statistics.goals || 0} goals</span><span>{player.statistics.assists || 0} assists</span><span>{player.statistics.cleanSheets || 0} clean sheets</span></div></Panel>}</div>}

    {tab === "notes" && <div className="grid gap-3 xl:grid-cols-2"><Panel title="Admin note"><div className="px-4 py-4"><p className="mb-2 text-xs text-gray-500">Applies across all terms.</p><p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{player.adminNote || "No admin note recorded."}</p></div></Panel><Panel title="Coach notes" count={notesResponse?.total || 0}>{notesLoading ? <Empty>Loading notes…</Empty> : notes.length ? <>{notes.map((note) => <div key={id(note._id)} className="border-b border-gray-100 px-4 py-3 last:border-0"><div className="flex justify-between gap-2"><span className="text-xs font-bold text-blue-700">{label(note.noteType)}</span><time className="text-xs text-gray-500">{shownDate(note.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{note.description}</p><p className="mt-1 text-xs text-gray-500">{note.classId?.name || "General note"} · {note.coach?.name || "Coach"}</p></div>)}<div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500"><span>Page {notesResponse?.page || 1} of {Math.max(1, notesResponse?.totalPages || 1)}</span><div className="flex gap-2"><button disabled={notesPage <= 1} onClick={() => setNotesPage((page) => page - 1)} className="border border-gray-200 px-2 py-1 disabled:opacity-40">Previous</button><button disabled={notesPage >= (notesResponse?.totalPages || 1)} onClick={() => setNotesPage((page) => page + 1)} className="border border-gray-200 px-2 py-1 disabled:opacity-40">Next</button></div></div></> : <Empty>No coach notes in this term.</Empty>}</Panel></div>}
  </div>;
}
