/*
 * Duration formatting
 * -------------------
 * A booking's length travels as a number of hours and can be a half ("1.5"),
 * which is not something to show a customer. `formatDuration` turns it into
 * "1 h 30 min" using the locale's own unit labels, and every surface that
 * states a duration — the picker, the live summary, the review step, the admin
 * tables — goes through it, so the wizard, the confirmation email and the
 * invoice all word it the same way.
 *
 * `t` is passed in rather than hooked so this stays a pure function.
 */

/** Hours (possibly fractional) -> whole minutes. */
export function durationMinutes(hours) {
  const minutes = Math.round((Number(hours) || 0) * 60);
  return minutes > 0 ? minutes : 0;
}

/**
 * The same thing without a translator: 2 -> "2h", 1.5 -> "1h 30m". For pure
 * code that has no access to the locale — the pricing engine's fallback line
 * label, which the UI overrides with a localized one.
 */
export function formatDurationPlain(hours) {
  const total = durationMinutes(hours);
  if (!total) return "";

  const wholeHours = Math.floor(total / 60);
  const minutes = total % 60;

  if (!wholeHours) return `${minutes}m`;
  return minutes ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
}

/**
 * A duration in hours as localized text: 2 -> "2 h", 1.5 -> "1 h 30 min".
 * Returns "" for a missing/zero duration so callers can leave the line out
 * rather than print a zero.
 */
export function formatDuration(t, hours) {
  const total = durationMinutes(hours);
  if (!total) return "";

  const wholeHours = Math.floor(total / 60);
  const minutes = total % 60;

  if (!wholeHours) return t("booking.units.duration.minutes", { minutes });
  if (!minutes) return t("booking.units.duration.hours", { hours: wholeHours });
  return t("booking.units.duration.hoursMinutes", { hours: wholeHours, minutes });
}
