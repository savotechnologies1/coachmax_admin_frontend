import React, { useMemo, useState } from "react";
import { addDateOnlyDays, todayDateOnly, toDateOnly } from "../../utils/dateTime";

interface Term {
  _id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
  isEvent?: boolean;
}

interface TermCalendarProps {
  terms: Term[];
  selectedYear: number;
}

// Deterministic color generator
// Seeds a hue from the term's _id so every term always gets the same distinct color.
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Golden-ratio angle increment to maximize visual distance between terms
const GOLDEN_ANGLE = 137.508;

function getTermColor(id: string, index: number) {
  const idOffset = (hashString(id) % 30) - 15;
  const hue = ((index * GOLDEN_ANGLE) + idOffset + 360) % 360;
  const sat = 65 + (hashString(id + "s") % 20);
  const lum = 42 + (hashString(id + "l") % 10);

  const bg = `hsl(${hue}, ${sat}%, ${lum}%)`;
  const light = `hsl(${hue}, ${sat - 10}%, 93%)`;
  const text = `hsl(${hue}, ${sat}%, ${lum - 12}%)`;
  const border = `hsl(${hue}, ${sat - 15}%, 75%)`;

  return { bg, light, text, border };
}

const MONTH_NAMES = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const TermCalendar: React.FC<TermCalendarProps> = ({ terms, selectedYear }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build date → array of term indices
  const dateMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    terms.forEach((term, idx) => {
      const termStart = toDateOnly(term.startDate);
      const termEnd = toDateOnly(term.endDate);
      if (!termStart || !termEnd || termStart > termEnd) return;
      // Only expand the visible year, including terms crossing New Year.
      const start = termStart < `${selectedYear}-01-01` ? `${selectedYear}-01-01` : termStart;
      const end = termEnd > `${selectedYear}-12-31` ? `${selectedYear}-12-31` : termEnd;
      let cur = start;
      while (cur <= end) {
        const key = cur;
        if (!map[key]) map[key] = [];
        map[key].push(idx);
        cur = addDateOnlyDays(cur, 1);
      }
    });
    return map;
  }, [terms, selectedYear]);

  const todayKey = todayDateOnly();

  return (
    <div className="flex flex-col gap-4">

      {/* ── Legend ── */}
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-1">
          {terms.map((term, idx) => {
            const c = getTermColor(term._id, idx);
            const active = hoveredId === term._id;
            return (
              <div
                key={term._id}
                onMouseEnter={() => setHoveredId(term._id)}
                onMouseLeave={() => setHoveredId(null)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-none border text-[11px] font-bold cursor-default transition-all duration-150 select-none"
                style={{
                  backgroundColor: active ? c.bg : c.light,
                  borderColor: c.border,
                  color: active ? "#fff" : c.text,
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? "#fff" : c.bg }} />
                {term.name}
                {term.isEvent && (
                  <span className="ml-1 text-[8px] uppercase tracking-wider opacity-70">
                    Holiday
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 12-Month Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const daysInMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();
          const firstDay = (new Date(selectedYear, monthIdx, 1).getDay() + 6) % 7;

          const cells: React.ReactNode[] = [];

          // Empty padding cells
          for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`e${i}`} className="h-7" />);
          }

          // Day cells
          for (let d = 1; d <= daysInMonth; d++) {
            const key = toKey(selectedYear, monthIdx, d);
            const indices = dateMap[key] || [];
            const isToday = key === todayKey;
            const primaryIdx = indices[0];
            const primaryTerm = primaryIdx !== undefined ? terms[primaryIdx] : null;
            const c = primaryTerm ? getTermColor(primaryTerm._id, primaryIdx) : null;
            const termId = primaryTerm?._id ?? null;
            const isHovered = termId !== null && hoveredId === termId;

            // Is this a start/end day of the term in this month?
            let isStart = false;
            let isEnd = false;
            if (c && primaryIdx !== undefined) {
              const prevKey = d > 1
                ? toKey(selectedYear, monthIdx, d - 1)
                : `${selectedYear}-${String(monthIdx).padStart(2, "0")}-99`;
              const nextKey = d < daysInMonth
                ? toKey(selectedYear, monthIdx, d + 1)
                : `${selectedYear}-${String(monthIdx + 2).padStart(2, "0")}-00`;
              isStart = !(dateMap[prevKey] || []).includes(primaryIdx) || d === 1;
              isEnd = !(dateMap[nextKey] || []).includes(primaryIdx) || d === daysInMonth;
            }

            cells.push(
              <div
                key={d}
                className="relative flex items-center justify-center h-7"
                onMouseEnter={() => termId && setHoveredId(termId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Continuous stripe for mid-range days */}
                {c && !isStart && !isEnd && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: isHovered ? c.bg : c.light,
                      opacity: 0.9,
                    }}
                  />
                )}
                {/* Half-stripe leading from start circle */}
                {c && isStart && !isEnd && (
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      left: "50%", right: 0,
                      backgroundColor: isHovered ? c.bg : c.light,
                      opacity: 0.9,
                    }}
                  />
                )}
                {/* Half-stripe ending at end circle */}
                {c && isEnd && !isStart && (
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      left: 0, right: "50%",
                      backgroundColor: isHovered ? c.bg : c.light,
                      opacity: 0.9,
                    }}
                  />
                )}
                {/* Filled circle for start/end/single day */}
                {c && (isStart || isEnd) && (
                  <div
                    className="absolute w-7 h-7 rounded-full z-10"
                    style={{ backgroundColor: c.bg }}
                  />
                )}
                {/* Today ring (when not in a term) */}
                {isToday && !c && (
                  <div className="absolute w-7 h-7 rounded-full border-2 border-[#1d4ed8] z-10" />
                )}
                {/* Day number */}
                <span
                  className="relative z-20 text-[11px] font-semibold select-none leading-none"
                  style={{
                    color: c
                      ? (isStart || isEnd)
                        ? "#ffffff"
                        : isHovered ? c.bg : c.text
                      : isToday
                        ? "#1d4ed8"
                        : "#94a3b8",
                    fontWeight: (isStart || isEnd || isToday) ? 700 : 500,
                  }}
                >
                  {d}
                </span>
              </div>
            );
          }

          return (
            <div
              key={monthName}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-none p-3 shadow-sm"
            >
              {/* Month title */}
              <div className="text-[10px] font-black uppercase tracking-widest text-[#031549] dark:text-slate-300 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                {monthName} <span className="text-slate-400 font-semibold">{selectedYear}</span>
              </div>
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 mb-0.5">
                {DAY_LABELS.map((lbl, i) => (
                  <div key={i} className="flex items-center justify-center h-5">
                    <span className="text-[9px] font-bold uppercase text-slate-400">{lbl}</span>
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7">{cells}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TermCalendar;
