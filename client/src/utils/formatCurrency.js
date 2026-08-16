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
/*
 * Intl.NumberFormat is expensive to construct and this is called once per quote
 * line, per booking row and per map InfoWindow — so formatters are cached by
 * their configuration. There are only a handful of distinct combinations, and
 * the objects are immutable and safe to share.
 */
const formatters = new Map();

function formatterFor(locale, currency, compact, maximumFractionDigits) {
  const key = `${locale}|${currency}|${compact}|${maximumFractionDigits}`;
  let formatter = formatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits,
    });
    formatters.set(key, formatter);
  }

  return formatter;
}

export function formatCurrency(
  amount,
  { currency = "EUR", locale = "en-IE", compact = false } = {}
) {
  if (amount == null || Number.isNaN(Number(amount))) return "—";

  return formatterFor(
    locale,
    currency,
    compact,
    Number.isInteger(amount) ? 0 : 2
  ).format(amount);
}
