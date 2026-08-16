/*
 * Duration formatting
 * -------------------
 * A booking's length travels as TOTAL MINUTES — 85 is a 1 h 25 min visit, which
 * is not something to show a customer. `formatDuration` turns it into
 * "1 h 25 min" using the locale's own unit labels, and every surface that states
 * a duration — the live summary, the review step, the admin tables — goes
 * through it, so the wizard, the confirmation email and the invoice all word it
 * the same way.
 *
 * The customer never types a total: the wizard collects an Hours field and a
 * Minutes field and `combineDuration` joins them, mirroring the server's
 * utils/duration.util.js exactly.
 *
 * `t` is passed in rather than hooked so this stays a pure function.
 */

/**
 * Combine the wizard's "Hours + Minutes" pair into total minutes: (1, 25) -> 85.
 * Returns NaN for a pair that isn't two whole numbers, so a half-typed duration
 * is reported rather than silently read as some other length.
 *
 * A CLEARED input is the case that matters: `Number("")` is 0, so an empty
 * Hours box would otherwise turn "25" into a 25-minute booking behind the
 * customer's back. Blanks are rejected explicitly.
 */
export function combineDuration(hours, minutes) {
  if (hours === "" || hours === null || hours === undefined) return NaN;
  if (minutes === "" || minutes === null || minutes === undefined) return NaN;

  const h = Number(hours);
  const m = Number(minutes);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return NaN;
  return h * 60 + m;
}

/** The inverse, for seeding the two inputs from a stored total: 85 -> { hours: 1, minutes: 25 }. */
export function splitDuration(totalMinutes) {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/**
 * The duration of a booking-shaped record, in minutes. `durationMinutes` is what
 * every write sets; `hours` is the legacy field on records made before durations
 * went to the minute (whole and half hours only, so x60 is exact).
 */
export function durationInMinutes(record) {
  const stored = Number(record?.durationMinutes);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);

  const legacyHours = Number(record?.hours);
  if (Number.isFinite(legacyHours) && legacyHours > 0) return Math.round(legacyHours * 60);

  return 0;
}

/**
 * Minutes as plain text without a translator: 120 -> "2h", 85 -> "1h 25m". For
 * pure code that has no access to the locale — the pricing engine's fallback
 * line label, which the UI overrides with a localized one.
 */
export function formatDurationPlain(totalMinutes) {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (!total) return "";

  const { hours, minutes } = splitDuration(total);

  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * A duration in minutes as localized text: 120 -> "2 h", 85 -> "1 h 25 min".
 * Returns "" for a missing/zero duration so callers can leave the line out
 * rather than print a zero.
 */
export function formatDuration(t, totalMinutes) {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (!total) return "";

  const { hours, minutes } = splitDuration(total);

  if (!hours) return t("booking.units.duration.minutes", { minutes });
  if (!minutes) return t("booking.units.duration.hours", { hours });
  return t("booking.units.duration.hoursMinutes", { hours, minutes });
}
