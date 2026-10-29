// src/components/EventComponents/HolidayCampSessionConfig.tsx
import React from "react";
import { Clock, DollarSign, Check, X, Calendar, AlertCircle } from "lucide-react";

export interface CampSessionRow {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Monday, 14 Dec"
  dayOfWeek: string;
  isEnabled: boolean; // whole date enabled
  hasFullDay: boolean;
  hasHalfDay: boolean;
  fullDayStart: string;
  fullDayEnd: string;
  fullDayPrice: number;
  fullDayCapacity?: number | null;
  halfDayStart: string;
  halfDayEnd: string;
  halfDayPrice: number;
  halfDayCapacity?: number | null;
}

interface HolidayCampSessionConfigProps {
  sessions: CampSessionRow[];
  onChange: (updated: CampSessionRow[]) => void;
  defaultFullPrice: number;
  defaultHalfPrice: number;
  onDefaultFullPriceChange: (val: number) => void;
  onDefaultHalfPriceChange: (val: number) => void;
}

export const HolidayCampSessionConfig: React.FC<HolidayCampSessionConfigProps> = ({
  sessions,
  onChange,
  defaultFullPrice,
  defaultHalfPrice,
  onDefaultFullPriceChange,
  onDefaultHalfPriceChange,
}) => {
  const handleToggleDate = (index: number) => {
    const next = [...sessions];
    next[index].isEnabled = !next[index].isEnabled;
    onChange(next);
  };

  const handleToggleFullDay = (index: number) => {
    const next = [...sessions];
    next[index].hasFullDay = !next[index].hasFullDay;
    onChange(next);
  };

  const handleToggleHalfDay = (index: number) => {
    const next = [...sessions];
    next[index].hasHalfDay = !next[index].hasHalfDay;
    onChange(next);
  };

  const handleFieldChange = (index: number, field: keyof CampSessionRow, val: any) => {
    const next = [...sessions];
    (next[index] as any)[field] = val;
    onChange(next);
  };

  const handleApplyDefaultsToAll = () => {
    const next = sessions.map((s) => ({
      ...s,
      fullDayPrice: defaultFullPrice,
      halfDayPrice: defaultHalfPrice,
    }));
    onChange(next);
  };

  const handleEnableAll = (enable: boolean) => {
    const next = sessions.map((s) => ({
      ...s,
      isEnabled: enable,
    }));
    onChange(next);
  };

  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-6 border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 text-center">
        <Calendar size={28} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No dates generated yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Select both a valid <strong>Start Date</strong> and <strong>End Date</strong> above to configure camp dates and Full Day / Half Day sessions.
        </p>
      </div>
    );
  }

  const enabledCount = sessions.filter((s) => s.isEnabled).length;

  return (
    <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#031549] text-white">
        <div>
          <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            <Clock size={16} className="text-brand-400" />
            Holiday Camp Dates & Sessions Configuration
          </h4>
          <p className="text-xs text-gray-300 mt-0.5">
            {enabledCount} of {sessions.length} dates enabled for booking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleEnableAll(true)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded text-white transition-all"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={() => handleEnableAll(false)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded text-white transition-all"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Global Default Rates Bar */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <DollarSign size={14} className="text-brand-600" /> Default Rates:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Full Day (8 AM–4 PM):</span>
            <input
              type="number"
              min={0}
              value={defaultFullPrice}
              onChange={(e) => onDefaultFullPriceChange(Number(e.target.value) || 0)}
              className="w-20 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Half Day (8 AM–2 PM):</span>
            <input
              type="number"
              min={0}
              value={defaultHalfPrice}
              onChange={(e) => onDefaultHalfPriceChange(Number(e.target.value) || 0)}
              className="w-20 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-white"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleApplyDefaultsToAll}
          className="px-3 py-1.5 bg-[#031549] text-white hover:bg-[#072477] text-xs font-bold transition-all shadow-sm"
        >
          Apply Rates to All Dates
        </button>
      </div>

      {/* Table of Generated Dates */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 uppercase font-bold text-[11px] border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-3 w-12 text-center">Status</th>
              <th className="p-3">Camp Date</th>
              <th className="p-3 min-w-[240px]">Full Day Session (8 AM–4 PM)</th>
              <th className="p-3 min-w-[240px]">Half Day Session (8 AM–2 PM)</th>
              <th className="p-3 text-center w-28">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sessions.map((row, idx) => (
              <tr
                key={row.dateStr}
                className={`transition-colors ${
                  !row.isEnabled
                    ? "bg-gray-50/70 dark:bg-gray-900/40 opacity-60"
                    : "hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
                }`}
              >
                {/* Toggle Date Checkbox */}
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={row.isEnabled}
                    onChange={() => handleToggleDate(idx)}
                    className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                  />
                </td>

                {/* Date Label */}
                <td className="p-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  <div>{row.dayLabel}</div>
                  <div className="text-[10px] text-gray-400 font-normal">{row.dateStr}</div>
                </td>

                {/* Full Day Options */}
                <td className="p-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!row.isEnabled}
                        checked={row.hasFullDay}
                        onChange={() => handleToggleFullDay(idx)}
                        className="w-3.5 h-3.5 text-blue-800 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className={`font-semibold ${row.hasFullDay ? "text-blue-900 dark:text-blue-300" : "text-gray-400"}`}>
                        Offer Full Day
                      </span>
                    </label>

                    {row.hasFullDay && row.isEnabled && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-gray-500 block">Fee ($)</label>
                          <input
                            type="number"
                            min={0}
                            value={row.fullDayPrice}
                            onChange={(e) => handleFieldChange(idx, "fullDayPrice", Number(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block">Timing</label>
                          <input
                            type="text"
                            value={`${row.fullDayStart} - ${row.fullDayEnd}`}
                            onChange={(e) => {
                              const parts = e.target.value.split("-").map(p => p.trim());
                              if (parts[0]) handleFieldChange(idx, "fullDayStart", parts[0]);
                              if (parts[1]) handleFieldChange(idx, "fullDayEnd", parts[1]);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs text-gray-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                {/* Half Day Options */}
                <td className="p-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!row.isEnabled}
                        checked={row.hasHalfDay}
                        onChange={() => handleToggleHalfDay(idx)}
                        className="w-3.5 h-3.5 text-sky-500 rounded border-gray-300 focus:ring-sky-400"
                      />
                      <span className={`font-semibold ${row.hasHalfDay ? "text-sky-700 dark:text-sky-300" : "text-gray-400"}`}>
                        Offer Half Day
                      </span>
                    </label>

                    {row.hasHalfDay && row.isEnabled && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-gray-500 block">Fee ($)</label>
                          <input
                            type="number"
                            min={0}
                            value={row.halfDayPrice}
                            onChange={(e) => handleFieldChange(idx, "halfDayPrice", Number(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block">Timing</label>
                          <input
                            type="text"
                            value={`${row.halfDayStart} - ${row.halfDayEnd}`}
                            onChange={(e) => {
                              const parts = e.target.value.split("-").map(p => p.trim());
                              if (parts[0]) handleFieldChange(idx, "halfDayStart", parts[0]);
                              if (parts[1]) handleFieldChange(idx, "halfDayEnd", parts[1]);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs text-gray-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                {/* Availability State */}
                <td className="p-3 text-center">
                  {row.isEnabled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <Check size={12} strokeWidth={3} />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <X size={12} strokeWidth={3} />
                      Disabled
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <p>
          <strong>Configurable Flexibility:</strong> You can enable or disable any individual date. For each enabled date, you can choose to offer Full Day only, Half Day only, or both options for participants to select from.
        </p>
      </div>
    </div>
  );
};

export default HolidayCampSessionConfig;
