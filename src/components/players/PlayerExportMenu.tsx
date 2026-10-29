import { useEffect, useRef, useState } from "react";
import { Download, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { PLAYER_EXPORT_COLUMNS, type PlayerExportColumn } from "./playerExport";

interface PlayerExportMenuProps {
  scopeLabel: string;
  isExporting: boolean;
  onExport: (columns: PlayerExportColumn[]) => Promise<boolean>;
}

export default function PlayerExportMenu({ scopeLabel, isExporting, onExport }: PlayerExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<PlayerExportColumn[]>(PLAYER_EXPORT_COLUMNS.map((column) => column.key));
  const [selected, setSelected] = useState<PlayerExportColumn[]>(PLAYER_EXPORT_COLUMNS.map((column) => column.key));
  const dragged = useRef<PlayerExportColumn | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  const moveColumn = (source: PlayerExportColumn, target: PlayerExportColumn) => {
    if (source === target) return;
    setColumns((current) => {
      const next = [...current];
      next.splice(next.indexOf(source), 1);
      next.splice(next.indexOf(target), 0, source);
      return next;
    });
  };

  const moveBy = (key: PlayerExportColumn, offset: number) => {
    const index = columns.indexOf(key);
    const target = columns[index + offset];
    if (target) moveColumn(key, target);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 min-h-11 min-w-[108px] items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#0047FF] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <Download size={14} /> Export <ChevronDown size={14} />
      </button>
      {open && (
        <div role="dialog" aria-label="Choose player export columns" className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,360px)] border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Export players</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">All matching players • {scopeLabel}. Search, metric and other visible filters apply.</p>
          <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Columns ({selected.length} selected)</p>
          <p className="mb-2 text-[11px] text-slate-500">Drag to reorder, or use the arrows.</p>
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700">
            {columns.map((key, index) => {
              const column = PLAYER_EXPORT_COLUMNS.find((item) => item.key === key)!;
              return (
                <div
                  key={key}
                  draggable
                  onDragStart={(event) => { dragged.current = key; event.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); if (dragged.current) moveColumn(dragged.current, key); dragged.current = null; }}
                  onDragEnd={() => { dragged.current = null; }}
                  className="flex items-center gap-2 border-b border-slate-100 bg-white px-2 py-1.5 last:border-b-0 dark:border-slate-800 dark:bg-slate-900"
                >
                  <GripVertical size={14} className="shrink-0 cursor-grab text-slate-400" aria-hidden="true" />
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={selected.includes(key)}
                      onChange={() => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])}
                    />
                    <span className="truncate">{column.label}</span>
                  </label>
                  <button type="button" aria-label={`Move ${column.label} up`} disabled={index === 0} onClick={() => moveBy(key, -1)} className="p-1 text-slate-500 disabled:opacity-30"><ChevronUp size={14} /></button>
                  <button type="button" aria-label={`Move ${column.label} down`} disabled={index === columns.length - 1} onClick={() => moveBy(key, 1)} className="p-1 text-slate-500 disabled:opacity-30"><ChevronDown size={14} /></button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            disabled={selected.length === 0 || isExporting}
            onClick={() => void onExport(columns.filter((key) => selected.includes(key))).then((success) => { if (success) setOpen(false); })}
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 bg-[#0047FF] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} /> {isExporting ? "Exporting…" : "Download CSV"}
          </button>
        </div>
      )}
    </div>
  );
}
