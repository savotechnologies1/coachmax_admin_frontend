/** One class can have several weekly occurrences; expansion belongs to an
 * occurrence, while edits, enrollment and attendance belong to the class ID. */
import { APP_TIME_ZONE, formatDateOnly, todayDateOnly } from "./dateTime";
export const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
export const occurrenceKey = (slot: { occurrenceId?: string; classId: string; dayOfWeek?: string; startTime?: string }) =>
  slot.occurrenceId || `${slot.classId}:${slot.dayOfWeek || ""}:${slot.startTime || ""}`;
export const dayLabel = (day: string) => day.charAt(0) + day.slice(1).toLowerCase();
export const currentScheduleDay = () => formatDateOnly(todayDateOnly(APP_TIME_ZONE), { weekday: "long" });
export const currentScheduleMinutes = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "hour")?.value) * 60 + Number(parts.find((part) => part.type === "minute")?.value);
};
export const scheduleDayQuery = (activeDay: string) => activeDay === "View All" ? "ALL" : activeDay.toUpperCase();
export const distinctClassSlots = <T extends { classId: string }>(slots: T[]): T[] =>
  [...new Map(slots.map((slot) => [String(slot.classId), slot])).values()];
