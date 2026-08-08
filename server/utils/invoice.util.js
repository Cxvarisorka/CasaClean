// Invoice configuration & money helpers.
// --------------------------------------
// An invoice is a legal-ish document, so everything printed on it that is NOT
// derived from the booking (who is billing, tax registration, VAT rate) comes
// from configuration rather than being hard-coded or invented. Nothing here is
// required to boot the server: with no INVOICE_* variables set the invoice
// still renders correctly, it just shows the platform defaults and no VAT line.
//
// Deliberately NOT part of assertEnv(): a missing company address must not stop
// bookings from being taken. It only makes the printed document less complete.

const { fromMinorUnits, toMinorUnits } = require('./money.util');

// Multi-line values (a postal address) are configured on a single env line with
// "|" as the line separator — .env files can't carry real newlines reliably.
const readLines = (value) =>
  String(value || '')
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * The company issuing the invoice. Snapshotted onto every Invoice document at
 * issue time, so changing these values later never rewrites history.
 */
const getSeller = () => ({
  name: process.env.INVOICE_COMPANY_NAME || 'CasaClean',
  addressLines: readLines(process.env.INVOICE_COMPANY_ADDRESS),
  vatNumber: process.env.INVOICE_VAT_NUMBER || '',
  registrationNumber: process.env.INVOICE_COMPANY_REG_NUMBER || '',
  email: process.env.INVOICE_COMPANY_EMAIL || '',
  phone: process.env.INVOICE_COMPANY_PHONE || '',
  website: process.env.INVOICE_COMPANY_WEBSITE || process.env.CLIENT_URL || ''
});

/**
 * VAT percentage added to catalogue prices. Unset/0/garbage means "don't show
 * a VAT line at all" — we never fabricate a tax figure. Capped below 100 as a
 * sanity bound (a configured 2200 would be a typo, not a tax rate).
 */
const getVatRate = () => {
  const rate = Number(process.env.INVOICE_VAT_RATE);
  return Number.isFinite(rate) && rate > 0 && rate < 100 ? rate : 0;
};

// Prefix of the human-readable invoice number (CC-2026-000042).
const getNumberPrefix = () => (process.env.INVOICE_NUMBER_PREFIX || 'CC').trim() || 'CC';

// Round a euro amount to cents through the integer minor unit, so the usual
// float artefacts (0.1 + 0.2) can never reach a printed total.
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

/**
 * Split a VAT-INCLUSIVE gross amount into net + tax.
 *
 * Only used for LEGACY bookings — those priced before VAT handling existed,
 * which carry no `tax.netAmount` snapshot. There the total actually charged is
 * the only fixed quantity, so the net has to be derived out of it. The tax is
 * taken as the remainder rather than rounded independently, which guarantees
 * `net + vat === gross` to the cent (rounding each half separately can drift by
 * a cent and print a total that doesn't add up).
 *
 * @param {number} gross  total actually charged, in euros
 * @param {number} rate   VAT percentage (0 disables the split)
 * @returns {{ net: number, vat: number, gross: number }}
 */
const splitVatInclusive = (gross, rate) => {
  const total = roundMoney(gross);
  if (!(rate > 0)) return { net: total, vat: 0, gross: total };

  const net = roundMoney(total / (1 + rate / 100));
  return { net, vat: roundMoney(total - net), gross: total };
};

/**
 * Format the sequential number for a year's invoice series.
 * @example formatInvoiceNumber('CC', 2026, 42) -> "CC-2026-000042"
 */
const formatInvoiceNumber = (prefix, series, sequence) =>
  `${prefix}-${series}-${String(sequence).padStart(6, '0')}`;

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
  readLines,
  getSeller,
  getVatRate,
  getNumberPrefix,
  roundMoney,
  addVatExclusive,
  splitVatInclusive,
  formatInvoiceNumber,
  formatEuro,
  formatDateLong
};
