import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";
import { ChevronDownIcon, HorizontaLDots } from "../icons";
import { useSidebar } from "../context/SidebarContext";
import {
  Activity, CalendarDays, ClipboardList, Copy, CreditCard, LayoutDashboard,
  MessageCircle, Newspaper, Settings2, Shield, ShoppingBag, Tag, Trophy, UserRound,
  Users, UsersRound,
} from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useSidebarBadges } from "../hooks/useSidebarBadges";
import { useCoachAccess, type AccessModule } from "../hooks/useCoachAccess";

type NavSubItem = {
  name: string;
  path: string;
  isEvent?: boolean;
  badgeCount?: number;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  badgeCount?: number;
  subItems?: NavSubItem[];
};

type MenuSection = {
  title: string;
  key: string;
  items: NavItem[];
};

const DEFAULT_PROGRAM_SUBITEMS: NavSubItem[] = [
  { name: "Academy", path: "/program/academy" },
  { name: "Schools", path: "/program/schools" },
  { name: "Holiday Camps", path: "/program/holiday-camps" },
  { name: "1on1 Sessions", path: "/program/1on1-sessions" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    sectionKey: string;
    index: number;
  } | null>(null);
  const [collapsedSubmenu, setCollapsedSubmenu] = useState<{
    sectionKey: string;
    index: number;
    top: number;
    left: number;
  } | null>(null);
  const collapsedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const collapsedFlyoutRef = useRef<HTMLDivElement | null>(null);

  const { role: userRole, isFull, can, scope } = useCoachAccess();

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLUListElement | null>>({});

  const { categories } = useCategories({ isEvent: "all" });
  const { badges, markPathAsSeen } = useSidebarBadges();

  const programsSubItems = useMemo(() => {
    const baseItems: NavSubItem[] =
      categories && categories.length > 0
        ? categories.map((cat: any) => ({
          name: cat.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
          path: `/program/${cat.name.toLowerCase().replace(/\s+/g, "-")}`,
          isEvent: !!cat.isEvent,
        }))
        : DEFAULT_PROGRAM_SUBITEMS;

    return baseItems.map((item) => {
      // Unallocated players badge attached to Academy
      if (item.path.toLowerCase().includes("academy")) {
        return {
          ...item,
          badgeCount: badges.unallocatedPlayers || 0,
        };
      }
      return item;
    });
  }, [categories, badges.unallocatedPlayers]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const navIcon = (Icon: typeof LayoutDashboard) => <Icon size={19} strokeWidth={1.8} />;

  const coachMenuSections: MenuSection[] = useMemo(() => [
    {
      title: "Main",
      key: "main",
      items: [
        {
          name: "Dashboard",
          icon: navIcon(LayoutDashboard),
          path: "/",
        },
        {
          name: "My Players",
          icon: navIcon(Users),
          badgeCount: badges.temporaryPlayers || 0,
          subItems: [
            { name: "Player List", path: "/my-players" },
            {
              name: "Temporary Players",
              path: "/temporary-players-list",
              badgeCount: badges.temporaryPlayers || 0
            },
            { name: "Add Players", path: "/add-temporary-players" },
            { name: "My Notes", path: "/coach-notes" }
          ],
        },
        {
          name: "Classes",
          icon: navIcon(Activity),
          path: "/schedule",
        },
        {
          name: "Programs",
          icon: navIcon(CalendarDays),
          subItems: programsSubItems,
        },
        {
          name: "Communication",
          icon: navIcon(MessageCircle),
          subItems: [
            { name: "Direct & Group Chat", path: "/messages" },
            { name: "Class Broadcast Announcements", path: "/announcements" },
          ],
        },
        {
          name: "News",
          icon: navIcon(Newspaper),
          path: "/news",
        },
      ],
    },
    {
      title: "Settings",
      key: "settings",
      items: [
        {
          name: "My Profile",
          icon: navIcon(UserRound),
          path: "/profile",
        },
      ],
    },
  ], [badges.temporaryPlayers, programsSubItems]);

  const adminMenuSections: MenuSection[] = useMemo(() => [
    {
      title: "Main",
      key: "main",
      items: [
        { name: "Dashboard", icon: navIcon(LayoutDashboard), path: "/" },
        {
          name: "Players Management",
          icon: navIcon(Users),
          badgeCount: badges.playersManagementTotal || 0,
          subItems: [
            { name: "Players", path: "/players" },
            { name: "Add Players", path: "/add-temporary-players" },
            {
              name: "New Players Request",
              path: "/new-registration-request",
              badgeCount: badges.verificationRequests || 0
            }
          ]
        },
        {
          name: "Programs",
          icon: navIcon(CalendarDays),
          subItems: programsSubItems
        },
        {
          name: "Classes",
          icon: navIcon(CalendarDays),
          path: "/classes",
        },
      ],
    },
    {
      title: "OPERATIONS",
      key: "operations",
      items: [
        {
          name: "Events",
          icon: navIcon(CalendarDays),
          path: "/events",
          badgeCount: badges.eventRegistrations || 0,
        },
        {
          name: "Leagues",
          icon: navIcon(Trophy),
          path: "/leagues"
        },
        {
          name: "Teams Management",
          icon: navIcon(Shield),
          path: "/teams"
        },
        {
          name: "Communication",
          icon: navIcon(MessageCircle),
          subItems: [
            { name: "Direct & Group Chat", path: "/communication" },
            { name: "Class Broadcast Announcements", path: "/announcements" },
          ],
        },
        {
          name: "Finance",
          icon: navIcon(CreditCard),
          badgeCount: badges.financeTotal || 0,
          subItems: [
            { name: "Bank Details", path: "/bank-details" },
            {
              name: "Invoices",
              path: "/invoices",
              badgeCount: badges.unpaidInvoices || 0
            },
            {
              name: "Transactions",
              path: "/transactions",
              badgeCount: badges.pendingPayments || 0
            },
            { name: "Term Earnings", path: "/term-earnings" }
          ]
        },
      ],
    },
    {
      title: "COMMERCE",
      key: "commerce",
      items: [
        {
          name: "Store",
          icon: navIcon(ShoppingBag),
          subItems: [
            { name: "Product List", path: "/products" },
            {
              name: "Orders",
              path: "/orders",
              badgeCount: badges.orders || 0
            }
          ]
        },
      ],
    },
    {
      title: "Content & Media",
      key: "media",
      items: [
        {
          name: "News",
          icon: navIcon(Newspaper),
          path: "/news",
        },
      ],
    },
    {
      title: "Management",
      key: "management",
      items: [
        { name: "Coaching Management", icon: navIcon(UsersRound), path: "/coaching-management" },
        { name: "Coach Manage", icon: navIcon(UserRound), path: "/coaches" },
        { name: "Sponsors", icon: navIcon(Tag), path: "/sponsors" },
        { name: "Audit Logs", icon: navIcon(ClipboardList), path: "/audit-logs" },
        { name: "Clone Term", icon: navIcon(Copy), path: "/clone-term" },
      ],
    },
    {
      title: "Settings",
      key: "settings",
      items: [
        { name: "Settings", icon: navIcon(Settings2), path: "/profile" }
      ],
    },
  ], [badges, programsSubItems]);

  const partialMenuSections: MenuSection[] = adminMenuSections.map((section) => ({
    ...section,
    items: section.items.flatMap((item): NavItem[] => {
      const moduleByName: Record<string, AccessModule> = {
        Dashboard: "dashboard", "Players Management": "players", Programs: "programs",
        Classes: "classes", Events: "events", Leagues: "leagues",
        "Teams Management": "teams", Communication: "communication", Finance: "payments",
        Store: "store", News: "news", "Coaching Management": "programs",
        "Coach Manage": "coaches", Sponsors: "sponsors", "Audit Logs": "audit",
        "Clone Term": "terms",
      };
      if (item.name === "Settings") return [{ ...item, name: "My Profile" }];
      const module = moduleByName[item.name];
      if (!module) return [];
      const allowed = item.name === "Players Management"
        ? can("players", "read") || can("players", "create") || can("requests", "read")
        : item.name === "Finance"
          ? can("payments", "read") || can("bankDetails", "read") || can("invoices", "read") || can("reports", "read")
          : item.name === "Store"
            ? can("store", "read") || can("orders", "read")
            : can(module, "read");
      if (!allowed) return [];
      if (item.name === "Players Management") return [{ ...item, badgeCount: 0, subItems: [
        ...(can("players", "read") ? [{ name: "Players", path: "/players" }] : []),
        ...(can("players", "create") ? [{ name: "Add Players", path: "/add-temporary-players" }] : []),
        ...(can("requests", "read") ? [{ name: "New Players Request", path: "/new-registration-request" }] : []),
      ] }];
      if (item.name === "Finance") return [{ ...item, badgeCount: 0, subItems: item.subItems?.filter((entry) =>
        entry.path === "/bank-details" ? can("bankDetails", "read") :
        entry.path === "/invoices" ? can("invoices", "read") :
        entry.path === "/term-earnings" ? can("reports", "read") && scope("reports") === "ALL" :
        can("payments", "read")) }];
      if (item.name === "Store") return [{ ...item, subItems: item.subItems?.filter((entry) =>
        entry.path === "/orders" ? can("orders", "read") : can("store", "read")) }];
      if (item.name === "Communication" && scope("communication") === "ASSIGNED") return [{ ...item, subItems: item.subItems?.filter((entry) =>
        entry.path !== "/announcements" || (can("classes", "read") && can("communication", "create"))).map((entry) =>
        entry.path === "/communication" ? { ...entry, path: "/messages" } : entry) }];
      if (item.name === "Classes") return [{ ...item, path: "/classes" }];
      if (item.name === "Coach Manage" && scope("coaches") !== "ALL") return [];
      return [item];
    }),
  })).filter((section) => section.items.length > 0);
  if (userRole === "COACH" && !isFull && can("notes", "read")) partialMenuSections.push({ title: "Coach", key: "coach", items: [
    { name: "My Notes", icon: navIcon(ClipboardList), path: "/coach-notes" },
  ] });
  const menuSections = isFull ? adminMenuSections : userRole === "COACH" ? partialMenuSections : coachMenuSections;

  const collapsedSubmenuItem = collapsedSubmenu
    ? menuSections
      .find((section) => section.key === collapsedSubmenu.sectionKey)
      ?.items[collapsedSubmenu.index]
    : null;

  useEffect(() => {
    if (isExpanded || isMobileOpen) setCollapsedSubmenu(null);
  }, [isExpanded, isMobileOpen]);

  useEffect(() => {
    setCollapsedSubmenu(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!collapsedSubmenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !collapsedTriggerRef.current?.contains(target) &&
        !collapsedFlyoutRef.current?.contains(target)
      ) {
        setCollapsedSubmenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCollapsedSubmenu(null);
        collapsedTriggerRef.current?.focus();
      }
    };
    const closeOnViewportChange = () => setCollapsedSubmenu(null);

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [collapsedSubmenu]);

  useEffect(() => {
    let matchedSectionKey: string | null = null;
    let matchedIndex: number | null = null;

    menuSections.forEach((section) => {
      section.items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (location.pathname === subItem.path) {
              matchedSectionKey = section.key;
              matchedIndex = index;
            }
          });
        }
      });
    });

    setOpenSubmenu((prev) => {
      if (matchedSectionKey !== null && matchedIndex !== null) {
        if (prev && prev.sectionKey === matchedSectionKey && prev.index === matchedIndex) {
          return prev;
        }
        return { sectionKey: matchedSectionKey, index: matchedIndex };
      }
      return null;
    });
  }, [location.pathname, menuSections]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.sectionKey}-${openSubmenu.index}`;
      const el = subMenuRefs.current[key];
      if (el) {
        const height = el.scrollHeight || 0;
        setSubMenuHeight((prev) => {
          if (prev[key] === height) return prev;
          return { ...prev, [key]: height };
        });
      }
    }
  }, [openSubmenu, programsSubItems]);

  const handleSubmenuToggle = (sectionKey: string, index: number) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.sectionKey === sectionKey &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { sectionKey, index };
    });
  };

  const renderMenuItems = (items: NavItem[], sectionKey: string) => (
    <ul className="flex flex-col gap-1">
      {items.map((nav, index) => {
        const hasBadge = (nav.badgeCount || 0) > 0;
        const isCollapsedMode = !isExpanded && !isMobileOpen;
        const isSubmenuSelected = openSubmenu?.sectionKey === sectionKey && openSubmenu.index === index;
        const isCollapsedFlyoutOpen = collapsedSubmenu?.sectionKey === sectionKey && collapsedSubmenu.index === index;

        return (
          <li key={nav.name} className="group/nav relative">
            {nav.subItems ? (
              <button
                onClick={(event) => {
                  if (!isCollapsedMode) {
                    handleSubmenuToggle(sectionKey, index);
                    return;
                  }

                  const button = event.currentTarget;
                  collapsedTriggerRef.current = button;
                  const rect = button.getBoundingClientRect();
                  const estimatedHeight = Math.min(
                    64 + (nav.subItems?.length || 0) * 38,
                    window.innerHeight - 16
                  );
                  setCollapsedSubmenu((current) => {
                    if (current?.sectionKey === sectionKey && current.index === index) {
                      return null;
                    }
                    return {
                      sectionKey,
                      index,
                      top: Math.max(8, Math.min(rect.top, window.innerHeight - estimatedHeight - 8)),
                      left: Math.min(rect.right + 8, window.innerWidth - 272),
                    };
                  });
                }}
                className={`menu-item group ${isSubmenuSelected || isCollapsedFlyoutOpen
                  ? "menu-item-active"
                  : "menu-item-inactive"
                  } cursor-pointer ${isCollapsedMode
                    ? "lg:justify-center"
                    : "lg:justify-start"
                  } relative`}
                aria-label={isCollapsedMode ? nav.name : undefined}
                title={isCollapsedMode ? nav.name : undefined}
                aria-haspopup={isCollapsedMode ? "true" : undefined}
                aria-expanded={isCollapsedMode
                  ? collapsedSubmenu?.sectionKey === sectionKey && collapsedSubmenu.index === index
                  : openSubmenu?.sectionKey === sectionKey && openSubmenu.index === index}
                aria-controls={isCollapsedMode ? `${sectionKey}-${index}-submenu` : undefined}
              >
                <span
                  className={`menu-item-icon-size relative ${isSubmenuSelected || isCollapsedFlyoutOpen
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                  {isCollapsedMode && hasBadge && (
                    <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#031549]">
                      {nav.badgeCount! > 99 ? "99+" : nav.badgeCount}
                    </span>
                  )}
                </span>
                <span className={`menu-item-text min-w-0 flex-1 ${!isCollapsedMode ? "block" : "hidden"}`}>
                  {nav.name}
                </span>
                {!isCollapsedMode && (
                  <span className="ml-auto inline-flex w-12 shrink-0 items-center justify-end gap-1.5">
                    {hasBadge ? (
                      <span className="inline-flex h-[21px] w-6 items-center justify-center rounded-full bg-rose-500/15 text-[10px] font-bold tabular-nums text-rose-200 ring-1 ring-inset ring-rose-300/20">
                        {nav.badgeCount! > 99 ? "99+" : nav.badgeCount}
                      </span>
                    ) : (
                      <span className="w-6" aria-hidden="true" />
                    )}
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isSubmenuSelected
                        ? "rotate-180 text-white"
                        : "text-slate-400"
                        }`}
                    />
                  </span>
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  aria-label={isCollapsedMode ? nav.name : undefined}
                  title={isCollapsedMode ? nav.name : undefined}
                  className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                    } ${isCollapsedMode ? "lg:justify-center" : "lg:justify-start"} relative`}
                >
                  <span
                    className={`menu-item-icon-size relative ${isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                      }`}
                  >
                    {nav.icon}
                    {isCollapsedMode && hasBadge && (
                      <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#031549]">
                        {nav.badgeCount! > 99 ? "99+" : nav.badgeCount}
                      </span>
                    )}
                  </span>
                  <span className={`menu-item-text min-w-0 flex-1 ${!isCollapsedMode ? "block" : "hidden"}`}>
                    {nav.name}
                  </span>
                  {!isCollapsedMode && (
                    <span className="ml-auto inline-flex w-12 shrink-0 items-center justify-end gap-1.5">
                      {hasBadge ? (
                        <span className="inline-flex h-[21px] w-6 items-center justify-center rounded-full bg-rose-500/15 text-[10px] font-bold tabular-nums text-rose-200 ring-1 ring-inset ring-rose-300/20">
                          {nav.badgeCount! > 99 ? "99+" : nav.badgeCount}
                        </span>
                      ) : (
                        <span className="w-6" aria-hidden="true" />
                      )}
                      <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && !isCollapsedMode && (
              <div
                className="block overflow-hidden transition-all duration-300"
                style={{
                  height: openSubmenu?.sectionKey === sectionKey && openSubmenu?.index === index
                    ? `${subMenuHeight[`${sectionKey}-${index}`]}px`
                    : "0px",
                }}
              >
                <ul
                  ref={(el) => {
                    subMenuRefs.current[`${sectionKey}-${index}`] = el;
                  }}
                  className="pt-1 space-y-1 ml-9 pb-1"
                >
                  {nav.subItems.map((subItem) => {
                    const subBadge = (subItem.badgeCount || 0) > 0;
                    return (
                      <li key={subItem.name}>
                        <Link
                          to={subItem.path}
                          className={`menu-dropdown-item flex items-center justify-between gap-2 ${isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                            }`}
                        >
                          <span className="truncate">{subItem.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            {subItem.isEvent && (
                              <span className="px-1 py-px text-[7px] font-black uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded select-none">
                                Holiday
                              </span>
                            )}
                            {subBadge && (
                              <span className="inline-flex items-center justify-center min-w-[22px] h-[21px] px-1.5 rounded-full text-[10px] font-bold tabular-nums bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-300/20">
                                {subItem.badgeCount! > 99 ? "99+" : subItem.badgeCount}
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-4 2xl:px-5 left-0 bg-[#031549] text-gray-300 h-screen transition-all duration-300 ease-in-out z-50 border-r border-[#082269] 
        ${isExpanded || isMobileOpen
          ? "w-[240px] 2xl:w-[290px]"
          : "w-[80px] xl:w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
    >
      <div className="py-5 flex justify-center w-full">
        <Link to="/">
          <span className={isExpanded || isMobileOpen ? "block" : "hidden"}>
            <img src="/images/logo/newlogo.png" alt="CoachMax" className="h-12 object-contain" />
          </span>
          <span className={!isExpanded && !isMobileOpen ? "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-1 ring-white/70" : "hidden"}>
            <img src="/images/logo/cm-logo2.png" alt="CoachMax" className="h-full w-full object-cover" />
          </span>
        </Link>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar pb-6">
        <nav className="mb-6">
          <div className="flex flex-col gap-3">
            {menuSections.map((section) => (
              <div key={section.key}>
                <h2
                  className={`mb-1.5 px-3 text-[9px] tracking-[0.16em] uppercase font-bold text-slate-500 flex leading-[20px] ${!isExpanded
                    ? "lg:justify-center"
                    : "justify-start"
                    }`}
                >
                  <span className={isExpanded || isMobileOpen ? "block" : "hidden"}>
                    {section.title}
                  </span>
                  <span className={!isExpanded && !isMobileOpen ? "block" : "hidden"}>
                    <HorizontaLDots className="size-6" />
                  </span>
                </h2>
                {renderMenuItems(section.items, section.key)}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
    {collapsedSubmenu && collapsedSubmenuItem?.subItems && createPortal(
      <div
        ref={collapsedFlyoutRef}
        id={`${collapsedSubmenu.sectionKey}-${collapsedSubmenu.index}-submenu`}
        className="fixed z-[100] w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(3,21,73,0.22)] ring-1 ring-black/5"
        style={{ top: collapsedSubmenu.top, left: collapsedSubmenu.left }}
      >
        <div className="mb-1.5 flex items-center gap-2 border-b border-slate-100 px-3 pb-2 pt-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0047FF]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {collapsedSubmenuItem.name}
          </span>
        </div>
        <ul className="max-h-[calc(100vh-5rem)] space-y-1 overflow-y-auto">
          {collapsedSubmenuItem.subItems.map((subItem) => {
            const subBadge = (subItem.badgeCount || 0) > 0;
            return (
              <li key={subItem.name}>
                <Link
                  to={subItem.path}
                  className={`flex min-h-9 items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isActive(subItem.path)
                    ? "bg-[#0047FF] text-white shadow-sm"
                    : "text-[#031549] hover:bg-blue-50 hover:text-[#0047FF]"
                    }`}
                >
                  <span className="truncate">{subItem.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {subItem.isEvent && (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1 py-px text-[7px] font-black uppercase text-amber-700">
                        Holiday
                      </span>
                    )}
                    {subBadge && (
                      <span className={`inline-flex h-[21px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${isActive(subItem.path) ? "bg-white/20 text-white" : "bg-blue-50 text-[#0047FF]"}`}>
                        {subItem.badgeCount! > 99 ? "99+" : subItem.badgeCount}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>,
      document.body
    )}
    </>
  );
};

export default AppSidebar;
