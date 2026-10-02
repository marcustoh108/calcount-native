// Works out which calendar day a scan belongs to, in the user's own time zone, using the
// server's clock. Pure and dependency-free so it runs in Deno (Edge Functions) and in Node (tests).

/** Used when an old app version sends no time zone: matches how days were counted before. */
export const FALLBACK_TIME_ZONE = "Asia/Singapore";

/** Real-world UTC offsets run from −12:00 to +14:00. */
const MIN_OFFSET_MINUTES = -12 * 60;
const MAX_OFFSET_MINUTES = 14 * 60;

/** yyyy-mm-dd for `now` in an IANA time zone, or null if the zone isn't one the runtime knows. */
export function dayInTimeZone(timeZone: string, now: Date): string | null {
  if (timeZone.length === 0 || timeZone.length > 64) return null;
  try {
    // en-CA formats dates as yyyy-mm-dd.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const year = get("year");
    const month = get("month");
    const day = get("day");
    if (!year || !month || !day) return null;
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/** yyyy-mm-dd for `now` at a fixed offset east of UTC, in minutes (e.g. 480 for UTC+8). */
export function dayAtOffset(offsetMinutes: number, now: Date): string | null {
  if (!Number.isInteger(offsetMinutes) || offsetMinutes < MIN_OFFSET_MINUTES || offsetMinutes > MAX_OFFSET_MINUTES) {
    return null;
  }
  return new Date(now.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/**
 * The user's current day: from their IANA time zone if valid, else their UTC offset, else
 * Singapore time. Only the zone comes from the phone; the time is always the server's.
 */
export function scanDayFor(timeZone: unknown, utcOffsetMinutes: unknown, now: Date = new Date()): string {
  if (typeof timeZone === "string") {
    const day = dayInTimeZone(timeZone, now);
    if (day) return day;
  }
  if (typeof utcOffsetMinutes === "number") {
    const day = dayAtOffset(utcOffsetMinutes, now);
    if (day) return day;
  }
  return dayInTimeZone(FALLBACK_TIME_ZONE, now) ?? now.toISOString().slice(0, 10);
}
