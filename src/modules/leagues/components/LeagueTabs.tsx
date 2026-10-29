import React from "react";
import {
  ListOrdered,
  CalendarDays,
  Users,
  BarChart3,
  TrendingUp,
  Info,
  ShieldAlert,
} from "lucide-react";

export type TabKey =
  | "ladder"
  | "schedule"
  | "teams"
  | "stats"
  | "graphs"
  | "details"
  | "management";

interface LeagueTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const LeagueTabs: React.FC<LeagueTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { key: "ladder" as TabKey, label: "Ladder", icon: ListOrdered },
    { key: "schedule" as TabKey, label: "Schedule", icon: CalendarDays },
    { key: "teams" as TabKey, label: "Teams", icon: Users },
    { key: "stats" as TabKey, label: "Stats", icon: BarChart3 },
    { key: "graphs" as TabKey, label: "Graphs", icon: TrendingUp },
    { key: "details" as TabKey, label: "Details", icon: Info },
    { key: "management" as TabKey, label: "Team Management", icon: ShieldAlert },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl overflow-x-auto no-scrollbar shadow-xs">
      <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                isActive
                  ? "border-amber-500 text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon
                size={16}
                className={isActive ? "text-amber-500" : "text-slate-400 dark:text-slate-500"}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
