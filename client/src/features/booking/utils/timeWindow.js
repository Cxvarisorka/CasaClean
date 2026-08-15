/*
 * Bookable time window
 * --------------------
 * The server is the authority on when a booking may start. `assertBookingWindow`
 * (server/services/booking.service.js) enforces three rules, and this module
 * mirrors all three so the wizard rejects a start time before checkout does:
 *
 *   1. start >= the city's workingHourStarts
 *   2. start <  the city's workingHourEnds
 *   3. start + duration <= the city's workingHourEnds   (a long booking must
 *      finish before closing — checking only the start would let 16:30 × 8h
 *      through a 09:00–17:30 window)
 *   4. a same-day booking can't start at a minute that has already passed
 *
 * The customer types the start time (any minute — 12:20 is a real arrival time),
 * so this module VALIDATES a time rather than enumerating a slot list. Rule 3 is
 * why `hours` is an input: the same city closes its window earlier for a longer
 * booking, and `startWindow` is what the step shows as the allowed range.
 *
 * Times are "HH:MM" 24-hour strings, matching the city model and the API.
 * `describeTimeIssue` returns a code + params rather than a sentence, so the
 * wording stays in the locale files.
 */

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" -> minutes since midnight, or null when malformed. */
export function toMinutes(value) {
  const match = typeof value === "string" ? value.match(TIME_RE) : null;
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since midnight -> "HH:MM". */
export function toTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * The range a booking of `hours` may start in, as { earliest, latest } "HH:MM"
 * strings — the city's opening time through the last minute that still leaves
 * room to finish before closing.
 *
 * Returns null when the city is unknown, its hours are unusable, or the booking
 * simply doesn't fit in the working day, so the caller can say so instead of
 * offering an impossible range.
 */
export function startWindow({ city, hours }) {
  if (!city) return null;

  const opens = toMinutes(city.workingHourStarts);
  const closes = toMinutes(city.workingHourEnds);
  if (opens === null || closes === null || closes <= opens) return null;

  const duration = Math.round((Number(hours) || 0) * 60);
  if (duration <= 0) return null;

  const latest = closes - duration;
  if (latest < opens) return null;

  return { earliest: toTimeString(opens), latest: toTimeString(latest) };
}

/**
 * True when "HH:MM" has already passed for the given "YYYY-MM-DD" date.
 * Only same-day bookings can be in the past; any other date returns false.
 * Mirrors the server's same-day check (which uses `<=`, so a time equal to the
 * current minute is already too late).
 */
export function isPastOnDate(time, dateString, now = new Date()) {
  const minutes = toMinutes(time);
  if (minutes === null || !dateString) return false;

  const todayString = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  if (dateString !== todayString) return false;

  return minutes <= now.getHours() * 60 + now.getMinutes();
}

/**
 * Why the chosen start time can't be booked — `{ code, params }` for the caller
 * to translate — or null when it is bookable.
 *
 * An empty time is NOT an issue here: "you haven't picked one yet" is the
 * schema's `required` message, and reporting it twice would put a red line
 * under a field the customer hasn't reached.
 */
export function describeTimeIssue({ city, hours, date, time, now = new Date() }) {
  if (!time) return null;
  if (!city) return { code: "noCity", params: {} };

  const start = toMinutes(time);
  if (start === null) return { code: "invalid", params: {} };

  const opens = toMinutes(city.workingHourStarts);
  const closes = toMinutes(city.workingHourEnds);
  if (opens === null || closes === null || closes <= opens) {
    return { code: "noCity", params: {} };
  }

  const cityParams = {
    city: city.name,
    open: city.workingHourStarts,
    close: city.workingHourEnds,
  };

  // Rules 1 & 2 — inside the opening hours at all.
  if (start < opens || start >= closes) {
    return { code: "outsideHours", params: cityParams };
  }

  // Rule 3 — long enough before closing to finish. Reported separately from
  // rule 1/2 because the fix is different: start earlier OR book shorter.
  const window = startWindow({ city, hours });
  if (!window) return { code: "noRoom", params: cityParams };
  if (start > toMinutes(window.latest)) {
    return { code: "tooLate", params: { ...cityParams, latest: window.latest } };
  }

  // Rule 4 — not already gone, for a booking later today.
  if (isPastOnDate(time, date, now)) return { code: "past", params: {} };

  return null;
}
