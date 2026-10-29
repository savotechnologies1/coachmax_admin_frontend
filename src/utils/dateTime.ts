/** Calendar dates use YYYY-MM-DD on the wire and DD/MM/YYYY in the UI.
 * Only timestamps are converted between timezones. Picker Date values must use
 * dateOnlyFormValue so their local calendar day is retained. */
export const APP_TIME_ZONE = import.meta.env.VITE_APP_TIMEZONE || "Australia/Sydney";
export const APP_LOCALE = "en-GB";
type DateValue = string | Date | null | undefined;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/;

export const getViewerTimeZone = (): string => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || APP_TIME_ZONE; }
  catch { return APP_TIME_ZONE; }
};

/** Strict legacy adapter. Invalid/impossible dates never silently roll over. */
export const toDateOnly = (value: DateValue): string => {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0) {
      return value.toISOString().slice(0, 10);
    }
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: getViewerTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  let candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return "";
  const legacy = candidate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (legacy) candidate = `${legacy[3]}-${legacy[2]}-${legacy[1]}`;
  else if (ISO_TIMESTAMP_RE.test(candidate)) {
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) return "";
    if (candidate.endsWith("T00:00:00.000Z") || candidate.endsWith("T00:00:00Z")) {
      candidate = candidate.slice(0, 10);
    } else {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: getViewerTimeZone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(parsed);
      const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
      candidate = `${part("year")}-${part("month")}-${part("day")}`;
    }
  }
  const match = candidate.match(DATE_ONLY_RE);
  if (!match) return "";
  const check = new Date(`${candidate}T00:00:00.000Z`);
  return check.getUTCFullYear() === Number(match[1]) && check.getUTCMonth() + 1 === Number(match[2]) && check.getUTCDate() === Number(match[3]) ? candidate : "";
};

export const dateOnlyToLocalDate = (value: DateValue): Date | null => {
  const match = toDateOnly(value).match(DATE_ONLY_RE);
  if (!match) return null;
  const date = new Date(0);
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(12, 0, 0, 0);
  return date;
};

export const dateOnlyFormValue = (value: Date | null | undefined): string => {
  if (!value || Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear().toString().padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

export const todayDateOnly = (timeZone = getViewerTimeZone()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const addDateOnlyDays = (value: string, amount: number): string => {
  const normalized = toDateOnly(value);
  if (!normalized || !Number.isInteger(amount)) throw new TypeError("A valid calendar date and whole number of days are required");
  const date = new Date(`${normalized}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

export const formatDateOnly = (value: DateValue, options?: Intl.DateTimeFormatOptions, locale = APP_LOCALE): string => {
  const normalized = toDateOnly(value);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-");
  const date = `${day}/${month}/${year}`;
  const weekday = options?.weekday ? new Intl.DateTimeFormat(locale, { weekday: options.weekday, timeZone: "UTC" }).format(new Date(`${normalized}T00:00:00.000Z`)) : "";
  if (weekday && !options?.day && !options?.month && !options?.year && !options?.dateStyle) return weekday;
  return weekday ? `${weekday} ${date}` : date;
};

export const formatDateTime = (value: DateValue, options?: Intl.DateTimeFormatOptions, timeZone = getViewerTimeZone()): string => {
  if (!value) return "";
  // Calendar values have no local clock or offset, even at mixed legacy call sites.
  if (typeof value === "string" && (DATE_ONLY_RE.test(value.trim()) || /^\d{2}\/\d{2}\/\d{4}$/.test(value.trim()))) return formatDateOnly(value, options);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (options) {
    const hasDate = options.dateStyle || options.day || options.month || options.year;
    if (!hasDate) return new Intl.DateTimeFormat(APP_LOCALE, { ...options, timeZone }).format(date);
    const datePart = new Intl.DateTimeFormat(APP_LOCALE, { year: "numeric", month: "2-digit", day: "2-digit", ...(options.weekday ? { weekday: options.weekday } : {}), timeZone }).format(date);
    const hasTime = options.timeStyle || options.hour || options.minute || options.second;
    if (!hasTime) return datePart;
    const timePart = new Intl.DateTimeFormat(APP_LOCALE, options.timeStyle
      ? { timeStyle: options.timeStyle, timeZone }
      : { hour: options.hour, minute: options.minute, second: options.second, hour12: options.hour12, timeZone }).format(date);
    return `${datePart} ${timePart}`;
  }
  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
};

/** A timestamp's date in the viewer timezone (createdAt/payment time, etc.). */
export const formatTimestampDate = (value: DateValue, timeZone = getViewerTimeZone()): string =>
  formatDateTime(value, { year: "numeric", month: "2-digit", day: "2-digit" }, timeZone);

export const formatTime = (value: DateValue, timeZone = getViewerTimeZone()): string =>
  formatDateTime(value, { hour: "numeric", minute: "2-digit" }, timeZone);

export const ageGroupContextYear = (termYear?: number | string | null): number => {
  if (termYear !== undefined && termYear !== null && termYear !== "") {
    const year = Number(termYear);
    if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new TypeError("Age group year must be a valid four-digit year");
    return year;
  }
  return Number(todayDateOnly(APP_TIME_ZONE).slice(0, 4));
};

export const ageGroupForYear = (dob: DateValue, contextYear?: number | string | null): number | null => {
  const normalized = toDateOnly(dob);
  if (!normalized) return null;
  const age = ageGroupContextYear(contextYear) - Number(normalized.slice(0, 4));
  return age >= 0 ? age : null;
};

/** Convert a valid organisation wall-clock time to a UTC instant. Reject DST gaps. */
export const zonedDateTimeToUtcISOString = (dateValue: string, timeValue: string, timeZone = APP_TIME_ZONE): string => {
  const normalized = toDateOnly(dateValue);
  const match = normalized.match(DATE_ONLY_RE);
  const timeMatch = timeValue.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match || !timeMatch) throw new TypeError("A valid date and time (HH:mm) are required");
  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const meridiem = timeMatch[3]?.toUpperCase();
  if (minutes > 59 || (meridiem ? hours < 1 || hours > 12 : hours > 23)) throw new TypeError("Invalid time");
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const wallClock = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hours, minutes);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  let guess = wallClock;
  for (let i = 0; i < 4; i += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value || 0);
    guess += wallClock - Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  }
  const parts = formatter.formatToParts(new Date(guess));
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  if (`${part("year")}-${part("month")}-${part("day")}` !== normalized || Number(part("hour")) !== hours || Number(part("minute")) !== minutes) throw new TypeError("The selected local time does not exist in this timezone");
  return new Date(guess).toISOString();
};

