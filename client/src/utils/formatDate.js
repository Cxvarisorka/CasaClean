/**
 * Formats a date (Date | ISO string | timestamp) into a human-readable label.
 *
 * @param {Date|string|number} value
 * @param {object} [options]
 * @param {"short"|"medium"|"long"} [options.style="medium"]
 * @param {string} [options.locale="en-US"]
 * @returns {string}
 */
export function formatDate(value, { style = "medium", locale = "en-US" } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const presets = {
    short: { day: "numeric", month: "short" },
    medium: { day: "numeric", month: "short", year: "numeric" },
    long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  };

  return new Intl.DateTimeFormat(locale, presets[style] ?? presets.medium).format(
    date
  );
}

/**
 * Returns a relative time label such as "3 days ago" / "in 2 hours".
 * @param {Date|string|number} value
 * @param {string} [locale="en-US"]
 */
export function formatRelativeTime(value, locale = "en-US") {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms || unit === "minute") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "minute");
}
