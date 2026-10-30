import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/apiClient";

export const ACCESS_MODULES = [
  { key: "dashboard", label: "Dashboard", assigned: false },
  { key: "players", label: "Players", assigned: true },
  { key: "parents", label: "Parents", assigned: true },
  { key: "requests", label: "New player requests", assigned: false },
  { key: "programs", label: "Programs and categories", assigned: false },
  { key: "terms", label: "Terms", assigned: false },
  { key: "classes", label: "Classes", assigned: true },
  { key: "attendance", label: "Attendance", assigned: true },
  { key: "teams", label: "Teams", assigned: true },
  { key: "leagues", label: "Leagues and fixtures", assigned: true },
  { key: "events", label: "Events and camps", assigned: false },
  { key: "store", label: "Store and products", assigned: false },
  { key: "orders", label: "Orders", assigned: true },
  { key: "invoices", label: "Invoices", assigned: true },
  { key: "payments", label: "Payments and transactions", assigned: true },
  { key: "bankDetails", label: "Bank details and payment setup", assigned: false },
  { key: "reports", label: "Reports and earnings", assigned: false },
  { key: "communication", label: "Communication", assigned: true },
  { key: "news", label: "News and media", assigned: false },
  { key: "notes", label: "My coach notes", assigned: true },
  { key: "coaches", label: "Coach management", assigned: false },
  { key: "sponsors", label: "Sponsors", assigned: false },
  { key: "audit", label: "Audit logs", assigned: false },
] as const;

export const ACCESS_ACTIONS = [
  { key: "read", label: "View" },
  { key: "create", label: "Add" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "assign", label: "Assign" },
  { key: "approve", label: "Approve" },
  { key: "export", label: "Export" },
] as const;

export type AccessModule = typeof ACCESS_MODULES[number]["key"];
export type AccessAction = typeof ACCESS_ACTIONS[number]["key"];
export type ModuleAccess = { scope: "ALL" | "ASSIGNED" } & Record<AccessAction, boolean>;
export type CoachAccess = { mode: "FULL" | "PARTIAL"; permissions: Record<AccessModule, ModuleAccess> };

export const SUPPORTED_ACTIONS: Record<AccessModule, readonly AccessAction[]> = {
  dashboard: ["read"], players: ["read", "create", "edit", "delete", "assign", "export"],
  parents: ["read"], requests: ["read", "delete", "assign", "approve"],
  programs: ["read", "create", "edit", "delete"], terms: ["read", "create", "edit", "delete"],
  classes: ["read", "create", "edit", "delete", "assign", "export"],
  attendance: ["read", "edit"], teams: ["read", "create", "edit", "delete", "assign", "export"],
  leagues: ["read", "create", "edit", "delete", "assign", "approve"], events: ["read", "create", "edit", "delete", "approve", "export"],
  store: ["read", "create", "edit", "delete"], orders: ["read", "edit"],
  invoices: ["read", "create", "edit", "delete"], payments: ["read", "edit", "approve"],
  bankDetails: ["read", "create", "edit"],
  reports: ["read", "export"], communication: ["read", "create", "edit", "delete"],
  news: ["read", "create", "edit", "delete"], notes: ["read", "create", "edit"],
  coaches: ["read", "create", "edit"], sponsors: ["read", "create", "edit", "delete"], audit: ["read"],
};

export const getLocalRole = (): string => {
  try { return JSON.parse(localStorage.getItem("user") || "null")?.role || ""; }
  catch { return ""; }
};

export const requiredPageAccess = (path: string): { module: AccessModule; action: AccessAction } | null => {
  if (path === "/" || path === "/notifications") return { module: "dashboard", action: "read" };
  if (path === "/profile" || path === "/user-manual") return null;
  if (path === "/players" || path === "/my-players" || path.startsWith("/player/")) return { module: "players", action: "read" };
  if (path === "/add-temporary-players") return { module: "players", action: "create" };
  if (path === "/new-registration-request" || path === "/temporary-players-list") return { module: "requests", action: "read" };
  if (path === "/coach-notes") return { module: "notes", action: "read" };
  if (path === "/classes" || path === "/schedule" || path === "/calendar") return { module: "classes", action: "read" };
  if (path.startsWith("/program") || path === "/coaching-management") return { module: "programs", action: "read" };
  if (path === "/clone-term") return { module: "terms", action: "create" };
  if (path.startsWith("/teams")) return { module: "teams", action: "read" };
  if (path.startsWith("/leagues") || path === "/fixtures") return { module: "leagues", action: "read" };
  if (path === "/add-event") return { module: "events", action: "create" };
  if (path.startsWith("/edit-event")) return { module: "events", action: "edit" };
  if (path.startsWith("/events") || path.startsWith("/event-details")) return { module: "events", action: "read" };
  if (path === "/add-product") return { module: "store", action: "create" };
  if (path.startsWith("/edit-product")) return { module: "store", action: "edit" };
  if (path === "/products" || path.startsWith("/products/")) return { module: "store", action: "read" };
  if (path.startsWith("/orders")) return { module: "orders", action: "read" };
  if (path.startsWith("/invoices")) return { module: "invoices", action: "read" };
  if (path === "/bank-details") return { module: "bankDetails", action: "read" };
  if (path === "/transactions") return { module: "payments", action: "read" };
  if (path === "/term-earnings" || path === "/finance-report") return { module: "reports", action: "read" };
  if (path === "/messages" || path === "/communication" || path === "/announcements") return { module: "communication", action: "read" };
  if (path.startsWith("/news") || path === "/add-content" || path === "/gallery" || path === "/add-gallery") return { module: "news", action: "read" };
  if (path.startsWith("/coaches")) return { module: "coaches", action: "read" };
  if (path === "/sponsors") return { module: "sponsors", action: "read" };
  if (path === "/audit-logs") return { module: "audit", action: "read" };
  return null;
};

export const useCoachAccess = () => {
  const role = getLocalRole();
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const query = useQuery<CoachAccess>({
    queryKey: ["my-coach-access"],
    queryFn: async () => (await apiClient.get("/api/coach/access")).data,
    enabled: role === "COACH",
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const isFull = isAdmin || (role === "COACH" && query.data?.mode === "FULL");
  const can = (module: AccessModule, action: AccessAction = "read") =>
    isFull || Boolean(query.data?.permissions?.[module]?.[action]);
  const scope = (module: AccessModule) => isFull ? "ALL" : (query.data?.permissions?.[module]?.scope || "ASSIGNED");
  return { ...query, role, isAdmin, isFull, can, scope };
};
