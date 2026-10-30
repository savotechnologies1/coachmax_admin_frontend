import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSidebarBadges, SidebarBadges } from "../api/adminApi";
import { socketService } from "../services/socketService";
import { useCoachAccess } from "./useCoachAccess";

const DEFAULT_BADGES: SidebarBadges = {
  verificationRequests: 0,
  temporaryPlayers: 0,
  unallocatedPlayers: 0,
  unpaidInvoices: 0,
  pendingPayments: 0,
  eventRegistrations: 0,
  orders: 0,
  playersManagementTotal: 0,
  financeTotal: 0,
};

export const PATH_TO_BADGE_KEY: Record<string, keyof SidebarBadges> = {
  "/orders": "orders",
  "/new-registration-request": "verificationRequests",
  "/temporary-players-list": "temporaryPlayers",
  "/program/academy": "unallocatedPlayers",
  "/events": "eventRegistrations",
  "/invoices": "unpaidInvoices",
  "/transactions": "pendingPayments",
};

const READ_ITEMS_STORAGE_KEY = "coachmax_read_badge_item_ids";

const getStoredReadItemsMap = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(READ_ITEMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoredReadItemsMap = (map: Record<string, string[]>) => {
  try {
    localStorage.setItem(READ_ITEMS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
};

// Module-level reactive store for read items (shared across all hook instances)
let globalReadItemsMap: Record<string, string[]> = getStoredReadItemsMap();
const globalSubscribers = new Set<(map: Record<string, string[]>) => void>();

const updateGlobalReadItemsMap = (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => {
  const next = updater(globalReadItemsMap);
  if (next !== globalReadItemsMap) {
    globalReadItemsMap = next;
    saveStoredReadItemsMap(next);
    globalSubscribers.forEach((notify) => notify(next));
  }
};

export const useSidebarBadges = () => {
  const { isFull } = useCoachAccess();
  const queryClient = useQueryClient();
  const [readItemsMap, setReadItemsMap] = useState<Record<string, string[]>>(() => globalReadItemsMap);

  useEffect(() => {
    globalSubscribers.add(setReadItemsMap);
    // Sync with the latest global state on mount
    setReadItemsMap(globalReadItemsMap);
    return () => {
      globalSubscribers.delete(setReadItemsMap);
    };
  }, []);

  const userStr = localStorage.getItem("user");
  let isAdmin = false;
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      if (parsed?.role === "SUPER_ADMIN" || parsed?.role === "ADMIN") {
        isAdmin = true;
      }
    } catch (e) {
      console.error(e);
    }
  }
  isAdmin = isAdmin || isFull;

  const query = useQuery<SidebarBadges>({
    queryKey: ["sidebar-badges"],
    queryFn: async () => {
      try {
        const data = await getSidebarBadges();
        return data || DEFAULT_BADGES;
      } catch (err) {
        console.warn("Failed to fetch sidebar badges:", err);
        return DEFAULT_BADGES;
      }
    },
    enabled: isAdmin,
    refetchInterval: 30000, // 30s background sync polling
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const rawBadges = query.data || DEFAULT_BADGES;

  // Real-time socket sync
  useEffect(() => {
    if (!isAdmin) return;

    const handleBadgeUpdate = (data: Partial<SidebarBadges>) => {
      if (!data) return;
      queryClient.setQueryData(["sidebar-badges"], (old: SidebarBadges | undefined) => {
        const mergedPending = {
          ...(old?.pendingItemIds || {}),
          ...(data.pendingItemIds || {}),
        };
        return {
          ...(old || DEFAULT_BADGES),
          ...data,
          pendingItemIds: data.pendingItemIds || mergedPending,
          playersManagementTotal:
            (data.verificationRequests ?? old?.verificationRequests ?? 0) +
            (data.temporaryPlayers ?? old?.temporaryPlayers ?? 0),
          financeTotal:
            (data.unpaidInvoices ?? old?.unpaidInvoices ?? 0) +
            (data.pendingPayments ?? old?.pendingPayments ?? 0),
        };
      });
    };

    socketService.on("sidebar_badges_update", handleBadgeUpdate);

    return () => {
      socketService.off("sidebar_badges_update", handleBadgeUpdate);
    };
  }, [isAdmin, queryClient]);

  // Cross-tab storage sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === READ_ITEMS_STORAGE_KEY) {
        const fromStorage = getStoredReadItemsMap();
        globalReadItemsMap = fromStorage;
        globalSubscribers.forEach((notify) => notify(fromStorage));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Clean up read IDs when items are no longer pending in backend (pruning)
  // CRITICAL: NEVER prune when query is still loading or before data is fetched!
  useEffect(() => {
    if (!query.isSuccess || !query.data) return;
    const pendingIds = query.data.pendingItemIds;
    if (!pendingIds) return;

    updateGlobalReadItemsMap((prev) => {
      let changed = false;
      const next: Record<string, string[]> = {};

      for (const [cat, readIds] of Object.entries(prev)) {
        const activeIds = pendingIds[cat as keyof typeof pendingIds];
        if (Array.isArray(activeIds)) {
          // Keep only read IDs that are STILL active in the pending list
          const activeIdsStr = activeIds.map(String);
          const filtered = readIds.filter((id) => activeIdsStr.includes(String(id)));
          if (filtered.length !== readIds.length) {
            changed = true;
          }
          next[cat] = filtered;
        } else {
          next[cat] = readIds;
        }
      }

      return changed ? next : prev;
    });
  }, [query.isSuccess, query.data]);

  // Mark an individual item as read by its unique ID
  const markItemAsRead = useCallback((category: keyof SidebarBadges | string, itemId: string) => {
    if (!category || !itemId) return;
    const catStr = String(category);
    const idStr = String(itemId);

    updateGlobalReadItemsMap((prev) => {
      const currentList = prev[catStr] || [];
      if (currentList.includes(idStr)) return prev;
      return {
        ...prev,
        [catStr]: [...currentList, idStr],
      };
    });
  }, []);

  // Mark multiple items as read (e.g. batch inspect)
  const markItemsAsRead = useCallback((category: keyof SidebarBadges | string, itemIds: string[]) => {
    if (!category || !Array.isArray(itemIds) || itemIds.length === 0) return;
    const catStr = String(category);
    const idsToAdd = itemIds.map(String);

    updateGlobalReadItemsMap((prev) => {
      const currentSet = new Set(prev[catStr] || []);
      let changed = false;
      for (const id of idsToAdd) {
        if (!currentSet.has(id)) {
          currentSet.add(id);
          changed = true;
        }
      }
      if (!changed) return prev;
      return {
        ...prev,
        [catStr]: Array.from(currentSet),
      };
    });
  }, []);

  // Check if an individual item is marked as read
  const isItemRead = useCallback(
    (category: keyof SidebarBadges | string, itemId: string) => {
      if (!category || !itemId) return false;
      const catStr = String(category);
      const list = readItemsMap[catStr] || [];
      return list.includes(String(itemId));
    },
    [readItemsMap]
  );

  // Mark an entire category as seen (all currently pending items)
  const markCategoryAsSeen = useCallback(
    (badgeKey: keyof SidebarBadges | string) => {
      const catStr = String(badgeKey);
      const pendingIds = rawBadges.pendingItemIds?.[catStr as keyof typeof rawBadges.pendingItemIds];
      if (Array.isArray(pendingIds) && pendingIds.length > 0) {
        markItemsAsRead(catStr, pendingIds);
      }
    },
    [rawBadges, markItemsAsRead]
  );

  // Backward compatible route seen helper
  const markPathAsSeen = useCallback(
    (targetPath: string) => {
      if (!targetPath) return;
      const matchedEntry = Object.entries(PATH_TO_BADGE_KEY).find(([route]) =>
        targetPath.toLowerCase().startsWith(route.toLowerCase())
      );
      if (!matchedEntry) return;
      const badgeKey = matchedEntry[1];
      markCategoryAsSeen(badgeKey);
    },
    [markCategoryAsSeen]
  );

  // Compute effective visible badges (subtracting read items)
  const badges = useMemo<SidebarBadges>(() => {
    const pendingIds = rawBadges.pendingItemIds;

    const getUnreadCount = (key: keyof SidebarBadges) => {
      const rawCount = (rawBadges[key] as number) || 0;
      const readList = readItemsMap[key as string] || [];

      // If backend provided specific pending item IDs, calculate unread items accurately
      if (pendingIds && Array.isArray(pendingIds[key as keyof typeof pendingIds])) {
        const activeIds = pendingIds[key as keyof typeof pendingIds] as string[];
        const unreadIds = activeIds.filter((id) => !readList.includes(id));
        return unreadIds.length;
      }

      // Fallback if specific item IDs not provided: subtract count of read items
      return Math.max(0, rawCount - readList.length);
    };

    const verificationRequests = getUnreadCount("verificationRequests");
    const temporaryPlayers = getUnreadCount("temporaryPlayers");
    const unallocatedPlayers = getUnreadCount("unallocatedPlayers");
    const unpaidInvoices = getUnreadCount("unpaidInvoices");
    const pendingPayments = getUnreadCount("pendingPayments");
    const eventRegistrations = getUnreadCount("eventRegistrations");
    const orders = getUnreadCount("orders");

    return {
      verificationRequests,
      temporaryPlayers,
      unallocatedPlayers,
      unpaidInvoices,
      pendingPayments,
      eventRegistrations,
      orders,
      playersManagementTotal: verificationRequests + temporaryPlayers,
      financeTotal: unpaidInvoices + pendingPayments,
      pendingItemIds: rawBadges.pendingItemIds,
    };
  }, [rawBadges, readItemsMap]);

  return {
    badges,
    rawBadges,
    readItemsMap,
    markItemAsRead,
    markItemsAsRead,
    isItemRead,
    markCategoryAsSeen,
    markPathAsSeen,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
