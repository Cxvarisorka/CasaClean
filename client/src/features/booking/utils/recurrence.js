/*
 * Recurrence date helpers
 * -----------------------
 * Booking dates are calendar strings, not instants. Parse them with the local
 * Date constructor so a UTC conversion never moves a visit or charge by a day.
 */

const DATE_STRING = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The human label for a cadence, in days. Cadences start at 1 now that a
 * service can offer a daily plan, so the singular case needs its own phrase
 * ("Every day", not "Every 1 days"). 0 is the one-time sentinel.
 */
export function intervalLabel(t, days) {
  const value = Number(days) || 0;
  if (value <= 0) return t("booking.schedule.repeat.oneTime");
  return value === 1
    ? t("booking.schedule.repeat.everyDay")
    : t("booking.schedule.repeat.everyDays", { days: value });
}

export function localDateFromDateString(value) {
  const match = typeof value === "string" ? value.match(DATE_STRING) : null;
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Reject impossible dates such as 2026-02-31 instead of normalising them.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function dateStringFromLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(value, days) {
  const date = localDateFromDateString(value);
  if (!date || !Number.isFinite(Number(days))) return null;
  date.setDate(date.getDate() + Number(days));
  return dateStringFromLocalDate(date);
}

export function todayDateString() {
  return dateStringFromLocalDate(new Date());
}

export function formatLocalDateString(value, locale, options) {
  const date = localDateFromDateString(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale || "en", options).format(date);
}

// API Date fields (nextChargeAt / lastChargeAt) are instants, unlike booking
// dates. They can safely use the normal timestamp parser.
export function formatTimestampDate(value, locale, options) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale || "en", options).format(date);
}
