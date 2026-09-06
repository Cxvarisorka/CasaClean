// VAT & money-formatting helpers.
// -------------------------------
// The one place euro amounts are rounded and VAT is added, so every consumer
// (pricing, cancellation fees, email templates) agrees to the cent.

const { fromMinorUnits, toMinorUnits } = require('./money.util');

/**
 * VAT percentage added to catalogue prices. Unset/0/garbage means "charge no
 * VAT at all" — we never fabricate a tax figure. Capped below 100 as a sanity
 * bound (a configured 2200 would be a typo, not a tax rate).
 *
 * The env var keeps its historic INVOICE_VAT_RATE name deliberately: renaming
 * it would silently disable VAT on every existing deployment.
 */
const getVatRate = () => {
  const rate = Number(process.env.INVOICE_VAT_RATE);
  return Number.isFinite(rate) && rate > 0 && rate < 100 ? rate : 0;
};

// Round a euro amount to cents through the integer minor unit, so the usual
// float artefacts (0.1 + 0.2) can never reach a charged total.
const roundMoney = (amount) => fromMinorUnits(toMinorUnits(amount));

/**
 * Add VAT ON TOP of a VAT-EXCLUSIVE net amount.
 *
 * This is the normal direction in this product: catalogue prices are net, so the
 * net is the fixed quantity and the gross is derived. The gross is taken as the
 * sum rather than rounded independently, which guarantees `net + vat === gross`
 * to the cent.
 *
 * @param {number} net   catalogue amount, VAT excluded, in euros
 * @param {number} rate  VAT percentage (0 means nothing is added)
 * @returns {{ net: number, vat: number, gross: number }}
 */
const addVatExclusive = (net, rate) => {
  const base = roundMoney(net);
  if (!(rate > 0)) return { net: base, vat: 0, gross: base };

  const vat = roundMoney(base * (rate / 100));
  return { net: base, vat, gross: roundMoney(base + vat) };
};

const formatEuro = (amount) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(
    Number(amount) || 0
  );

// "2026-08-07" -> "7 August 2026". Booking dates are plain date strings with no
// timezone, so they're parsed as UTC and formatted as UTC — going through the
// server's local zone could shift the printed date by a day.
const formatDateLong = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
};

module.exports = {
  getVatRate,
  roundMoney,
  addVatExclusive,
  formatEuro,
  formatDateLong
};
