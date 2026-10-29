import type { Player } from "../../types/player";
import { formatDateOnly } from "../../utils/dateTime";

export const PLAYER_EXPORT_COLUMNS = [
  { key: "name", label: "Player name" },
  { key: "dob", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "category", label: "Category" },
  { key: "program", label: "Program" },
  { key: "classes", label: "Assigned classes" },
  { key: "term", label: "Term" },
  { key: "payment", label: "Payment status" },
  { key: "jersey", label: "Jersey number" },
  { key: "skill", label: "Skill rating" },
  { key: "foot", label: "Preferred foot" },
  { key: "medical", label: "Medical conditions" },
  { key: "contact", label: "Contact name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
] as const;

export type PlayerExportColumn = (typeof PLAYER_EXPORT_COLUMNS)[number]["key"];

const idOf = (value: any): string => String(value?._id || value || "");
const classesInScope = (player: Player, termId: string, year: string): any[] =>
  (player.assignedClasses || []).filter((item: any) => {
    if (termId !== "All") return idOf(item?.term) === termId;
    if (year !== "All") return String(item?.term?.year || "") === year;
    return true;
  });

function cellValue(player: Player, key: PlayerExportColumn, termId: string, year: string): string {
  const classes = classesInScope(player, termId, year);
  const paymentEntries = (player.classPaymentStatuses || []).filter((entry) =>
    classes.some((item: any) => idOf(item) === idOf(entry.class))
  );

  switch (key) {
    case "name": return player.fullName || [player.firstName, player.lastName].filter(Boolean).join(" ");
    case "dob": return player.dob ? formatDateOnly(player.dob) : "";
    case "gender": return player.gender || "";
    case "category": return player.category?.name || "";
    case "program": return (player.programs || []).map((item) => item.name).filter(Boolean).join(", ") || player.program?.name || "";
    case "classes": return classes.map((item: any) => item.name).filter(Boolean).join(", ");
    case "term": return Array.from(new Set(classes.map((item: any) => item.term?.name).filter(Boolean))).join(", ") || (typeof player.term === "object" ? (player.term as any)?.name : "") || "";
    case "payment": return paymentEntries.map((item) => item.paymentStatus).filter(Boolean).join(", ") || player.paymentStatus || "";
    case "jersey": return player.jerseyNumber == null ? "" : String(player.jerseyNumber);
    case "skill": return player.rating == null ? "" : String(player.rating);
    case "foot": return player.preferredFoot || player.prefferedFoot || "";
    case "medical": return player.medicalConditionDetails || player.medicalConditions || (player.isMedicalCondition ? "Yes" : "No");
    case "contact": return player.parentId?.fullName || "";
    case "email": return player.parentId?.email || player.email || "";
    case "phone": return player.parentId?.phone || player.phone || "";
  }
}

const csvCell = (value: string): string => {
  // Keep spreadsheet programs from interpreting user supplied values as formulas.
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function downloadPlayersCsv(players: Player[], columns: PlayerExportColumn[], termId: string, year: string): void {
  const headers = columns.map((key) => PLAYER_EXPORT_COLUMNS.find((column) => column.key === key)?.label || key);
  const lines = [headers.map(csvCell).join(",")];
  players.forEach((player) => {
    lines.push(columns.map((key) => csvCell(String(cellValue(player, key, termId, year) || ""))).join(","));
  });

  const url = URL.createObjectURL(new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `players_${year === "All" ? "all-years" : year}_${termId === "All" ? "all-terms" : "selected-term"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
