import React from 'react';

export interface StatusColorInfo {
  key: string;
  label: string;
  dotColor: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  menuHoverClass: string;
  description: string;
}

export const STATUS_REGISTRY: Record<string, StatusColorInfo> = {
  PAID: {
    key: "PAID",
    label: "PAID",
    dotColor: "bg-emerald-600",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeClass: "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Paid & Confirmed Active"
  },
  ACTIVE: {
    key: "ACTIVE",
    label: "PAID",
    dotColor: "bg-emerald-600",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeClass: "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Active / Paid Status"
  },
  APPROVED: {
    key: "APPROVED",
    label: "PAID",
    dotColor: "bg-emerald-600",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeClass: "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Approved & Paid"
  },
  HANDSHAKE: {
    key: "HANDSHAKE",
    label: "HANDSHAKE",
    dotColor: "bg-amber-400",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-200 dark:border-amber-800",
    badgeClass: "bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Handshake Deal (Scholarship / Director Approved)"
  },
  UNPAID: {
    key: "UNPAID",
    label: "APPROVED (UNPAID)",
    dotColor: "bg-slate-700 dark:bg-slate-300",
    textClass: "text-slate-800 dark:text-slate-200",
    bgClass: "bg-slate-50 dark:bg-slate-800/40",
    borderClass: "border-slate-300 dark:border-slate-700",
    badgeClass: "bg-slate-100 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Approved & Fee Allocated (Pending Payment)"
  },
  TRIAL: {
    key: "TRIAL",
    label: "TRIAL",
    dotColor: "bg-red-500",
    textClass: "text-red-500 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/40",
    borderClass: "border-red-200 dark:border-red-800",
    badgeClass: "bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Trial Session (Red Text, No Icon)"
  },
  TBC: {
    key: "TBC",
    label: "TBC",
    dotColor: "bg-[#b7a9d9]",
    textClass: "text-[#b7a9d9]",
    bgClass: "bg-[#b7a9d9]/10 dark:bg-[#b7a9d9]/20",
    borderClass: "border-[#b7a9d9]/40 dark:border-[#b7a9d9]/40",
    badgeClass: "bg-[#b7a9d9]/15 border border-[#b7a9d9]/40 text-[#b7a9d9]",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "To Be Confirmed (#b7a9d9 Text, No Icon)"
  },
  EXTRA: {
    key: "EXTRA",
    label: "EXTRA",
    dotColor: "bg-[#d6d11a]",
    textClass: "text-[#d6d11a]",
    bgClass: "bg-[#d6d11a]/10 dark:bg-[#d6d11a]/20",
    borderClass: "border-[#d6d11a]/40 dark:border-[#d6d11a]/40",
    badgeClass: "bg-[#d6d11a]/15 border border-[#d6d11a]/40 text-[#d6d11a]",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Extra Player Status (#d6d11a Text, No Icon)"
  },
  OTHERS: {
    key: "OTHERS",
    label: "EXTRA",
    dotColor: "bg-[#d6d11a]",
    textClass: "text-[#d6d11a]",
    bgClass: "bg-[#d6d11a]/10 dark:bg-[#d6d11a]/20",
    borderClass: "border-[#d6d11a]/40 dark:border-[#d6d11a]/40",
    badgeClass: "bg-[#d6d11a]/15 border border-[#d6d11a]/40 text-[#d6d11a]",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Extra Player Status (#d6d11a Text, No Icon)"
  },
  SUBSTITUTE: {
    key: "SUBSTITUTE",
    label: "SUBSTITUTE",
    dotColor: "bg-[#d6d11a]",
    textClass: "text-[#d6d11a]",
    bgClass: "bg-[#d6d11a]/10 dark:bg-[#d6d11a]/20",
    borderClass: "border-[#d6d11a]/40 dark:border-[#d6d11a]/40",
    badgeClass: "bg-[#d6d11a]/15 border border-[#d6d11a]/40 text-[#d6d11a]",
    menuHoverClass: "hover:bg-slate-50 dark:hover:bg-slate-700/50",
    description: "Substitute Player (#d6d11a Text, No Icon)"
  }
};

export const getStatusConfig = (status?: string): StatusColorInfo => {
  const key = (status || "UNPAID").toUpperCase();
  return STATUS_REGISTRY[key] || STATUS_REGISTRY.UNPAID;
};

export const STATUS_COLOR_CONFIG = STATUS_REGISTRY;

export const getPlayerStatusTextClass = (status?: string): string => {
  const st = (status || "").toUpperCase();
  if (st === "TRIAL") {
    return "text-red-500 dark:text-red-400 hover:text-red-600 font-bold";
  }
  if (st === "TBC") {
    return "text-[#b7a9d9] hover:opacity-80 font-bold";
  }
  if (st === "EXTRA" || st === "OTHERS" || st === "SUBSTITUTE") {
    return "text-[#d6d11a] hover:opacity-80 font-bold";
  }
  return "text-slate-800 dark:text-slate-200 hover:text-[#0047FF] dark:hover:text-[#336eff]";
};

export const StatusDot: React.FC<{ status: string; className?: string }> = ({ status, className = "w-2 h-2" }) => {
  const config = getStatusConfig(status);
  return <span className={`rounded-full shrink-0 ${config.dotColor} ${className}`} />;
};

export interface StatusIconProps {
  status: string;
  className?: string;
  size?: string;
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status, className = "", size = "w-5 h-5" }) => {
  const s = (status || "").toUpperCase();

  // PAID, APPROVED, ACTIVE -> Green circle checkmark
  if (s === "PAID" || s === "APPROVED" || s === "ACTIVE") {
    return (
      <div className={`flex items-center justify-center text-emerald-600 ${className}`} title="PAID">
        <svg className={`${size} fill-current`} viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  // HANDSHAKE -> Handshake icon
  if (s === "HANDSHAKE") {
    const isSmall = size.includes("w-3") || size.includes("w-4") || size.includes("w-3.5");
    return (
      <div className={`flex items-center justify-center ${className}`} title="HANDSHAKE">
        <span
          className={`${isSmall ? "text-xs" : "text-sm"} leading-none select-none`}
          role="img"
          aria-label="handshake"
        >
          🤝
        </span>
      </div>
    );
  }

  // APPROVED (UNPAID) / UNPAID -> Outlined circle with horizontal minus
  if (s === "UNPAID" || s === "APPROVED (UNPAID)") {
    return (
      <div
        className={`flex items-center justify-center text-slate-700 dark:text-slate-300 ${className}`}
        title="APPROVED (UNPAID)"
      >
        <svg className={size} viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <circle cx="10" cy="10" r="7.5" strokeWidth="1.8" />
          <line x1="5.5" y1="10" x2="14.5" y2="10" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // OVER_DUE -> Red outlined circle with warning line
  if (s === "OVER_DUE") {
    return (
      <div
        className={`flex items-center justify-center text-rose-600 dark:text-rose-400 ${className}`}
        title="OVER DUE"
      >
        <svg className={size} viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <circle cx="10" cy="10" r="7.5" strokeWidth="1.8" />
          <line x1="10" y1="6" x2="10" y2="10.5" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="10" cy="13.5" r="0.9" fill="currentColor" />
        </svg>
      </div>
    );
  }

  // TRIAL -> Blank space, shows "TRIAL" on hover
  if (s === "TRIAL") {
    return (
      <div
        className={`group/status relative inline-flex items-center justify-center ${size} ${className} cursor-default`}
        title="TRIAL"
        aria-label="TRIAL"
      >
        <span className="inline-block w-4 h-4 select-none opacity-0" />
        <span className="pointer-events-none absolute left-1/2 -top-7 -translate-x-1/2 opacity-0 group-hover/status:opacity-100 transition-opacity bg-slate-900 text-white dark:bg-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md z-[110] whitespace-nowrap">
          TRIAL
        </span>
      </div>
    );
  }

  // TBC -> Blank space, shows "TBC" on hover
  if (s === "TBC") {
    return (
      <div
        className={`group/status relative inline-flex items-center justify-center ${size} ${className} cursor-default`}
        title="TBC"
        aria-label="TBC"
      >
        <span className="inline-block w-4 h-4 select-none opacity-0" />
        <span className="pointer-events-none absolute left-1/2 -top-7 -translate-x-1/2 opacity-0 group-hover/status:opacity-100 transition-opacity bg-slate-900 text-white dark:bg-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md z-[110] whitespace-nowrap">
          TBC
        </span>
      </div>
    );
  }

  // EXTRA, OTHERS, SUBSTITUTE -> Blank space, shows "EXTRA" on hover
  if (s === "EXTRA" || s === "OTHERS" || s === "SUBSTITUTE") {
    const label = s === "SUBSTITUTE" ? "SUBSTITUTE" : "EXTRA";
    return (
      <div
        className={`group/status relative inline-flex items-center justify-center ${size} ${className} cursor-default`}
        title={label}
        aria-label={label}
      >
        <span className="inline-block w-4 h-4 select-none opacity-0" />
        <span className="pointer-events-none absolute left-1/2 -top-7 -translate-x-1/2 opacity-0 group-hover/status:opacity-100 transition-opacity bg-slate-900 text-white dark:bg-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md z-[110] whitespace-nowrap">
          {label}
        </span>
      </div>
    );
  }

  return null;
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = "" }) => {
  const config = getStatusConfig(status);
  return (
    <span className={`px-2 py-0.5 font-bold text-[9px] uppercase rounded-none shadow-xs ${config.badgeClass} ${className}`}>
      {config.label}
    </span>
  );
};

export interface StatusUpdateMenuListProps {
  currentStatus?: string;
  onSelectStatus: (statusKey: string) => void;
  allowedStatuses?: string[];
  isTeam?: boolean;
}

export const StatusUpdateMenuList: React.FC<StatusUpdateMenuListProps> = ({
  onSelectStatus,
  isTeam = false,
}) => {
  return (
    <div className="py-1 select-none">
      <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        UPDATE STATUS
      </div>

      {/* Group 1: Statuses with Icons (PAID, HANDSHAKE, APPROVED (UNPAID)) */}
      <div className="space-y-0.5 mt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStatus("PAID");
          }}
          className="w-full text-left px-4 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2.5"
        >
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            <StatusIcon status="PAID" size="w-4 h-4" />
          </div>
          <span>PAID</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStatus("HANDSHAKE");
          }}
          className="w-full text-left px-4 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2.5"
        >
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            <StatusIcon status="HANDSHAKE" size="w-4 h-4" />
          </div>
          <span>HANDSHAKE</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStatus("UNPAID");
          }}
          className="w-full text-left px-4 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2.5"
        >
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            <StatusIcon status="UNPAID" size="w-4 h-4" />
          </div>
          <span>APPROVED (UNPAID)</span>
        </button>
      </div>

      {/* Group 2: Statuses with Colored Text Only (No Icons) */}
      <div className="space-y-0.5 mt-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStatus("TRIAL");
          }}
          className="w-full text-left pl-8 pr-4 py-1 text-xs font-bold text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors block"
        >
          TRIAL
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStatus("TBC");
          }}
          className="w-full text-left pl-8 pr-4 py-1 text-xs font-bold text-[#b7a9d9] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors block"
        >
          TBC
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectStatus("EXTRA");
          }}
          className="w-full text-left pl-8 pr-4 py-1 text-xs font-bold text-[#d6d11a] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors block"
        >
          EXTRA
        </button>

        {isTeam && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectStatus("SUBSTITUTE");
            }}
            className="w-full text-left pl-8 pr-4 py-1 text-xs font-bold text-[#d6d11a] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors block"
          >
            SUBSTITUTE
          </button>
        )}
      </div>
    </div>
  );
};

export const DEFAULT_UPDATE_STATUS_KEYS = [
  "TRIAL",
  "UNPAID",
  "PAID",
  "TBC",
  "HANDSHAKE",
  "EXTRA",
  "SUBSTITUTE"
];

interface StatusColorCodeProps {
  isTeam?: boolean;
  className?: string;
}

export const StatusColorCode: React.FC<StatusColorCodeProps> = ({
  isTeam = false,
  className = ""
}) => {
  const legendItems = [
    STATUS_REGISTRY.PAID,
    STATUS_REGISTRY.UNPAID,
    STATUS_REGISTRY.TRIAL,
    STATUS_REGISTRY.TBC,
    STATUS_REGISTRY.HANDSHAKE,
    STATUS_REGISTRY.EXTRA,
    ...(isTeam ? [STATUS_REGISTRY.SUBSTITUTE] : []),
  ];

  return (
    <div className={`flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 ${className}`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Colors:</span>
      <div className="flex flex-wrap items-center gap-2.5">
        {legendItems.map((item) => {
          const hasIcon = item.key === "PAID" || item.key === "ACTIVE" || item.key === "APPROVED" || item.key === "HANDSHAKE" || item.key === "UNPAID";
          return (
            <div key={item.key} className="flex items-center gap-1.5 bg-slate-100/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-[4px] border border-slate-200/50 dark:border-slate-700/50">
              {hasIcon ? (
                <StatusIcon status={item.key} size="w-3.5 h-3.5" className="shrink-0" />
              ) : (
                <span className={`w-2 h-2 rounded-full ${item.dotColor} shrink-0`} />
              )}
              <span className={`text-[10px] font-bold ${hasIcon ? "text-slate-700 dark:text-slate-200" : item.textClass}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusColorCode;

