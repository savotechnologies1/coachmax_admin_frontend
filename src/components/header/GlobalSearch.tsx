import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiClient";
import { requiredPageAccess, useCoachAccess, type AccessModule } from "../../hooks/useCoachAccess";

type SearchItem = { type: string; title: string; subtitle: string; path: string; state?: Record<string, unknown> };
type SearchGroup = { label: string; items: SearchItem[] };
type SearchResponse = { query: string; groups: SearchGroup[] };

const PAGES: { title: string; path: string; module: AccessModule }[] = [
  { title: "Dashboard", path: "/", module: "dashboard" },
  { title: "Players", path: "/players", module: "players" },
  { title: "New player requests", path: "/new-registration-request", module: "requests" },
  { title: "Programs", path: "/programs", module: "programs" },
  { title: "Academy", path: "/program/academy", module: "programs" },
  { title: "Classes", path: "/classes", module: "classes" },
  { title: "Calendar", path: "/calendar", module: "classes" },
  { title: "Teams", path: "/teams", module: "teams" },
  { title: "Leagues", path: "/leagues", module: "leagues" },
  { title: "Fixtures", path: "/fixtures", module: "leagues" },
  { title: "Events", path: "/events", module: "events" },
  { title: "Products", path: "/products", module: "store" },
  { title: "Orders", path: "/orders", module: "orders" },
  { title: "Invoices", path: "/invoices", module: "invoices" },
  { title: "Transactions", path: "/transactions", module: "payments" },
  { title: "Finance report", path: "/finance-report", module: "reports" },
  { title: "Coaches", path: "/coaches", module: "coaches" },
  { title: "News", path: "/news", module: "news" },
  { title: "Communication", path: "/communication", module: "communication" },
  { title: "Sponsors", path: "/sponsors", module: "sponsors" },
  { title: "Audit logs", path: "/audit-logs", module: "audit" },
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { can, role, dataUpdatedAt: accessUpdatedAt } = useCoachAccess();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const cleanQuery = query.trim().replace(/\s+/g, " ");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(cleanQuery), 250);
    return () => window.clearTimeout(timeout);
  }, [cleanQuery]);

  const search = useQuery<SearchResponse>({
    queryKey: ["global-search", role, accessUpdatedAt, debounced],
    queryFn: async ({ signal }) => (await apiClient.get("/api/admin/global-search", { params: { q: debounced }, signal })).data,
    enabled: Boolean(role) && debounced.length >= 2 && debounced.length <= 80,
    staleTime: 30_000,
    retry: false,
  });

  const pageItems = PAGES
    .map((page) => page.path === "/players" && role === "COACH" ? { ...page, title: "My Players", path: "/my-players" } : page)
    .filter((page) => can(page.module) && (!cleanQuery || page.title.toLowerCase().includes(cleanQuery.toLowerCase())))
    .slice(0, cleanQuery ? 6 : 5)
    .map((page): SearchItem => ({ type: "page", title: page.title, subtitle: "Page", path: page.path }));

  const remoteGroups = debounced === cleanQuery && cleanQuery.length >= 2 ? search.data?.groups || [] : [];
  const groups = [
    ...(pageItems.length ? [{ label: "Pages", items: pageItems }] : []),
    ...remoteGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const access = requiredPageAccess(item.path);
        return !access || can(access.module, access.action);
      }),
    })).filter((group) => group.items.length),
  ];
  const flatItems = groups.flatMap((group) => group.items);
  const waiting = cleanQuery.length >= 2 && (debounced !== cleanQuery || search.isFetching);

  useEffect(() => setActive(0), [cleanQuery]);
  useEffect(() => setActive((value) => Math.min(value, Math.max(flatItems.length - 1, 0))), [flatItems.length]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const choose = (item: SearchItem) => {
    navigate(item.path, { state: item.state });
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div ref={rootRef} className="relative w-full lg:w-[300px] xl:w-[430px]">
      <div className="relative">
        <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-500" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search CoachMax"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="global-search-results"
          aria-activedescendant={open && flatItems[active] ? `global-search-result-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((value) => Math.min(value + 1, Math.max(flatItems.length - 1, 0))); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
            if (event.key === "Enter") { event.preventDefault(); if (flatItems[active]) choose(flatItems[active]); }
          }}
          placeholder="Search players, leagues, products..."
          className="h-11 w-full rounded-lg border border-gray-200 bg-white !pl-11 !pr-16 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
        />
        {query ? (
          <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        ) : (
          <kbd aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800">Ctrl K</kbd>
        )}
      </div>
      {open && (
        <div id="global-search-results" role="listbox" aria-label="Search suggestions" className="absolute left-0 top-full z-[100] mt-2 max-h-[min(65vh,500px)] w-[min(92vw,520px)] overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {waiting && <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" /> Searching...</div>}
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.label}</div>
              {group.items.map((item) => {
                const index = flatItems.indexOf(item);
                return <button
                  id={`global-search-result-${index}`}
                  key={`${item.type}-${item.path}-${item.title}`}
                  type="button"
                  role="option"
                  aria-selected={active === index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${active === index ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10" : "text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <Search size={15} className="shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.title}</span><span className="block truncate text-xs text-gray-500">{item.subtitle}</span></span>
                  <ArrowRight size={14} className="shrink-0 text-gray-400" />
                </button>;
              })}
            </div>
          ))}
          {!waiting && !flatItems.length && <div className="px-4 py-5 text-sm text-gray-500">{search.isError && cleanQuery.length >= 2 ? "Search is unavailable. Try again." : "No matching pages or records."}</div>}
          {cleanQuery.length < 2 && <div className="px-4 py-2 text-xs text-gray-500">Type at least 2 characters to search records.</div>}
        </div>
      )}
    </div>
  );
}
