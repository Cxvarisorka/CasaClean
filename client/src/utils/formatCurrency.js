/**
 * Formats a numeric amount as a localized currency string.
 * Defaults to EUR (the backend prices services in euros) but stays
 * configurable so the same helper serves any future market.
 *
 * @param {number} amount
 * @param {object} [options]
 * @param {string} [options.currency="EUR"]
 * @param {string} [options.locale="en-IE"]
 * @param {boolean} [options.compact=false] - use compact notation (e.g. €1.2K)
 * @returns {string}
 */
export function formatCurrency(
  amount,
  { currency = "EUR", locale = "en-IE", compact = false } = {}
) {
  if (amount == null || Number.isNaN(Number(amount))) return "—";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
