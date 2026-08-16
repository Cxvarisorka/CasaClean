/*
 * Bookable time window
 * --------------------
 * The server is the authority on when a booking may start. `assertBookingWindow`
 * (server/services/booking.service.js) enforces four rules, and this module
 * mirrors all four so the wizard rejects a slot before checkout does:
 *
 *   1. the start is at least ADVANCE_BOOKING_HOURS away — measured to the
 *      MINUTE, not by calendar day — unless the chosen service allows instant
 *      (same-day) booking
 *   2. a start today can't be a minute that has already passed
 *   3. start >= the city's workingHourStarts, and start < workingHourEnds
 *   4. start + duration <= the city's workingHourEnds — the whole visit has to
 *      fit, so checking only the start would let 16:30 × 8 h through a
 *      09:00–17:30 window
 *
 * The customer types the start time (any minute — 12:20 is a real arrival time)
 * and types the duration as an Hours/Minutes pair, so this module VALIDATES
 * rather than enumerating a slot list. `startWindow` is the range the step
 * shows; `remainingMinutes` is the longest visit a chosen start still leaves
 * room for, which is what the duration inputs are checked against.
 *
 * Times are "HH:MM" 24-hour strings, matching the city model and the API.
 * `describeTimeIssue` returns a code + params rather than a sentence, so the
 * wording stays in the locale files.
 */

import { ADVANCE_BOOKING_HOURS, MIN_DURATION_MINUTES } from "../constants";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ADVANCE_BOOKING_MS = ADVANCE_BOOKING_HOURS * 60 * 60 * 1000;

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

/** A Date as the local "YYYY-MM-DD" the booking date field uses. */
export function toDateString(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** The moment a chosen date + time starts, in local time. */
function startsAt(dateString, time) {
  const minutes = toMinutes(time);
  if (minutes === null || !dateString) return null;
  const [y, m, d] = String(dateString).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
}

/** True when the service opted out of the advance notice. Fails closed. */
export function allowsInstantBooking(service) {
  return Boolean(service?.allowInstantBooking);
}

/**
 * The earliest DATE a booking may fall on — what the date picker's `min` uses.
 * An instant service can be booked today; anything else has to clear the notice
 * period, and the day it lands on is the first that can hold a valid start.
 */
export function earliestBookableDate({ service, now = new Date() } = {}) {
  if (allowsInstantBooking(service)) return toDateString(now);
  return toDateString(new Date(now.getTime() + ADVANCE_BOOKING_MS));
}

/**
 * The range a booking of `durationMinutes` may start in, as { earliest, latest }
 * "HH:MM" strings — the city's opening time through the last minute that still
 * leaves room to finish before closing.
 *
 * Returns null when the city is unknown, its hours are unusable, or the booking
 * simply doesn't fit in the working day, so the caller can say so instead of
 * offering an impossible range.
 */
export function startWindow({ city, durationMinutes }) {
  if (!city) return null;

  const opens = toMinutes(city.workingHourStarts);
  const closes = toMinutes(city.workingHourEnds);
  if (opens === null || closes === null || closes <= opens) return null;

  const duration = Math.round(Number(durationMinutes) || 0);
  if (duration <= 0) return null;

  const latest = closes - duration;
  if (latest < opens) return null;

  return { earliest: toTimeString(opens), latest: toTimeString(latest) };
}

/**
 * How many minutes of the city's working day are left after the chosen start —
 * the longest visit that could still finish before closing.
 *
 * This is the number the duration inputs are validated against ("15:00 in a city
 * that closes at 17:00 leaves 120 minutes"). Returns null when the city or the
 * start is unknown, and 0 or less when the start is outside the working day at
 * all, which rule 3 reports instead.
 */
export function remainingMinutes({ city, time }) {
  if (!city) return null;

  const start = toMinutes(time);
  const opens = toMinutes(city.workingHourStarts);
  const closes = toMinutes(city.workingHourEnds);
  if (start === null || opens === null || closes === null) return null;

  return closes - start;
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
  if (dateString !== toDateString(now)) return false;

  return minutes <= now.getHours() * 60 + now.getMinutes();
}

/**
 * True when the chosen start leaves at least the required notice.
 * Exactly ADVANCE_BOOKING_HOURS ahead qualifies — the rule is "at least".
 */
export function meetsAdvanceNotice(dateString, time, now = new Date()) {
  const start = startsAt(dateString, time);
  if (!start) return false;
  return start.getTime() - now.getTime() >= ADVANCE_BOOKING_MS;
}

/**
 * Why the chosen start time can't be booked — `{ code, params }` for the caller
 * to translate — or null when it is bookable.
 *
 * An empty time is NOT an issue here: "you haven't picked one yet" is the
 * schema's `required` message, and reporting it twice would put a red line
 * under a field the customer hasn't reached.
 */
export function describeTimeIssue({
  city,
  service,
  durationMinutes,
  date,
  time,
  now = new Date(),
}) {
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

  // Rule 1 — the notice period, unless this service sells same-day slots. Ahead
  // of the working-hours rules because it is the one a customer is most likely
  // to hit, and "pick a later day" is a different fix from "pick a later time".
  if (date && !allowsInstantBooking(service) && !meetsAdvanceNotice(date, time, now)) {
    const earliest = new Date(now.getTime() + ADVANCE_BOOKING_MS);
    return {
      code: "tooSoon",
      params: {
        hours: ADVANCE_BOOKING_HOURS,
        earliestDate: toDateString(earliest),
        earliestTime: toTimeString(earliest.getHours() * 60 + earliest.getMinutes()),
      },
    };
  }

  // Rule 2 — not already gone, for a booking later today.
  if (isPastOnDate(time, date, now)) return { code: "past", params: {} };

  // Rule 3 — inside the opening hours at all.
  if (start < opens || start >= closes) {
    return { code: "outsideHours", params: cityParams };
  }

  // Rule 4 — long enough before closing to finish. Reported separately from
  // rule 3 because the fix is different: start earlier OR book shorter. When
  // the start itself is fine, the duration is what has to give, so that is what
  // the message names.
  const window = startWindow({ city, durationMinutes });
  if (!window) return { code: "noRoom", params: cityParams };
  if (start > toMinutes(window.latest)) {
    return {
      code: "durationExceeds",
      params: {
        ...cityParams,
        latest: window.latest,
        remaining: Math.max(remainingMinutes({ city, time }) ?? 0, 0),
      },
    };
  }

  return null;
}

/**
 * Why the entered duration can't be booked at all — independent of the start
 * time, so the preferences step can report it before a date is chosen.
 *
 * Returns `{ code, params }` or null. `noRoom` means the city's whole working
 * day is shorter than the requested visit, which no start time can fix.
 */
export function describeDurationIssue({ city, durationMinutes }) {
  const duration = Math.round(Number(durationMinutes) || 0);
  if (!city || duration < MIN_DURATION_MINUTES) return null;

  const opens = toMinutes(city.workingHourStarts);
  const closes = toMinutes(city.workingHourEnds);
  if (opens === null || closes === null || closes <= opens) return null;

  if (duration > closes - opens) {
    return {
      code: "noRoom",
      params: {
        city: city.name,
        open: city.workingHourStarts,
        close: city.workingHourEnds,
      },
    };
  }

  return null;
}
