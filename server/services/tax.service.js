// VAT number registration & verification (Stripe Tax IDs)
// -------------------------------------------------------
// A business only stops being charged VAT once its VAT number has actually been
// checked. We use Stripe's Customer Tax IDs for that: registering an `eu_vat`
// number on the Stripe Customer makes Stripe validate it against VIES (the EU's
// own VAT registry) and report the outcome.
//
// This is FREE and independent of Stripe Tax — we are not asking Stripe to
// calculate anything, only to answer "is this a real, currently-registered VAT
// number?". The rate and the money are decided by utils/tax.util.js, and the
// invoice is rendered by our own code.
//
// Verification is ASYNCHRONOUS: `createTaxId` almost always comes back
// `pending`, and Stripe delivers the real answer minutes later as a
// `customer.tax_id.updated` webhook. Everything here is written around that —
// `pending` is a normal state, and it is charged VAT like any consumer until it
// turns `verified`. Being wrong in that direction costs the customer a refund
// request; being wrong the other way means under-collecting tax we still owe.

const stripe = require('../config/stripe.config');
const User = require('../models/user.model');
const AppError = require('../utils/appError.util');
const { ensureStripeCustomer } = require('./stripeCustomer.service');

// Stripe reports `pending` | `verified` | `unverified` | `unavailable`.
// `unavailable` means VIES itself could not be reached — treat it as unverified
// rather than optimistically granting relief.
const mapVerification = (status) =>
  status === 'verified' ? 'verified' : status === 'pending' ? 'pending' : 'unverified';

/**
 * Normalise a VAT number to the form Stripe and VIES expect: uppercase, no
 * spaces, dots or dashes. "it 012 345 678-90" -> "IT01234567890".
 */
const normaliseVatNumber = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

// Loose structural check only — two-letter country prefix plus 2-13
// alphanumerics. The real validation is VIES's job; this exists so an obvious
// typo fails fast with a clear message instead of a Stripe API error.
const VAT_NUMBER_RE = /^[A-Z]{2}[A-Z0-9]{2,13}$/;

const isPlausibleVatNumber = (value) => VAT_NUMBER_RE.test(normaliseVatNumber(value));

/**
 * Remove the Stripe Tax ID currently attached to a user, if any.
 *
 * Best-effort: a tax id that Stripe has already lost (deleted in the dashboard,
 * customer recreated) must not block the user from saving a new one.
 */
const detachVatNumber = async (user) => {
  if (!user.stripeTaxIdId || !user.stripeCustomerId) return;
  try {
    await stripe.customers.deleteTaxId(user.stripeCustomerId, user.stripeTaxIdId);
  } catch (err) {
    console.error(`Stripe tax id detach failed for user ${user._id}:`, err.message);
  }
};

/**
 * Register a VAT number for a user and start Stripe's VIES verification.
 *
 * Replaces any previously registered number. Returns the fields to persist —
 * the caller owns the write, so this stays usable from more than one endpoint.
 *
 * @param {Object} user       the user document (needs _id, email, fullname)
 * @param {string} vatNumber  the raw number as typed by the customer
 * @returns {Promise<{ vatNumber: string, vatStatus: string, stripeTaxIdId: string }>}
 * @throws {AppError} 400 when the number is not even structurally a VAT number,
 *                    or when Stripe rejects it outright
 */
const registerVatNumber = async (user, vatNumber) => {
  const value = normaliseVatNumber(vatNumber);

  if (!isPlausibleVatNumber(value)) {
    throw new AppError(
      "That doesn't look like a VAT number. Use the full number including the country prefix, e.g. IT01234567890.",
      400
    );
  }

  const customerId = await ensureStripeCustomer(user);

  // Replace rather than accumulate: a customer with two tax ids on file makes
  // "is this business verified?" ambiguous.
  await detachVatNumber({ ...user, stripeCustomerId: customerId });

  let taxId;
  try {
    taxId = await stripe.customers.createTaxId(customerId, {
      type: 'eu_vat',
      value
    });
  } catch (err) {
    // Stripe rejects structurally invalid numbers synchronously. Surface its
    // message — it is more specific than anything we could infer.
    throw new AppError(
      `That VAT number was not accepted: ${err.message}`,
      400
    );
  }

  return {
    vatNumber: value,
    vatStatus: mapVerification(taxId.verification?.status),
    stripeTaxIdId: taxId.id
  };
};

/**
 * Clear a user's VAT registration (they switched back to a personal account, or
 * removed the number). Detaches it from Stripe and returns the fields to reset.
 */
const clearVatNumber = async (user) => {
  await detachVatNumber(user);
  return { vatNumber: '', vatStatus: 'none', stripeTaxIdId: null };
};

/**
 * Apply Stripe's verification result to the owning user.
 *
 * Driven by the `customer.tax_id.*` webhooks — this is where a `pending` number
 * becomes `verified` (and the customer starts paying net) or `unverified`.
 * Matched on the tax id itself, then on the customer, so a number replaced in
 * the meantime can't have a stale result written over it.
 *
 * @param {Object} taxId  the Stripe TaxId object from the event
 * @returns {Promise<Object|null>} the updated user, or null if it matched nobody
 */
const applyVerificationResult = async (taxId) => {
  if (!taxId?.id) return null;

  const status = mapVerification(taxId.verification?.status);

  return User.findOneAndUpdate(
    { stripeTaxIdId: taxId.id },
    { $set: { vatStatus: status } },
    { returnDocument: 'after' }
  );
};

/**
 * Handle a `customer.tax_id.deleted` event: the number is gone on Stripe's side,
 * so it can no longer earn the reverse charge here either.
 */
const applyVatNumberDeleted = async (taxId) => {
  if (!taxId?.id) return null;

  return User.findOneAndUpdate(
    { stripeTaxIdId: taxId.id },
    { $set: { vatStatus: 'none', vatNumber: '' }, $unset: { stripeTaxIdId: '' } },
    { returnDocument: 'after' }
  );
};

/**
 * Re-read a user's tax id straight from Stripe.
 *
 * The webhook is the normal path; this is the pull-based backstop for when a
 * verification result was missed (a webhook delivery failure, or a local dev
 * session with no tunnel running), so a verified business is never stuck paying
 * VAT because an event went astray.
 */
const refreshVatStatus = async (user) => {
  if (!user?.stripeTaxIdId || !user?.stripeCustomerId) return user;

  let taxId;
  try {
    taxId = await stripe.customers.retrieveTaxId(user.stripeCustomerId, user.stripeTaxIdId);
  } catch (err) {
    console.error(`Stripe tax id refresh failed for user ${user._id}:`, err.message);
    return user;
  }

  const status = mapVerification(taxId.verification?.status);
  if (status === user.vatStatus) return user;

  return User.findByIdAndUpdate(user._id, { $set: { vatStatus: status } }, { returnDocument: 'after' });
};

module.exports = {
  normaliseVatNumber,
  isPlausibleVatNumber,
  mapVerification,
  registerVatNumber,
  clearVatNumber,
  applyVerificationResult,
  applyVatNumberDeleted,
  refreshVatStatus
};
