/*
 * Bookable time slots
 * -------------------
 * The server is the authority on when a booking may start. `assertBookingWindow`
 * (server/services/booking.service.js) enforces three rules, and this module
 * mirrors all three so the wizard never offers a slot that checkout will reject:
 *
 *   1. start >= the city's workingHourStarts
 *   2. start <  the city's workingHourEnds
 *   3. start + hours <= the city's workingHourEnds   (a long booking must finish
 *      before closing — checking only the start would let 16:30 × 8h through a
 *      09:00–17:30 window)
 *
 * Rule 3 is why `hours` is an input here: the same city offers fewer start times
 * for a longer booking. A same-day booking additionally can't start in the past,
 * which the server also enforces; `isPastOnDate` covers that.
 *
 * Times are "HH:MM" 24-hour strings, matching the city model and the API.
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
 * Every valid start time for a booking of `hours` in a city, at `stepMinutes`
 * granularity (default: hourly, matching how the product has always presented
 * slots). Returns [] when the city is unknown or its hours are unusable, so the
 * UI shows "pick a city first" instead of inventing options.
 */
export function buildTimeSlots({ city, hours, stepMinutes = 60 }) {
  if (!city) return [];

  const opens = toMinutes(city.workingHourStarts);
  const closes = toMinutes(city.workingHourEnds);
  if (opens === null || closes === null || closes <= opens) return [];

  // Duration is optional: with no/invalid hours yet, fall back to the plain
  // opening window so the step still renders something sensible.
  const duration = Number(hours) > 0 ? Number(hours) * 60 : 0;
  const latestStart = closes - duration;
  if (latestStart < opens) return [];

  // Align to the hour so a city opening at 08:30 still yields 08:30, 09:30, …
  const slots = [];
  for (let minute = opens; minute <= latestStart; minute += stepMinutes) {
    slots.push(toTimeString(minute));
  }
  return slots;
}

/**
 * True when "HH:MM" has already passed for the given "YYYY-MM-DD" date.
 * Only same-day bookings can be in the past; any other date returns false.
 * Mirrors the server's same-day check (which uses strict `<=`, so a slot equal
 * to the current minute is already too late).
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

/** Slots for a city/duration/date, with past same-day starts removed. */
export function bookableTimeSlots({ city, hours, date, now = new Date() }) {
  return buildTimeSlots({ city, hours }).filter(
    (slot) => !isPastOnDate(slot, date, now)
  );
}
