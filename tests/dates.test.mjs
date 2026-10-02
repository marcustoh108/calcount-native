// Time-zone and midnight tests. Run with `npm test` (fixed to America/New_York so the
// daylight-saving cases are reproducible on any machine).
import assert from "node:assert/strict";
import { test } from "node:test";

import { dayAtOffset, dayInTimeZone, scanDayFor } from "../supabase/functions/_shared/scanDay.ts";
import { formatDayLabel, lastNDays, msUntilNextMidnight, todayKey } from "../lib/utils/date.ts";

const HOUR = 3_600_000;

test("scan day follows the user's own time zone", () => {
  const now = new Date("2026-10-02T15:30:00Z");
  assert.equal(dayInTimeZone("Asia/Singapore", now), "2026-10-02"); // 23:30
  assert.equal(dayInTimeZone("Pacific/Auckland", now), "2026-10-03"); // 04:30 next day
  assert.equal(dayInTimeZone("Europe/London", now), "2026-10-02");
  assert.equal(dayInTimeZone("America/Los_Angeles", now), "2026-10-02"); // 08:30
  assert.equal(dayInTimeZone("Pacific/Kiritimati", now), "2026-10-03"); // UTC+14
  assert.equal(dayInTimeZone("Etc/GMT+12", now), "2026-10-02"); // UTC−12
  // An hour later Singapore has passed midnight; Los Angeles hasn't.
  const later = new Date("2026-10-02T16:30:00Z");
  assert.equal(dayInTimeZone("Asia/Singapore", later), "2026-10-03");
  assert.equal(dayInTimeZone("America/Los_Angeles", later), "2026-10-02");
});

test("bad or missing time zones fall back safely", () => {
  const now = new Date("2026-10-02T23:30:00Z");
  assert.equal(dayInTimeZone("Not/AZone", now), null);
  assert.equal(dayInTimeZone("", now), null);
  assert.equal(scanDayFor("Not/AZone", 60, now), "2026-10-03"); // uses the UTC+1 offset
  assert.equal(scanDayFor(null, -300, now), "2026-10-02"); // UTC−5
  assert.equal(scanDayFor(undefined, undefined, now), "2026-10-03"); // Singapore, as before
  assert.equal(scanDayFor(42, "480", now), "2026-10-03");
  assert.equal(dayAtOffset(15 * 60, now), null);
  assert.equal(dayAtOffset(-13 * 60, now), null);
  assert.equal(dayAtOffset(1.5, now), null);
});

test("every real time zone stays within a day of UTC (what the database accepts)", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const utcDay = Date.UTC(2026, 9, 2);
  for (const zone of Intl.supportedValuesOf("timeZone")) {
    const day = dayInTimeZone(zone, now);
    assert.ok(day, zone);
    const diffDays = (Date.parse(`${day}T00:00:00Z`) - utcDay) / (24 * HOUR);
    assert.ok(Math.abs(diffDays) <= 1, `${zone} → ${day}`);
  }
});

test("midnight timer handles daylight-saving days", () => {
  assert.equal(process.env.TZ, "America/New_York", "run tests with `npm test`");
  // 1 Nov 2026: clocks go back, so the day is 25 hours long.
  assert.equal(msUntilNextMidnight(new Date(2026, 10, 1, 0, 0, 0)), 25 * HOUR);
  // 8 Mar 2026: clocks go forward, so the day is 23 hours long.
  assert.equal(msUntilNextMidnight(new Date(2026, 2, 8, 0, 0, 0)), 23 * HOUR);
  assert.equal(msUntilNextMidnight(new Date(2026, 9, 2, 23, 59, 0)), 60_000);
});

test("day keys and labels use local dates", () => {
  assert.equal(todayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(formatDayLabel(todayKey()), "Today");
  const y = new Date();
  y.setDate(y.getDate() - 1);
  assert.equal(formatDayLabel(todayKey(y)), "Yesterday");
  const week = lastNDays(7);
  assert.equal(week.length, 7);
  assert.equal(week[6], todayKey());
  assert.equal(new Set(week).size, 7);
});
