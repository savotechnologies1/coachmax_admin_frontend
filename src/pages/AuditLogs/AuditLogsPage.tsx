import { formatDateTime } from "../../utils/dateTime";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import apiClient from "../../api/apiClient";

interface AuditLog {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  userRole: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  source?: string;
  ipAddress: string;
  deviceInfo: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditLogResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: AuditLog[];
  resolvedNames?: Record<string, string>;
  filters?: { actions: string[]; entityTypes: string[]; actors: { _id: string; name: string; email: string; role: string }[] };
}

const formatDate = (value: string) => formatDateTime(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) || "N/A";

const getActionColor = (action: string) => {
  const a = action?.toUpperCase() || "";
  if (a.includes("CREATED") || a.includes("ADD"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30";
  if (a.includes("UPDATED") || a.includes("EDIT") || a.includes("MODIFY"))
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30";
  if (a.includes("DELETED") || a.includes("REMOVE"))
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30";
  if (a.includes("LOGIN") || a.includes("LOGOUT") || a.includes("AUTH"))
    return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-800/30";
  if (a.includes("ASSIGN") || a.includes("TRANSFER"))
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30";
  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
};

const getEntityIcon = (entityType: string) => {
  const e = entityType?.toLowerCase() || "";
  if (e.includes("coachnote") || e.includes("note")) return "📝";
  if (e.includes("attendance")) return "✅";
  if (e.includes("class")) return "📚";
  if (e.includes("user") || e.includes("player")) return "👤";
  if (e.includes("coach")) return "🏋️";
  if (e.includes("payment") || e.includes("invoice")) return "💰";
  if (e.includes("event")) return "📅";
  if (e.includes("team")) return "🛡️";
  if (e.includes("broadcast")) return "📢";
  if (e.includes("product") || e.includes("order")) return "🛒";
  if (e.includes("term")) return "📋";
  if (e.includes("program") || e.includes("category")) return "📂";
  if (e.includes("session")) return "⏱️";
  return "📄";
};

const getRoleBadge = (role: string) => {
  const r = role?.toUpperCase() || "";
  if (r === "SUPER_ADMIN") return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30";
  if (r === "ADMIN") return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/30";
  if (r === "COACH") return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30";
  if (r === "PARENT") return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30";
  return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
};

const formatActionLabel = (action: string) => {
  return (action || "UNKNOWN").replace(/_/g, " ");
};

const safeEntries = (value: Record<string, any>) => Object.entries(value).filter(([key]) => !key.startsWith("_") && !/password|token|secret|otp/i.test(key));
const friendlyValue = (value: any, names: Record<string, string>): string => {
  if (typeof value === "string" && /^[a-f\d]{24}$/i.test(value)) return names[value] || "Previous record";
  if (Array.isArray(value)) return value.map((item) => friendlyValue(item, names)).join(", ");
  if (value && typeof value === "object") return Object.entries(value).filter(([key]) => !/password|token|secret|otp/i.test(key)).map(([key, item]) => `${key}: ${friendlyValue(item, names)}`).join(", ");
  return String(value ?? "—");
};
const friendlyDescription = (log: AuditLog, names: Record<string, string>) => (log.description || "—").replace(/\b[a-f\d]{24}\b/gi, (id) => names[id] || (id === log.entityId ? log.entityName : "") || "previous record");
const renderChanges = (oldVal: Record<string, any> | null, newVal: Record<string, any> | null, names: Record<string, string> = {}) => {
  if (!oldVal && !newVal) return null;

  if (!oldVal && newVal) {
    // Created — show new values
    const entries = safeEntries(newVal);
    if (entries.length === 0) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {entries.slice(0, 3).map(([key, val]) => (
          <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30">
            <span className="text-emerald-400">{key}:</span> {friendlyValue(val, names).substring(0, 35)}{friendlyValue(val, names).length > 35 ? "…" : ""}
          </span>
        ))}
        {entries.length > 3 && (
          <span className="text-[9px] text-slate-400 font-semibold">+{entries.length - 3} more</span>
        )}
      </div>
    );
  }

  if (oldVal && newVal) {
    // Updated — show diff
    const changedKeys = safeEntries(newVal).map(([key]) => key).filter(k => JSON.stringify(oldVal[k]) !== JSON.stringify(newVal[k]));
    if (changedKeys.length === 0) return null;
    return (
      <div className="mt-1.5 space-y-0.5">
        {changedKeys.slice(0, 2).map((key) => (
          <div key={key} className="flex items-center gap-1 text-[9px] font-bold">
            <span className="text-slate-400 uppercase tracking-wider">{key}:</span>
            <span className="px-1 py-0.5 bg-rose-50 text-rose-500 border border-rose-100 line-through dark:bg-rose-950/20 dark:border-rose-800/30">
              {friendlyValue(oldVal[key], names).substring(0, 30)}
            </span>
            <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="px-1 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800/30">
              {friendlyValue(newVal[key], names).substring(0, 30)}
            </span>
          </div>
        ))}
        {changedKeys.length > 2 && (
          <span className="text-[9px] text-slate-400 font-semibold">+{changedKeys.length - 2} more changes</span>
        )}
      </div>
    );
  }

  return null;
};

export default function AuditLogsPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actorFilter, setActorFilter] = useState(searchParams.get("userId") || "");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const limit = 50;
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);

  const { data, isLoading, isError } = useQuery<AuditLogResponse>({
    queryKey: ["audit-logs", page, limit, debouncedSearch, entityFilter, actorFilter, roleFilter, actionFilter, sourceFilter, startDate, endDate],
    queryFn: async () => {
      const params: any = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (entityFilter) params.entityType = entityFilter;
      if (actorFilter) params.userId = actorFilter;
      if (roleFilter) params.userRole = roleFilter;
      if (actionFilter) params.action = actionFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (startDate) params.startAt = new Date(`${startDate}T00:00:00`).toISOString();
      if (endDate) params.endAt = new Date(`${endDate}T23:59:59.999`).toISOString();
      const res = await apiClient.get("/api/admin/audit-logs", { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const logs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <>
      <PageMeta title="CoachMax | Audit Logs" description="View system audit logs" />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Audit Logs" items={[{ name: "Management", path: "/" }]} />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0047FF]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0047FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Logs</p>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">{total}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Page</p>
                <h3 className="text-xl font-black text-[#0047FF]">{page} <span className="text-sm font-bold text-slate-400">/ {totalPages}</span></h3>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing</p>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">{logs.length} <span className="text-sm font-bold text-slate-400">entries</span></h3>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-theme-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Per Page</p>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">{limit}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 md:items-center">
          <div className="flex-1 max-w-sm relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by description, user name, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-none border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold outline-none focus:border-[#0047FF] dark:border-gray-700 dark:bg-gray-900 dark:text-white transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="rounded-none border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold uppercase outline-none focus:border-[#0047FF] dark:border-gray-700 dark:bg-gray-900 dark:text-white cursor-pointer"
            >
              <option value="">All areas</option>
              {(data?.filters?.entityTypes || ["Attendance", "User", "Class", "Team", "League", "Event", "Product", "Invoice", "Admin"]).map((type) => <option key={type} value={type}>{type.replace(/([a-z])([A-Z])/g, "$1 $2")}</option>)}
            </select>
            <select aria-label="Filter by person" value={actorFilter} onChange={(event) => { setActorFilter(event.target.value); setPage(1); }} className="rounded border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"><option value="">All people</option>{data?.filters?.actors?.map((actor) => <option key={actor._id} value={actor._id}>{actor.name || actor.email} ({actor.role})</option>)}</select>
            <select aria-label="Filter by role" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="rounded border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"><option value="">All roles</option><option value="SUPER_ADMIN">Super Admin</option><option value="ADMIN">Admin</option><option value="COACH">Coach</option><option value="UNVERIFIED">Unverified sign-in</option></select>
            <select aria-label="Filter by action" value={actionFilter} onChange={(event) => { setActionFilter(event.target.value); setPage(1); }} className="rounded border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"><option value="">All actions</option>{data?.filters?.actions?.map((action) => <option key={action} value={action}>{formatActionLabel(action)}</option>)}</select>
            <select aria-label="Filter by login source" value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }} className="rounded border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"><option value="">Web and app</option><option value="Web">Web</option><option value="App">App</option><option value="Unknown">Unknown</option></select>
            <label className="flex items-center gap-1 text-xs text-gray-600">From <input aria-label="From date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="rounded border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900" /></label>
            <label className="flex items-center gap-1 text-xs text-gray-600">To <input aria-label="To date" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="rounded border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900" /></label>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-none shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <table className="min-w-[1100px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-[50px]">#</th>
                  <th className="py-3 px-3 min-w-[120px]">Entity Type</th>
                  <th className="py-3 px-3 min-w-[160px]">Action</th>
                  <th className="py-3 px-3 min-w-[300px]">Description & Changes</th>
                  <th className="py-3 px-3 min-w-[200px]">Performed By</th>
                  <th className="py-3 px-3 min-w-[150px]">Date & Time</th>
                  <th className="py-3 px-3 min-w-[120px]">IP Address</th>
                  <th className="py-3 px-4 w-[60px] text-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-[#0047FF] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Failed to load audit logs</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">No audit logs found</span>
                        <span className="text-[10px] text-slate-300 font-medium">Try adjusting your filters</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <>
                      <tr
                        key={log._id}
                        className={`border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer ${expandedRow === log._id ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}`}
                        onClick={() => setExpandedRow(expandedRow === log._id ? null : log._id)}
                      >
                        {/* # */}
                        <td className="py-3.5 px-4 text-slate-400 font-bold text-xs">
                          {(page - 1) * limit + idx + 1}
                        </td>

                        {/* Entity Type */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span className="text-base leading-none">{getEntityIcon(log.entityType)}</span>
                            <span className="uppercase tracking-wider text-[10px]">{(log.entityType || "System").replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-3">
                          <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border ${getActionColor(log.action)}`}>
                            {formatActionLabel(log.action)}
                          </span>
                        </td>

                        {/* Description & Changes */}
                        <td className="py-3.5 px-3">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                            {friendlyDescription(log, data?.resolvedNames || {})}
                          </p>
                          {log.entityName && <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-300">Record: {log.entityName}</p>}
                          {renderChanges(log.oldValue, log.newValue, data?.resolvedNames)}
                        </td>

                        {/* Performed By */}
                        <td className="py-3.5 px-3">
                          {log.user ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 bg-[#031549] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                {(log.user.name || log.user.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                                  {log.user.name || "Unknown"}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium truncate">{log.user.email}</div>
                                <span className={`inline-block mt-0.5 px-1.5 py-0 text-[8px] font-black uppercase tracking-widest border ${getRoleBadge(log.userRole || log.user.role)}`}>
                                  {log.userRole || log.user.role || "USER"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div><span className="block text-xs text-slate-600 font-semibold">{log.actorName || log.actorEmail || "Former staff member"}</span>
                              <span className={`mt-1 inline-block border px-1.5 text-[8px] font-black uppercase ${getRoleBadge(log.userRole)}`}>{log.userRole || "STAFF"}</span></div>
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-3">
                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {formatDate(log.createdAt)}
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-3">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 border border-slate-100 dark:border-slate-700">
                            {log.ipAddress?.replace("::ffff:", "") || "—"}
                          </span>
                          {log.source && <span className="mt-1 block text-[10px] text-slate-500">{log.source}</span>}
                        </td>

                        {/* Expand Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button type="button" aria-label={`${expandedRow === log._id ? "Hide" : "Show"} details for ${log.entityName || log.entityType}`} className="text-slate-400 hover:text-[#0047FF] transition-colors">
                            <svg className={`w-4 h-4 transition-transform ${expandedRow === log._id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {expandedRow === log._id && (
                        <tr key={`${log._id}-detail`} className="bg-slate-50/80 dark:bg-slate-800/30">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Entity Info */}
                              <div className="space-y-2">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entity Info</h5>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-bold">Record:</span>
                                  <span className="text-slate-700 dark:text-slate-300 text-xs">{log.entityName || "Previous record"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-bold">Type:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{log.entityType}</span>
                                </div>
                              </div>

                              {/* Device Info */}
                              <div className="space-y-2">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Device Info</h5>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed break-all bg-white dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-700">
                                  {log.source || "Unknown source"}{log.deviceInfo ? ` · ${log.deviceInfo}` : ""}
                                </p>
                              </div>

                              {/* Old / New Values */}
                              <div className="space-y-2">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Changes</h5>
                                {log.oldValue && (
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1 block">Old Value</span>
                                    <pre className="text-[10px] text-slate-500 bg-white dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-700 overflow-x-auto max-h-[100px] font-mono">
                                      {friendlyValue(log.oldValue, data?.resolvedNames || {})}
                                    </pre>
                                  </div>
                                )}
                                {log.newValue && (
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1 block">New Value</span>
                                    <pre className="text-[10px] text-slate-500 bg-white dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-700 overflow-x-auto max-h-[100px] font-mono">
                                      {friendlyValue(log.newValue, data?.resolvedNames || {})}
                                    </pre>
                                  </div>
                                )}
                                {!log.oldValue && !log.newValue && (
                                  <span className="text-[10px] text-slate-400 italic">No data changes recorded</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800 gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded-none border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-none border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-[10px] font-black border transition-colors ${
                        page === pageNum
                          ? "bg-[#0047FF] text-white border-[#0047FF]"
                          : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-none border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                  Next
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="rounded-none border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
