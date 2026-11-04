import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Mail, RefreshCw, Search, Send, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import PageMeta from "../../components/common/PageMeta";
import { todayDateOnly, toDateOnly } from "../../utils/dateTime";
import {
  createEmailCampaign,
  getEmailAudiences,
  getEmailAudiencePlayers,
  getEmailCampaignDetails,
  getEmailCampaigns,
  previewEmailCampaign,
  retryFailedEmailRecipients,
} from "../../api/emailCampaignApi";

type AudienceType = "CLASS" | "EVENT" | "TOURNAMENT";
type ContactStatus = "AVAILABLE" | "SKIPPED";
type AudienceOption = {
  _id: string; name: string; year?: string; startDate?: string; endDate?: string; status?: string;
  termId?: string; termName?: string; categoryId?: string; categoryName?: string; programId?: string; programName?: string;
};
type PlayerRow = { playerId: string; playerName: string; recipientName: string; email: string; contactStatus: ContactStatus; reason?: string };
type Counts = { queued: number; sending: number; sent: number; failed: number; skipped: number };
type Campaign = {
  _id: string; audienceType: AudienceType; audienceName: string; subject: string; message: string;
  selectedPlayerCount: number; createdAt: string; createdBy?: { name?: string; email?: string };
  counts: Counts; state: string;
};
type CampaignRecipient = {
  _id: string; playerNames: string[]; recipientName: string; recipientEmail: string;
  status: string; skipReason?: string; attempts: number; queuedAt?: string; startedAt?: string;
  sentAt?: string; nextAttemptAt?: string; lastError?: string;
};
const TYPES: { value: AudienceType; label: string; plural: string }[] = [
  { value: "CLASS", label: "Class", plural: "Classes" },
  { value: "EVENT", label: "Event", plural: "Events" },
  { value: "TOURNAMENT", label: "Tournament", plural: "Tournaments" },
];
const PAGE_SIZE = 100;
const shortDate = (value?: string) => value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
const apiMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;
const STATE_STYLES: Record<string, string> = {
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  QUEUED: "bg-blue-50 text-blue-700 border-blue-200",
  SENDING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  IN_QUEUE: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  SKIPPED: "bg-slate-100 text-slate-600 border-slate-200",
};
const stateStyle = (status: string) => STATE_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";

const eventStatusLabel = (option: AudienceOption, today: string) => {
  const status = String(option.status || "UPCOMING").toUpperCase();
  if (status === "CANCELLED" || status === "CANCELED") return "Cancelled";
  const startDate = toDateOnly(option.startDate);
  const endDate = toDateOnly(option.endDate);
  const effectiveStatus = startDate && endDate && startDate <= endDate && endDate < today ? "COMPLETED" : status;
  if (effectiveStatus === "ONGOING" || effectiveStatus === "LIVE") return "Live / Ongoing";
  if (effectiveStatus === "COMPLETED") return "Completed";
  if (effectiveStatus === "UPCOMING") return "Upcoming";
  return effectiveStatus.charAt(0) + effectiveStatus.slice(1).toLowerCase();
};

const eventStatusBadgeStyle = (label: string) => {
  if (label === "Live / Ongoing") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label === "Upcoming") return "border-blue-200 bg-blue-50 text-blue-700";
  if (label === "Completed") return "border-slate-200 bg-slate-100 text-slate-600";
  if (label === "Cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

function EventAudienceSelect({
  options,
  value,
  disabled,
  placeholder,
  today,
  onChange,
}: {
  options: AudienceOption[];
  value: string;
  disabled: boolean;
  placeholder: string;
  today: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option._id === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectedStatus = selectedOption ? eventStatusLabel(selectedOption, today) : "";
  return <div ref={rootRef} className="relative mt-1">
    <button type="button" role="combobox" aria-label="Select event" aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)} className="flex h-10 w-full items-center gap-2 border border-slate-300 bg-white px-3 text-left text-sm text-slate-800 outline-none focus:border-[#064bff] disabled:bg-slate-100">
      <span className={`min-w-0 flex-1 truncate ${selectedOption ? "font-medium" : "text-slate-400"}`}>{selectedOption?.name || placeholder}</span>
      {selectedOption && <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-bold ${eventStatusBadgeStyle(selectedStatus)}`}>{selectedStatus}</span>}
      <ChevronDown size={15} className="shrink-0 text-slate-500" />
    </button>
    {open && <div role="listbox" aria-label="Events" className="absolute left-0 top-full z-40 mt-1 max-h-64 w-full min-w-[280px] overflow-y-auto border border-slate-200 bg-white py-1 shadow-lg">
      {options.length ? options.map((option) => {
        const status = eventStatusLabel(option, today);
        const isSelected = option._id === value;
        return <button key={option._id} type="button" role="option" aria-selected={isSelected} onClick={() => { onChange(option._id); setOpen(false); }} className={`flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 ${isSelected ? "bg-blue-50/70" : "bg-white"}`}>
          <span className="min-w-0 flex-1 truncate text-slate-800">{option.name}</span>
          <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-bold ${eventStatusBadgeStyle(status)}`}>{status}</span>
        </button>;
      }) : <div className="px-3 py-2 text-sm text-slate-500">No events for this year</div>}
    </div>}
  </div>;
}

const initialAudienceFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("audienceType");
  const audienceType: AudienceType = requestedType === "EVENT" || requestedType === "TOURNAMENT" ? requestedType : "CLASS";
  return { audienceType, audienceId: params.get("audienceId") || "" };
};

export default function EmailCampaignDashboard() {
  const initialAudience = initialAudienceFromUrl();
  const [audiences, setAudiences] = useState<Record<AudienceType, AudienceOption[]>>({ CLASS: [], EVENT: [], TOURNAMENT: [] });
  const [audienceType, setAudienceType] = useState<AudienceType>(initialAudience.audienceType);
  const [audienceId, setAudienceId] = useState(initialAudience.audienceId);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [termFilter, setTermFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [subProgramFilter, setSubProgramFilter] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [contactCounts, setContactCounts] = useState({ players: 0, availablePlayers: 0, missingOrOptedOut: 0, deliverableRecipients: 0 });
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("ALL");
  const [playerPage, setPlayerPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllAudience, setSelectAllAudience] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"recipients" | "history">("recipients");
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignOverview, setCampaignOverview] = useState<Counts>({ queued: 0, sending: 0, sent: 0, failed: 0, skipped: 0 });
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState("ALL");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientStatusFilter, setRecipientStatusFilter] = useState("ALL");
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientTotal, setRecipientTotal] = useState(0);

  const currentAudienceOptions = audiences[audienceType] || [];
  const yearOptions = useMemo(() => Array.from(new Set([
    String(new Date().getFullYear()),
    ...currentAudienceOptions.map((option) => option.year || ""),
  ].filter(Boolean))).sort((left, right) => Number(right) - Number(left)), [currentAudienceOptions]);
  const yearScopedAudiences = useMemo(() => yearFilter === "ALL"
    ? currentAudienceOptions
    : currentAudienceOptions.filter((option) => option.year === yearFilter), [currentAudienceOptions, yearFilter]);
  const today = todayDateOnly();
  const termOptions = useMemo(() => {
    const unique = new Map<string, string>();
    yearScopedAudiences.forEach((option) => {
      if (option.termId && option.termName) unique.set(option.termId, option.termName);
    });
    return Array.from(unique, ([id, name]) => ({ id, name })).sort((first, second) => first.name.localeCompare(second.name));
  }, [yearScopedAudiences]);
  const termScopedClasses = useMemo(() => yearScopedAudiences.filter((option) => option.termId === termFilter), [yearScopedAudiences, termFilter]);
  const programOptions = useMemo(() => {
    const unique = new Map<string, string>();
    termScopedClasses.forEach((option) => {
      if (option.categoryId && option.categoryName) unique.set(option.categoryId, option.categoryName);
    });
    return Array.from(unique, ([id, name]) => ({ id, name })).sort((first, second) => first.name.localeCompare(second.name));
  }, [termScopedClasses]);
  const programScopedClasses = useMemo(() => termScopedClasses.filter((option) => option.categoryId === programFilter), [termScopedClasses, programFilter]);
  const subProgramOptions = useMemo(() => {
    const unique = new Map<string, string>();
    programScopedClasses.forEach((option) => {
      if (option.programId && option.programName) unique.set(option.programId, option.programName);
    });
    return Array.from(unique, ([id, name]) => ({ id, name })).sort((first, second) => first.name.localeCompare(second.name));
  }, [programScopedClasses]);
  const audienceOptions = audienceType === "CLASS"
    ? programScopedClasses.filter((option) => option.programId === subProgramFilter)
    : yearScopedAudiences;
  const selectedCount = selectAllAudience ? Math.max(0, contactCounts.players - excludedIds.size) : selectedIds.size;
  const selectedTypeLabel = TYPES.find((item) => item.value === audienceType)?.label || "Audience";
  const audiencePlaceholder = loadingAudiences
    ? "Loading audiences..."
    : !yearFilter
      ? "Choose year first"
      : audienceType === "CLASS" && !termFilter
        ? "Choose term first"
        : audienceType === "CLASS" && !programFilter
          ? "Choose program first"
          : audienceType === "CLASS" && !subProgramFilter
            ? "Choose sub-program first"
            : `Choose ${audienceType === "CLASS" ? "class" : selectedTypeLabel.toLowerCase()}`;
  const playerPages = Math.max(1, Math.ceil(playerTotal / PAGE_SIZE));

  const resetRecipientSelection = () => {
    setAudienceId("");
    setPlayers([]);
    setPlayerTotal(0);
    setContactCounts({ players: 0, availablePlayers: 0, missingOrOptedOut: 0, deliverableRecipients: 0 });
    setSelectedIds(new Set());
    setExcludedIds(new Set());
    setSelectAllAudience(false);
    setPlayerPage(1);
    setSearch("");
    setContactFilter("ALL");
    setLoadError("");
  };

  useEffect(() => {
    let live = true;
    setLoadingAudiences(true);
    getEmailAudiences().then((response) => {
      if (!live) return;
      const data = response?.data || {};
      setAudiences({ CLASS: data.classes || [], EVENT: data.events || [], TOURNAMENT: data.tournaments || [] });
    }).catch((error) => {
      if (live) toast.error(apiMessage(error, "Could not load email audiences."));
    }).finally(() => live && setLoadingAudiences(false));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!audienceId) return;
    const selectedAudience = (audiences[audienceType] || []).find((option) => option._id === audienceId);
    if (!selectedAudience) return;
    if (selectedAudience.year && selectedAudience.year !== yearFilter) setYearFilter(selectedAudience.year);
    if (audienceType === "CLASS") {
      if (selectedAudience.termId && selectedAudience.termId !== termFilter) setTermFilter(selectedAudience.termId);
      if (selectedAudience.categoryId && selectedAudience.categoryId !== programFilter) setProgramFilter(selectedAudience.categoryId);
      if (selectedAudience.programId && selectedAudience.programId !== subProgramFilter) setSubProgramFilter(selectedAudience.programId);
    } else if (audienceType === "TOURNAMENT" && selectedAudience.termId && selectedAudience.termId !== termFilter) {
      setTermFilter(selectedAudience.termId);
    }
  }, [audiences, audienceId, audienceType, yearFilter, termFilter, programFilter, subProgramFilter]);

  useEffect(() => {
    if (!audienceId) return;
    let live = true;
    setLoadingPlayers(true);
    setLoadError("");
    getEmailAudiencePlayers({ audienceType, audienceId, search, contactStatus: contactFilter, page: playerPage, limit: PAGE_SIZE })
      .then((response) => {
        if (!live) return;
        const data = response?.data || {};
        setPlayers(data.players || []);
        setPlayerTotal(Number(data.total) || 0);
        setContactCounts(data.counts || { players: 0, availablePlayers: 0, missingOrOptedOut: 0, deliverableRecipients: 0 });
      }).catch((error) => {
        if (live) setLoadError(apiMessage(error, "Could not load players for this audience."));
      }).finally(() => live && setLoadingPlayers(false));
    return () => { live = false; };
  }, [audienceType, audienceId, search, contactFilter, playerPage]);

  const refreshCampaigns = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getEmailCampaigns({ page: campaignPage, limit: 25, search: historySearch, audienceType: historyType });
      setCampaigns(response?.data || []);
      setCampaignTotal(Number(response?.total) || 0);
      setCampaignOverview(response?.overview || { queued: 0, sending: 0, sent: 0, failed: 0, skipped: 0 });
    } catch (error) {
      toast.error(apiMessage(error, "Could not load email history."));
    } finally {
      setHistoryLoading(false);
    }
  }, [campaignPage, historySearch, historyType]);
  useEffect(() => { refreshCampaigns(); }, [refreshCampaigns]);
  useEffect(() => {
    if (activeTab !== "history") return;
    const timer = window.setInterval(() => { refreshCampaigns(); }, 15000);
    return () => window.clearInterval(timer);
  }, [activeTab, refreshCampaigns]);

  const loadCampaign = useCallback(async (campaign: Campaign, page = 1, status = recipientStatusFilter) => {
    try {
      const response = await getEmailCampaignDetails(campaign._id, { page, limit: 100, status });
      const data = response?.data || {};
      setSelectedCampaign(data.campaign || campaign);
      setCampaignRecipients(data.recipients || []);
      setRecipientTotal(Number(data.total) || 0);
      setRecipientPage(page);
    } catch (error) {
      toast.error(apiMessage(error, "Could not load delivery records."));
    }
  }, [recipientStatusFilter]);
  useEffect(() => {
    if (!selectedCampaign || activeTab !== "history") return;
    const timer = window.setInterval(() => { loadCampaign(selectedCampaign, recipientPage, recipientStatusFilter); }, 12000);
    return () => window.clearInterval(timer);
  }, [activeTab, loadCampaign, recipientPage, recipientStatusFilter, selectedCampaign]);

  const selectionPayload = useCallback(() => ({
    audienceType,
    audienceId,
    selectAll: selectAllAudience,
    excludedPlayerIds: selectAllAudience ? [...excludedIds] : [],
    playerIds: selectAllAudience ? [] : [...selectedIds],
  }), [audienceType, audienceId, selectAllAudience, excludedIds, selectedIds]);

  const togglePlayer = (playerId: string) => {
    if (selectAllAudience) {
      setExcludedIds((current) => {
        const next = new Set(current);
        if (next.has(playerId)) next.delete(playerId); else next.add(playerId);
        return next;
      });
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId); else next.add(playerId);
      return next;
    });
  };
  const isPlayerSelected = (playerId: string) => selectAllAudience ? !excludedIds.has(playerId) : selectedIds.has(playerId);

  const openComposer = async () => {
    if (!audienceId || selectedCount < 1) return toast.error("Choose an audience and at least one player.");
    try {
      const response = await previewEmailCampaign(selectionPayload());
      setPreview(response?.data || null);
      setComposeSubject("");
      setComposeMessage("");
      setComposeOpen(true);
    } catch (error) {
      toast.error(apiMessage(error, "Could not preview the selected recipients."));
    }
  };

  const sendCampaign = async (event: FormEvent) => {
    event.preventDefault();
    if (!composeSubject.trim() || !composeMessage.trim()) return toast.error("Enter an email subject and message.");
    setSending(true);
    try {
      const response = await createEmailCampaign({ ...selectionPayload(), subject: composeSubject, message: composeMessage });
      const data = response?.data || {};
      if (data.queueFailures) {
        toast.error(`${data.queueFailures} email${data.queueFailures === 1 ? "" : "s"} could not be queued. Check the campaign history for details.`);
      }
      if (data.queuedRecipients) {
        toast.success(`${data.queuedRecipients} recipient email${data.queuedRecipients === 1 ? "" : "s"} added to the queue.`);
      }
      if (!data.queuedRecipients && !data.queueFailures) {
        toast("No emails were queued. Check the skipped recipients in campaign history.", { icon: "ℹ️" });
      }
      if (data.skippedPlayers) toast(`${data.skippedPlayers} player${data.skippedPlayers === 1 ? "" : "s"} skipped because email is missing or disabled.`, { icon: "ℹ️" });
      setComposeOpen(false);
      setActiveTab("history");
      setSelectedIds(new Set());
      setExcludedIds(new Set());
      setSelectAllAudience(false);
      setCampaignPage(1);
      await refreshCampaigns();
      if (data.campaignId) {
        const campaign = { _id: data.campaignId } as Campaign;
        await loadCampaign(campaign, 1, "ALL");
      }
    } catch (error) {
      if (!(error as any)?._handled) toast.error(apiMessage(error, "Could not queue this email."));
    } finally {
      setSending(false);
    }
  };

  const retryFailed = async () => {
    if (!selectedCampaign) return;
    try {
      const response = await retryFailedEmailRecipients(selectedCampaign._id);
      toast.success(response?.message || "Failed messages queued for retry.");
      await loadCampaign(selectedCampaign, recipientPage, recipientStatusFilter);
      await refreshCampaigns();
    } catch (error) {
      toast.error(apiMessage(error, "Could not retry failed messages."));
    }
  };

  const audienceLabel = useMemo(() => audienceOptions.find((option) => option._id === audienceId)?.name || "", [audienceOptions, audienceId]);
  const selectedPageCount = players.filter((player) => isPlayerSelected(player.playerId)).length;

  return (
    <>
      <PageMeta title="Bulk Email | CoachMax" description="Select players, send private group emails, and track delivery." />
      <div className="w-full space-y-5 p-4 text-slate-900 sm:p-6">
        <PageBreadcrumb pageTitle="Email Center" subtitle="Email selected players across classes, events, and tournaments. Every recipient gets a private message." items={[{ name: "Communication", path: "/communication" }]}>
          {activeTab === "recipients" && <button onClick={openComposer} disabled={!audienceId || selectedCount < 1} className="inline-flex h-10 items-center gap-2 bg-[#064bff] px-4 text-sm font-semibold text-white hover:bg-[#003bd1] disabled:cursor-not-allowed disabled:bg-slate-300"><Send size={16} /> Send bulk email{selectedCount ? ` (${selectedCount})` : ""}</button>}
        </PageBreadcrumb>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Recipient emails queued", value: campaignOverview.queued + campaignOverview.sending, icon: Clock3, tint: "text-blue-700 bg-blue-50" },
            { label: "Sent", value: campaignOverview.sent, icon: Check, tint: "text-emerald-700 bg-emerald-50" },
            { label: "Failed", value: campaignOverview.failed, icon: RefreshCw, tint: "text-red-700 bg-red-50" },
            { label: "Skipped", value: campaignOverview.skipped, icon: Users, tint: "text-slate-700 bg-slate-100" },
          ].map((item) => <div key={item.label} className="flex items-center gap-3 border border-slate-200 bg-white p-4 shadow-sm"><span className={`grid h-10 w-10 place-items-center ${item.tint}`}><item.icon size={18} /></span><div><div className="text-xl font-bold text-[#07194f]">{item.value}</div><div className="text-xs text-slate-500">{item.label}</div></div></div>)}
        </div>

        <div className="border border-slate-200 bg-white shadow-sm">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setActiveTab("recipients")} className={`border-b-2 px-5 py-3 text-sm font-semibold ${activeTab === "recipients" ? "border-[#064bff] text-[#064bff]" : "border-transparent text-slate-500"}`}><Users size={15} className="mr-2 inline" />Select recipients</button>
            <button onClick={() => setActiveTab("history")} className={`border-b-2 px-5 py-3 text-sm font-semibold ${activeTab === "history" ? "border-[#064bff] text-[#064bff]" : "border-transparent text-slate-500"}`}><Clock3 size={15} className="mr-2 inline" />Campaign history</button>
          </div>

          {activeTab === "recipients" ? <section className="space-y-4 p-4 sm:p-5">
            <div className={`grid gap-3 md:grid-cols-2 ${audienceType === "CLASS" ? "xl:grid-cols-4 2xl:grid-cols-7" : "xl:grid-cols-4"}`}>
              <label className="text-xs font-semibold text-slate-600">Year<select value={yearFilter} onChange={(event) => { resetRecipientSelection(); setYearFilter(event.target.value); setTermFilter(""); setProgramFilter(""); setSubProgramFilter(""); }} disabled={loadingAudiences} className="mt-1 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#064bff] disabled:bg-slate-100"><option value="">Choose year</option><option value="ALL">All years</option>{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-600">Audience type<select value={audienceType} onChange={(event) => { resetRecipientSelection(); setYearFilter(String(new Date().getFullYear())); setTermFilter(""); setProgramFilter(""); setSubProgramFilter(""); setAudienceType(event.target.value as AudienceType); }} className="mt-1 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#064bff]"><option value="CLASS">Class</option><option value="EVENT">Event</option><option value="TOURNAMENT">Tournament</option></select></label>
              {audienceType === "CLASS" ? <>
                <label className="text-xs font-semibold text-slate-600">Term<select value={termFilter} onChange={(event) => { resetRecipientSelection(); setTermFilter(event.target.value); setProgramFilter(""); setSubProgramFilter(""); }} disabled={!yearFilter || loadingAudiences} className="mt-1 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#064bff] disabled:bg-slate-100"><option value="">{!yearFilter ? "Choose year first" : "Choose term"}</option>{termOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-600">Program<select value={programFilter} onChange={(event) => { resetRecipientSelection(); setProgramFilter(event.target.value); setSubProgramFilter(""); }} disabled={!termFilter || loadingAudiences} className="mt-1 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#064bff] disabled:bg-slate-100"><option value="">{!termFilter ? "Choose term first" : "Choose program"}</option>{programOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-600">Sub-program<select value={subProgramFilter} onChange={(event) => { resetRecipientSelection(); setSubProgramFilter(event.target.value); }} disabled={!programFilter || loadingAudiences} className="mt-1 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#064bff] disabled:bg-slate-100"><option value="">{!programFilter ? "Choose program first" : "Choose sub-program"}</option>{subProgramOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
              </> : null}
              <label className="text-xs font-semibold text-slate-600">Select {audienceType === "CLASS" ? "class" : selectedTypeLabel.toLowerCase()}
                {audienceType === "EVENT" ? <EventAudienceSelect options={audienceOptions} value={audienceId} disabled={loadingAudiences || !yearFilter} placeholder={audiencePlaceholder} today={today} onChange={(nextId) => { resetRecipientSelection(); setAudienceId(nextId); }} /> : <select value={audienceId} onChange={(event) => { const nextId = event.target.value; resetRecipientSelection(); setAudienceId(nextId); }} disabled={loadingAudiences || !yearFilter || (audienceType === "CLASS" && (!termFilter || !programFilter || !subProgramFilter))} className="mt-1 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#064bff] disabled:bg-slate-100"><option value="">{audiencePlaceholder}</option>{audienceOptions.map((option) => <option key={option._id} value={option._id}>{option.name}</option>)}</select>}
              </label>
              <label className="text-xs font-semibold text-slate-600">Search player or email<div className="mt-1 flex h-10 items-center gap-2 border border-slate-300 px-3 focus-within:border-[#064bff]"><Search size={15} className="text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPlayerPage(1); }} placeholder="Search name, parent, or email" className="min-w-0 flex-1 text-sm outline-none" /></div></label>
            </div>
            {audienceId && <div className="flex flex-wrap items-center justify-end gap-2">
                <select aria-label="Filter by email availability" value={contactFilter} onChange={(event) => { setContactFilter(event.target.value); setPlayerPage(1); }} className="h-9 border border-slate-300 bg-white px-2 text-xs"><option value="ALL">All email contacts</option><option value="AVAILABLE">Email available</option><option value="SKIPPED">Missing or opted out</option></select>
                <button onClick={() => { setSelectAllAudience(true); setExcludedIds(new Set()); setSelectedIds(new Set()); }} className="h-9 border border-[#064bff] bg-white px-3 text-xs font-semibold text-[#064bff]">Select all {selectedTypeLabel.toLowerCase()} players</button>
                {(selectedCount > 0) && <button onClick={() => { setSelectAllAudience(false); setSelectedIds(new Set()); setExcludedIds(new Set()); }} className="h-9 px-2 text-xs font-semibold text-slate-500 hover:text-slate-900">Clear selection</button>}
            </div>}

            {!audienceId ? <div className="grid min-h-52 place-items-center border border-dashed border-slate-300 bg-slate-50 text-center"><div><Mail className="mx-auto mb-2 text-[#064bff]" size={26} /><p className="text-sm font-semibold text-[#07194f]">Choose a class, event, or tournament</p><p className="mt-1 text-xs text-slate-500">The matching player roster and guardian email addresses will appear here.</p></div></div> : <div className="overflow-hidden border border-slate-200">
              <div className="flex items-center justify-between bg-[#07194f] px-4 py-3 text-white"><div className="text-sm font-semibold">Player contacts <span className="ml-2 font-normal text-blue-100">{selectedCount} selected</span></div><div className="text-xs text-blue-100">Email addresses are visible to authorized staff only</div></div>
              {loadError ? <div className="p-8 text-center text-sm text-red-600">{loadError}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="w-12 px-4 py-3"><input aria-label="Select visible players" type="checkbox" checked={players.length > 0 && selectedPageCount === players.length} onChange={(event) => {
                if (selectAllAudience) {
                  setExcludedIds((current) => { const next = new Set(current); players.forEach((player) => event.target.checked ? next.delete(player.playerId) : next.add(player.playerId)); return next; });
                } else {
                  setSelectedIds((current) => { const next = new Set(current); players.forEach((player) => event.target.checked ? next.add(player.playerId) : next.delete(player.playerId)); return next; });
                }
              }} /></th><th className="px-4 py-3">Player</th><th className="px-4 py-3">Parent / guardian</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Contact status</th></tr></thead><tbody>
                {loadingPlayers ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading audience contacts…</td></tr> : players.length ? players.map((player) => <tr key={player.playerId} className="border-t border-slate-100 hover:bg-blue-50/30"><td className="px-4 py-3"><input type="checkbox" checked={isPlayerSelected(player.playerId)} onChange={() => togglePlayer(player.playerId)} aria-label={`Select ${player.playerName}`} /></td><td className="px-4 py-3 font-semibold text-slate-800">{player.playerName}</td><td className="px-4 py-3 text-slate-600">{player.recipientName || "Parent/Guardian"}</td><td className="px-4 py-3 font-medium text-slate-700">{player.email || "—"}</td><td className="px-4 py-3"><span title={player.reason} className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase ${player.contactStatus === "AVAILABLE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{player.contactStatus === "AVAILABLE" ? "Ready" : player.reason?.includes("turned off") ? "Email off" : player.reason?.includes("invalid") ? "Invalid email" : "Missing email"}</span></td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">No players match this filter.</td></tr>}
              </tbody></table></div>}
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>Showing {playerTotal ? (playerPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(playerPage * PAGE_SIZE, playerTotal)} of {playerTotal} players</span><div className="flex items-center gap-2"><button onClick={() => setPlayerPage((page) => Math.max(1, page - 1))} disabled={playerPage <= 1 || loadingPlayers} className="border border-slate-300 p-1.5 disabled:opacity-40"><ChevronLeft size={15} /></button><span>Page {playerPage} of {playerPages}</span><button onClick={() => setPlayerPage((page) => Math.min(playerPages, page + 1))} disabled={playerPage >= playerPages || loadingPlayers} className="border border-slate-300 p-1.5 disabled:opacity-40"><ChevronRight size={15} /></button></div></div>
            </div>}
          </section> : <section className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-3"><div className="flex h-10 min-w-64 flex-1 items-center gap-2 border border-slate-300 px-3"><Search size={15} className="text-slate-400" /><input value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setCampaignPage(1); }} placeholder="Search subject or audience" className="min-w-0 flex-1 text-sm outline-none" /></div><select value={historyType} onChange={(event) => { setHistoryType(event.target.value); setCampaignPage(1); }} className="h-10 border border-slate-300 bg-white px-3 text-sm"><option value="ALL">All audience types</option>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><button onClick={refreshCampaigns} className="inline-flex h-10 items-center gap-2 border border-slate-300 px-3 text-sm font-semibold text-slate-700"><RefreshCw size={14} /> Refresh</button></div>
            <div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[930px] text-left text-sm"><thead className="bg-[#07194f] text-[11px] uppercase tracking-wide text-white"><tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Selected</th><th className="px-4 py-3">Queued</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Failed</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Details</th></tr></thead><tbody>{historyLoading ? <tr><td colSpan={9} className="p-8 text-center text-slate-500">Loading email history…</td></tr> : campaigns.length ? campaigns.map((campaign) => <tr key={campaign._id} className="border-t border-slate-100"><td className="max-w-72 px-4 py-3"><div className="truncate font-semibold text-[#07194f]" title={campaign.subject}>{campaign.subject}</div><div className="mt-0.5 text-xs text-slate-500">By {campaign.createdBy?.name || campaign.createdBy?.email || "Admin"}</div></td><td className="px-4 py-3"><div className="font-medium">{campaign.audienceName}</div><div className="mt-0.5 text-[10px] font-bold uppercase text-[#064bff]">{campaign.audienceType}</div></td><td className="px-4 py-3">{campaign.selectedPlayerCount}</td><td className="px-4 py-3">{campaign.counts.queued + campaign.counts.sending}</td><td className="px-4 py-3 font-semibold text-emerald-700">{campaign.counts.sent}</td><td className="px-4 py-3 font-semibold text-red-700">{campaign.counts.failed}</td><td className="px-4 py-3"><span className={`inline-flex border px-2 py-1 text-[10px] font-bold ${stateStyle(campaign.state)}`}>{campaign.state.replace(/_/g, " ")}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{shortDate(campaign.createdAt)}</td><td className="px-4 py-3"><button onClick={() => { setRecipientStatusFilter("ALL"); setRecipientPage(1); loadCampaign(campaign, 1, "ALL"); }} className="border border-[#064bff] px-3 py-1.5 text-xs font-semibold text-[#064bff] hover:bg-blue-50">View records</button></td></tr>) : <tr><td colSpan={9} className="p-8 text-center text-slate-500">No email campaigns found.</td></tr>}</tbody></table></div>
            <div className="flex items-center justify-between text-xs text-slate-500"><span>{campaignTotal} campaigns</span><div className="flex items-center gap-2"><button onClick={() => setCampaignPage((page) => Math.max(1, page - 1))} disabled={campaignPage <= 1 || historyLoading} className="border border-slate-300 p-1.5 disabled:opacity-40"><ChevronLeft size={15} /></button><span>Page {campaignPage} of {Math.max(1, Math.ceil(campaignTotal / 25))}</span><button onClick={() => setCampaignPage((page) => Math.min(Math.max(1, Math.ceil(campaignTotal / 25)), page + 1))} disabled={campaignPage >= Math.max(1, Math.ceil(campaignTotal / 25)) || historyLoading} className="border border-slate-300 p-1.5 disabled:opacity-40"><ChevronRight size={15} /></button></div></div>
            {selectedCampaign && <div className="border border-slate-200 bg-slate-50">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white p-4"><div><h2 className="font-bold text-[#07194f]">Delivery records: {selectedCampaign.subject}</h2><p className="mt-1 text-xs text-slate-500">{selectedCampaign.audienceName} · {selectedCampaign.selectedPlayerCount} players · Created {shortDate(selectedCampaign.createdAt)}</p></div><div className="flex gap-2"><select aria-label="Filter delivery records" value={recipientStatusFilter} onChange={(event) => { setRecipientStatusFilter(event.target.value); loadCampaign(selectedCampaign, 1, event.target.value); }} className="h-9 border border-slate-300 bg-white px-2 text-xs"><option value="ALL">All records</option>{["QUEUED", "SENDING", "SENT", "FAILED", "SKIPPED"].map((status) => <option key={status} value={status}>{status}</option>)}</select>{selectedCampaign.counts.failed > 0 && <button onClick={retryFailed} className="inline-flex h-9 items-center gap-2 bg-[#064bff] px-3 text-xs font-semibold text-white"><RefreshCw size={13} /> Retry failed</button>}<button aria-label="Close delivery records" onClick={() => setSelectedCampaign(null)} className="border border-slate-300 bg-white p-2 text-slate-500"><X size={15} /></button></div></div>
              <details className="border-b border-slate-200 bg-white px-4 py-3"><summary className="cursor-pointer text-xs font-semibold text-[#064bff]">View queued email content and status summary</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedCampaign.message}</p><div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500"><span>Queued: {selectedCampaign.counts.queued}</span><span>Sending: {selectedCampaign.counts.sending}</span><span>Sent: {selectedCampaign.counts.sent}</span><span>Failed: {selectedCampaign.counts.failed}</span><span>Skipped: {selectedCampaign.counts.skipped}</span></div></details>
              <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2.5">Player(s)</th><th className="px-3 py-2.5">Recipient</th><th className="px-3 py-2.5">Email</th><th className="px-3 py-2.5">Delivery</th><th className="px-3 py-2.5">Attempts</th><th className="px-3 py-2.5">Queued at</th><th className="px-3 py-2.5">Last attempt / sent</th><th className="px-3 py-2.5">Next retry</th><th className="px-3 py-2.5">Details</th></tr></thead><tbody>{campaignRecipients.length ? campaignRecipients.map((recipient) => <tr key={recipient._id} className="border-t border-slate-200 bg-white align-top"><td className="max-w-56 px-3 py-3 font-semibold text-slate-800">{recipient.playerNames?.join(", ") || "Player unavailable"}</td><td className="px-3 py-3">{recipient.recipientName || "Parent/Guardian"}</td><td className="px-3 py-3 font-medium text-slate-700">{recipient.recipientEmail || "—"}</td><td className="px-3 py-3"><span className={`inline-flex border px-2 py-1 text-[10px] font-bold ${stateStyle(recipient.status)}`}>{recipient.status}</span></td><td className="px-3 py-3">{recipient.attempts || 0}</td><td className="whitespace-nowrap px-3 py-3">{shortDate(recipient.queuedAt)}</td><td className="whitespace-nowrap px-3 py-3">{shortDate(recipient.sentAt || recipient.startedAt)}</td><td className="whitespace-nowrap px-3 py-3">{shortDate(recipient.nextAttemptAt)}</td><td className="max-w-64 px-3 py-3 text-slate-500">{recipient.skipReason || recipient.lastError || (recipient.status === "SENT" ? "Accepted by mail server." : recipient.status === "QUEUED" || recipient.status === "SENDING" ? "Waiting for delivery worker." : "—")}</td></tr>) : <tr><td colSpan={9} className="p-7 text-center text-slate-500">No delivery records match this filter.</td></tr>}</tbody></table></div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"><span>{recipientTotal} recipient records</span><div className="flex items-center gap-2"><button onClick={() => loadCampaign(selectedCampaign, Math.max(1, recipientPage - 1), recipientStatusFilter)} disabled={recipientPage <= 1} className="border border-slate-300 p-1.5 disabled:opacity-40"><ChevronLeft size={14} /></button><span>Page {recipientPage} of {Math.max(1, Math.ceil(recipientTotal / 100))}</span><button onClick={() => loadCampaign(selectedCampaign, Math.min(Math.max(1, Math.ceil(recipientTotal / 100)), recipientPage + 1), recipientStatusFilter)} disabled={recipientPage >= Math.max(1, Math.ceil(recipientTotal / 100))} className="border border-slate-300 p-1.5 disabled:opacity-40"><ChevronRight size={14} /></button></div></div>
            </div>}
          </section>}
        </div>
      </div>

      {composeOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"><form onSubmit={sendCampaign} className="flex max-h-[92vh] w-full max-w-2xl flex-col border border-slate-200 bg-white shadow-2xl"><header className="flex items-start justify-between bg-[#07194f] px-5 py-4 text-white"><div><div className="flex items-center gap-2 text-lg font-bold"><Mail size={19} />Compose email</div><p className="mt-1 text-xs text-blue-100">{audienceLabel}</p></div><button type="button" onClick={() => setComposeOpen(false)} className="p-1 text-white/80 hover:text-white"><X size={20} /></button></header><div className="space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-3 gap-2"><div className="border border-slate-200 bg-slate-50 p-3"><div className="text-xl font-bold text-[#07194f]">{preview?.selectedPlayers || selectedCount}</div><div className="text-[10px] uppercase text-slate-500">Players selected</div></div><div className="border border-emerald-200 bg-emerald-50 p-3"><div className="text-xl font-bold text-emerald-700">{preview?.deliverableRecipients ?? "—"}</div><div className="text-[10px] uppercase text-emerald-700">Private emails</div></div><div className="border border-amber-200 bg-amber-50 p-3"><div className="text-xl font-bold text-amber-700">{preview?.skippedPlayers ?? "—"}</div><div className="text-[10px] uppercase text-amber-700">Will be skipped</div></div></div>
        {preview?.skippedReasons?.length > 0 && <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Skipped recipients: {preview.skippedReasons.join(" ")}</div>}
        <label className="block text-xs font-semibold text-slate-700">Subject<input maxLength={180} value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} required className="mt-1 h-10 w-full border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#064bff]" placeholder="Email subject" /></label>
        <label className="block text-xs font-semibold text-slate-700">Message<textarea value={composeMessage} onChange={(event) => setComposeMessage(event.target.value)} required maxLength={12000} rows={9} className="mt-1 w-full resize-y border border-slate-300 p-3 text-sm font-normal leading-6 outline-none focus:border-[#064bff]" placeholder="Write your message…" /><span className="mt-1 block text-right font-normal text-slate-400">{composeMessage.length}/12,000</span></label>
        <div className="flex items-start gap-2 border border-blue-100 bg-blue-50 p-3 text-xs text-slate-600"><Mail size={15} className="mt-0.5 shrink-0 text-[#064bff]" /><p>Each parent/guardian receives a separate email. Other players’ and families’ addresses are never shown.</p></div>
      </div><footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={() => setComposeOpen(false)} className="h-10 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={sending || !composeSubject.trim() || !composeMessage.trim()} className="inline-flex h-10 items-center gap-2 bg-[#064bff] px-5 text-sm font-semibold text-white disabled:bg-slate-300"><Send size={15} />{sending ? "Adding to queue…" : `Queue ${preview?.deliverableRecipients || 0} emails`}</button></footer></form></div>}
    </>
  );
}
